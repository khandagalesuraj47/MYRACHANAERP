-- ==============================================================================
-- MIGRATION: 20260910000009_fix_registration_and_update_v103.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Fix Self-Registration so Pending Users Always Reach Admin, & Seed v1.0.3
-- ==============================================================================

-- 1. Automatic trigger on auth.users to create profile AND pending organization_member
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- 1.1 Create or update public.profiles
    INSERT INTO public.profiles (id, email, full_name, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        updated_at = now();

    -- 1.2 Find the default active organization
    SELECT id INTO v_org_id 
    FROM public.organizations 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;

    -- 1.3 Create organization_member record as PENDING (is_active = false)
    IF v_org_id IS NOT NULL THEN
        INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
        VALUES (v_org_id, NEW.id, 'USER', false)
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Explicit RPC for client-side registration fallback (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.self_register_member(
    p_user_id UUID,
    p_full_name TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_org_id UUID;
    v_member_id UUID;
BEGIN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name, is_active)
    VALUES (p_user_id, lower(trim(p_email)), trim(p_full_name), true)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

    -- Get organization
    SELECT id INTO v_org_id 
    FROM public.organizations 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active organization found');
    END IF;

    -- Insert pending member record
    INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
    VALUES (v_org_id, p_user_id, 'USER', false)
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET is_active = CASE WHEN public.organization_members.is_active = true THEN true ELSE false END
    RETURNING id INTO v_member_id;

    RETURN jsonb_build_object('success', true, 'organization_id', v_org_id, 'member_id', v_member_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.self_register_member(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- 3. Backfill any existing profiles that are missing an organization_members record
DO $$
DECLARE
    v_org_id UUID;
    r_prof RECORD;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
    IF v_org_id IS NOT NULL THEN
        FOR r_prof IN 
            SELECT p.id 
            FROM public.profiles p
            LEFT JOIN public.organization_members om ON om.user_id = p.id AND om.organization_id = v_org_id
            WHERE om.id IS NULL
        LOOP
            INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
            VALUES (v_org_id, r_prof.id, 'USER', false)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- 4. Seed version 3 (1.0.3) in app_releases table
CREATE TABLE IF NOT EXISTS public.app_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code INT NOT NULL UNIQUE,
    version_name TEXT NOT NULL,
    apk_url TEXT NOT NULL,
    release_notes TEXT,
    is_critical BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'app_releases' AND policyname = 'Public read app releases'
    ) THEN
        CREATE POLICY "Public read app releases" ON public.app_releases FOR SELECT USING (true);
    END IF;
END $$;

INSERT INTO public.app_releases (version_code, version_name, apk_url, release_notes, is_critical)
VALUES (
    3,
    '1.0.3',
    'https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp.apk',
    'Version 1.0.3: Native Android auto-fit layout, native-only OTA update modal, robust self-registration approval sync, and direct Supabase storage attachment pipelines.',
    false
)
ON CONFLICT (version_code) DO UPDATE 
SET 
    version_name = EXCLUDED.version_name,
    apk_url = EXCLUDED.apk_url,
    release_notes = EXCLUDED.release_notes,
    published_at = timezone('utc'::text, now());


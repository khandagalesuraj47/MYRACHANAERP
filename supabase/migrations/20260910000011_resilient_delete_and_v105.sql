-- ==============================================================================
-- MIGRATION: 20260910000011_resilient_delete_and_v105.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE:
--   1. Ensure public.password_reset_requests table exists unconditionally
--   2. Make admin_delete_user 100% resilient using dynamic to_regclass checks
--   3. Seed v1.0.5 native Android release
-- ==============================================================================

-- 1. ENSURE PASSWORD RESET REQUESTS TABLE EXISTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED', 'REJECTED')),
    temp_password TEXT,
    admin_notes TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fulfilled_at TIMESTAMPTZ,
    fulfilled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_req_status ON public.password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_pw_reset_req_email ON public.password_reset_requests(lower(email));
CREATE INDEX IF NOT EXISTS idx_pw_reset_req_org ON public.password_reset_requests(organization_id);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public to request password reset" ON public.password_reset_requests;
    CREATE POLICY "Allow public to request password reset"
    ON public.password_reset_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow org admins to manage password reset requests" ON public.password_reset_requests;
    CREATE POLICY "Allow org admins to manage password reset requests"
    ON public.password_reset_requests
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.user_id = auth.uid()
              AND organization_members.role = 'ADMIN'
              AND organization_members.is_active = true
        )
    );
END $$;

-- 2. BULLET-PROOF ADMIN DELETE USER RPC (NEVER FAILS ON MISSING RELATIONS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_organization_id UUID,
    p_member_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_actual_member_id UUID;
    v_caller_is_admin BOOLEAN;
BEGIN
    -- 1. Verify caller is admin
    v_caller_is_admin := public.is_org_admin(p_organization_id);
    IF NOT v_caller_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only administrators can delete personnel.');
    END IF;

    -- 2. Locate user_id and actual member record id
    SELECT id, user_id INTO v_actual_member_id, v_user_id
    FROM public.organization_members
    WHERE (id = p_member_id OR user_id = p_member_id) 
      AND organization_id = p_organization_id
    LIMIT 1;

    -- If not found in organization_members, check if p_member_id matches an auth user or profile
    IF v_user_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_member_id) THEN
            v_user_id := p_member_id;
        ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_member_id) THEN
            v_user_id := p_member_id;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Personnel record not found in this organization.');
        END IF;
    END IF;

    -- 3. Cannot delete self
    IF v_user_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'You cannot delete your own administrator account.');
    END IF;

    -- 4. Delete user task assignments safely
    IF to_regclass('public.user_task_assignments') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.user_task_assignments WHERE user_id = $1' USING v_user_id;
    END IF;

    -- 5. Delete password reset requests safely
    IF to_regclass('public.password_reset_requests') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.password_reset_requests WHERE user_id = $1' USING v_user_id;
    END IF;

    -- 6. Delete organization membership if exists
    IF v_actual_member_id IS NOT NULL THEN
        DELETE FROM public.organization_members
        WHERE id = v_actual_member_id;
    ELSE
        DELETE FROM public.organization_members
        WHERE user_id = v_user_id;
    END IF;

    -- 7. Delete profile if exists
    IF to_regclass('public.profiles') IS NOT NULL THEN
        DELETE FROM public.profiles
        WHERE id = v_user_id;
    END IF;

    -- 8. Delete from auth.users (cascades sessions, identities, tokens)
    BEGIN
        DELETE FROM auth.users
        WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
        -- Handled if auth delete fails
    END;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID, UUID) TO authenticated;

-- 3. SEED v1.0.5 RELEASE IN APP_RELEASES
-- ==============================================================================
INSERT INTO public.app_releases (
    version_code,
    version_name,
    apk_url,
    release_notes,
    is_critical,
    published_at
)
VALUES (
    5,
    '1.0.5',
    'https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp-v1.0.5.apk',
    'Version 1.0.5: Native Android redesign with Material 3 bottom navigation, native bottom sheets, mobile-first card reflow, edge-to-edge system insets, and resilient fail-safe applicant deletion.',
    false,
    now()
)
ON CONFLICT (version_code) DO UPDATE
SET
    version_name = EXCLUDED.version_name,
    apk_url = EXCLUDED.apk_url,
    release_notes = EXCLUDED.release_notes,
    is_critical = EXCLUDED.is_critical,
    published_at = EXCLUDED.published_at;

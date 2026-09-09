-- ==============================================================================
-- MIGRATION: 20260909000001_core_multitenant_schema.sql
-- ERP PLATFORM: MY RACHANA ERP
-- DOMAIN: Multi-Tenant Core Architecture (Organizations, Profiles, Memberships)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE TABLES
-- ==============================================================================

-- 2.1 Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on slug for lookup performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- 2.2 Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2.3 Organization Members (Tenancy + Role assignment)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_organization_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- ==============================================================================
-- 3. TIMESTAMP AUTO-UPDATE TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_org_members_updated_at ON public.organization_members;
CREATE TRIGGER trg_org_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. HELPER SECURITY FUNCTIONS FOR RLS (Non-recursive, secure search_path)
-- ==============================================================================

-- Check if current user is an active member of the given organization
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND is_active = true
    );
$$;

-- Check if current user is an active ADMIN in the given organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND role = 'ADMIN'
          AND is_active = true
    );
$$;

-- Get all active organization IDs for current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND is_active = true;
$$;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 5.1 Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 5.2 Organizations Policies
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT public.get_user_org_ids())
    );

DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
CREATE POLICY "Admins can update their organization"
    ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (public.is_org_admin(id))
    WITH CHECK (public.is_org_admin(id));

-- 5.3 Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can view members in same organization" ON public.profiles;
CREATE POLICY "Users can view members in same organization"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT user_id 
            FROM public.organization_members 
            WHERE organization_id IN (SELECT public.get_user_org_ids())
              AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 5.4 Organization Members Policies
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON public.organization_members;
CREATE POLICY "Users can view memberships in their organizations"
    ON public.organization_members
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
    );

DROP POLICY IF EXISTS "Admins can insert members in their organization" ON public.organization_members;
CREATE POLICY "Admins can insert members in their organization"
    ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_org_admin(organization_id)
    );

DROP POLICY IF EXISTS "Admins can update members in their organization" ON public.organization_members;
CREATE POLICY "Admins can update members in their organization"
    ON public.organization_members
    FOR UPDATE
    TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins can delete members in their organization" ON public.organization_members;
CREATE POLICY "Admins can delete members in their organization"
    ON public.organization_members
    FOR DELETE
    TO authenticated
    USING (public.is_org_admin(organization_id));

-- ==============================================================================
-- 6. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 7. INITIAL TENANT & ADMIN LINK SEEDING (Idempotent & Safe)
-- Organization: Rachana Construction Limited
-- Admin User: 47ebdc72-57c1-4e15-91bb-6fe7b688f174 (khandagalesuraj47@gmail.com)
-- ==============================================================================

DO $$
DECLARE
    v_org_id UUID;
    v_admin_uid UUID := '47ebdc72-57c1-4e15-91bb-6fe7b688f174'::UUID;
BEGIN
    -- 1. Ensure initial Organization exists
    SELECT id INTO v_org_id 
    FROM public.organizations 
    WHERE slug = 'rachana-construction-limited';

    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name, slug, is_active)
        VALUES ('Rachana Construction Limited', 'rachana-construction-limited', true)
        RETURNING id INTO v_org_id;
    END IF;

    -- 2. Ensure Profile exists for the existing auth user
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_admin_uid) THEN
        INSERT INTO public.profiles (id, email, full_name, is_active)
        VALUES (
            v_admin_uid,
            'khandagalesuraj47@gmail.com',
            'Suraj Khandagale',
            true
        )
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            is_active = true,
            updated_at = now();

        -- 3. Link user to Organization as ADMIN
        INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
        VALUES (
            v_org_id,
            v_admin_uid,
            'ADMIN',
            true
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role = 'ADMIN',
            is_active = true,
            updated_at = now();
    END IF;
END $$;

-- ==============================================================================
-- 8. SUPABASE REALTIME CONFIGURATION
-- Add tables to the supabase_realtime publication for instant UI sync
-- ==============================================================================

DO $$
BEGIN
    -- Ensure supabase_realtime publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add organizations if not present
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = 'organizations'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
        END IF;

        -- Add profiles if not present
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = 'profiles'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        END IF;

        -- Add organization_members if not present
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = 'organization_members'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
        END IF;
    END IF;
END $$;
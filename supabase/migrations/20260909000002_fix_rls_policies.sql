-- ==============================================================================
-- MIGRATION: 20260909000002_fix_rls_policies.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Fix RLS recursion on public.organization_members and add atomic context RPC
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS (PL/pgSQL to avoid AST inlining recursion)
-- ==============================================================================

-- Get all active organization IDs for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND is_active = true;
END;
$$;

-- Check if current user is an active member of the given organization
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND is_active = true
    );
END;
$$;

-- Check if current user is an active ADMIN in the given organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND role = 'ADMIN'
          AND is_active = true
    );
END;
$$;

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES — RECURSION-FREE
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 2.1 ORGANIZATION MEMBERS
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view same organization memberships" ON public.organization_members;

-- Direct non-recursive check: Users can ALWAYS view their own membership rows
CREATE POLICY "Users can view own membership"
    ON public.organization_members
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Members can view other memberships in their active organization
CREATE POLICY "Users can view same organization memberships"
    ON public.organization_members
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
    );

-- Insert/Update/Delete policies for organization_members
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

-- 2.2 ORGANIZATIONS
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

-- 2.3 PROFILES
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

-- ==============================================================================
-- 3. ATOMIC USER CONTEXT RESOLUTION RPC (High Performance, Single Roundtrip)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_context()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_profile RECORD;
    v_member RECORD;
    v_org RECORD;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('status', 'UNAUTHENTICATED');
    END IF;

    -- 1. Profile resolution
    SELECT id, email, full_name, is_active, created_at, updated_at
    INTO v_profile
    FROM public.profiles
    WHERE id = v_uid;

    IF v_profile.id IS NOT NULL AND v_profile.is_active = false THEN
        RETURN jsonb_build_object(
            'status', 'USER_INACTIVE',
            'userId', v_uid,
            'errorMessage', 'Your user profile has been deactivated. Please contact your administrator.'
        );
    END IF;

    -- 2. Organization Membership resolution
    SELECT id, organization_id, user_id, role, is_active, created_at, updated_at
    INTO v_member
    FROM public.organization_members
    WHERE user_id = v_uid
      AND is_active = true
    LIMIT 1;

    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'NO_MEMBERSHIP',
            'userId', v_uid,
            'errorMessage', 'Your account is not assigned to an active organization. Please contact your administrator.'
        );
    END IF;

    -- 3. Organization resolution
    SELECT id, name, slug, is_active, created_at, updated_at
    INTO v_org
    FROM public.organizations
    WHERE id = v_member.organization_id;

    IF v_org.id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'NO_MEMBERSHIP',
            'userId', v_uid,
            'errorMessage', 'The organization assigned to your account could not be found.'
        );
    END IF;

    IF v_org.is_active = false THEN
        RETURN jsonb_build_object(
            'status', 'ORGANIZATION_INACTIVE',
            'userId', v_uid,
            'errorMessage', 'Your organization account is currently inactive. Please contact support.'
        );
    END IF;

    -- Return resolved success payload
    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'userId', v_uid,
        'user_id', v_uid,
        'email', COALESCE(v_profile.email, auth.jwt()->>'email'),
        'role', v_member.role,
        'profile', jsonb_build_object(
            'id', v_uid,
            'email', v_profile.email,
            'fullName', v_profile.full_name,
            'full_name', v_profile.full_name,
            'isActive', COALESCE(v_profile.is_active, true),
            'is_active', COALESCE(v_profile.is_active, true)
        ),
        'membership', jsonb_build_object(
            'id', v_member.id,
            'organizationId', v_member.organization_id,
            'organization_id', v_member.organization_id,
            'userId', v_member.user_id,
            'user_id', v_member.user_id,
            'role', v_member.role,
            'isActive', v_member.is_active,
            'is_active', v_member.is_active
        ),
        'organization', jsonb_build_object(
            'id', v_org.id,
            'name', v_org.name,
            'slug', v_org.slug,
            'isActive', v_org.is_active,
            'is_active', v_org.is_active
        )
    );
END;
$$;

-- Grant EXECUTE to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated;


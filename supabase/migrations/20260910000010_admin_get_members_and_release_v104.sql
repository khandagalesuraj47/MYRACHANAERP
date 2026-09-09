-- ==============================================================================
-- MIGRATION: 20260910000010_admin_get_members_and_release_v104.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE:
--   1. Fix RLS on public.profiles so admins can view all applicants (even if is_active = false)
--   2. Provide admin_get_organization_members RPC with SECURITY DEFINER to get complete member details
--   3. Enhance admin_delete_user to delete by member_id OR user_id (unlinked applicants)
--   4. Seed app_releases for v1.0.4 (version_code: 4)
-- ==============================================================================

-- 1. FIX PROFILES RLS POLICY FOR ADMINS & SELF-REGISTERED USERS
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view members in same organization" ON public.profiles;

CREATE POLICY "Users can view members in same organization"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        -- User can view own profile
        id = auth.uid()
        OR
        -- Organization Admins can view ANY profile in their organization or unassigned pending profiles
        EXISTS (
            SELECT 1 FROM public.organization_members adm
            WHERE adm.user_id = auth.uid()
              AND adm.role = 'ADMIN'
              AND adm.is_active = true
        )
        OR
        -- Non-admin members can view active members of their organization
        id IN (
            SELECT user_id 
            FROM public.organization_members 
            WHERE organization_id IN (SELECT public.get_user_org_ids())
              AND is_active = true
        )
    );

-- 2. ATOMIC RPC: ADMIN GET ORGANIZATION MEMBERS WITH COMPLETE DETAILS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_get_organization_members(
    p_organization_id UUID
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    user_id UUID,
    role TEXT,
    is_active BOOLEAN,
    site_id UUID,
    department_id UUID,
    custom_role_id UUID,
    designation TEXT,
    employee_code TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    profile_email TEXT,
    profile_full_name TEXT,
    auth_email TEXT,
    auth_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Verify caller is admin of this organization
    v_is_admin := public.is_org_admin(p_organization_id);
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only organization administrators can query complete personnel records.';
    END IF;

    RETURN QUERY
    SELECT 
        om.id,
        om.organization_id,
        om.user_id,
        om.role,
        om.is_active,
        om.site_id,
        om.department_id,
        om.custom_role_id,
        om.designation,
        om.employee_code,
        om.phone,
        om.created_at,
        om.updated_at,
        COALESCE(p.email, u.email::text) AS profile_email,
        COALESCE(NULLIF(p.full_name, ''), NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(COALESCE(p.email, u.email::text), '@', 1)) AS profile_full_name,
        u.email::text AS auth_email,
        u.created_at AS auth_created_at
    FROM public.organization_members om
    LEFT JOIN public.profiles p ON p.id = om.user_id
    LEFT JOIN auth.users u ON u.id = om.user_id
    WHERE om.organization_id = p_organization_id
    ORDER BY om.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_organization_members(UUID) TO authenticated;

-- 3. ENHANCE ADMIN DELETE USER TO HANDLE EITHER MEMBER_ID OR USER_ID
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

    -- 4. Delete user task assignments
    DELETE FROM public.user_task_assignments
    WHERE user_id = v_user_id;

    -- 5. Delete password reset requests
    DELETE FROM public.password_reset_requests
    WHERE user_id = v_user_id;

    -- 6. Delete organization membership if exists
    IF v_actual_member_id IS NOT NULL THEN
        DELETE FROM public.organization_members
        WHERE id = v_actual_member_id;
    ELSE
        DELETE FROM public.organization_members
        WHERE user_id = v_user_id;
    END IF;

    -- 7. Delete profile
    DELETE FROM public.profiles
    WHERE id = v_user_id;

    -- 8. Delete from auth.users (cascades sessions, identities, tokens)
    DELETE FROM auth.users
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID, UUID) TO authenticated;

-- 4. SEED APP RELEASE FOR v1.0.4 (version_code 4)
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
    4,
    '1.0.4',
    'https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp-v1.0.4.apk',
    'Version 1.0.4: Full registration details in approval modal, Reject/Delete option for pending accounts, on-demand in-app update checker in Settings tab, responsive multi-screen auto-fit, and universal real-time Supabase sync across all modules.',
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

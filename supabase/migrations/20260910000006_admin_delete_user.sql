-- ==============================================================================
-- MIGRATION: 20260910000006_admin_delete_user.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Atomic Permanent Deletion of User from Supabase (auth.users, profiles, organization_members)
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
    v_caller_is_admin BOOLEAN;
BEGIN
    -- 1. Verify caller is admin
    v_caller_is_admin := public.is_org_admin(p_organization_id);
    IF NOT v_caller_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only administrators can delete personnel.');
    END IF;

    -- 2. Fetch user_id
    SELECT user_id INTO v_user_id
    FROM public.organization_members
    WHERE id = p_member_id AND organization_id = p_organization_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Personnel record not found in this organization.');
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

    -- 6. Delete organization membership
    DELETE FROM public.organization_members
    WHERE id = p_member_id;

    -- 7. Delete profile
    DELETE FROM public.profiles
    WHERE id = v_user_id;

    -- 8. Delete from auth.users (cascades sessions and identities)
    DELETE FROM auth.users
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID, UUID) TO authenticated;


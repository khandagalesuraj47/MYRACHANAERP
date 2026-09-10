-- ==============================================================================
-- MIGRATION: 20260910000014_assigned_site_and_v108.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE:
--   1. Update get_current_user_context() to resolve and return assignedSite object
--      (id, name, code, location) directly in atomic RPC response
--   2. Seed v1.0.8 release in app_releases
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
    v_site RECORD;
    v_role_code TEXT;
    v_perms JSONB;
    v_tasks JSONB;
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
    SELECT om.id, om.organization_id, om.user_id, om.role, om.is_active,
           om.custom_role_id, om.department_id, om.site_id, om.employee_code, om.phone, om.designation,
           r.code as custom_role_code, r.name as custom_role_name
    INTO v_member
    FROM public.organization_members om
    LEFT JOIN public.roles r ON r.id = om.custom_role_id
    WHERE om.user_id = v_uid
      AND om.is_active = true
    LIMIT 1;

    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'NO_MEMBERSHIP',
            'userId', v_uid,
            'errorMessage', 'Your account is not assigned to an active organization. Please contact your administrator.'
        );
    END IF;

    -- 2.5 Site resolution
    IF v_member.site_id IS NOT NULL THEN
        SELECT id, name, code, location
        INTO v_site
        FROM public.sites
        WHERE id = v_member.site_id;
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

    -- 4. Effective role code
    v_role_code := COALESCE(v_member.custom_role_code, v_member.role);

    -- 5. Effective permissions array
    SELECT COALESCE(jsonb_agg(permission_code), '[]'::jsonb)
    INTO v_perms
    FROM public.get_user_effective_permissions(v_uid, v_member.organization_id);

    -- 6. Assigned task types array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'taskTypeId', tt.id,
        'code', tt.code,
        'name', tt.name,
        'module', tt.module,
        'icon', tt.icon,
        'canInitiate', uta.can_initiate,
        'canExecute', uta.can_execute,
        'canApprove', uta.can_approve
    )), '[]'::jsonb)
    INTO v_tasks
    FROM public.user_task_assignments uta
    JOIN public.task_types tt ON tt.id = uta.task_type_id AND tt.is_active = true
    WHERE uta.user_id = v_uid
      AND uta.organization_id = v_member.organization_id;

    -- Return resolved success payload
    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'userId', v_uid,
        'user_id', v_uid,
        'email', COALESCE(v_profile.email, auth.jwt()->>'email'),
        'role', v_role_code,
        'baseRole', v_member.role,
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
            'role', v_role_code,
            'baseRole', v_member.role,
            'employeeCode', v_member.employee_code,
            'designation', v_member.designation,
            'phone', v_member.phone,
            'departmentId', v_member.department_id,
            'siteId', v_member.site_id,
            'isActive', v_member.is_active,
            'is_active', v_member.is_active
        ),
        'assignedSite', CASE WHEN v_site.id IS NOT NULL THEN jsonb_build_object(
            'id', v_site.id,
            'name', v_site.name,
            'code', v_site.code,
            'location', v_site.location
        ) ELSE NULL END,
        'organization', jsonb_build_object(
            'id', v_org.id,
            'name', v_org.name,
            'slug', v_org.slug,
            'isActive', v_org.is_active,
            'is_active', v_org.is_active
        ),
        'permissions', v_perms,
        'assignedTasks', v_tasks
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_context() TO authenticated;

-- Seed v1.0.8 release in app_releases
INSERT INTO public.app_releases (
    version_code,
    version_name,
    apk_url,
    release_notes,
    is_critical
) VALUES (
    8,
    '1.0.8',
    'https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp-v1.0.8.apk',
    'v1.0.8: Fixed user assigned site display across all devices, clean light theme for admin & user portals, removed redundant welcome overview box, universal responsive mobile fit-to-screen.',
    false
)
ON CONFLICT (version_code) DO UPDATE SET
    version_name = EXCLUDED.version_name,
    apk_url = EXCLUDED.apk_url,
    release_notes = EXCLUDED.release_notes,
    is_critical = EXCLUDED.is_critical;


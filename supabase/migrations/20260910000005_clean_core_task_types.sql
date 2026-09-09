-- ==============================================================================
-- MIGRATION: 20260910000005_clean_core_task_types.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Restrict Task Matrix and TBAC to Strictly 4 Core Tasks:
--          1. Item Master (ITEM_MASTER)
--          2. Asset Master (ASSET_MASTER)
--          3. Vendor Master (VENDOR_MASTER)
--          4. Diesel Requisition (DIESEL_REQUISITION)
--          All assigned tasks grant FULL access (can_initiate, can_execute, can_approve)
-- ==============================================================================

DO $$
DECLARE
    r_org RECORD;
BEGIN
    -- 1. Deactivate all task types that are not the 4 core tasks
    UPDATE public.task_types
    SET is_active = false
    WHERE code NOT IN ('ITEM_MASTER', 'ASSET_MASTER', 'VENDOR_MASTER', 'DIESEL_REQUISITION');

    -- 2. Insert or update the 4 core tasks for each active organization
    FOR r_org IN SELECT id FROM public.organizations WHERE is_active = true LOOP
        -- 2.1 Item Master
        INSERT INTO public.task_types (
            organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active
        )
        VALUES (
            r_org.id, 'ITEM_MASTER', 'Item Master', 'INVENTORY', 'Package',
            'Item and material master directory management', 'MEDIUM', 24, false, true
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET
            name = 'Item Master',
            module = 'INVENTORY',
            icon = 'Package',
            is_active = true;

        -- 2.2 Asset Master
        INSERT INTO public.task_types (
            organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active
        )
        VALUES (
            r_org.id, 'ASSET_MASTER', 'Asset Master', 'FLEET', 'Wrench',
            'Create, configure and manage company & contractor machinery', 'MEDIUM', 24, false, true
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET
            name = 'Asset Master',
            module = 'FLEET',
            icon = 'Wrench',
            is_active = true;

        -- 2.3 Vendor Master
        INSERT INTO public.task_types (
            organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active
        )
        VALUES (
            r_org.id, 'VENDOR_MASTER', 'Vendor Master', 'PROCUREMENT', 'Briefcase',
            'Register and manage purchase vendors and hiring contractors', 'MEDIUM', 24, false, true
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET
            name = 'Vendor Master',
            module = 'PROCUREMENT',
            icon = 'Briefcase',
            is_active = true;

        -- 2.4 Diesel Requisition
        INSERT INTO public.task_types (
            organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active
        )
        VALUES (
            r_org.id, 'DIESEL_REQUISITION', 'Diesel Requisition', 'FUEL', 'Fuel',
            'Request fuel requirement for site operations', 'HIGH', 12, true, true
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET
            name = 'Diesel Requisition',
            module = 'FUEL',
            icon = 'Fuel',
            is_active = true;
    END LOOP;

    -- Clean up task assignments pointing to deactivated tasks
    DELETE FROM public.user_task_assignments
    WHERE task_type_id IN (
        SELECT id FROM public.task_types WHERE is_active = false
    );
END $$;

-- 3. Update approve_registration_request RPC to assign FULL permissions (initiate, execute, approve)
CREATE OR REPLACE FUNCTION public.approve_registration_request(
    p_organization_id UUID,
    p_member_id UUID,
    p_site_id UUID,
    p_role TEXT,
    p_custom_role_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_task_type_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_task_id UUID;
BEGIN
    -- Verify caller is an active ADMIN
    IF NOT public.is_org_admin(p_organization_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only administrators can approve registrations.');
    END IF;

    -- Require explicit site assignment
    IF p_site_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mandatory site assignment required.');
    END IF;

    -- Fetch user_id for this member
    SELECT user_id INTO v_user_id
    FROM public.organization_members
    WHERE id = p_member_id AND organization_id = p_organization_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member record not found in this organization.');
    END IF;

    -- Activate member, set strict site_id and role
    UPDATE public.organization_members
    SET is_active = true,
        site_id = p_site_id,
        role = CASE WHEN p_role = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END,
        custom_role_id = p_custom_role_id,
        department_id = p_department_id,
        updated_at = now()
    WHERE id = p_member_id;

    -- Auto-confirm auth user so login is immediate
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_user_id;

    -- Sync task assignments with FULL access (can_initiate, can_execute, can_approve all true)
    DELETE FROM public.user_task_assignments
    WHERE organization_id = p_organization_id AND user_id = v_user_id;

    IF array_length(p_task_type_ids, 1) > 0 THEN
        FOREACH v_task_id IN ARRAY p_task_type_ids LOOP
            INSERT INTO public.user_task_assignments (
                organization_id,
                user_id,
                task_type_id,
                can_initiate,
                can_execute,
                can_approve,
                assigned_by
            )
            VALUES (
                p_organization_id,
                v_user_id,
                v_task_id,
                true,
                true,
                true,
                auth.uid()
            )
            ON CONFLICT (organization_id, user_id, task_type_id) 
            DO UPDATE SET
                can_initiate = true,
                can_execute = true,
                can_approve = true,
                updated_at = now();
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_registration_request TO authenticated;


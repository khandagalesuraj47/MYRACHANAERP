-- ==============================================================================
-- MIGRATION: 20260910000003_registration_approvals_and_tbac_matrix.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Email Pre-check, Dynamic Task Types, Real-time Task Assignments & Approval Flow
-- ==============================================================================

-- 1. Check if email exists in ERP before forgot-password OTP or registration
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email))
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE lower(email) = lower(trim(p_email))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated, service_role;

-- 2. Seed default operational task types for all active organizations
DO $$
DECLARE
    r_org RECORD;
BEGIN
    FOR r_org IN SELECT id FROM public.organizations WHERE is_active = true LOOP
        -- 2.1 Diesel Requisition
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active)
        VALUES (r_org.id, 'DIESEL_REQUISITION', 'Diesel Requisition Indent', 'FUEL', 'Fuel', 'Request fuel requirement for site operations', 'HIGH', 12, true, true)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- 2.2 Diesel Issue Log
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active)
        VALUES (r_org.id, 'DIESEL_ISSUE', 'Diesel Issue Log', 'FUEL', 'Truck', 'Dispense and log diesel fuel into assets or contractor machines', 'HIGH', 4, false, true)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- 2.3 Asset Master Management
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active)
        VALUES (r_org.id, 'ASSET_MASTER', 'Asset Registration & Fleet Master', 'FLEET', 'Wrench', 'Create, configure and manage company & contractor machinery', 'MEDIUM', 24, false, true)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- 2.4 Vendor Master Management
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active)
        VALUES (r_org.id, 'VENDOR_MASTER', 'Vendor Directory & Contractor Master', 'PROCUREMENT', 'Briefcase', 'Register and manage purchase vendors and hiring contractors', 'MEDIUM', 24, false, true)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- 2.5 Material Issue Slip
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active)
        VALUES (r_org.id, 'MATERIAL_ISSUE', 'Material Issue Slip', 'INVENTORY', 'Package', 'Issue inventory spares, cement, aggregates and consumables', 'MEDIUM', 8, false, true)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- 2.6 Material Receipt (GRN)
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active)
        VALUES (r_org.id, 'MATERIAL_RECEIPT', 'Material Receipt / GRN', 'INVENTORY', 'Boxes', 'Receive incoming deliveries and verify challan receipts', 'HIGH', 12, true, true)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- 2.7 Maintenance & Breakdown Request
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active)
        VALUES (r_org.id, 'MAINTENANCE_REQUEST', 'Equipment Breakdown / Service', 'FLEET', 'Cpu', 'Report machine breakdown, request repair and track spare parts', 'CRITICAL', 4, true, true)
        ON CONFLICT (organization_id, code) DO NOTHING;
    END LOOP;
END $$;

-- 3. Atomic Admin Approval RPC function
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
    -- 3.1 Verify caller is an active ADMIN
    IF NOT public.is_org_admin(p_organization_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only administrators can approve registrations.');
    END IF;

    -- 3.2 Require explicit site assignment
    IF p_site_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mandatory site assignment required.');
    END IF;

    -- 3.3 Fetch user_id for this member
    SELECT user_id INTO v_user_id
    FROM public.organization_members
    WHERE id = p_member_id AND organization_id = p_organization_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member record not found in this organization.');
    END IF;

    -- 3.4 Activate member, set strict site_id and role
    UPDATE public.organization_members
    SET is_active = true,
        site_id = p_site_id,
        role = CASE WHEN p_role = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END,
        custom_role_id = p_custom_role_id,
        department_id = p_department_id,
        updated_at = now()
    WHERE id = p_member_id;

    -- 3.5 Auto-confirm auth user so login is immediate
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_user_id;

    -- 3.6 Sync task assignments
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
                (p_role = 'ADMIN'),
                auth.uid()
            )
            ON CONFLICT (organization_id, user_id, task_type_id) DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_registration_request TO authenticated;

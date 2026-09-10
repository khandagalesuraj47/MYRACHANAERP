-- ==============================================================================
-- MIGRATION: 20260910000012_ensure_task_types_and_tbac.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE:
--   1. Ensure 4 Core Task Types exist for ALL active organizations with valid UUIDs:
--      - ITEM_MASTER
--      - ASSET_MASTER
--      - VENDOR_MASTER
--      - DIESEL_REQUISITION
--   2. Provide bullet-proof RPC toggle_user_task_assignment that handles any
--      input (UUID, code, or legacy 'tt-' prefix) without syntax error.
--   3. Update app_releases to v1.0.5
-- ==============================================================================

-- 1. Ensure table task_types exists and has proper unique constraint
CREATE TABLE IF NOT EXISTS public.task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    default_priority TEXT DEFAULT 'MEDIUM',
    sla_hours INTEGER DEFAULT 24,
    requires_approval BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure unique constraint on (organization_id, code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unq_task_types_org_code'
    ) THEN
        ALTER TABLE public.task_types
        ADD CONSTRAINT unq_task_types_org_code UNIQUE (organization_id, code);
    END IF;
END $$;

ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Members can view task_types" ON public.task_types;
    CREATE POLICY "Members can view task_types"
    ON public.task_types FOR SELECT TO authenticated
    USING (true);

    DROP POLICY IF EXISTS "Admins can manage task_types" ON public.task_types;
    CREATE POLICY "Admins can manage task_types"
    ON public.task_types FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.user_id = auth.uid()
              AND organization_members.role = 'ADMIN'
              AND organization_members.is_active = true
        )
    );
END $$;

-- 2. Populate / Ensure the 4 Core Tasks for EVERY active organization
DO $$
DECLARE
    r_org RECORD;
BEGIN
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
END $$;

-- 3. BULLET-PROOF RPC: toggle_user_task_assignment
-- Accepts UUID string, direct code (e.g. 'DIESEL_REQUISITION'), or 'tt-' prefix without syntax errors
CREATE OR REPLACE FUNCTION public.toggle_user_task_assignment(
    p_organization_id UUID,
    p_user_id UUID,
    p_task_identifier TEXT,
    p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_task_type_id UUID;
    v_caller_is_admin BOOLEAN;
    v_clean_identifier TEXT;
    v_code TEXT;
BEGIN
    -- 1. Caller admin check
    v_caller_is_admin := public.is_org_admin(p_organization_id);
    IF NOT v_caller_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only administrators can manage task assignments.');
    END IF;

    v_clean_identifier := trim(p_task_identifier);

    -- 2. Normalize code if legacy prefix or direct code passed
    IF v_clean_identifier ILIKE 'tt-diesel%' OR v_clean_identifier ILIKE '%DIESEL%' THEN
        v_code := 'DIESEL_REQUISITION';
    ELSIF v_clean_identifier ILIKE 'tt-item%' OR v_clean_identifier ILIKE '%ITEM%' THEN
        v_code := 'ITEM_MASTER';
    ELSIF v_clean_identifier ILIKE 'tt-asset%' OR v_clean_identifier ILIKE '%ASSET%' THEN
        v_code := 'ASSET_MASTER';
    ELSIF v_clean_identifier ILIKE 'tt-vendor%' OR v_clean_identifier ILIKE '%VENDOR%' THEN
        v_code := 'VENDOR_MASTER';
    END IF;

    -- 3. Check if clean identifier is a valid UUID format
    IF v_clean_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id INTO v_task_type_id
        FROM public.task_types
        WHERE id = v_clean_identifier::UUID;
    END IF;

    -- 4. If not found by UUID, find by normalized code
    IF v_task_type_id IS NULL AND v_code IS NOT NULL THEN
        SELECT id INTO v_task_type_id
        FROM public.task_types
        WHERE organization_id = p_organization_id AND code = v_code;
    END IF;

    -- 5. If still not found, create task_type dynamically
    IF v_task_type_id IS NULL AND v_code IS NOT NULL THEN
        INSERT INTO public.task_types (
            organization_id, code, name, module, icon, description, default_priority, sla_hours, requires_approval, is_active
        )
        VALUES (
            p_organization_id,
            v_code,
            CASE v_code
                WHEN 'ITEM_MASTER' THEN 'Item Master'
                WHEN 'ASSET_MASTER' THEN 'Asset Master'
                WHEN 'VENDOR_MASTER' THEN 'Vendor Master'
                WHEN 'DIESEL_REQUISITION' THEN 'Diesel Requisition'
                ELSE 'Operational Task'
            END,
            CASE v_code
                WHEN 'ITEM_MASTER' THEN 'INVENTORY'
                WHEN 'ASSET_MASTER' THEN 'FLEET'
                WHEN 'VENDOR_MASTER' THEN 'PROCUREMENT'
                WHEN 'DIESEL_REQUISITION' THEN 'FUEL'
                ELSE 'OPERATIONS'
            END,
            CASE v_code
                WHEN 'ITEM_MASTER' THEN 'Package'
                WHEN 'ASSET_MASTER' THEN 'Wrench'
                WHEN 'VENDOR_MASTER' THEN 'Briefcase'
                WHEN 'DIESEL_REQUISITION' THEN 'Fuel'
                ELSE 'Layers'
            END,
            'Operational module',
            'MEDIUM',
            24,
            false,
            true
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET is_active = true
        RETURNING id INTO v_task_type_id;
    END IF;

    IF v_task_type_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unable to resolve task type: ' || p_task_identifier);
    END IF;

    -- 6. Perform Grant or Revoke
    IF p_enabled THEN
        INSERT INTO public.user_task_assignments (
            organization_id,
            user_id,
            task_type_id,
            can_initiate,
            can_execute,
            can_approve
        )
        VALUES (
            p_organization_id,
            p_user_id,
            v_task_type_id,
            true,
            true,
            true
        )
        ON CONFLICT (organization_id, user_id, task_type_id) DO UPDATE SET
            can_initiate = true,
            can_execute = true,
            can_approve = true;
    ELSE
        DELETE FROM public.user_task_assignments
        WHERE organization_id = p_organization_id
          AND user_id = p_user_id
          AND task_type_id = v_task_type_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'task_type_id', v_task_type_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_user_task_assignment(UUID, UUID, TEXT, BOOLEAN) TO authenticated;

-- 4. Seed v1.0.6 Release in app_releases
INSERT INTO public.app_releases (
    version_code,
    version_name,
    apk_url,
    release_notes,
    is_critical,
    published_at
)
VALUES (
    6,
    '1.0.6',
    'https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp-v1.0.6.apk',
    'Version 1.0.6: Resilient TBAC task matrix assignment, active-only personnel filtering, user-wise personalized operational dashboard with live site metrics and diesel modules.',
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

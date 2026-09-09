-- ==============================================================================
-- MIGRATION: 20260909000004_enterprise_complete_schema.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: All Enterprise ERP Phases (Forms, Workflows, Fuel, Fleet, Materials, PO, Audit)
-- SAFETY: 100% Additive, non-destructive, strictly tenant-isolated via RLS
-- ==============================================================================

-- 1. DYNAMIC FORM BUILDER & SUBMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL DEFAULT 'OPERATIONS',
    status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    current_version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_form_org_code UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_forms_org ON public.forms(organization_id);

CREATE TABLE IF NOT EXISTS public.form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    field_code TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('TEXT', 'NUMBER', 'DECIMAL', 'DATE', 'SELECT', 'BOOLEAN', 'TEXTAREA')),
    is_required BOOLEAN NOT NULL DEFAULT false,
    default_value TEXT,
    placeholder TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    options JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_form_field_code UNIQUE (form_id, field_code)
);
CREATE INDEX IF NOT EXISTS idx_form_fields_form ON public.form_fields(form_id);

CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_submissions_org ON public.form_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON public.form_submissions(form_id);

-- 2. WORKFLOW & APPROVAL ENGINE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_workflow_org_code UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflow_definitions(organization_id);

CREATE TABLE IF NOT EXISTS public.workflow_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
    stage_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    approver_role TEXT NOT NULL DEFAULT 'ADMIN',
    min_amount NUMERIC(15, 2) DEFAULT 0,
    max_amount NUMERIC(15, 2),
    sla_hours INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_wf ON public.workflow_stages(workflow_id);

CREATE TABLE IF NOT EXISTS public.approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('SUBMIT', 'APPROVE', 'REJECT', 'RETURN')),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approval_actions_org ON public.approval_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_entity ON public.approval_actions(entity_type, entity_id);

-- 3. HEAVY CIVIL OPERATIONAL MASTER DATA & ACTIVITY TABLES
-- ------------------------------------------------------------------------------

-- 3.1 Fuel & Diesel Management (Issue Logs & Receipts)
CREATE TABLE IF NOT EXISTS public.diesel_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ISSUE', 'RECEIPT', 'TRANSFER')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    slip_number TEXT NOT NULL,
    machine_asset_id TEXT,
    vehicle_number TEXT,
    liters NUMERIC(10, 2) NOT NULL CHECK (liters > 0),
    rate_per_liter NUMERIC(10, 2),
    total_amount NUMERIC(12, 2),
    current_meter_reading NUMERIC(12, 2),
    issued_to TEXT,
    issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    site_location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_diesel_org_slip UNIQUE (organization_id, slip_number)
);
CREATE INDEX IF NOT EXISTS idx_diesel_org ON public.diesel_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_diesel_date ON public.diesel_transactions(transaction_date);

-- 3.2 Heavy Machinery & Fleet Assets
CREATE TABLE IF NOT EXISTS public.machinery_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    asset_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('EXCAVATOR', 'DUMPER', 'TRANSIT_MIXER', 'BATCHING_PLANT', 'ROLLER', 'CRANE', 'GENERATOR', 'OTHER')),
    registration_number TEXT,
    model TEXT,
    status TEXT NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'UNDER_MAINTENANCE', 'BREAKDOWN', 'IDLE')),
    cumulative_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    current_site TEXT,
    operator_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_machinery_org_code UNIQUE (organization_id, asset_code)
);
CREATE INDEX IF NOT EXISTS idx_machinery_org ON public.machinery_assets(organization_id);

-- 3.3 Inventory & Materials Management
CREATE TABLE IF NOT EXISTS public.material_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('CEMENT', 'STEEL', 'AGGREGATE', 'SAND', 'FUEL', 'SPARES', 'CHEMICAL', 'OTHER')),
    unit_of_measure TEXT NOT NULL,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_material_org_code UNIQUE (organization_id, item_code)
);
CREATE INDEX IF NOT EXISTS idx_material_org ON public.material_items(organization_id);

CREATE TABLE IF NOT EXISTS public.material_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    material_item_id UUID NOT NULL REFERENCES public.material_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INWARD_GRN', 'OUTWARD_ISSUE', 'RETURN')),
    reference_number TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    site_location TEXT,
    vendor_supplier TEXT,
    issued_to TEXT,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mat_trans_org ON public.material_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_mat_trans_item ON public.material_transactions(material_item_id);

-- 3.4 Procurement & Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED')),
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expected_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_po_org_num UNIQUE (organization_id, po_number)
);
CREATE INDEX IF NOT EXISTS idx_po_org ON public.purchase_orders(organization_id);

-- 3.5 Immutable Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diesel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Forms RLS
CREATE POLICY "forms_tenant_all" ON public.forms
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Form Fields RLS
CREATE POLICY "form_fields_tenant_all" ON public.form_fields
    FOR ALL TO authenticated
    USING (form_id IN (SELECT id FROM public.forms WHERE organization_id IN (SELECT public.get_user_org_ids())))
    WITH CHECK (form_id IN (SELECT id FROM public.forms WHERE organization_id IN (SELECT public.get_user_org_ids())));

-- Form Submissions RLS
CREATE POLICY "form_subs_tenant_all" ON public.form_submissions
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Workflows RLS
CREATE POLICY "wf_defs_tenant_all" ON public.workflow_definitions
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "wf_stages_tenant_all" ON public.workflow_stages
    FOR ALL TO authenticated
    USING (workflow_id IN (SELECT id FROM public.workflow_definitions WHERE organization_id IN (SELECT public.get_user_org_ids())))
    WITH CHECK (workflow_id IN (SELECT id FROM public.workflow_definitions WHERE organization_id IN (SELECT public.get_user_org_ids())));

CREATE POLICY "approval_actions_tenant_all" ON public.approval_actions
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Diesel Transactions RLS
CREATE POLICY "diesel_tenant_all" ON public.diesel_transactions
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Machinery Assets RLS
CREATE POLICY "machinery_tenant_all" ON public.machinery_assets
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Material Items RLS
CREATE POLICY "material_items_tenant_all" ON public.material_items
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "material_trans_tenant_all" ON public.material_transactions
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Purchase Orders RLS
CREATE POLICY "po_tenant_all" ON public.purchase_orders
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Audit Logs RLS (Read by tenant members, append-only insert)
CREATE POLICY "audit_select_tenant" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "audit_insert_tenant" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- 5. REALTIME REPLICATION ENABLEMENT
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.forms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.diesel_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machinery_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;


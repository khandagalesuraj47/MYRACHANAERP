-- ==============================================================================
-- MIGRATION 20260909000006: Diesel Requisitions Workflow & Party Master
-- ==============================================================================

-- 1. Diesel Parties (Petrol Pumps, Fuel Vendors, Depots)
CREATE TABLE IF NOT EXISTS public.diesel_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    gst_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_diesel_party_org_name UNIQUE (organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_diesel_parties_org ON public.diesel_parties(organization_id);

-- 2. Diesel Purchase Requisitions
CREATE TABLE IF NOT EXISTS public.diesel_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    requisition_no TEXT NOT NULL,
    requisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
    bowser_vehicle_no TEXT NOT NULL DEFAULT 'Bowser (2300 Ltr)',
    bowser_capacity_liters NUMERIC(12, 2) NOT NULL DEFAULT 2300.00,
    requested_liters NUMERIC(12, 2) NOT NULL,
    previous_consumption_notes TEXT,
    attachment_urls TEXT[] DEFAULT '{}'::TEXT[],
    party_id UUID REFERENCES public.diesel_parties(id) ON DELETE SET NULL,
    party_name TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('DRAFT', 'PENDING_VERIFICATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    stage INTEGER NOT NULL DEFAULT 1,
    -- Audit & Authorization Trail
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_by_name TEXT,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_diesel_req_org_no UNIQUE (organization_id, requisition_no)
);
CREATE INDEX IF NOT EXISTS idx_diesel_req_org ON public.diesel_requisitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_diesel_req_status ON public.diesel_requisitions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_diesel_req_site ON public.diesel_requisitions(site_id);

-- 3. Row Level Security Policies
ALTER TABLE public.diesel_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diesel_requisitions ENABLE ROW LEVEL SECURITY;

-- 3.1 Diesel Parties Policies
DROP POLICY IF EXISTS "Members can view diesel parties" ON public.diesel_parties;
CREATE POLICY "Members can view diesel parties"
    ON public.diesel_parties FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Members can manage diesel parties" ON public.diesel_parties;
CREATE POLICY "Members can manage diesel parties"
    ON public.diesel_parties FOR ALL TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 3.2 Diesel Requisitions Policies
DROP POLICY IF EXISTS "Members can view diesel requisitions" ON public.diesel_requisitions;
CREATE POLICY "Members can view diesel requisitions"
    ON public.diesel_requisitions FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Members can insert diesel requisitions" ON public.diesel_requisitions;
CREATE POLICY "Members can insert diesel requisitions"
    ON public.diesel_requisitions FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Members can update diesel requisitions" ON public.diesel_requisitions;
CREATE POLICY "Members can update diesel requisitions"
    ON public.diesel_requisitions FOR UPDATE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Members can delete diesel requisitions" ON public.diesel_requisitions;
CREATE POLICY "Members can delete diesel requisitions"
    ON public.diesel_requisitions FOR DELETE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );


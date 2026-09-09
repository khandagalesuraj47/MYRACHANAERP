-- ==========================================================
-- MIGRATION: Asset Master & Vendor Master (Mechanical ERP)
-- Organization: Rachana Construction Limited (VTR Site)
-- Description:
-- 1. Vendors table (Purchase Vendors & Contractor Vendors)
--    with optional GST, PAN, TDS, Security Deposit, Bank, Documents.
-- 2. Enhance machinery_assets table with ownership, contractor linkage,
--    fuel modes, meter types, strict vehicle number uniqueness, active/inactive.
-- 3. Row Level Security (RLS) policies allowing CRUD.
-- ==========================================================

-- 1. VENDORS TABLE
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vendor_code TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_type TEXT NOT NULL CHECK (vendor_type IN ('PURCHASE_VENDOR', 'CONTRACTOR_VENDOR')),
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT DEFAULT 'Maharashtra',
    
    -- Contractor Financial & Legal Terms (Important but OPTIONAL / Not mandatory)
    gst_number TEXT,
    pan_number TEXT,
    aadhaar_number TEXT,
    tds_percentage NUMERIC(5, 2) DEFAULT 0.00,
    security_deposit_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_terms TEXT DEFAULT '30 Days',
    
    -- Bank Account Details (Optional)
    bank_name TEXT,
    account_holder_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    branch_name TEXT,
    
    -- Uploaded Documents (Aadhaar, PAN, GST, Cheque, Contract)
    documents JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_vendor_code_org UNIQUE (organization_id, vendor_code)
);

-- Unique index to prevent duplicate vendor names in the same organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_name_unique 
ON public.vendors (organization_id, lower(trim(vendor_name)));

CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON public.vendors(organization_id, vendor_type);

-- 2. ENHANCE MACHINERY_ASSETS TABLE
-- Add columns if not already present
DO $$ 
BEGIN
    -- Ownership type: COMPANY_OWNED vs CONTRACTOR_RENTAL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'ownership_type') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN ownership_type TEXT NOT NULL DEFAULT 'COMPANY_OWNED' CHECK (ownership_type IN ('COMPANY_OWNED', 'CONTRACTOR_RENTAL'));
    END IF;

    -- Contractor / Vendor Linkage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'vendor_id') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
    END IF;

    -- Asset Category (Expanded construction fleet)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'asset_category') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN asset_category TEXT NOT NULL DEFAULT 'EXCAVATOR';
    END IF;

    -- Vehicle / Equipment Registration Number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'vehicle_number') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN vehicle_number TEXT;
    END IF;

    -- Make & Model
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'make') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN make TEXT;
    END IF;

    -- Chassis & Engine Numbers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'chassis_number') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN chassis_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'engine_number') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN engine_number TEXT;
    END IF;

    -- Year of Manufacture
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'year_of_manufacture') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN year_of_manufacture INT;
    END IF;

    -- Meter Reading Type: HOURS vs KILOMETERS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'meter_type') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN meter_type TEXT NOT NULL DEFAULT 'HOURS' CHECK (meter_type IN ('HOURS', 'KILOMETERS'));
    END IF;

    -- Current Meter Reading
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'current_meter_reading') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN current_meter_reading NUMERIC(12, 2) DEFAULT 0.00;
    END IF;

    -- Fuel Tank Capacity in Liters
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'fuel_tank_capacity') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN fuel_tank_capacity NUMERIC(10, 2) DEFAULT 0.00;
    END IF;

    -- Fuel Issue Mode: COMPANY_SUPPLIED vs DEBIT_TO_CONTRACTOR
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'fuel_issue_mode') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN fuel_issue_mode TEXT NOT NULL DEFAULT 'COMPANY_SUPPLIED' CHECK (fuel_issue_mode IN ('COMPANY_SUPPLIED', 'DEBIT_TO_CONTRACTOR', 'NOT_APPLICABLE'));
    END IF;

    -- Assigned Site Name (e.g. VTR Site)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'assigned_site_name') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN assigned_site_name TEXT DEFAULT 'VTR Site';
    END IF;

    -- Attached Documents (RC, Insurance, Fitness, PUC, Photo)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'document_urls') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN document_urls JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Drop obsolete category check constraint if exists, and recreate flexible check
DO $$
BEGIN
    ALTER TABLE public.machinery_assets DROP CONSTRAINT IF EXISTS machinery_assets_category_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Drop status constraint if exists to allow ACTIVE / INACTIVE / UNDER_MAINTENANCE / BREAKDOWN
DO $$
BEGIN
    ALTER TABLE public.machinery_assets DROP CONSTRAINT IF EXISTS machinery_assets_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Strict duplicate prevention: Unique Index on vehicle_number per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_machinery_vehicle_no_unique 
ON public.machinery_assets (organization_id, lower(trim(vehicle_number))) 
WHERE vehicle_number IS NOT NULL AND trim(vehicle_number) <> '';

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Vendors
DROP POLICY IF EXISTS "vendors_org_all" ON public.vendors;
CREATE POLICY "vendors_org_all" ON public.vendors
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- RLS Policies for Machinery Assets
DROP POLICY IF EXISTS "machinery_assets_org_all" ON public.machinery_assets;
CREATE POLICY "machinery_assets_org_all" ON public.machinery_assets
    FOR ALL
    USING (true)
    WITH CHECK (true);


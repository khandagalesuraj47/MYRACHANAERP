-- ==========================================================
-- MIGRATION: Dynamic Asset Categories & Dual Engine Machinery
-- Organization: Rachana Construction Limited (VTR Site)
-- Description:
-- 1. Create public.asset_categories table for on-the-fly category additions.
-- 2. Enhance public.machinery_assets with dual engine and fuel consumption benchmarks.
-- 3. Row Level Security (RLS) policies allowing CRUD.
-- ==========================================================

-- 1. ASSET CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    default_meter_type TEXT NOT NULL DEFAULT 'HOURS' CHECK (default_meter_type IN ('HOURS', 'KILOMETERS')),
    is_dual_engine_default BOOLEAN DEFAULT false,
    default_standard_average NUMERIC(8, 2) DEFAULT 0.00,
    default_average_unit TEXT DEFAULT 'KM_PER_LITER',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_asset_cat_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_asset_cat_org ON public.asset_categories(organization_id);

-- 2. ENHANCE MACHINERY_ASSETS WITH DUAL ENGINE & CONSUMPTION BENCHMARKS
DO $$
BEGIN
    -- Standard Fuel Average Benchmark
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'standard_average') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN standard_average NUMERIC(8, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'standard_average_unit') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN standard_average_unit TEXT DEFAULT 'KM_PER_LITER';
    END IF;

    -- Dual Engine Support (e.g. Transit Mixer TM)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'has_dual_engine') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN has_dual_engine BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'secondary_engine_name') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN secondary_engine_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'secondary_engine_number') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN secondary_engine_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'secondary_meter_type') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN secondary_meter_type TEXT DEFAULT 'HOURS' CHECK (secondary_meter_type IN ('HOURS', 'KILOMETERS'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'secondary_meter_reading') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN secondary_meter_reading NUMERIC(10, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machinery_assets' AND column_name = 'secondary_standard_average') THEN
        ALTER TABLE public.machinery_assets ADD COLUMN secondary_standard_average NUMERIC(8, 2) DEFAULT 0.00;
    END IF;
END $$;

-- Enable RLS on asset_categories
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asset_categories_org_all" ON public.asset_categories;
CREATE POLICY "asset_categories_org_all" ON public.asset_categories
    FOR ALL
    USING (true)
    WITH CHECK (true);


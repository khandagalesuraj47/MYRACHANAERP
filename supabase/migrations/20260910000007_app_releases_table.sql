-- ==============================================================================
-- MIGRATION: 20260910000007_app_releases_table.sql
-- PURPOSE: In-App Version Tracking & Android APK Update Management
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code INT NOT NULL UNIQUE,
    version_name TEXT NOT NULL,
    apk_url TEXT NOT NULL,
    release_notes TEXT,
    is_critical BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Allow public read access (authenticated or unauthenticated) so apps can check for updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'app_releases' AND policyname = 'Public read app releases'
    ) THEN
        CREATE POLICY "Public read app releases" ON public.app_releases
        FOR SELECT
        USING (true);
    END IF;
END $$;

-- Allow authenticated users to insert/update if admin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'app_releases' AND policyname = 'Admin manage app releases'
    ) THEN
        CREATE POLICY "Admin manage app releases" ON public.app_releases
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Insert or update latest release info
INSERT INTO public.app_releases (version_code, version_name, apk_url, release_notes, is_critical)
VALUES (
    2,
    '1.0.2',
    'https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp.apk',
    'Version 1.0.2: Includes Personnel Deactivation & Permanent Supabase Deletion, Admin Helpline 7770002696 smooth reveal for Temporary Password Requests, Mobile Login Hero Banner, and Enterprise TBAC single-site synchronization.',
    false
)
ON CONFLICT (version_code) DO UPDATE 
SET 
    version_name = EXCLUDED.version_name,
    apk_url = EXCLUDED.apk_url,
    release_notes = EXCLUDED.release_notes,
    published_at = timezone('utc'::text, now());


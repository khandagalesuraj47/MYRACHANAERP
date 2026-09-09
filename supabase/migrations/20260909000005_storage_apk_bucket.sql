-- ==============================================================================
-- MIGRATION: 20260909000005_storage_apk_bucket.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Supabase Storage Bucket for Android APK Releases
-- ==============================================================================

-- 1. Create public bucket for APK releases
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'apk-releases',
    'apk-releases',
    true,
    52428800, -- 50 MB
    ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Public Read Access (Anyone can download the APK)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public APK Download'
    ) THEN
        CREATE POLICY "Public APK Download" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'apk-releases');
    END IF;
END $$;

-- 3. Allow authenticated or authorized upload to apk-releases
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Upload to apk-releases'
    ) THEN
        CREATE POLICY "Allow Upload to apk-releases" ON storage.objects
        FOR INSERT TO public
        WITH CHECK (bucket_id = 'apk-releases');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Update to apk-releases'
    ) THEN
        CREATE POLICY "Allow Update to apk-releases" ON storage.objects
        FOR UPDATE TO public
        USING (bucket_id = 'apk-releases');
    END IF;
END $$;


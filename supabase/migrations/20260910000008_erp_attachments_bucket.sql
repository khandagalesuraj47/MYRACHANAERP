-- ==============================================================================
-- MIGRATION: 20260910000008_erp_attachments_bucket.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Supabase Storage Bucket for All ERP Attachments (Photos, PDFs, Docs)
-- ==============================================================================

-- 1. Create dedicated public bucket for all ERP attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'erp-attachments',
    'erp-attachments',
    true,
    26214400, -- 25 MB
    NULL      -- Allow all MIME types (PDF, PNG, JPG, WEBP, XLS, etc.)
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = NULL;

-- Also remove MIME restrictions on apk-releases so it can accept files without error
UPDATE storage.buckets
SET allowed_mime_types = NULL, public = true
WHERE id = 'apk-releases';

-- 2. Public Read Access on erp-attachments (Anyone can view/download uploaded documents)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read erp-attachments'
    ) THEN
        CREATE POLICY "Public Read erp-attachments" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'erp-attachments');
    END IF;
END $$;

-- 3. Public / Authenticated Insert Access on erp-attachments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Upload to erp-attachments'
    ) THEN
        CREATE POLICY "Allow Upload to erp-attachments" ON storage.objects
        FOR INSERT TO public
        WITH CHECK (bucket_id = 'erp-attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Update to erp-attachments'
    ) THEN
        CREATE POLICY "Allow Update to erp-attachments" ON storage.objects
        FOR UPDATE TO public
        USING (bucket_id = 'erp-attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Delete to erp-attachments'
    ) THEN
        CREATE POLICY "Allow Delete to erp-attachments" ON storage.objects
        FOR DELETE TO public
        USING (bucket_id = 'erp-attachments');
    END IF;
END $$;


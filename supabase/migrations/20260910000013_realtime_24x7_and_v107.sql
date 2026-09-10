-- ==============================================================================
-- MIGRATION: 20260910000013_realtime_24x7_and_v107.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE:
--   1. Enable 24x7 Zero-Refresh Live Replication for ALL operational tables
--      in postgres publication 'supabase_realtime' with REPLICA IDENTITY FULL
--   2. Ensure changes stream instantly across Admin and User devices without refresh
--   3. Seed v1.0.7 release in app_releases
-- ==============================================================================

-- 1. SET REPLICA IDENTITY FULL (Ensures complete row data is transmitted on updates/deletes)
ALTER TABLE IF EXISTS public.organization_members REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.user_task_assignments REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.diesel_requisitions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.task_types REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.sites REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.projects REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.profiles REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.password_reset_requests REPLICA IDENTITY FULL;

-- 2. ADD ALL OPERATIONAL TABLES TO supabase_realtime PUBLICATION
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- organization_members
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'organization_members'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
        END IF;

        -- user_task_assignments
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_task_assignments'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.user_task_assignments;
        END IF;

        -- diesel_requisitions
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'diesel_requisitions'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.diesel_requisitions;
        END IF;

        -- task_types
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_types'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.task_types;
        END IF;

        -- sites
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sites'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.sites;
        END IF;

        -- projects
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
        END IF;

        -- profiles
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        END IF;

        -- password_reset_requests
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'password_reset_requests'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;
        END IF;
    END IF;
END $$;

-- 3. SEED v1.0.7 RELEASE IN APP_RELEASES
INSERT INTO public.app_releases (
    version_code,
    version_name,
    apk_url,
    release_notes,
    is_critical,
    published_at
)
VALUES (
    7,
    '1.0.7',
    'https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp-v1.0.7.apk',
    'Version 1.0.7: Enterprise 24x7 zero-refresh realtime sync, MyJio-inspired UI/UX presentation, personalized user operational dashboards, and dark slate theme unification.',
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


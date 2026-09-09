-- ==============================================================================
-- MIGRATION: 20260910000002_admin_create_user_and_auto_confirm.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Secure Admin User Creation with Pre-Confirmed Emails & Site-Binding Lock
-- ==============================================================================

-- 1. Ensure pgcrypto extension exists for Blowfish password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. One-time fix: Confirm all existing users in auth.users so "Email not confirmed" is resolved
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- 3. Auto-confirmation helper function (safely callable if login encounters unconfirmed state)
CREATE OR REPLACE FUNCTION public.confirm_user_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE lower(email) = lower(trim(p_email));
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO anon, authenticated, service_role;

-- 4. Secure Admin Create User RPC
-- Runs with SECURITY DEFINER privileges. Strictly verifies the calling user is an ADMIN.
-- Immediately marks email_confirmed_at = now() so users can log in instantly without email confirmation roadblock.
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_organization_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'USER',
    p_custom_role_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_site_id UUID DEFAULT NULL,
    p_designation TEXT DEFAULT NULL,
    p_employee_code TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_caller_is_admin BOOLEAN;
BEGIN
    -- 4.1 Strict Security Check: Verify caller is an active ADMIN in this organization
    v_caller_is_admin := public.is_org_admin(p_organization_id);
    IF NOT v_caller_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Only system administrators of this organization can create users.'
        );
    END IF;

    -- 4.2 Hash password securely using Blowfish crypt
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 4.3 Check if user already exists in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email));

    IF v_user_id IS NOT NULL THEN
        -- User exists: update password, ensure confirmed, update metadata
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('full_name', p_full_name),
            updated_at = now()
        WHERE id = v_user_id;
    ELSE
        -- Insert new auth user with auto-confirmed email
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000'::UUID,
            v_user_id,
            'authenticated',
            'authenticated',
            lower(trim(p_email)),
            v_encrypted_pw,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', p_full_name),
            now(),
            now()
        );
    END IF;

    -- 4.4 Upsert public.profiles
    INSERT INTO public.profiles (id, email, full_name, is_active, updated_at)
    VALUES (v_user_id, lower(trim(p_email)), p_full_name, true, now())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        is_active = true,
        updated_at = now();

    -- 4.5 Upsert public.organization_members with strict site_id binding
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        role,
        custom_role_id,
        department_id,
        site_id,
        designation,
        employee_code,
        phone,
        is_active,
        updated_at
    )
    VALUES (
        p_organization_id,
        v_user_id,
        CASE WHEN p_role = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END,
        p_custom_role_id,
        p_department_id,
        p_site_id,
        p_designation,
        p_employee_code,
        p_phone,
        true,
        now()
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        custom_role_id = EXCLUDED.custom_role_id,
        department_id = EXCLUDED.department_id,
        site_id = EXCLUDED.site_id,
        designation = EXCLUDED.designation,
        employee_code = EXCLUDED.employee_code,
        phone = EXCLUDED.phone,
        is_active = true,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', lower(trim(p_email))
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;

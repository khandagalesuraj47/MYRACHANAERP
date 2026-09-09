-- ==============================================================================
-- MIGRATION: 20260910000004_temp_password_workflow.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Request Temporary Password Flow via Admin (Helpline: 7770002696)
--          and Mandatory First-Login Password Change
-- ==============================================================================

-- 1. Add must_change_password column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN must_change_password BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Create password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED', 'REJECTED')),
    temp_password TEXT,
    admin_notes TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fulfilled_at TIMESTAMPTZ,
    fulfilled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_req_status ON public.password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_pw_reset_req_email ON public.password_reset_requests(lower(email));
CREATE INDEX IF NOT EXISTS idx_pw_reset_req_org ON public.password_reset_requests(organization_id);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Allow public to request password reset
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public to request password reset" ON public.password_reset_requests;
    CREATE POLICY "Allow public to request password reset"
    ON public.password_reset_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
END $$;

-- Allow org admins to view and manage password reset requests
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow org admins to manage password reset requests" ON public.password_reset_requests;
    CREATE POLICY "Allow org admins to manage password reset requests"
    ON public.password_reset_requests
    FOR ALL
    TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));
END $$;

-- 3. RPC: Request Temporary Password (called by user on Forgot Password screen)
CREATE OR REPLACE FUNCTION public.request_temp_password(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_request_id UUID;
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(p_email));

    -- Check if user exists in auth.users or profiles
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = v_clean_email;

    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id
        FROM public.profiles
        WHERE lower(email) = v_clean_email;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This email is not registered in MY RACHANA ERP.'
        );
    END IF;

    -- Find organization
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = v_user_id
    LIMIT 1;

    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM public.organizations WHERE is_active = true LIMIT 1;
    END IF;

    -- Insert or update pending request
    INSERT INTO public.password_reset_requests (
        organization_id,
        user_id,
        email,
        status,
        requested_at,
        updated_at
    )
    VALUES (
        v_org_id,
        v_user_id,
        v_clean_email,
        'PENDING',
        now(),
        now()
    )
    RETURNING id INTO v_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'admin_phone', '7770002696',
        'message', 'Temporary password request submitted to Administrator.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_temp_password(TEXT) TO anon, authenticated, service_role;

-- 4. RPC: Admin Issue Temporary Password
CREATE OR REPLACE FUNCTION public.admin_issue_temp_password(
    p_request_id UUID,
    p_temp_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_req RECORD;
    v_encrypted_pw TEXT;
    v_caller_is_admin BOOLEAN;
BEGIN
    SELECT * INTO v_req
    FROM public.password_reset_requests
    WHERE id = p_request_id;

    IF v_req.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password reset request not found.');
    END IF;

    -- Verify caller is admin
    v_caller_is_admin := public.is_org_admin(v_req.organization_id);
    IF NOT v_caller_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required.');
    END IF;

    IF length(trim(p_temp_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Temporary password must be at least 6 characters.');
    END IF;

    -- Hash password using crypt Blowfish
    v_encrypted_pw := crypt(trim(p_temp_password), gen_salt('bf'));

    -- Update auth.users password
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Flag profile that password change is mandatory upon login
    UPDATE public.profiles
    SET must_change_password = true,
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Update request status
    UPDATE public.password_reset_requests
    SET status = 'FULFILLED',
        temp_password = trim(p_temp_password),
        fulfilled_at = now(),
        fulfilled_by = auth.uid(),
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'email', v_req.email,
        'temp_password', trim(p_temp_password)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_issue_temp_password(UUID, TEXT) TO authenticated;

-- 5. RPC: Direct Admin Password Reset (allows admin to directly issue temp password for any user)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_user_id UUID,
    p_temp_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_org_id UUID;
    v_caller_is_admin BOOLEAN;
    v_encrypted_pw TEXT;
    v_email TEXT;
BEGIN
    -- Verify target user
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = p_user_id;

    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM public.profiles
        WHERE id = p_user_id;
    END IF;

    IF v_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user does not exist.');
    END IF;

    -- Find organization
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
        v_caller_is_admin := public.is_org_admin(v_org_id);
        IF NOT v_caller_is_admin THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required.');
        END IF;
    END IF;

    IF length(trim(p_temp_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Temporary password must be at least 6 characters.');
    END IF;

    -- Hash password using crypt Blowfish
    v_encrypted_pw := crypt(trim(p_temp_password), gen_salt('bf'));

    -- Update auth.users password
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = p_user_id;

    -- Flag profile that password change is mandatory upon login
    UPDATE public.profiles
    SET must_change_password = true,
        updated_at = now()
    WHERE id = p_user_id;

    -- Fulfill any existing pending password reset requests for this user
    UPDATE public.password_reset_requests
    SET status = 'FULFILLED',
        temp_password = trim(p_temp_password),
        fulfilled_at = now(),
        fulfilled_by = auth.uid(),
        updated_at = now()
    WHERE (user_id = p_user_id OR lower(email) = lower(v_email)) AND status = 'PENDING';

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'email', v_email,
        'temp_password', trim(p_temp_password)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;

-- 6. RPC: Complete Mandatory Password Change (called after user sets new permanent password)
CREATE OR REPLACE FUNCTION public.complete_mandatory_password_change()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE public.profiles
    SET must_change_password = false,
        updated_at = now()
    WHERE id = auth.uid();
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_mandatory_password_change() TO authenticated;


-- ==============================================================================
-- MIGRATION: 20260909000003_rbac_and_hierarchy.sql
-- ERP PLATFORM: MY RACHANA ERP
-- PURPOSE: Organizational Hierarchy, Extensible RBAC, and Task-Based Access Control
-- SAFETY: 100% Additive, non-destructive, strictly tenant-isolated via RLS
-- ==============================================================================

-- 1. EXTENSIONS (Ensure UUID and crypto exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ORGANIZATIONAL HIERARCHY TABLES
-- ==============================================================================

-- 2.1 Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_department_org_code UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);

-- 2.2 Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED')),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_project_org_code UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);

-- 2.3 Sites (Locations belonging to projects or operational hubs)
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_site_org_code UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_sites_org ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_project ON public.sites(project_id);

-- 2.4 Teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_org ON public.teams(organization_id);

-- ==============================================================================
-- 3. RBAC & PERMISSIONS SCHEMA
-- ==============================================================================

-- 3.1 Roles (Custom & System roles per organization)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_org_code UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_roles_org ON public.roles(organization_id);

-- 3.2 Master Permissions Catalog (Global catalog of valid operations)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

-- 3.3 Role Permissions (Mapping permissions to roles)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_role_perms_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_perms_org ON public.role_permissions(organization_id);

-- 3.4 User Permission Overrides (Explicit ALLOW / DENY overrides per user)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    override_type TEXT NOT NULL CHECK (override_type IN ('ALLOW', 'DENY')),
    reason TEXT,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_permission UNIQUE (organization_id, user_id, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_user_perms_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_org ON public.user_permissions(organization_id);

-- ==============================================================================
-- 4. TASK-BASED ACCESS CONTROL (TBAC)
-- ==============================================================================

-- 4.1 Task Types Registry (Admin-configurable operational activities)
CREATE TABLE IF NOT EXISTS public.task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    default_priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (default_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    sla_hours INTEGER DEFAULT 24,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_type_org_code UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_task_types_org ON public.task_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_types_module ON public.task_types(module);

-- 4.2 User Task Assignments (Direct operational responsibility assignments)
CREATE TABLE IF NOT EXISTS public.user_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_type_id UUID NOT NULL REFERENCES public.task_types(id) ON DELETE CASCADE,
    can_initiate BOOLEAN NOT NULL DEFAULT true,
    can_execute BOOLEAN NOT NULL DEFAULT true,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_task_type UNIQUE (organization_id, user_id, task_type_id)
);
CREATE INDEX IF NOT EXISTS idx_user_task_assign_user ON public.user_task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_assign_org ON public.user_task_assignments(organization_id);

-- ==============================================================================
-- 5. ENHANCE ORGANIZATION MEMBERS (Additive columns for profile & hierarchy)
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'custom_role_id') THEN
        ALTER TABLE public.organization_members ADD COLUMN custom_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'department_id') THEN
        ALTER TABLE public.organization_members ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'site_id') THEN
        ALTER TABLE public.organization_members ADD COLUMN site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'employee_code') THEN
        ALTER TABLE public.organization_members ADD COLUMN employee_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'phone') THEN
        ALTER TABLE public.organization_members ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'designation') THEN
        ALTER TABLE public.organization_members ADD COLUMN designation TEXT;
    END IF;
END $$;

-- ==============================================================================
-- 6. PERMISSION RESOLVER FUNCTIONS (Deterministic, PL/pgSQL)
-- Precedence: User DENY > User ALLOW > Role DENY > Role ALLOW > Default DENY
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id UUID, p_org_id UUID)
RETURNS TABLE (permission_code TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH role_perms AS (
        -- Permissions from the user's assigned custom role OR fallback system role
        SELECT p.code
        FROM public.organization_members om
        JOIN public.roles r ON (
            (om.custom_role_id IS NOT NULL AND r.id = om.custom_role_id)
            OR (om.custom_role_id IS NULL AND r.organization_id = p_org_id AND r.code = om.role)
        )
        JOIN public.role_permissions rp ON rp.role_id = r.id AND rp.is_active = true
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE om.user_id = p_user_id
          AND om.organization_id = p_org_id
          AND om.is_active = true
    ),
    user_allows AS (
        -- Explicit user-level ALLOW overrides
        SELECT p.code
        FROM public.user_permissions up
        JOIN public.permissions p ON p.id = up.permission_id
        WHERE up.user_id = p_user_id
          AND up.organization_id = p_org_id
          AND up.override_type = 'ALLOW'
    ),
    user_denies AS (
        -- Explicit user-level DENY overrides
        SELECT p.code
        FROM public.user_permissions up
        JOIN public.permissions p ON p.id = up.permission_id
        WHERE up.user_id = p_user_id
          AND up.organization_id = p_org_id
          AND up.override_type = 'DENY'
    ),
    combined AS (
        SELECT code FROM role_perms
        UNION
        SELECT code FROM user_allows
    )
    SELECT code
    FROM combined
    WHERE code NOT IN (SELECT code FROM user_denies);
END;
$$;

-- Check if current authenticated user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_master BOOLEAN;
BEGIN
    -- Master admin always has all permissions
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.roles r ON r.id = om.custom_role_id
        WHERE om.user_id = auth.uid()
          AND om.organization_id = p_org_id
          AND om.is_active = true
          AND r.code = 'MASTER_ADMIN'
    ) INTO v_is_master;

    IF v_is_master THEN
        RETURN true;
    END IF;

    -- Legacy check: if role is ADMIN in organization_members, treat as master admin
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE user_id = auth.uid()
          AND organization_id = p_org_id
          AND role = 'ADMIN'
          AND is_active = true
    ) INTO v_is_master;

    IF v_is_master THEN
        RETURN true;
    END IF;

    -- Check deterministic effective permissions
    RETURN EXISTS (
        SELECT 1
        FROM public.get_user_effective_permissions(auth.uid(), p_org_id)
        WHERE permission_code = p_permission
    );
END;
$$;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_assignments ENABLE ROW LEVEL SECURITY;

-- 7.1 Permissions Catalog: Authenticated users can view catalog
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions"
    ON public.permissions
    FOR SELECT TO authenticated
    USING (true);

-- 7.2 Departments Policies
DROP POLICY IF EXISTS "Members can view departments" ON public.departments;
CREATE POLICY "Members can view departments"
    ON public.departments FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
    ON public.departments FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.3 Projects Policies
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
CREATE POLICY "Members can view projects"
    ON public.projects FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
    ON public.projects FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.4 Sites Policies
DROP POLICY IF EXISTS "Members can view sites" ON public.sites;
CREATE POLICY "Members can view sites"
    ON public.sites FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage sites" ON public.sites;
CREATE POLICY "Admins can manage sites"
    ON public.sites FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.5 Teams Policies
DROP POLICY IF EXISTS "Members can view teams" ON public.teams;
CREATE POLICY "Members can view teams"
    ON public.teams FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams"
    ON public.teams FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.6 Roles Policies
DROP POLICY IF EXISTS "Members can view roles" ON public.roles;
CREATE POLICY "Members can view roles"
    ON public.roles FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles"
    ON public.roles FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.7 Role Permissions Policies
DROP POLICY IF EXISTS "Members can view role_permissions" ON public.role_permissions;
CREATE POLICY "Members can view role_permissions"
    ON public.role_permissions FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role_permissions"
    ON public.role_permissions FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.8 User Permissions Policies
DROP POLICY IF EXISTS "Users can view own user_permissions" ON public.user_permissions;
CREATE POLICY "Users can view own user_permissions"
    ON public.user_permissions FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins can manage user_permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage user_permissions"
    ON public.user_permissions FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.9 Task Types Policies
DROP POLICY IF EXISTS "Members can view task_types" ON public.task_types;
CREATE POLICY "Members can view task_types"
    ON public.task_types FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage task_types" ON public.task_types;
CREATE POLICY "Admins can manage task_types"
    ON public.task_types FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- 7.10 User Task Assignments Policies
DROP POLICY IF EXISTS "Users can view own task_assignments" ON public.user_task_assignments;
CREATE POLICY "Users can view own task_assignments"
    ON public.user_task_assignments FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins can manage user_task_assignments" ON public.user_task_assignments;
CREATE POLICY "Admins can manage user_task_assignments"
    ON public.user_task_assignments FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- ==============================================================================
-- 8. DEFAULT SEEDING (Idempotent: Permissions Catalog, Roles, Task Types)
-- ==============================================================================

-- 8.1 Seed Master Permissions Catalog
INSERT INTO public.permissions (code, module, action, name, description)
VALUES
    -- Projects & Sites
    ('projects.view', 'projects', 'view', 'View Projects', 'Access project list and details'),
    ('projects.create', 'projects', 'create', 'Create Projects', 'Register new projects'),
    ('projects.update', 'projects', 'update', 'Update Projects', 'Edit project details and milestones'),
    ('projects.delete', 'projects', 'delete', 'Delete Projects', 'Archive or delete projects'),
    ('sites.view', 'sites', 'view', 'View Sites', 'Access site locations and details'),
    ('sites.create', 'sites', 'create', 'Create Sites', 'Register new construction sites'),
    ('sites.update', 'sites', 'update', 'Update Sites', 'Edit site details'),
    ('sites.delete', 'sites', 'delete', 'Delete Sites', 'Archive or delete sites'),

    -- Operations: Equipment & Fuel
    ('machines.view', 'machines', 'view', 'View Machines', 'Access heavy plant machinery list'),
    ('machines.create', 'machines', 'create', 'Create Machines', 'Register heavy machinery in fleet'),
    ('machines.update', 'machines', 'update', 'Update Machines', 'Update machine telemetry and status'),
    ('machines.delete', 'machines', 'delete', 'Delete Machines', 'Decommission machinery'),
    ('vehicles.view', 'vehicles', 'view', 'View Vehicles', 'Access fleet vehicles'),
    ('vehicles.create', 'vehicles', 'create', 'Create Vehicles', 'Register vehicles'),
    ('vehicles.update', 'vehicles', 'update', 'Update Vehicles', 'Update vehicle status'),
    ('vehicles.delete', 'vehicles', 'delete', 'Delete Vehicles', 'Decommission vehicles'),
    ('fuel.view', 'fuel', 'view', 'View Fuel Records', 'Access diesel logs and meter logs'),
    ('fuel.issue', 'fuel', 'issue', 'Issue Diesel', 'Dispense diesel to machine or vehicle'),
    ('fuel.receive', 'fuel', 'receive', 'Receive Diesel', 'Log diesel tanker delivery at site'),
    ('fuel.approve', 'fuel', 'approve', 'Approve Diesel Logs', 'Verify and approve fuel issue entries'),
    ('maintenance.view', 'maintenance', 'view', 'View Maintenance', 'Access equipment service records'),
    ('maintenance.create', 'maintenance', 'create', 'Request Maintenance', 'Log machine breakdown or service request'),
    ('maintenance.approve', 'maintenance', 'approve', 'Approve Maintenance', 'Authorize maintenance service order'),

    -- Materials & Purchase
    ('inventory.view', 'inventory', 'view', 'View Inventory', 'Inspect stock quantities at site stores'),
    ('inventory.issue', 'inventory', 'issue', 'Issue Material', 'Issue material from store to site work'),
    ('inventory.receive', 'inventory', 'receive', 'Receive Material', 'Receive GRN delivery from vendor'),
    ('purchase.view', 'purchase', 'view', 'View Purchase Requests', 'View purchase requisitions and orders'),
    ('purchase.create', 'purchase', 'create', 'Create Purchase Request', 'Create requisition for materials or spares'),
    ('purchase.submit', 'purchase', 'submit', 'Submit Purchase Request', 'Submit request for supervisor review'),
    ('purchase.approve', 'purchase', 'approve', 'Approve Purchase', 'Approve purchase requisition or order'),
    ('vendors.view', 'vendors', 'view', 'View Vendors', 'Access supplier directory'),
    ('vendors.create', 'vendors', 'create', 'Create Vendors', 'Register new vendors and suppliers'),
    ('vendors.update', 'vendors', 'update', 'Update Vendors', 'Update vendor details and GSTIN'),

    -- Administration & Governance
    ('people.view', 'people', 'view', 'View People Directory', 'Access employee directory and contacts'),
    ('people.create', 'people', 'create', 'Invite/Create Users', 'Create employee accounts and profiles'),
    ('people.update', 'people', 'update', 'Edit User Profiles', 'Update designation, department, and phone'),
    ('people.deactivate', 'people', 'deactivate', 'Deactivate Users', 'Suspend or reactivate user access'),
    ('roles.view', 'roles', 'view', 'View Roles', 'Inspect roles and permission mappings'),
    ('roles.create', 'roles', 'create', 'Create Roles', 'Create custom organizational roles'),
    ('roles.update', 'roles', 'update', 'Update Roles', 'Modify role permissions'),
    ('tasks.assign', 'tasks', 'assign', 'Assign Tasks', 'Assign operational responsibilities to employees'),
    ('forms.manage', 'forms', 'manage', 'Manage Forms', 'Design and publish dynamic operational forms'),
    ('workflows.manage', 'workflows', 'manage', 'Manage Workflows', 'Configure approval chains and rules'),
    ('audit.view', 'audit', 'view', 'View Audit Logs', 'Inspect tamper-evident system audit trail')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    module = EXCLUDED.module,
    action = EXCLUDED.action;

-- 8.2 Seed System Roles, Default Permissions & Task Types for each existing Organization
DO $$
DECLARE
    r_org RECORD;
    v_master_role_id UUID;
    v_admin_role_id UUID;
    v_mgr_role_id UUID;
    v_sup_role_id UUID;
    v_user_role_id UUID;
    v_op_role_id UUID;
    v_perm_id UUID;
BEGIN
    FOR r_org IN SELECT id FROM public.organizations LOOP
        -- MASTER_ADMIN
        INSERT INTO public.roles (organization_id, code, name, description, is_system)
        VALUES (r_org.id, 'MASTER_ADMIN', 'Master Administrator', 'Unrestricted administrative authority across organization', true)
        ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_master_role_id;

        -- ADMIN
        INSERT INTO public.roles (organization_id, code, name, description, is_system)
        VALUES (r_org.id, 'ADMIN', 'Administrator', 'Full operational and user configuration authority', true)
        ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_admin_role_id;

        -- PROJECT_MANAGER
        INSERT INTO public.roles (organization_id, code, name, description, is_system)
        VALUES (r_org.id, 'PROJECT_MANAGER', 'Project Manager', 'Oversees projects, sites, purchase approvals, and schedules', true)
        ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_mgr_role_id;

        -- SITE_SUPERVISOR
        INSERT INTO public.roles (organization_id, code, name, description, is_system)
        VALUES (r_org.id, 'SITE_SUPERVISOR', 'Site Supervisor', 'Supervises daily site operations, fuel issues, and materials', true)
        ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_sup_role_id;

        -- OPERATOR
        INSERT INTO public.roles (organization_id, code, name, description, is_system)
        VALUES (r_org.id, 'OPERATOR', 'Machine / Plant Operator', 'Executes equipment operations and logs daily hours', true)
        ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_op_role_id;

        -- USER
        INSERT INTO public.roles (organization_id, code, name, description, is_system)
        VALUES (r_org.id, 'USER', 'Standard Member', 'General organization user with assigned task capabilities', true)
        ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_user_role_id;

        -- Grant ALL permissions to MASTER_ADMIN & ADMIN
        FOR v_perm_id IN SELECT id FROM public.permissions LOOP
            INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
            VALUES (r_org.id, v_master_role_id, v_perm_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;

            INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
            VALUES (r_org.id, v_admin_role_id, v_perm_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;

        -- Grant Supervisor permissions (Fuel issue, material issue, maintenance request)
        FOR v_perm_id IN SELECT id FROM public.permissions WHERE code IN (
            'sites.view', 'machines.view', 'vehicles.view', 'fuel.view', 'fuel.issue',
            'inventory.view', 'inventory.issue', 'maintenance.view', 'maintenance.create',
            'purchase.view', 'purchase.create', 'purchase.submit'
        ) LOOP
            INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
            VALUES (r_org.id, v_sup_role_id, v_perm_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;

        -- Seed Standard Task Types
        INSERT INTO public.task_types (organization_id, code, name, module, icon, description, default_priority, sla_hours)
        VALUES
            (r_org.id, 'DIESEL_ISSUE', 'Diesel Issue', 'fuel', 'Fuel', 'Dispense diesel fuel from site bowser/storage into machine or vehicle', 'HIGH', 12),
            (r_org.id, 'DIESEL_PURCHASE', 'Diesel Tanker Inward', 'fuel', 'Truck', 'Receive bulk diesel tanker delivery at site storage tank', 'HIGH', 24),
            (r_org.id, 'MATERIAL_ISSUE', 'Material Issue Slip', 'inventory', 'PackageCheck', 'Issue construction materials from site store to execution gang', 'MEDIUM', 24),
            (r_org.id, 'MATERIAL_RECEIPT', 'Goods Receipt Note (GRN)', 'inventory', 'Boxes', 'Inspect and receive delivered raw materials at site', 'MEDIUM', 48),
            (r_org.id, 'PURCHASE_REQUEST', 'Purchase Requisition', 'purchase', 'ShoppingCart', 'Requisition materials, spares, or safety consumables', 'MEDIUM', 72),
            (r_org.id, 'MAINTENANCE_REQUEST', 'Breakdown Report', 'maintenance', 'Wrench', 'Report machine breakdown or schedule preventative service', 'CRITICAL', 8),
            (r_org.id, 'VEHICLE_ASSIGNMENT', 'Vehicle Trip Sheet', 'vehicles', 'Navigation', 'Daily trip and transport log for transport vehicles', 'LOW', 24)
        ON CONFLICT (organization_id, code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description;

        -- Upgrade existing members with role='ADMIN' to have custom_role_id = v_master_role_id
        UPDATE public.organization_members
        SET custom_role_id = v_master_role_id
        WHERE organization_id = r_org.id
          AND role = 'ADMIN'
          AND custom_role_id IS NULL;

    END LOOP;
END $$;

-- ==============================================================================
-- 9. ENHANCED CONTEXT RESOLVER RPC
-- Returns profile, role, custom_role, organization, permissions list, and assigned tasks
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_context()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_profile RECORD;
    v_member RECORD;
    v_org RECORD;
    v_role_code TEXT;
    v_perms JSONB;
    v_tasks JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('status', 'UNAUTHENTICATED');
    END IF;

    -- 1. Profile resolution
    SELECT id, email, full_name, is_active, created_at, updated_at
    INTO v_profile
    FROM public.profiles
    WHERE id = v_uid;

    IF v_profile.id IS NOT NULL AND v_profile.is_active = false THEN
        RETURN jsonb_build_object(
            'status', 'USER_INACTIVE',
            'userId', v_uid,
            'errorMessage', 'Your user profile has been deactivated. Please contact your administrator.'
        );
    END IF;

    -- 2. Organization Membership resolution
    SELECT om.id, om.organization_id, om.user_id, om.role, om.is_active,
           om.custom_role_id, om.department_id, om.site_id, om.employee_code, om.phone, om.designation,
           r.code as custom_role_code, r.name as custom_role_name
    INTO v_member
    FROM public.organization_members om
    LEFT JOIN public.roles r ON r.id = om.custom_role_id
    WHERE om.user_id = v_uid
      AND om.is_active = true
    LIMIT 1;

    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'NO_MEMBERSHIP',
            'userId', v_uid,
            'errorMessage', 'Your account is not assigned to an active organization. Please contact your administrator.'
        );
    END IF;

    -- 3. Organization resolution
    SELECT id, name, slug, is_active, created_at, updated_at
    INTO v_org
    FROM public.organizations
    WHERE id = v_member.organization_id;

    IF v_org.id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'NO_MEMBERSHIP',
            'userId', v_uid,
            'errorMessage', 'The organization assigned to your account could not be found.'
        );
    END IF;

    IF v_org.is_active = false THEN
        RETURN jsonb_build_object(
            'status', 'ORGANIZATION_INACTIVE',
            'userId', v_uid,
            'errorMessage', 'Your organization account is currently inactive. Please contact support.'
        );
    END IF;

    -- 4. Effective role code (custom role takes precedence over base role)
    v_role_code := COALESCE(v_member.custom_role_code, v_member.role);

    -- 5. Effective permissions array
    SELECT COALESCE(jsonb_agg(permission_code), '[]'::jsonb)
    INTO v_perms
    FROM public.get_user_effective_permissions(v_uid, v_member.organization_id);

    -- 6. Assigned task types array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'taskTypeId', tt.id,
        'code', tt.code,
        'name', tt.name,
        'module', tt.module,
        'icon', tt.icon,
        'canInitiate', uta.can_initiate,
        'canExecute', uta.can_execute,
        'canApprove', uta.can_approve
    )), '[]'::jsonb)
    INTO v_tasks
    FROM public.user_task_assignments uta
    JOIN public.task_types tt ON tt.id = uta.task_type_id AND tt.is_active = true
    WHERE uta.user_id = v_uid
      AND uta.organization_id = v_member.organization_id;

    -- Return resolved success payload
    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'userId', v_uid,
        'user_id', v_uid,
        'email', COALESCE(v_profile.email, auth.jwt()->>'email'),
        'role', v_role_code,
        'baseRole', v_member.role,
        'profile', jsonb_build_object(
            'id', v_uid,
            'email', v_profile.email,
            'fullName', v_profile.full_name,
            'full_name', v_profile.full_name,
            'isActive', COALESCE(v_profile.is_active, true),
            'is_active', COALESCE(v_profile.is_active, true)
        ),
        'membership', jsonb_build_object(
            'id', v_member.id,
            'organizationId', v_member.organization_id,
            'organization_id', v_member.organization_id,
            'userId', v_member.user_id,
            'user_id', v_member.user_id,
            'role', v_role_code,
            'baseRole', v_member.role,
            'employeeCode', v_member.employee_code,
            'designation', v_member.designation,
            'phone', v_member.phone,
            'departmentId', v_member.department_id,
            'siteId', v_member.site_id,
            'isActive', v_member.is_active,
            'is_active', v_member.is_active
        ),
        'organization', jsonb_build_object(
            'id', v_org.id,
            'name', v_org.name,
            'slug', v_org.slug,
            'isActive', v_org.is_active,
            'is_active', v_org.is_active
        ),
        'permissions', v_perms,
        'assignedTasks', v_tasks
    );
END;
$$;

-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, UUID) TO authenticated;


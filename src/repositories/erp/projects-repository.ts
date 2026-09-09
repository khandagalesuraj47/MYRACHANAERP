import { supabase } from '../../lib/supabase'
import type { Project, Site } from '../../types/rbac'

export interface ProjectWithSites extends Project {
  sites: Site[]
}

export const ProjectsRepository = {
  /**
   * Fetch all projects for an organization
   */
  async getProjects(organizationId: string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[ProjectsRepository] getProjects error:', error)
        return []
      }

      return (data || []).map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        code: row.code,
        description: row.description,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } catch (err) {
      console.error('[ProjectsRepository] getProjects unexpected exception:', err)
      return []
    }
  },

  /**
   * Fetch all sites for an organization, optionally filtered by project_id
   */
  async getSites(organizationId: string, projectId?: string): Promise<Site[]> {
    try {
      let query = supabase
        .from('sites')
        .select('*')
        .eq('organization_id', organizationId)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        console.error('[ProjectsRepository] getSites error:', error)
        return []
      }

      return (data || []).map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        projectId: row.project_id,
        name: row.name,
        code: row.code,
        location: row.location,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } catch (err) {
      console.error('[ProjectsRepository] getSites unexpected exception:', err)
      return []
    }
  },

  /**
   * Fetch all projects together with their nested sites
   */
  async getProjectsWithSites(organizationId: string): Promise<ProjectWithSites[]> {
    try {
      const [projects, sites] = await Promise.all([
        this.getProjects(organizationId),
        this.getSites(organizationId),
      ])

      const sitesByProject: Record<string, Site[]> = {}

      for (const site of sites) {
        if (site.projectId) {
          if (!sitesByProject[site.projectId]) {
            sitesByProject[site.projectId] = []
          }
          sitesByProject[site.projectId].push(site)
        }
      }

      return projects.map((p) => ({
        ...p,
        sites: sitesByProject[p.id] || [],
      }))
    } catch (err) {
      console.error('[ProjectsRepository] getProjectsWithSites error:', err)
      return []
    }
  },

  /**
   * Create a new project
   */
  async createProject(params: {
    organizationId: string
    name: string
    code: string
    description?: string
    status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'
  }): Promise<{ project: Project | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          organization_id: params.organizationId,
          name: params.name.trim(),
          code: params.code.trim().toUpperCase(),
          description: params.description?.trim() || null,
          status: params.status || 'ACTIVE',
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return { project: null, error: error.message }
      }

      return {
        project: {
          id: data.id,
          organizationId: data.organization_id,
          name: data.name,
          code: data.code,
          description: data.description,
          status: data.status,
          startDate: data.start_date,
          endDate: data.end_date,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error creating project'
      return { project: null, error: msg }
    }
  },

  /**
   * Create a new site under a project
   */
  async createSite(params: {
    organizationId: string
    projectId: string
    name: string
    code: string
    location?: string
  }): Promise<{ site: Site | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('sites')
        .insert({
          organization_id: params.organizationId,
          project_id: params.projectId,
          name: params.name.trim(),
          code: params.code.trim().toUpperCase(),
          location: params.location?.trim() || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return { site: null, error: error.message }
      }

      return {
        site: {
          id: data.id,
          organizationId: data.organization_id,
          projectId: data.project_id,
          name: data.name,
          code: data.code,
          location: data.location,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error creating site'
      return { site: null, error: msg }
    }
  },

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project'
      return { success: false, error: msg }
    }
  },

  /**
   * Delete a site
   */
  async deleteSite(siteId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('sites').delete().eq('id', siteId)
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete site'
      return { success: false, error: msg }
    }
  },
}


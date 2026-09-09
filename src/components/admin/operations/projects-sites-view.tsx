import React, { useState, useEffect, useCallback } from 'react'
import {
  FolderKanban,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Trash2,
} from 'lucide-react'
import { ProjectsRepository, type ProjectWithSites } from '../../../repositories/erp/projects-repository'

interface ProjectsSitesViewProps {
  organizationId: string
  organizationName: string
}

export function ProjectsSitesView({ organizationId, organizationName }: ProjectsSitesViewProps) {
  const [projects, setProjects] = useState<ProjectWithSites[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectStatus, setProjectStatus] = useState<'ACTIVE' | 'PLANNING' | 'ON_HOLD' | 'COMPLETED'>('ACTIVE')
  const [submittingProject, setSubmittingProject] = useState(false)

  // Site Modal State
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [siteName, setSiteName] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [siteLocation, setSiteLocation] = useState('')
  const [submittingSite, setSubmittingSite] = useState(false)

  const loadData = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    const data = await ProjectsRepository.getProjectsWithSites(organizationId)
    setProjects(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    if (!organizationId) return

    ProjectsRepository.getProjectsWithSites(organizationId).then((data) => {
      if (isMounted) {
        setProjects(data)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [organizationId])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim() || !projectCode.trim()) return

    setSubmittingProject(true)
    const res = await ProjectsRepository.createProject({
      organizationId,
      name: projectName,
      code: projectCode,
      description: projectDesc,
      status: projectStatus,
    })
    setSubmittingProject(false)

    if (res.project) {
      showNotification('success', `Project "${res.project.name}" created successfully.`)
      setIsProjectModalOpen(false)
      setProjectName('')
      setProjectCode('')
      setProjectDesc('')
      loadData()
    } else {
      showNotification('error', res.error || 'Failed to create project.')
    }
  }

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !siteName.trim() || !siteCode.trim()) return

    setSubmittingSite(true)
    const res = await ProjectsRepository.createSite({
      organizationId,
      projectId: selectedProjectId,
      name: siteName,
      code: siteCode,
      location: siteLocation,
    })
    setSubmittingSite(false)

    if (res.site) {
      showNotification('success', `Site "${res.site.name}" added successfully.`)
      setIsSiteModalOpen(false)
      setSiteName('')
      setSiteCode('')
      setSiteLocation('')
      setSelectedProjectId(null)
      loadData()
    } else {
      showNotification('error', res.error || 'Failed to add site.')
    }
  }

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"? Nested sites will also be removed.`)) {
      return
    }
    const res = await ProjectsRepository.deleteProject(projectId)
    if (res.success) {
      showNotification('success', `Project "${name}" removed.`)
      loadData()
    } else {
      showNotification('error', res.error || 'Failed to delete project.')
    }
  }

  const handleDeleteSite = async (siteId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete site "${name}"?`)) {
      return
    }
    const res = await ProjectsRepository.deleteSite(siteId)
    if (res.success) {
      showNotification('success', `Site "${name}" removed.`)
      loadData()
    } else {
      showNotification('error', res.error || 'Failed to delete site.')
    }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.sites.some(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase())
      )
  )

  const totalSitesCount = projects.reduce((acc, curr) => acc + curr.sites.length, 0)

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              Command Center
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Projects & Sites Management
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Define heavy civil engineering projects (e.g. VTR Project) and nested operational sites (e.g. Walshind, Kharegaon) for {organizationName}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh list"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Projects</span>
            <FolderKanban className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{projects.length}</div>
          <p className="text-[11px] text-slate-400">Civil contracts & enterprise packages</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Construction Sites</span>
            <MapPin className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalSitesCount}</div>
          <p className="text-[11px] text-slate-400">Operational field locations</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tenant Association</span>
            <Building className="h-4 w-4 text-slate-600" />
          </div>
          <div className="text-sm font-bold truncate text-slate-900 mt-1">{organizationName}</div>
          <p className="text-[11px] text-emerald-600 font-medium">PostgreSQL RLS Scoped</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, code, or nested sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 space-y-2">
          <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="text-xs text-slate-500">Loading projects and sites...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Projects Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            Register your first project (e.g. <strong>VTR Project</strong>) and then add multiple construction sites (e.g. <strong>Walshind</strong>, <strong>Kharegaon</strong>) beneath it.
          </p>
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              {/* Project Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{project.name}</h3>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {project.code}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {project.status}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.id)
                      setIsSiteModalOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Add Site</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(project.id, project.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Nested Sites Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-500" />
                    <span>Operational Sites ({project.sites.length})</span>
                  </span>
                </div>

                {project.sites.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>No sites added yet. Click &quot;Add Site&quot; to register locations like Walshind or Kharegaon.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {project.sites.map((site) => (
                      <div
                        key={site.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                            <MapPin className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {site.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              {site.code} {site.location ? `• ${site.location}` : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSite(site.id, site.name)}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                          title="Remove site"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Create New Project</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VTR Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VTR-01"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Initial Status</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PLANNING">PLANNING</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Project scope, client details, highway stretch, etc."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProject}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingProject ? 'Creating...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SITE MODAL */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Construction Site</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSiteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Site Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Walshind or Kharegaon"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Site Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WALSH-01"
                    value={siteCode}
                    onChange={(e) => setSiteCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase text-slate-900 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Location / Milestone</label>
                  <input
                    type="text"
                    placeholder="e.g. Ch. 45+200"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSite}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingSite ? 'Saving...' : 'Add Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

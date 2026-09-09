import React, { useState, useEffect, useCallback } from 'react'
import {
  Cpu,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  MapPin,
  Clock,
} from 'lucide-react'
import type { MachineryAsset } from '../../../types/enterprise-erp'
import { OperationsRepository } from '../../../repositories/erp/operations-repository'

interface FleetMachineryViewProps {
  organizationId: string
}

export function FleetMachineryView({ organizationId }: FleetMachineryViewProps) {
  const [assets, setAssets] = useState<MachineryAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Form state
  const [assetCode, setAssetCode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<MachineryAsset['category']>('EXCAVATOR')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [model, setModel] = useState('')
  const [cumulativeHours, setCumulativeHours] = useState('0')
  const [currentSite, setCurrentSite] = useState('')
  const [operatorName, setOperatorName] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await OperationsRepository.getMachineryAssets(organizationId)
    setAssets(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    OperationsRepository.getMachineryAssets(organizationId).then((data) => {
      if (isMounted) {
        setAssets(data)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [organizationId])

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetCode || !name) return

    setSubmitting(true)
    const res = await OperationsRepository.addMachineryAsset({
      organizationId,
      assetCode,
      name,
      category,
      registrationNumber: registrationNumber || null,
      model: model || null,
      status: 'OPERATIONAL',
      cumulativeHours: parseFloat(cumulativeHours) || 0,
      currentSite: currentSite || null,
      operatorName: operatorName || null,
      isActive: true,
    })

    setSubmitting(false)
    if (res.success) {
      setIsModalOpen(false)
      setAssetCode('')
      setName('')
      setRegistrationNumber('')
      setModel('')
      setCumulativeHours('0')
      setCurrentSite('')
      setOperatorName('')
      setFeedback('New machinery asset registered successfully.')
      loadData()
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback(res.error || 'Failed to register asset')
    }
  }

  const operationalCount = assets.filter((a) => a.status === 'OPERATIONAL').length
  const maintenanceCount = assets.filter((a) => a.status === 'UNDER_MAINTENANCE' || a.status === 'BREAKDOWN').length
  const totalHours = assets.reduce((acc, curr) => acc + curr.cumulativeHours, 0)

  const filteredAssets = assets.filter((a) => {
    const matchQuery =
      a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.registrationNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.currentSite || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter
    return matchQuery && matchStatus
  })

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 rounded">
              Fleet & Equipment
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Machinery & Fleet Asset Management
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time tracking of heavy civil machinery: excavators, dumpers, batching plants, transit mixers, and running hours.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh assets"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/60 text-blue-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Fleet Units</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{assets.length}</div>
          <p className="text-[11px] text-slate-400">Tracked across all sites</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Operational</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{operationalCount}</div>
          <p className="text-[11px] text-slate-400">Ready for active duty</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Under Maintenance</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">{maintenanceCount}</div>
          <p className="text-[11px] text-slate-400">Service / Breakdown</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cumulative Engine Hours</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400 font-mono">
            {totalHours.toLocaleString()} <span className="text-xs text-slate-400">hrs</span>
          </div>
          <p className="text-[11px] text-slate-400">Total logged runtime</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Asset Code, Model, Reg No, Site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPERATIONAL">OPERATIONAL</option>
            <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
            <option value="BREAKDOWN">BREAKDOWN</option>
            <option value="IDLE">IDLE</option>
          </select>
        </div>
      </div>

      {/* Machinery Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <div className="h-6 w-6 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mx-auto mb-2" />
            <span className="font-mono text-xs">Querying fleet registry...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Cpu className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No machinery assets registered</p>
            <p className="text-xs text-slate-500">Register heavy civil equipment to monitor fleet health and deployment.</p>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 hover:border-slate-700 transition-all text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.5 rounded">
                    {asset.assetCode}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1">{asset.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{asset.model || asset.category}</p>
                </div>
                <span
                  className={`font-mono text-[9px] px-2 py-0.5 rounded border font-semibold ${
                    asset.status === 'OPERATIONAL'
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                      : asset.status === 'BREAKDOWN'
                      ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                      : 'bg-amber-950/70 border-amber-800 text-amber-300'
                  }`}
                >
                  {asset.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/70 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Reg No:</span>
                  <p className="font-medium text-slate-300">{asset.registrationNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Runtime Hours:</span>
                  <p className="font-bold text-purple-400">{asset.cumulativeHours.toLocaleString()} hrs</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-slate-400 text-[11px]">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-blue-400" />
                  <span className="truncate max-w-[140px]">{asset.currentSite || 'Central Depot'}</span>
                </div>
                <span className="truncate max-w-[120px] font-sans font-medium text-slate-300">
                  {asset.operatorName || 'Unassigned'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Register Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Register Machinery Asset</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Asset Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EXC-014"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MachineryAsset['category'])}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="EXCAVATOR">Excavator</option>
                    <option value="DUMPER">Tipper / Dumper</option>
                    <option value="TRANSIT_MIXER">Transit Mixer</option>
                    <option value="BATCHING_PLANT">Batching Plant</option>
                    <option value="ROLLER">Road Roller</option>
                    <option value="CRANE">Mobile Crane</option>
                    <option value="GENERATOR">DG Set</option>
                    <option value="OTHER">Other Equipment</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Asset Name / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Hitachi EX-210 Hydraulic Excavator"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-14-CL-9021"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Model / Make</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 Super Series"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Cumulative Hours</label>
                  <input
                    type="number"
                    value={cumulativeHours}
                    onChange={(e) => setCumulativeHours(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Current Site</label>
                  <input
                    type="text"
                    placeholder="e.g. Nagpur Highway Sec 3"
                    value={currentSite}
                    onChange={(e) => setCurrentSite(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Operator Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunil Patil"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import {
  Fuel,
  Plus,
  Search,
  RefreshCw,
  Truck,
  TrendingUp,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react'
import type { DieselTransaction } from '../../../types/enterprise-erp'
import { OperationsRepository } from '../../../repositories/erp/operations-repository'

interface FuelDieselViewProps {
  organizationId: string
}

export function FuelDieselView({ organizationId }: FuelDieselViewProps) {
  const [logs, setLogs] = useState<DieselTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Form State
  const [slipNumber, setSlipNumber] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [liters, setLiters] = useState('')
  const [rate, setRate] = useState('92.50')
  const [meterReading, setMeterReading] = useState('')
  const [issuedTo, setIssuedTo] = useState('')
  const [siteLocation, setSiteLocation] = useState('')
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await OperationsRepository.getDieselTransactions(organizationId)
    setLogs(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    OperationsRepository.getDieselTransactions(organizationId).then((data) => {
      if (isMounted) {
        setLogs(data)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [organizationId])

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slipNumber || !liters) return

    setSubmitting(true)
    const litersNum = parseFloat(liters) || 0
    const rateNum = parseFloat(rate) || 0

    const res = await OperationsRepository.logDieselIssue({
      organizationId,
      transactionType: 'ISSUE',
      transactionDate: new Date().toISOString().split('T')[0],
      slipNumber,
      vehicleNumber: vehicleNumber || null,
      liters: litersNum,
      ratePerLiter: rateNum,
      totalAmount: litersNum * rateNum,
      currentMeterReading: parseFloat(meterReading) || null,
      issuedTo: issuedTo || null,
      siteLocation: siteLocation || null,
      notes: notes || null,
    })

    setSubmitting(false)
    if (res.success) {
      setIsModalOpen(false)
      setSlipNumber('')
      setVehicleNumber('')
      setLiters('')
      setMeterReading('')
      setIssuedTo('')
      setSiteLocation('')
      setNotes('')
      setFeedback('Diesel issue chit logged successfully.')
      loadData()
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback(res.error || 'Failed to log diesel transaction')
    }
  }

  const totalLiters = logs.reduce((acc, curr) => acc + curr.liters, 0)
  const totalSpend = logs.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)

  const filteredLogs = logs.filter(
    (l) =>
      l.slipNumber.toLowerCase().includes(search.toLowerCase()) ||
      (l.vehicleNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.issuedTo || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.siteLocation || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded">
              Heavy Civil Operations
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Fuel & Diesel Management
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time diesel issue chits, bulk fuel dispensing, equipment hour-meter logging, and reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh logs"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-amber-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Log Diesel Chit</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-900/60 text-amber-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Diesel Dispensed</span>
            <Fuel className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalLiters.toLocaleString()} <span className="text-sm font-normal text-slate-400">Liters</span>
          </div>
          <p className="text-[11px] text-slate-400">Recorded across active project sites</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cumulative Fuel Spend</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            ₹{totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400">Calculated based on average chit rate</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Logged Chits</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {logs.length} <span className="text-sm font-normal text-slate-400">Slips</span>
          </div>
          <p className="text-[11px] text-slate-400">Audit-verified dispensing transactions</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Slip No, Vehicle No, Machine, Site, or Operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Slip No / Date</th>
                <th className="px-4 py-3 font-semibold">Vehicle / Machine</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Meter Reading</th>
                <th className="px-4 py-3 font-semibold">Site / Issued To</th>
                <th className="px-4 py-3 font-semibold text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                      <span className="text-xs">Querying fuel transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Fuel className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-400">No diesel transactions found</p>
                    <p className="text-xs text-slate-500">Log a new diesel issue slip to populate the ledger.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{log.slipNumber}</p>
                      <p className="text-[10px] text-slate-500">{log.transactionDate}</p>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-amber-400" />
                        <span className="font-medium text-slate-200">{log.vehicleNumber || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-400">
                      {log.liters.toFixed(2)} L
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.currentMeterReading ? `${log.currentMeterReading} hrs/km` : '—'}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <p className="text-slate-200">{log.siteLocation || 'Main Yard'}</p>
                      <p className="text-[11px] text-slate-500">{log.issuedTo || 'Driver/Operator'}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      ₹{(log.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Diesel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Log Diesel Issue Slip</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Slip / Indent Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DSL-2026-001"
                    value={slipNumber}
                    onChange={(e) => setSlipNumber(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Vehicle / Asset Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-RN-4819"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Quantity (Liters) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 150"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Rate / Liter (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Meter Reading</label>
                  <input
                    type="number"
                    placeholder="e.g. 4820"
                    value={meterReading}
                    onChange={(e) => setMeterReading(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Site / Dispensing Point</label>
                  <input
                    type="text"
                    placeholder="e.g. Chainage Km 42 Workfront"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Issued To (Driver / Operator)</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Shinde"
                    value={issuedTo}
                    onChange={(e) => setIssuedTo(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Notes / Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Earthwork excavation shift diesel top-up"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none resize-none"
                />
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
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? 'Saving Slip...' : 'Save Diesel Chit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  CreditCard,
  Building,
} from 'lucide-react'
import type { PurchaseOrder } from '../../../types/enterprise-erp'
import { OperationsRepository } from '../../../repositories/erp/operations-repository'

interface ProcurementViewProps {
  organizationId: string
}

export function ProcurementView({ organizationId }: ProcurementViewProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Form state
  const [poNumber, setPoNumber] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await OperationsRepository.getPurchaseOrders(organizationId)
    setOrders(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    OperationsRepository.getPurchaseOrders(organizationId).then((data) => {
      if (isMounted) {
        setOrders(data)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [organizationId])

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poNumber || !vendorName || !totalAmount) return

    setSubmitting(true)
    const res = await OperationsRepository.createPurchaseOrder({
      organizationId,
      poNumber,
      vendorName,
      totalAmount: parseFloat(totalAmount) || 0,
      status: 'PENDING_APPROVAL',
      expectedDeliveryDate: deliveryDate || null,
      notes: notes || null,
    })

    setSubmitting(false)
    if (res.success) {
      setIsModalOpen(false)
      setPoNumber('')
      setVendorName('')
      setTotalAmount('')
      setDeliveryDate('')
      setNotes('')
      setFeedback('Purchase Order submitted for multi-level workflow approval.')
      loadData()
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback(res.error || 'Failed to create purchase order')
    }
  }

  const totalValue = orders.reduce((acc, curr) => acc + curr.totalAmount, 0)
  const pendingCount = orders.filter((po) => po.status === 'PENDING_APPROVAL').length
  const approvedCount = orders.filter((po) => po.status === 'APPROVED' || po.status === 'FULFILLED').length

  const filteredOrders = orders.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded">
              Procurement & Contracts
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Purchase Indents & Orders
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Vendor supply contracts, procurement indents, multi-tier budget approvals, and delivery tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh orders"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-indigo-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Procurement Value</span>
            <CreditCard className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400">Total volume of issued POs</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending Approvals</span>
            <ShoppingCart className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">{pendingCount}</div>
          <p className="text-[11px] text-slate-400">Awaiting management sign-off</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Approved / Fulfilled</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{approvedCount}</div>
          <p className="text-[11px] text-slate-400">Active or completed contracts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by PO Number or Vendor Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">PO Number</th>
              <th className="px-4 py-3 font-semibold">Vendor Supplier</th>
              <th className="px-4 py-3 font-semibold text-right">Amount (₹)</th>
              <th className="px-4 py-3 font-semibold">Delivery Date</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  <div className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-2" />
                  <span className="text-xs">Querying purchase orders...</span>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  <ShoppingCart className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-400">No purchase orders found</p>
                  <p className="text-xs text-slate-500">Create a purchase order to initiate procurement workflows.</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-indigo-400">{po.poNumber}</td>
                  <td className="px-4 py-3 font-sans font-medium text-white">
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      <span>{po.vendorName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white">
                    ₹{po.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {po.expectedDeliveryDate || 'Immediate'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${
                        po.status === 'APPROVED' || po.status === 'FULFILLED'
                          ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                          : po.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                          : 'bg-rose-950/70 border-rose-800 text-rose-300'
                      }`}
                    >
                      {po.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Create Purchase Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">PO Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-2026-904"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Vendor / Supplier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JSW Steel Infrastructure Ltd"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Total Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 450000"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Specifications / Scope Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fe 550D TMT Rebars 16mm & 20mm grade as per IS 1786"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none resize-none"
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
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? 'Submitting PO...' : 'Submit Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


import React, { useState, useEffect, useCallback } from 'react'
import {
  Boxes,
  Plus,
  Search,
  RefreshCw,
  PackageCheck,
  CheckCircle2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react'
import type { MaterialItem, MaterialTransaction } from '../../../types/enterprise-erp'
import { OperationsRepository } from '../../../repositories/erp/operations-repository'

interface InventoryMaterialsViewProps {
  organizationId: string
}

export function InventoryMaterialsView({ organizationId }: InventoryMaterialsViewProps) {
  const [items, setItems] = useState<MaterialItem[]>([])
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'STOCK' | 'TRANSACTIONS'>('STOCK')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Transaction form state
  const [transType, setTransType] = useState<MaterialTransaction['transactionType']>('INWARD_GRN')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [quantity, setQuantity] = useState('')
  const [siteLocation, setSiteLocation] = useState('')
  const [vendorSupplier, setVendorSupplier] = useState('')
  const [issuedTo, setIssuedTo] = useState('')
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [itemsData, transData] = await Promise.all([
      OperationsRepository.getMaterialItems(organizationId),
      OperationsRepository.getMaterialTransactions(organizationId),
    ])
    setItems(itemsData)
    setTransactions(transData)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    Promise.all([
      OperationsRepository.getMaterialItems(organizationId),
      OperationsRepository.getMaterialTransactions(organizationId),
    ]).then(([itemsData, transData]) => {
      if (isMounted) {
        setItems(itemsData)
        setTransactions(transData)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [organizationId])

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemId || !refNumber || !quantity) return

    setSubmitting(true)
    const res = await OperationsRepository.logMaterialTransaction({
      organizationId,
      materialItemId: selectedItemId,
      transactionType: transType,
      referenceNumber: refNumber,
      quantity: parseFloat(quantity) || 0,
      siteLocation: siteLocation || null,
      vendorSupplier: vendorSupplier || null,
      issuedTo: issuedTo || null,
      notes: notes || null,
    })

    setSubmitting(false)
    if (res.success) {
      setIsModalOpen(false)
      setSelectedItemId('')
      setRefNumber('')
      setQuantity('')
      setSiteLocation('')
      setVendorSupplier('')
      setIssuedTo('')
      setNotes('')
      setFeedback('Material movement recorded successfully.')
      loadData()
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback(res.error || 'Failed to record material movement')
    }
  }

  const lowStockCount = items.filter((i) => i.currentStock <= i.reorderLevel).length

  const filteredItems = items.filter(
    (i) =>
      i.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTransactions = transactions.filter(
    (t) =>
      t.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.materialItem?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.vendorSupplier || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
              Warehouse & Materials
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Inventory & Material Tracking
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time material stock registers (Cement, Steel, Aggregates, Sand), Inward GRN, and Outward Issue Slips.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh inventory"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Log Material Slip</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Tracked Material SKUs</span>
            <Boxes className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{items.length}</div>
          <p className="text-[11px] text-slate-400">Master inventory items</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Low Stock Items</span>
            <TrendingDown className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">{lowStockCount}</div>
          <p className="text-[11px] text-slate-400">At or below reorder threshold</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Recorded Movements</span>
            <PackageCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{transactions.length}</div>
          <p className="text-[11px] text-slate-400">Inward & outward slip events</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search material SKU, name, slip reference, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('STOCK')}
          className={`px-4 py-2 rounded-t-lg transition-colors cursor-pointer font-semibold ${
            activeTab === 'STOCK'
              ? 'bg-slate-900 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Material Stock Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`px-4 py-2 rounded-t-lg transition-colors cursor-pointer font-semibold ${
            activeTab === 'TRANSACTIONS'
              ? 'bg-slate-900 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Movement Slips ({transactions.length})
        </button>
      </div>

      {/* Stock Tab */}
      {activeTab === 'STOCK' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">SKU Code</th>
                <th className="px-4 py-3 font-semibold">Material Name</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">UOM</th>
                <th className="px-4 py-3 font-semibold text-right">Current Stock</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="h-6 w-6 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mx-auto mb-2" />
                    <span className="text-xs">Querying material stock...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Boxes className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-400">No material items in warehouse</p>
                    <p className="text-xs text-slate-500">Record an Inward GRN slip to initialize material inventory.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.reorderLevel
                  return (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-emerald-400">{item.itemCode}</td>
                      <td className="px-4 py-3 font-sans font-medium text-white">{item.name}</td>
                      <td className="px-4 py-3 text-slate-400">{item.category}</td>
                      <td className="px-4 py-3 text-slate-400">{item.unitOfMeasure}</td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        {item.currentStock.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${
                            isLow
                              ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                              : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                          }`}
                        >
                          {isLow ? 'LOW STOCK' : 'OPTIMAL'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Slip Ref / Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Material</th>
                <th className="px-4 py-3 font-semibold text-right">Quantity</th>
                <th className="px-4 py-3 font-semibold">Supplier / Issued To</th>
                <th className="px-4 py-3 font-semibold">Site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium text-slate-400">No material movements recorded</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{t.referenceNumber}</p>
                      <p className="text-[10px] text-slate-500">{t.createdAt.split('T')[0]}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded border font-semibold ${
                          t.transactionType === 'INWARD_GRN'
                            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                            : 'bg-blue-950/70 border-blue-800 text-blue-300'
                        }`}
                      >
                        {t.transactionType === 'INWARD_GRN' ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {t.transactionType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans font-medium text-slate-200">
                      {t.materialItem?.name || 'Material Item'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">
                      {t.quantity.toLocaleString()} {t.materialItem?.unitOfMeasure}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-400">
                      {t.vendorSupplier || t.issuedTo || '—'}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-400">
                      {t.siteLocation || 'Main Warehouse'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Record Material Movement Slip</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Movement Type *</label>
                  <select
                    value={transType}
                    onChange={(e) => setTransType(e.target.value as MaterialTransaction['transactionType'])}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="INWARD_GRN">Inward (GRN / Gate Receipt)</option>
                    <option value="OUTWARD_ISSUE">Outward (Issue Slip / Workfront)</option>
                    <option value="RETURN">Return to Warehouse</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Slip / GRN Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GRN-2026-881"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Select Material Item *</label>
                  <select
                    required
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose Item --</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.itemCode}) - {i.unitOfMeasure}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Supplier / Issued To</label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech / Supervisor Santosh"
                    value={vendorSupplier || issuedTo}
                    onChange={(e) => {
                      setVendorSupplier(e.target.value)
                      setIssuedTo(e.target.value)
                    }}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Site / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Nagpur Highway Yard Camp"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Notes / Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Concrete bridge pier reinforcement casting batch"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none resize-none"
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
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

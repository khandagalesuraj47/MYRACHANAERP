import React, { useState, useEffect, useCallback } from 'react'
import {
  Cpu,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Truck,
  Fuel,
  Upload,
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle2,
  Building,
  Gauge,
  AlertTriangle,
  FileCheck,
} from 'lucide-react'
import {
  AssetMasterRepository,
  ASSET_CATEGORIES,
  type MachineryAssetRecord,
  type AssetOwnershipType,
  type AssetCategory,
  type MeterReadingType,
  type FuelIssueMode,
  type AssetDocument,
} from '../../../repositories/erp/asset-master-repository'
import {
  VendorRepository,
  type Vendor,
} from '../../../repositories/erp/vendor-repository'

interface AssetMasterViewProps {
  organizationId: string
  organizationName?: string
}

function createDocId(): string {
  return `doc-${Math.random().toString(36).slice(2, 9)}`
}

export function AssetMasterView({ organizationId }: AssetMasterViewProps) {
  const [assets, setAssets] = useState<MachineryAssetRecord[]>([])
  const [contractorVendors, setContractorVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOwnership, setFilterOwnership] = useState<'ALL' | AssetOwnershipType>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  // Form Fields
  const [formAssetCode, setFormAssetCode] = useState('')
  const [formVehicleNumber, setFormVehicleNumber] = useState('')
  const [formName, setFormName] = useState('')
  const [formOwnershipType, setFormOwnershipType] = useState<AssetOwnershipType>('COMPANY_OWNED')
  const [formVendorId, setFormVendorId] = useState<string>('')
  const [formAssetCategory, setFormAssetCategory] = useState<AssetCategory>('HYVA')
  const [formMake, setFormMake] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formChassisNumber, setFormChassisNumber] = useState('')
  const [formEngineNumber, setFormEngineNumber] = useState('')
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear())
  const [formMeterType, setFormMeterType] = useState<MeterReadingType>('KILOMETERS')
  const [formCurrentMeter, setFormCurrentMeter] = useState<number>(0)
  const [formFuelCapacity, setFormFuelCapacity] = useState<number>(300)
  const [formFuelIssueMode, setFormFuelIssueMode] = useState<FuelIssueMode>('COMPANY_SUPPLIED')
  const [formAssignedSite, setFormAssignedSite] = useState('VTR Site')
  const [formOperatorName, setFormOperatorName] = useState('')
  const [formDocuments, setFormDocuments] = useState<AssetDocument[]>([])
  const [formIsActive, setFormIsActive] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // View Docs Modal
  const [viewDocsAsset, setViewDocsAsset] = useState<MachineryAssetRecord | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [assetList, vendorList] = await Promise.all([
      AssetMasterRepository.getAssets(organizationId),
      VendorRepository.getVendors(organizationId, 'CONTRACTOR_VENDOR'),
    ])
    setAssets(assetList)
    setContractorVendors(vendorList)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const [assetList, vendorList] = await Promise.all([
        AssetMasterRepository.getAssets(organizationId),
        VendorRepository.getVendors(organizationId, 'CONTRACTOR_VENDOR'),
      ])
      if (mounted) {
        setAssets(assetList)
        setContractorVendors(vendorList)
        setLoading(false)
      }
    }
    void init()
    return () => {
      mounted = false
    }
  }, [organizationId])

  // When changing category in form, auto-suggest default meter type
  const handleCategoryChange = (cat: AssetCategory) => {
    setFormAssetCategory(cat)
    const def = ASSET_CATEGORIES.find((c) => c.id === cat)
    if (def) {
      setFormMeterType(def.defaultMeter)
    }
  }

  const openNewAssetModal = async () => {
    setIsEditing(false)
    setSelectedAssetId(null)
    const code = await AssetMasterRepository.generateNextAssetCode(organizationId, 'HYVA')
    setFormAssetCode(code)
    setFormVehicleNumber('')
    setFormName('')
    setFormOwnershipType('COMPANY_OWNED')
    setFormVendorId('')
    setFormAssetCategory('HYVA')
    setFormMake('')
    setFormModel('')
    setFormChassisNumber('')
    setFormEngineNumber('')
    setFormYear(new Date().getFullYear())
    setFormMeterType('KILOMETERS')
    setFormCurrentMeter(0)
    setFormFuelCapacity(300)
    setFormFuelIssueMode('COMPANY_SUPPLIED')
    setFormAssignedSite('VTR Site')
    setFormOperatorName('')
    setFormDocuments([])
    setFormIsActive(true)
    setShowModal(true)
  }

  const openEditAssetModal = (asset: MachineryAssetRecord) => {
    setIsEditing(true)
    setSelectedAssetId(asset.id)
    setFormAssetCode(asset.assetCode)
    setFormVehicleNumber(asset.vehicleNumber)
    setFormName(asset.name)
    setFormOwnershipType(asset.ownershipType)
    setFormVendorId(asset.vendorId || '')
    setFormAssetCategory(asset.assetCategory)
    setFormMake(asset.make || '')
    setFormModel(asset.model || '')
    setFormChassisNumber(asset.chassisNumber || '')
    setFormEngineNumber(asset.engineNumber || '')
    setFormYear(asset.yearOfManufacture || new Date().getFullYear())
    setFormMeterType(asset.meterType)
    setFormCurrentMeter(asset.currentMeterReading || 0)
    setFormFuelCapacity(asset.fuelTankCapacity || 0)
    setFormFuelIssueMode(asset.fuelIssueMode)
    setFormAssignedSite(asset.assignedSiteName || 'VTR Site')
    setFormOperatorName(asset.operatorName || '')
    setFormDocuments(asset.documentUrls || [])
    setFormIsActive(asset.isActive)
    setShowModal(true)
  }

  // Upload Asset Document (RC, Insurance, Fitness, PUC, Photo)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: 'RC' | 'INSURANCE' | 'FITNESS' | 'PUC' | 'PHOTO' | 'OTHER'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    const res = await AssetMasterRepository.uploadDocument(file, formAssetCode || 'AST', docType)
    setUploadingDoc(false)

    if (res.url) {
      const newDoc: AssetDocument = {
        id: createDocId(),
        title: `${docType}: ${file.name}`,
        docType,
        fileUrl: res.url,
        uploadedAt: new Date().toISOString(),
      }
      setFormDocuments((prev) => [...prev, newDoc])
    } else {
      alert(res.error || 'Failed to upload document')
    }
  }

  const handleRemoveDoc = (docId: string) => {
    setFormDocuments((prev) => prev.filter((d) => d.id !== docId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const vNo = formVehicleNumber.trim()
    if (!vNo) {
      alert('Vehicle / Registration number is strictly required.')
      return
    }

    if (formOwnershipType === 'CONTRACTOR_RENTAL' && !formVendorId) {
      alert('Please select the Contractor / Vendor for this rental vehicle.')
      return
    }

    setSubmitting(true)

    // Name fallback
    const displayName = formName.trim() || `${formAssetCategory} (${vNo.toUpperCase()})`

    if (isEditing && selectedAssetId) {
      const res = await AssetMasterRepository.updateAsset(selectedAssetId, {
        organizationId,
        name: displayName,
        ownershipType: formOwnershipType,
        vendorId: formOwnershipType === 'CONTRACTOR_RENTAL' ? formVendorId : undefined,
        assetCategory: formAssetCategory,
        vehicleNumber: vNo,
        make: formMake,
        model: formModel,
        chassisNumber: formChassisNumber,
        engineNumber: formEngineNumber,
        yearOfManufacture: Number(formYear) || undefined,
        meterType: formMeterType,
        currentMeterReading: Number(formCurrentMeter) || 0,
        fuelTankCapacity: Number(formFuelCapacity) || 0,
        fuelIssueMode: formFuelIssueMode,
        assignedSiteName: formAssignedSite,
        operatorName: formOperatorName,
        documentUrls: formDocuments,
        isActive: formIsActive,
      })

      setSubmitting(false)
      if (res.success) {
        setFeedback({ message: `Asset '${vNo.toUpperCase()}' updated successfully.`, type: 'success' })
        setShowModal(false)
        loadData()
      } else {
        alert(res.error || 'Failed to update asset')
      }
    } else {
      const res = await AssetMasterRepository.createAsset({
        organizationId,
        assetCode: formAssetCode,
        name: displayName,
        ownershipType: formOwnershipType,
        vendorId: formOwnershipType === 'CONTRACTOR_RENTAL' ? formVendorId : undefined,
        assetCategory: formAssetCategory,
        vehicleNumber: vNo,
        make: formMake,
        model: formModel,
        chassisNumber: formChassisNumber,
        engineNumber: formEngineNumber,
        yearOfManufacture: Number(formYear) || undefined,
        meterType: formMeterType,
        currentMeterReading: Number(formCurrentMeter) || 0,
        fuelTankCapacity: Number(formFuelCapacity) || 0,
        fuelIssueMode: formFuelIssueMode,
        assignedSiteName: formAssignedSite,
        operatorName: formOperatorName,
        documentUrls: formDocuments,
        isActive: formIsActive,
      })

      setSubmitting(false)
      if (res.asset) {
        setFeedback({ message: `Asset '${vNo.toUpperCase()}' registered successfully.`, type: 'success' })
        setShowModal(false)
        loadData()
      } else {
        alert(res.error || 'Failed to register asset')
      }
    }
  }

  const handleToggleStatus = async (asset: MachineryAssetRecord) => {
    const nextStatus = !asset.isActive
    const res = await AssetMasterRepository.toggleStatus(asset.id, nextStatus)
    if (res.success) {
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, isActive: nextStatus, status: nextStatus ? 'ACTIVE' : 'INACTIVE' } : a))
      )
      setFeedback({
        message: nextStatus
          ? `Asset '${asset.vehicleNumber}' is now ACTIVE. Diesel issue unlocked.`
          : `Asset '${asset.vehicleNumber}' is now INACTIVE. Diesel issue is strictly BLOCKED!`,
        type: nextStatus ? 'success' : 'error',
      })
    } else {
      alert(res.error || 'Failed to update status')
    }
  }

  const handleDelete = async (asset: MachineryAssetRecord) => {
    if (!confirm(`Are you sure you want to delete asset '${asset.vehicleNumber}' (${asset.assetCode})?`)) {
      return
    }
    const res = await AssetMasterRepository.deleteAsset(asset.id)
    if (res.success) {
      setFeedback({ message: `Asset '${asset.vehicleNumber}' deleted successfully.`, type: 'success' })
      loadData()
    } else {
      alert(res.error || 'Failed to delete asset')
    }
  }

  // Filtered Assets
  const filteredAssets = assets.filter((a) => {
    if (filterOwnership !== 'ALL' && a.ownershipType !== filterOwnership) return false
    if (filterCategory !== 'ALL' && a.assetCategory !== filterCategory) return false
    if (filterStatus === 'ACTIVE' && !a.isActive) return false
    if (filterStatus === 'INACTIVE' && a.isActive) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        a.vehicleNumber.toLowerCase().includes(q) ||
        a.assetCode.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.vendorName && a.vendorName.toLowerCase().includes(q)) ||
        (a.make && a.make.toLowerCase().includes(q)) ||
        (a.model && a.model.toLowerCase().includes(q))
      if (!match) return false
    }

    return true
  })

  // Summary Metrics
  const totalCount = assets.length
  const companyCount = assets.filter((a) => a.ownershipType === 'COMPANY_OWNED').length
  const contractorCount = assets.filter((a) => a.ownershipType === 'CONTRACTOR_RENTAL').length
  const activeCount = assets.filter((a) => a.isActive).length
  const inactiveCount = assets.filter((a) => !a.isActive).length

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-orange-700 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
              Mechanical Master
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Asset Master Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Master registry of Company Owned &amp; Contractor / Rental Equipment (Hyva, Excavators, JCBs, Transit Mixers, Cranes, Rollers, Bolero).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh asset list"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openNewAssetModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Register Asset</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Total Machinery Fleet</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-xs">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700">
            <Building className="h-3 w-3" />
            <span>Company Owned</span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-900 mt-1">{companyCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <Truck className="h-3 w-3" />
            <span>Contractor Rental</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-1">{contractorCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700">Active (Fuel Ready)</span>
          <div className="text-xl font-bold font-mono text-emerald-900 mt-1">{activeCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 shadow-xs">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-700">
            <AlertTriangle className="h-3 w-3" />
            <span>Diesel Blocked (Inactive)</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-900 mt-1">{inactiveCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Vehicle Reg No (e.g. MH04...), Asset Code, Model, Contractor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Ownership Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterOwnership('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterOwnership === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Assets
            </button>
            <button
              type="button"
              onClick={() => setFilterOwnership('COMPANY_OWNED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterOwnership === 'COMPANY_OWNED' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Company Owned
            </button>
            <button
              type="button"
              onClick={() => setFilterOwnership('CONTRACTOR_RENTAL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterOwnership === 'CONTRACTOR_RENTAL' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contractor
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter by category"
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            aria-label="Filter by status"
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active (Fuel Allowed)</option>
            <option value="INACTIVE">Inactive (Fuel Blocked)</option>
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading machinery fleet...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Cpu className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No machinery or vehicles registered</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Click &quot;+ Register Asset&quot; to add your first Hyva, Excavator, Transit Mixer, or JCB.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                  <th className="py-3 px-4">Vehicle Reg No &amp; Code</th>
                  <th className="py-3 px-4">Category &amp; Make</th>
                  <th className="py-3 px-4">Ownership &amp; Contractor</th>
                  <th className="py-3 px-4">Meter &amp; Tank</th>
                  <th className="py-3 px-4">Fuel Mode</th>
                  <th className="py-3 px-4">Status &amp; Fueling</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 text-sm">{asset.vehicleNumber}</div>
                      <div className="font-mono text-[10px] text-slate-400">{asset.assetCode}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {ASSET_CATEGORIES.find((c) => c.id === asset.assetCategory)?.label.split('(')[0] || asset.assetCategory}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {asset.make} {asset.model} {asset.yearOfManufacture ? `(${asset.yearOfManufacture})` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {asset.ownershipType === 'COMPANY_OWNED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                          <Building className="h-2.5 w-2.5" />
                          <span>Company Owned</span>
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <Truck className="h-2.5 w-2.5" />
                            <span>Contractor Rental</span>
                          </span>
                          <div className="font-medium text-[11px] text-slate-700">
                            {asset.vendorName || 'Contractor Hired'}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Gauge className="h-3 w-3 text-slate-400" />
                          <span>
                            {asset.currentMeterReading} {asset.meterType === 'HOURS' ? 'Hrs' : 'Km'}
                          </span>
                        </div>
                        {asset.fuelTankCapacity > 0 && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                            <Fuel className="h-2.5 w-2.5 text-slate-400" />
                            <span>Tank: {asset.fuelTankCapacity} Ltr</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {asset.fuelIssueMode === 'COMPANY_SUPPLIED' ? (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Company Fuel
                        </span>
                      ) : asset.fuelIssueMode === 'DEBIT_TO_CONTRACTOR' ? (
                        <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Debit Basis
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">N/A</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {asset.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(asset)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                          title="Vehicle is active. Click to set inactive."
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>ACTIVE</span>
                        </button>
                      ) : (
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(asset)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 cursor-pointer"
                            title="Vehicle is inactive. Click to reactivate."
                          >
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            <span>INACTIVE</span>
                          </button>
                          <div className="text-[9px] font-bold text-rose-600 uppercase tracking-tight">
                            🚫 Diesel Blocked
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {asset.documentUrls.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewDocsAsset(asset)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="View Documents (RC, Insurance, etc.)"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditAssetModal(asset)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title="Edit Asset"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(asset)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Asset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT ASSET MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEditing ? 'Edit Machinery / Vehicle Asset' : 'Register New Asset to Master'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Asset Code: <span className="font-mono font-semibold">{formAssetCode}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              {/* Ownership Type Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Asset Ownership Model *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormOwnershipType('COMPANY_OWNED')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formOwnershipType === 'COMPANY_OWNED'
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Building className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Company Owned</div>
                      <div className="text-[10px] text-slate-500">
                        Rachana Construction Limited asset
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormOwnershipType('CONTRACTOR_RENTAL')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formOwnershipType === 'CONTRACTOR_RENTAL'
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Truck className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Contractor / Rental</div>
                      <div className="text-[10px] text-slate-500">
                        Hired from Vendor / Sub-contractor
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* If Contractor: Select Contractor from Vendor Master */}
              {formOwnershipType === 'CONTRACTOR_RENTAL' && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                  <label className="block font-bold text-amber-900">
                    Associated Contractor Vendor (Vendor Master Link) *
                  </label>
                  {contractorVendors.length === 0 ? (
                    <div className="text-[11px] text-amber-800">
                      No Contractor Vendors registered yet. Please add a contractor in Vendor Master first!
                    </div>
                  ) : (
                    <select
                      value={formVendorId}
                      onChange={(e) => setFormVendorId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-slate-900 text-xs font-medium focus:outline-hidden"
                    >
                      <option value="">-- Select Contractor Vendor --</option>
                      {contractorVendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName} ({v.vendorCode}) {v.contactPerson ? `- ${v.contactPerson}` : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Fuel Issue Mode for Contractor */}
                  <div className="pt-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Diesel Issue Agreement Mode *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="radio"
                          name="fuelMode"
                          value="COMPANY_SUPPLIED"
                          checked={formFuelIssueMode === 'COMPANY_SUPPLIED'}
                          onChange={() => setFormFuelIssueMode('COMPANY_SUPPLIED')}
                        />
                        <div>
                          <div className="font-bold text-slate-800 text-[11px]">Company Fuel</div>
                          <div className="text-[10px] text-slate-400">Included in hire contract</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="radio"
                          name="fuelMode"
                          value="DEBIT_TO_CONTRACTOR"
                          checked={formFuelIssueMode === 'DEBIT_TO_CONTRACTOR'}
                          onChange={() => setFormFuelIssueMode('DEBIT_TO_CONTRACTOR')}
                        />
                        <div>
                          <div className="font-bold text-slate-800 text-[11px]">Debit Basis</div>
                          <div className="text-[10px] text-slate-400">Deducted from monthly bill</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Equipment Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Equipment / Vehicle Category *
                </label>
                <select
                  value={formAssetCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as AssetCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-hidden"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Number & Display Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Registration No / Vehicle No * (Duplicate Check)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH04AB1234 / HYV-01"
                    value={formVehicleNumber}
                    onChange={(e) => setFormVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 uppercase focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400">Strictly unique per organization</span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Asset Nickname / Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. VTR Hyva #1 / Poclain 200"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Make, Model & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Make / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Tata / CAT / JCB / Komatsu"
                    value={formMake}
                    onChange={(e) => setFormMake(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Prima 2830.K / 320D"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Year of Manufacture</label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value) || 2024)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Chassis & Engine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Chassis Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Chassis / Frame number"
                    value={formChassisNumber}
                    onChange={(e) => setFormChassisNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Engine Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Engine serial number"
                    value={formEngineNumber}
                    onChange={(e) => setFormEngineNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Meter Type, Current Meter, Fuel Tank Capacity */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="font-bold text-slate-800">Operational &amp; Fuel Specifications</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Meter Type *</label>
                    <select
                      value={formMeterType}
                      onChange={(e) => setFormMeterType(e.target.value as MeterReadingType)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-hidden"
                    >
                      <option value="KILOMETERS">Kilometers (KM) - Road / Site Vehicles</option>
                      <option value="HOURS">Hours (HR) - Excavators / JCB / Plant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Current Meter Reading</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={formCurrentMeter}
                      onChange={(e) => setFormCurrentMeter(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Fuel Tank Capacity (Liters)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="300"
                      value={formFuelCapacity}
                      onChange={(e) => setFormFuelCapacity(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Assigned Site</label>
                    <input
                      type="text"
                      value={formAssignedSite}
                      onChange={(e) => setFormAssignedSite(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Assigned Operator / Driver</label>
                    <input
                      type="text"
                      placeholder="Driver name"
                      value={formOperatorName}
                      onChange={(e) => setFormOperatorName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* ASSET DOCUMENTS SECTION (RC, Insurance, Fitness, PUC, Photo) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-slate-600" />
                    <span className="font-bold text-slate-800">
                      Asset Compliance Documents (RC, Insurance, Fitness, PUC, Photo)
                    </span>
                  </div>
                  {uploadingDoc && (
                    <span className="text-[10px] text-orange-600 font-medium animate-pulse">
                      Uploading to cloud...
                    </span>
                  )}
                </div>

                {/* Upload Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { type: 'RC', label: 'RC Book' },
                    { type: 'INSURANCE', label: 'Insurance' },
                    { type: 'FITNESS', label: 'Fitness' },
                    { type: 'PUC', label: 'PUC' },
                    { type: 'PHOTO', label: 'Machine Photo' },
                  ].map((doc) => (
                    <label
                      key={doc.type}
                      className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-center"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-semibold text-slate-700">{doc.label}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, doc.type as 'RC' | 'INSURANCE' | 'FITNESS' | 'PUC' | 'PHOTO')
                        }
                        disabled={uploadingDoc}
                      />
                    </label>
                  ))}
                </div>

                {/* Uploaded Documents List */}
                {formDocuments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Attached Documents ({formDocuments.length})
                    </div>
                    <div className="space-y-1">
                      {formDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              {doc.docType}
                            </span>
                            <span className="text-slate-600 truncate max-w-[200px]">{doc.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active / Inactive Switch with DIESEL BLOCKING WARNING */}
              <div
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  formIsActive ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="font-bold text-slate-900">
                      {formIsActive ? 'Asset Active (Ready for Fueling)' : 'Asset Inactive (Fuel Blocked)'}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formIsActive ? (
                      'This vehicle is active and eligible for diesel filling and issue slips.'
                    ) : (
                      <span className="text-rose-700 font-semibold">
                        ⚠️ WARNING: Diesel issue will be STRICTLY BLOCKED for this vehicle until reactivated.
                      </span>
                    )}
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-rose-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ASSET DOCUMENTS MODAL */}
      {viewDocsAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {viewDocsAsset.vehicleNumber} — Registered Documents
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">{viewDocsAsset.assetCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewDocsAsset(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {viewDocsAsset.documentUrls.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No compliance documents attached.</p>
              ) : (
                viewDocsAsset.documentUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px]">
                        {doc.docType}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{doc.title}</div>
                        <div className="text-[10px] text-slate-400">
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800 bg-white border border-orange-200 px-3 py-1.5 rounded-lg shadow-2xs"
                    >
                      <span>Open / Download</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setViewDocsAsset(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

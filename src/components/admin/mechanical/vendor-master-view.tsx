import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Upload,
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle2,
  Fuel,
  Truck,
} from 'lucide-react'
import {
  VendorRepository,
  type Vendor,
  type VendorType,
  type DocumentType,
  type VendorDocument,
} from '../../../repositories/erp/vendor-repository'

interface VendorMasterViewProps {
  organizationId: string
  organizationName?: string
}

function createVendorDocId(): string {
  return `doc-${Math.random().toString(36).slice(2, 9)}`
}

export function VendorMasterView({ organizationId }: VendorMasterViewProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | VendorType>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)

  // Form Fields
  const [formVendorCode, setFormVendorCode] = useState('')
  const [formVendorName, setFormVendorName] = useState('')
  const [formVendorType, setFormVendorType] = useState<VendorType>('CONTRACTOR_VENDOR')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formState, setFormState] = useState('Maharashtra')

  // Contractor Terms (Optional)
  const [formGstNumber, setFormGstNumber] = useState('')
  const [formPanNumber, setFormPanNumber] = useState('')
  const [formAadhaarNumber, setFormAadhaarNumber] = useState('')
  const [formTdsPercentage, setFormTdsPercentage] = useState<number>(1.0)
  const [formSecurityDeposit, setFormSecurityDeposit] = useState<number>(0)
  const [formPaymentTerms, setFormPaymentTerms] = useState('30 Days')

  // Bank Details (Optional)
  const [formBankName, setFormBankName] = useState('')
  const [formAccountHolder, setFormAccountHolder] = useState('')
  const [formAccountNumber, setFormAccountNumber] = useState('')
  const [formIfscCode, setFormIfscCode] = useState('')
  const [formBranchName, setFormBranchName] = useState('')

  // Documents
  const [formDocuments, setFormDocuments] = useState<VendorDocument[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)

  // Status & Notes
  const [formIsActive, setFormIsActive] = useState(true)
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // View Documents Modal
  const [viewDocsVendor, setViewDocsVendor] = useState<Vendor | null>(null)

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    const data = await VendorRepository.getVendors(organizationId)
    setVendors(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const data = await VendorRepository.getVendors(organizationId)
      if (mounted) {
        setVendors(data)
        setLoading(false)
      }
    }
    void init()
    return () => {
      mounted = false
    }
  }, [organizationId])

  const openNewVendorModal = async () => {
    setIsEditing(false)
    setSelectedVendorId(null)
    const code = await VendorRepository.generateNextVendorCode(organizationId, 'CONTRACTOR_VENDOR')
    setFormVendorCode(code)
    setFormVendorName('')
    setFormVendorType('CONTRACTOR_VENDOR')
    setFormContactPerson('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
    setFormCity('')
    setFormState('Maharashtra')
    setFormGstNumber('')
    setFormPanNumber('')
    setFormAadhaarNumber('')
    setFormTdsPercentage(1.0)
    setFormSecurityDeposit(0)
    setFormPaymentTerms('30 Days')
    setFormBankName('')
    setFormAccountHolder('')
    setFormAccountNumber('')
    setFormIfscCode('')
    setFormBranchName('')
    setFormDocuments([])
    setFormIsActive(true)
    setFormNotes('')
    setShowModal(true)
  }

  const openEditVendorModal = (vendor: Vendor) => {
    setIsEditing(true)
    setSelectedVendorId(vendor.id)
    setFormVendorCode(vendor.vendorCode)
    setFormVendorName(vendor.vendorName)
    setFormVendorType(vendor.vendorType)
    setFormContactPerson(vendor.contactPerson || '')
    setFormPhone(vendor.phone || '')
    setFormEmail(vendor.email || '')
    setFormAddress(vendor.address || '')
    setFormCity(vendor.city || '')
    setFormState(vendor.state || 'Maharashtra')
    setFormGstNumber(vendor.gstNumber || '')
    setFormPanNumber(vendor.panNumber || '')
    setFormAadhaarNumber(vendor.aadhaarNumber || '')
    setFormTdsPercentage(vendor.tdsPercentage || 0)
    setFormSecurityDeposit(vendor.securityDepositAmount || 0)
    setFormPaymentTerms(vendor.paymentTerms || '30 Days')
    setFormBankName(vendor.bankName || '')
    setFormAccountHolder(vendor.accountHolderName || '')
    setFormAccountNumber(vendor.accountNumber || '')
    setFormIfscCode(vendor.ifscCode || '')
    setFormBranchName(vendor.branchName || '')
    setFormDocuments(vendor.documents || [])
    setFormIsActive(vendor.isActive)
    setFormNotes(vendor.notes || '')
    setShowModal(true)
  }

  // Document Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: DocumentType) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    const res = await VendorRepository.uploadDocument(file, formVendorCode || 'VEN', docType)
    setUploadingDoc(false)

    if (res.url) {
      const newDoc: VendorDocument = {
        id: createVendorDocId(),
        documentType: docType,
        documentName: file.name,
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
    if (!formVendorName.trim()) {
      alert('Vendor / Firm Name is required.')
      return
    }

    setSubmitting(true)

    if (isEditing && selectedVendorId) {
      const res = await VendorRepository.updateVendor(selectedVendorId, {
        organizationId,
        vendorName: formVendorName,
        vendorType: formVendorType,
        contactPerson: formContactPerson,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        state: formState,
        gstNumber: formGstNumber,
        panNumber: formPanNumber,
        aadhaarNumber: formAadhaarNumber,
        tdsPercentage: Number(formTdsPercentage || 0),
        securityDepositAmount: Number(formSecurityDeposit || 0),
        paymentTerms: formPaymentTerms,
        bankName: formBankName,
        accountHolderName: formAccountHolder,
        accountNumber: formAccountNumber,
        ifscCode: formIfscCode,
        branchName: formBranchName,
        documents: formDocuments,
        isActive: formIsActive,
        notes: formNotes,
      })

      setSubmitting(false)
      if (res.success) {
        setFeedback({ message: `Vendor '${formVendorName}' updated successfully.`, type: 'success' })
        setShowModal(false)
        fetchVendors()
      } else {
        alert(res.error || 'Failed to update vendor')
      }
    } else {
      const res = await VendorRepository.createVendor({
        organizationId,
        vendorCode: formVendorCode,
        vendorName: formVendorName,
        vendorType: formVendorType,
        contactPerson: formContactPerson,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        state: formState,
        gstNumber: formGstNumber,
        panNumber: formPanNumber,
        aadhaarNumber: formAadhaarNumber,
        tdsPercentage: Number(formTdsPercentage || 0),
        securityDepositAmount: Number(formSecurityDeposit || 0),
        paymentTerms: formPaymentTerms,
        bankName: formBankName,
        accountHolderName: formAccountHolder,
        accountNumber: formAccountNumber,
        ifscCode: formIfscCode,
        branchName: formBranchName,
        documents: formDocuments,
        isActive: formIsActive,
        notes: formNotes,
      })

      setSubmitting(false)
      if (res.vendor) {
        setFeedback({ message: `Vendor '${formVendorName}' registered successfully.`, type: 'success' })
        setShowModal(false)
        fetchVendors()
      } else {
        alert(res.error || 'Failed to create vendor')
      }
    }
  }

  const handleToggleStatus = async (vendor: Vendor) => {
    const nextStatus = !vendor.isActive
    const res = await VendorRepository.toggleStatus(vendor.id, nextStatus)
    if (res.success) {
      setVendors((prev) =>
        prev.map((v) => (v.id === vendor.id ? { ...v, isActive: nextStatus, status: nextStatus ? 'ACTIVE' : 'INACTIVE' } : v))
      )
      setFeedback({
        message: `Vendor '${vendor.vendorName}' is now ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`,
        type: 'success',
      })
    } else {
      alert(res.error || 'Failed to update status')
    }
  }

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to delete vendor '${vendor.vendorName}' (${vendor.vendorCode})?`)) {
      return
    }
    const res = await VendorRepository.deleteVendor(vendor.id)
    if (res.success) {
      setFeedback({ message: `Vendor '${vendor.vendorName}' deleted successfully.`, type: 'success' })
      fetchVendors()
    } else {
      alert(res.error || 'Failed to delete vendor')
    }
  }

  // Filtered List
  const filteredVendors = vendors.filter((v) => {
    if (filterType !== 'ALL' && v.vendorType !== filterType) return false
    if (filterStatus === 'ACTIVE' && !v.isActive) return false
    if (filterStatus === 'INACTIVE' && v.isActive) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        v.vendorName.toLowerCase().includes(q) ||
        v.vendorCode.toLowerCase().includes(q) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
        (v.phone && v.phone.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q))
      if (!match) return false
    }

    return true
  })

  // Counts
  const totalCount = vendors.length
  const purchaseCount = vendors.filter((v) => v.vendorType === 'PURCHASE_VENDOR').length
  const contractorCount = vendors.filter((v) => v.vendorType === 'CONTRACTOR_VENDOR').length
  const activeCount = vendors.filter((v) => v.isActive).length
  const inactiveCount = vendors.filter((v) => !v.isActive).length

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-700 uppercase tracking-widest bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Mechanical Master
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Vendor Master Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Registered directory of Purchase Vendors (Petrol Pumps, Fuel, Spares) &amp; Contractor Vendors (Machinery &amp; Vehicle Rental).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchVendors}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh vendor list"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openNewVendorModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Vendor</span>
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
          <span className="text-[11px] font-semibold text-slate-500">Total Vendors</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-xs">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700">
            <Fuel className="h-3 w-3" />
            <span>Purchase / Pumps</span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-900 mt-1">{purchaseCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <Truck className="h-3 w-3" />
            <span>Contractors (Rental)</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-1">{contractorCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700">Active Vendors</span>
          <div className="text-xl font-bold font-mono text-emerald-900 mt-1">{activeCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700">Inactive</span>
          <div className="text-xl font-bold font-mono text-rose-900 mt-1">{inactiveCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor by name, code, contact person, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 shadow-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PURCHASE_VENDOR')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'PURCHASE_VENDOR' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Purchase (Pumps)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('CONTRACTOR_VENDOR')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'CONTRACTOR_VENDOR' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contractors (Rental)
            </button>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            aria-label="Filter by status"
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading vendors directory...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No vendors found</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Click &quot;+ New Vendor&quot; to register your first Petrol Pump or Machinery Rental Contractor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                  <th className="py-3 px-4">Vendor Code &amp; Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Contractor / Tax Terms</th>
                  <th className="py-3 px-4">Documents</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{vendor.vendorName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{vendor.vendorCode}</div>
                    </td>

                    <td className="py-3 px-4">
                      {vendor.vendorType === 'PURCHASE_VENDOR' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                          <Fuel className="h-2.5 w-2.5" />
                          <span>Purchase / Pump</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                          <Truck className="h-2.5 w-2.5" />
                          <span>Machinery Contractor</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px] text-slate-600">
                        {vendor.contactPerson && <div className="font-medium text-slate-800">{vendor.contactPerson}</div>}
                        {vendor.phone && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Phone className="h-2.5 w-2.5" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.city && (
                          <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                            <MapPin className="h-2.5 w-2.5" />
                            <span>{vendor.city}, {vendor.state}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {vendor.vendorType === 'CONTRACTOR_VENDOR' ? (
                        <div className="space-y-0.5 text-[11px]">
                          {vendor.gstNumber ? (
                            <div className="font-mono text-[10px] text-slate-600">GST: {vendor.gstNumber}</div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">No GST</div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>TDS: <b>{vendor.tdsPercentage}%</b></span>
                            {vendor.securityDepositAmount > 0 && (
                              <span>Dep: <b>₹{vendor.securityDepositAmount.toLocaleString()}</b></span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {vendor.documents.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewDocsVendor(vendor)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 underline cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          <span>{vendor.documents.length} File(s)</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No docs</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(vendor)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                          vendor.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${vendor.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{vendor.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditVendorModal(vendor)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title="Edit Vendor"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(vendor)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Vendor"
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

      {/* CREATE / EDIT VENDOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEditing ? 'Edit Vendor Details' : 'Register New Vendor / Contractor'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Vendor Code: <span className="font-mono font-semibold">{formVendorCode}</span>
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
              {/* Vendor Type Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vendor Classification / Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormVendorType('CONTRACTOR_VENDOR')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formVendorType === 'CONTRACTOR_VENDOR'
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Truck className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Contractor Vendor</div>
                      <div className="text-[10px] text-slate-500">
                        Machinery &amp; Equipment Rental / Sub-Contractor
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormVendorType('PURCHASE_VENDOR')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formVendorType === 'PURCHASE_VENDOR'
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Fuel className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Purchase Vendor</div>
                      <div className="text-[10px] text-slate-500">
                        Petrol Pump / Fuel / Oil / Spare Parts Supplier
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Vendor / Firm Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Firm / Vendor / Contractor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Ganesh Earthmovers / Bharat Petroleum VTR Pump"
                  value={formVendorName}
                  onChange={(e) => setFormVendorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Owner / Manager name"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Phone / Mobile</label>
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Address & City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 mb-1">Address / Site Operating Base</label>
                  <input
                    type="text"
                    placeholder="Address, workshop, or pump location"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">City / Town</label>
                  <input
                    type="text"
                    placeholder="e.g. Kalyan / Vashind"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* CONTRACTOR TERMS (OPTIONAL / ऐच्छिक) */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-amber-700" />
                    <span className="font-bold text-amber-900">
                      Contractor Terms &amp; Compliance (Optional / देणे गरजेचे पण ऐच्छिक)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium">Non-mandatory</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">GST Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={formGstNumber}
                      onChange={(e) => setFormGstNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 uppercase focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={formPanNumber}
                      onChange={(e) => setFormPanNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 uppercase focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Aadhaar Number</label>
                    <input
                      type="text"
                      placeholder="12 digit Aadhaar"
                      value={formAadhaarNumber}
                      onChange={(e) => setFormAadhaarNumber(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">TDS Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 1.0 or 2.0"
                      value={formTdsPercentage}
                      onChange={(e) => setFormTdsPercentage(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Security Deposit (₹)</label>
                    <input
                      type="number"
                      step="1000"
                      placeholder="e.g. 50000"
                      value={formSecurityDeposit}
                      onChange={(e) => setFormSecurityDeposit(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Payment Terms</label>
                    <input
                      type="text"
                      placeholder="e.g. 30 Days / Weekly"
                      value={formPaymentTerms}
                      onChange={(e) => setFormPaymentTerms(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* BANK DETAILS (OPTIONAL) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                  <span className="font-bold text-slate-800">Bank Account Details (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC / SBI"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="Name in passbook"
                      value={formAccountHolder}
                      onChange={(e) => setFormAccountHolder(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="Account number"
                      value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formIfscCode}
                      onChange={(e) => setFormIfscCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono uppercase focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Branch Name</label>
                    <input
                      type="text"
                      placeholder="Branch name"
                      value={formBranchName}
                      onChange={(e) => setFormBranchName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* DOCUMENTS UPLOAD SECTION */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-slate-600" />
                    <span className="font-bold text-slate-800">Vendor Documents Section (Store for Future)</span>
                  </div>
                  {uploadingDoc && (
                    <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                      Uploading to cloud...
                    </span>
                  )}
                </div>

                {/* Upload Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['AADHAAR', 'PAN', 'GST', 'CHEQUE', 'CONTRACT'] as DocumentType[]).map((type) => (
                    <label
                      key={type}
                      className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-center"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-semibold text-slate-700">
                        {type === 'CHEQUE' ? 'Passbook/Cheque' : type}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, type)}
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
                              {doc.documentType}
                            </span>
                            <span className="text-slate-600 truncate max-w-[200px]">{doc.documentName}</span>
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

              {/* Status Toggle & Notes */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-bold text-slate-900">Vendor Active Status</div>
                  <div className="text-[11px] text-slate-500">
                    When inactive, vendor&apos;s vehicles or pump cannot be selected for new transactions.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DOCUMENTS MODAL */}
      {viewDocsVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {viewDocsVendor.vendorName} — Stored Documents
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">{viewDocsVendor.vendorCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewDocsVendor(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {viewDocsVendor.documents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No documents attached to this vendor.</p>
              ) : (
                viewDocsVendor.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                        {doc.documentType}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{doc.documentName}</div>
                        <div className="text-[10px] text-slate-400">
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-white border border-amber-200 px-3 py-1.5 rounded-lg shadow-2xs"
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
                onClick={() => setViewDocsVendor(null)}
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

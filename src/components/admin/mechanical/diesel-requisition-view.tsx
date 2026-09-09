import React, { useState, useEffect, useCallback } from 'react'
import {
  Fuel,
  Plus,
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Printer,
  Camera,
  Trash2,
  Edit,
  Building,
  Check,
} from 'lucide-react'
import {
  DieselRequisitionRepository,
  type DieselRequisition,
  type DieselParty,
} from '../../../repositories/erp/diesel-requisition-repository'
import { DieselRequisitionPdfModal } from './diesel-requisition-pdf-modal'
import { useAuth } from '../../../context/auth-context'

interface DieselRequisitionViewProps {
  organizationId: string
  organizationName?: string
}

export function DieselRequisitionView({
  organizationId,
  organizationName = 'Rachana Construction Limited',
}: DieselRequisitionViewProps) {
  const { context: authCtx } = useAuth()
  const currentUserName = authCtx?.profile?.fullName || authCtx?.email?.split('@')[0] || 'User'
  const currentUserId = authCtx?.userId || ''

  const [requisitions, setRequisitions] = useState<DieselRequisition[]>([])
  const [parties, setParties] = useState<DieselParty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false)

  const [activeRequisition, setActiveRequisition] = useState<DieselRequisition | null>(null)

  // Form States - Create Requisition
  const [reqDate, setReqDate] = useState(() => new Date().toISOString().split('T')[0])
  const [bowserVehicleNo, setBowserVehicleNo] = useState('Bowser (2300 Ltr)')
  const [requestedLiters, setRequestedLiters] = useState('2300')
  const [consumptionNotes, setConsumptionNotes] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<string[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [submittingCreate, setSubmittingCreate] = useState(false)

  // Form States - Verification & Party Assignment
  const [selectedPartyId, setSelectedPartyId] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [submittingVerify, setSubmittingVerify] = useState(false)

  // Form States - GM Approval
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submittingApprove, setSubmittingApprove] = useState(false)

  // Form States - Add Party
  const [newPartyName, setNewPartyName] = useState('')
  const [newPartyLocation, setNewPartyLocation] = useState('')
  const [newPartyPhone, setNewPartyPhone] = useState('')
  const [newPartyGst, setNewPartyGst] = useState('')
  const [submittingParty, setSubmittingParty] = useState(false)

  // Form States - Edit
  const [editLiters, setEditLiters] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editBowser, setEditBowser] = useState('')
  const [submittingEdit, setSubmittingEdit] = useState(false)

  const loadData = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    const [reqs, prts] = await Promise.all([
      DieselRequisitionRepository.getRequisitions(organizationId),
      DieselRequisitionRepository.getParties(organizationId),
    ])
    setRequisitions(reqs)
    setParties(prts)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    if (!organizationId) return

    Promise.all([
      DieselRequisitionRepository.getRequisitions(organizationId),
      DieselRequisitionRepository.getParties(organizationId),
    ]).then(([reqs, prts]) => {
      if (isMounted) {
        setRequisitions(reqs)
        setParties(prts)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [organizationId])

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  // Handle File Upload (Camera or File)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    const res = await DieselRequisitionRepository.uploadAttachment(file, organizationId, 'REQ')
    setUploadingFile(false)

    if (res.url) {
      setAttachedFiles((prev) => [...prev, res.url!])
      notify('success', 'Attachment / Meter Photo uploaded successfully.')
    } else {
      notify('error', res.error || 'Failed to upload photo')
    }
  }

  // Step 1: Create Requisition
  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault()
    const litersNum = parseFloat(requestedLiters)
    if (isNaN(litersNum) || litersNum <= 0) {
      notify('error', 'Please enter a valid diesel quantity in liters.')
      return
    }

    setSubmittingCreate(true)
    const reqNo = await DieselRequisitionRepository.generateNextRequisitionNo(organizationId)

    const res = await DieselRequisitionRepository.createRequisition({
      organizationId,
      requisitionNo: reqNo,
      requisitionDate: reqDate,
      bowserVehicleNo,
      bowserCapacityLiters: 2300,
      requestedLiters: litersNum,
      previousConsumptionNotes: consumptionNotes,
      attachmentUrls: attachedFiles,
      createdByUserId: currentUserId,
      createdByName: currentUserName,
    })
    setSubmittingCreate(false)

    if (res.requisition) {
      notify('success', `Requisition ${res.requisition.requisitionNo} raised successfully.`)
      setIsCreateModalOpen(false)
      setRequestedLiters('2300')
      setConsumptionNotes('')
      setAttachedFiles([])
      loadData()
    } else {
      notify('error', res.error || 'Failed to create requisition')
    }
  }

  // Step 2: Verify & Assign Party
  const handleVerifyRequisition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRequisition || !selectedPartyId) {
      notify('error', 'Please select a Party / Petrol Pump from the dropdown.')
      return
    }

    const party = parties.find((p) => p.id === selectedPartyId)
    if (!party) return

    setSubmittingVerify(true)
    const res = await DieselRequisitionRepository.verifyRequisition(activeRequisition.id, {
      partyId: party.id,
      partyName: party.name,
      verifiedByUserId: currentUserId,
      verifiedByName: currentUserName,
      verificationNotes,
    })
    setSubmittingVerify(false)

    if (res.success) {
      notify('success', `Requisition verified and assigned to "${party.name}". Sent to GM for final approval.`)
      setIsVerifyModalOpen(false)
      setActiveRequisition(null)
      setSelectedPartyId('')
      setVerificationNotes('')
      loadData()
    } else {
      notify('error', res.error || 'Failed to verify requisition')
    }
  }

  // Step 3: Approve Requisition
  const handleApprove = async () => {
    if (!activeRequisition) return

    setSubmittingApprove(true)
    const res = await DieselRequisitionRepository.approveRequisition(activeRequisition.id, {
      approvedByUserId: currentUserId,
      approvedByName: currentUserName,
      approvalNotes,
    })
    setSubmittingApprove(false)

    if (res.success) {
      notify('success', `Requisition ${activeRequisition.requisitionNo} approved successfully!`)
      setIsApproveModalOpen(false)
      setActiveRequisition(null)
      setApprovalNotes('')
      loadData()
    } else {
      notify('error', res.error || 'Failed to approve requisition')
    }
  }

  // Step 3: Reject Requisition
  const handleReject = async () => {
    if (!activeRequisition || !rejectionReason.trim()) {
      notify('error', 'Please enter a rejection reason.')
      return
    }

    setSubmittingApprove(true)
    const res = await DieselRequisitionRepository.rejectRequisition(activeRequisition.id, {
      userId: currentUserId,
      userName: currentUserName,
      reason: rejectionReason,
    })
    setSubmittingApprove(false)

    if (res.success) {
      notify('success', `Requisition ${activeRequisition.requisitionNo} rejected.`)
      setIsApproveModalOpen(false)
      setActiveRequisition(null)
      setRejectionReason('')
      loadData()
    } else {
      notify('error', res.error || 'Failed to reject requisition')
    }
  }

  // Edit Requisition
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRequisition) return

    const litersNum = parseFloat(editLiters)
    setSubmittingEdit(true)
    const res = await DieselRequisitionRepository.updateRequisition(activeRequisition.id, {
      requestedLiters: isNaN(litersNum) ? undefined : litersNum,
      previousConsumptionNotes: editNotes,
      bowserVehicleNo: editBowser,
    })
    setSubmittingEdit(false)

    if (res.success) {
      notify('success', 'Requisition updated successfully.')
      setIsEditModalOpen(false)
      setActiveRequisition(null)
      loadData()
    } else {
      notify('error', res.error || 'Failed to update requisition')
    }
  }

  // Delete Requisition
  const handleDelete = async (req: DieselRequisition) => {
    if (!window.confirm(`Are you sure you want to delete requisition ${req.requisitionNo}?`)) {
      return
    }
    const res = await DieselRequisitionRepository.deleteRequisition(req.id)
    if (res.success) {
      notify('success', `Requisition ${req.requisitionNo} deleted.`)
      loadData()
    } else {
      notify('error', res.error || 'Failed to delete requisition')
    }
  }

  // Add New Party
  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartyName.trim()) return

    setSubmittingParty(true)
    const res = await DieselRequisitionRepository.createParty({
      organizationId,
      name: newPartyName,
      location: newPartyLocation,
      contactPhone: newPartyPhone,
      gstNumber: newPartyGst,
    })
    setSubmittingParty(false)

    if (res.party) {
      notify('success', `Party "${res.party.name}" added successfully.`)
      setIsAddPartyModalOpen(false)
      setNewPartyName('')
      setNewPartyLocation('')
      setNewPartyPhone('')
      setNewPartyGst('')
      // Select the newly created party
      setSelectedPartyId(res.party.id)
      loadData()
    } else {
      notify('error', res.error || 'Failed to create party')
    }
  }

  // Filtered List
  const filteredRequisitions = requisitions.filter((r) => {
    const matchesSearch =
      r.requisitionNo.toLowerCase().includes(search.toLowerCase()) ||
      (r.partyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.createdByName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.bowserVehicleNo || '').toLowerCase().includes(search.toLowerCase())

    if (statusFilter === 'ALL') return matchesSearch
    return matchesSearch && r.status === statusFilter
  })

  // Summary counts
  const pendingScrutinyCount = requisitions.filter((r) => r.status === 'PENDING_VERIFICATION').length
  const pendingGmCount = requisitions.filter((r) => r.status === 'PENDING_APPROVAL').length
  const approvedTotalLiters = requisitions
    .filter((r) => r.status === 'APPROVED')
    .reduce((acc, curr) => acc + curr.requestedLiters, 0)

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-orange-700 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
              Mechanical Department
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-slate-500 font-medium">VTR Site</span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Diesel Purchase Requisition
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            3-Tier Mechanical Diesel Procuring: Field Requisition (Bowser 2300L) $\rightarrow$ Verification & Party Assignment $\rightarrow$ General Manager Approval.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            title="Refresh logs"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddPartyModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100/70 text-orange-800 px-3 py-2 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Building className="h-3.5 w-3.5" />
            <span>+ Add Petrol Pump</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Diesel Requisition</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Scrutiny</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{pendingScrutinyCount}</div>
          <p className="text-[11px] text-amber-600 font-medium">Awaiting party assignment</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending GM Approval</span>
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{pendingGmCount}</div>
          <p className="text-[11px] text-blue-600 font-medium">Awaiting final GM signature</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Approved Diesel</span>
            <Fuel className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {approvedTotalLiters.toLocaleString('en-IN')} L
          </div>
          <p className="text-[11px] text-slate-400">Cumulative site indent</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Bowser Tanker Asset</span>
            <Building className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 mt-1">2,300 Liters</div>
          <p className="text-[11px] text-emerald-600 font-medium">VTR Dedicated Mobile Tanker</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Requisition No, Petrol Pump, Raised By, or Vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 shadow-xs"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { label: 'All', value: 'ALL' },
            { label: 'Pending Scrutiny', value: 'PENDING_VERIFICATION' },
            { label: 'Pending GM', value: 'PENDING_APPROVAL' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Rejected', value: 'REJECTED' },
          ].map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === pill.value
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Records List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2">
            <RefreshCw className="h-6 w-6 text-orange-600 animate-spin" />
            <span className="text-xs">Loading diesel requisitions...</span>
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
              <Fuel className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Diesel Requisitions Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click &quot;New Diesel Requisition&quot; to raise a fuel indent for VTR Site Bowser (2300L).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono uppercase text-[11px] text-slate-600">
                <tr>
                  <th className="p-3.5">Requisition No / Date</th>
                  <th className="p-3.5">Vehicle / Bowser</th>
                  <th className="p-3.5">Quantity (Ltrs)</th>
                  <th className="p-3.5">Assigned Petrol Pump</th>
                  <th className="p-3.5">Authorization Flow</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">{req.requisitionNo}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.requisitionDate}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{req.bowserVehicleNo}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Cap: {req.bowserCapacityLiters}L</div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-mono font-extrabold text-sm text-slate-900">
                        {req.requestedLiters.toLocaleString('en-IN')} L
                      </span>
                    </td>

                    <td className="p-3.5">
                      {req.partyName ? (
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <Building className="h-3 w-3 text-slate-400" />
                          <span>{req.partyName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Pending Party Assignment
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-slate-700">
                          1. Raised: <span className="font-semibold text-slate-900">{req.createdByName || 'Field'}</span>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          2. Verified: <span className="font-semibold text-slate-900">{req.verifiedByName || 'Pending'}</span>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          3. Approved: <span className="font-semibold text-slate-900">{req.approvedByName || 'Pending'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'PENDING_APPROVAL'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Stage 1 -> 2: Operator Scrutiny / Party Assignment */}
                        {req.status === 'PENDING_VERIFICATION' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRequisition(req)
                              setSelectedPartyId(req.partyId || '')
                              setVerificationNotes(req.verificationNotes || '')
                              setIsVerifyModalOpen(true)
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer border border-blue-200"
                            title="Verify & Assign Petrol Pump"
                          >
                            Assign Party
                          </button>
                        )}

                        {/* Stage 2 -> 3: General Manager Approval */}
                        {req.status === 'PENDING_APPROVAL' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRequisition(req)
                              setIsApproveModalOpen(true)
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors cursor-pointer border border-emerald-200"
                            title="Review & Approve as GM"
                          >
                            Approve
                          </button>
                        )}

                        {/* Print / View PDF */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRequisition(req)
                            setIsPdfModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title="Generate Requirement PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Edit: Available to participants */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRequisition(req)
                            setEditLiters(req.requestedLiters.toString())
                            setEditNotes(req.previousConsumptionNotes || '')
                            setEditBowser(req.bowserVehicleNo)
                            setIsEditModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title="Edit Requisition"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(req)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Requisition"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE DIESEL REQUISITION (Field In-Charge) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Diesel Purchase Requisition</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Stage 1 • Field In-Charge Indent</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Requisition Date</label>
                  <input
                    type="date"
                    required
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Site Location</label>
                  <input
                    type="text"
                    disabled
                    value="VTR Site"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Bowser Tanker Vehicle</label>
                  <input
                    type="text"
                    value={bowserVehicleNo}
                    onChange={(e) => setBowserVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Requested Quantity (Liters) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={requestedLiters}
                    onChange={(e) => setRequestedLiters(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">Standard Tanker Capacity: 2300 Ltr</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Previous Consumption Notes / Machinery Justification
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Previous 2300L issued to Excavator 01, Tippers on Kharegaon stretch..."
                  value={consumptionNotes}
                  onChange={(e) => setConsumptionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Attach Proof / Meter Reading / Consumption Sheet */}
              <div className="space-y-2 p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-orange-600" />
                    <span>Attach Meter / Consumption Proof (Photo or PDF)</span>
                  </span>
                  {uploadingFile && <span className="text-[10px] text-orange-600 animate-pulse">Uploading...</span>}
                </div>

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                />

                {attachedFiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {attachedFiles.map((url, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 flex items-center gap-1"
                      >
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Proof #{i + 1} Attached</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingCreate ? 'Submitting...' : 'Submit to Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VERIFY & ASSIGN PARTY (Data Operator / Scrutiny) */}
      {/* ========================================================================= */}
      {isVerifyModalOpen && activeRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Verify & Assign Petrol Pump</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Stage 2 • Operator Scrutiny</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyRequisition} className="space-y-4">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requisition No:</span>
                  <span className="font-mono font-bold text-slate-900">{activeRequisition.requisitionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Quantity:</span>
                  <span className="font-mono font-bold text-slate-900">{activeRequisition.requestedLiters} Liters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Raised By:</span>
                  <span className="font-semibold text-slate-900">{activeRequisition.createdByName}</span>
                </div>
                {activeRequisition.previousConsumptionNotes && (
                  <div className="pt-1 border-t border-slate-200 text-slate-600">
                    <span className="font-semibold block">Consumption Notes:</span>
                    {activeRequisition.previousConsumptionNotes}
                  </div>
                )}
              </div>

              {/* Select Party Dropdown */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Select Petrol Pump / Vendor *</label>
                  <button
                    type="button"
                    onClick={() => setIsAddPartyModalOpen(true)}
                    className="text-[11px] text-orange-600 hover:underline font-semibold cursor-pointer"
                  >
                    + Add New Petrol Pump
                  </button>
                </div>
                <select
                  required
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- Choose Petrol Pump / Party --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.location ? `(${p.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Scrutiny / Verification Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Verification remarks, billing terms, order instructions..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerify}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingVerify ? 'Submitting...' : 'Verify & Send to GM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GENERAL MANAGER FINAL APPROVAL */}
      {/* ========================================================================= */}
      {isApproveModalOpen && activeRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">General Manager Approval</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Stage 3 • Final Authorization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Requisition:</span>
                <span className="font-mono font-bold text-slate-900">{activeRequisition.requisitionNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bowser / Capacity:</span>
                <span className="font-bold text-slate-900">{activeRequisition.bowserVehicleNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Quantity:</span>
                <span className="font-mono font-extrabold text-sm text-emerald-700">
                  {activeRequisition.requestedLiters} Liters
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Petrol Pump:</span>
                <span className="font-bold text-slate-900">{activeRequisition.partyName || 'Not Assigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verified By:</span>
                <span className="font-semibold text-slate-900">{activeRequisition.verifiedByName}</span>
              </div>

              {activeRequisition.attachmentUrls.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block mb-1">Attached Proofs:</span>
                  <div className="flex gap-2 flex-wrap">
                    {activeRequisition.attachmentUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono px-2 py-1 rounded bg-white border border-slate-200 text-blue-600 hover:underline"
                      >
                        Proof #{i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">GM Approval Remarks (Optional)</label>
              <textarea
                rows={2}
                placeholder="Approval sanction notes..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Rejection Reason (If rejecting)</label>
              <input
                type="text"
                placeholder="State reason if sending back..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={submittingApprove || !rejectionReason.trim()}
                className="px-4 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Reject Requisition
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={submittingApprove}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {submittingApprove ? 'Approving...' : 'Approve for Dispensing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT REQUISITION */}
      {/* ========================================================================= */}
      {isEditModalOpen && activeRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Edit Requisition</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Requested Liters *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editLiters}
                  onChange={(e) => setEditLiters(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Bowser Tanker</label>
                <input
                  type="text"
                  value={editBowser}
                  onChange={(e) => setEditBowser(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Consumption Notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD NEW PETROL PUMP / PARTY */}
      {/* ========================================================================= */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Petrol Pump / Vendor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddParty} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Petrol Pump / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HPCL Bunk - Walshind or Indian Oil"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Location / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near Toll Plaza, Walshind"
                  value={newPartyLocation}
                  onChange={(e) => setNewPartyLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    placeholder="Mobile / Phone"
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">GST Number</label>
                  <input
                    type="text"
                    placeholder="GSTIN"
                    value={newPartyGst}
                    onChange={(e) => setNewPartyGst(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase text-slate-900 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingParty}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingParty ? 'Saving...' : 'Save Petrol Pump'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: OFFICIAL PRINTABLE PDF MODAL */}
      {/* ========================================================================= */}
      {isPdfModalOpen && activeRequisition && (
        <DieselRequisitionPdfModal
          requisition={activeRequisition}
          organizationName={organizationName}
          onClose={() => {
            setIsPdfModalOpen(false)
            setActiveRequisition(null)
          }}
        />
      )}
    </div>
  )
}

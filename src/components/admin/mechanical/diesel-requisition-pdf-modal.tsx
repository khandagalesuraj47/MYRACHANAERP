import React from 'react'
import { Printer, X } from 'lucide-react'
import type { DieselRequisition } from '../../../repositories/erp/diesel-requisition-repository'

interface DieselRequisitionPdfModalProps {
  requisition: DieselRequisition
  organizationName: string
  onClose: () => void
}

export function DieselRequisitionPdfModal({
  requisition,
  organizationName,
  onClose,
}: DieselRequisitionPdfModalProps) {
  const handlePrint = () => {
    window.print()
  }

  const isApproved = requisition.status === 'APPROVED'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 text-left">
        {/* Modal Action Header (Excluded from Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded">
              Official Requirement PDF
            </span>
            <span className="text-xs text-slate-500 font-mono">{requisition.requisitionNo}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 space-y-6 text-slate-900 bg-white" id="printable-indent">
          {/* Company & Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-900 text-white uppercase rounded">
                  ERP
                </span>
                <h1 className="text-xl font-extrabold tracking-tight uppercase">
                  {organizationName}
                </h1>
              </div>
              <p className="text-xs font-mono text-slate-600 mt-1 uppercase tracking-wider">
                Heavy Civil Mechanical Division • VTR Project Site
              </p>
            </div>

            <div className="text-right font-mono">
              <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-xs font-bold uppercase">
                Diesel Purchase Requisition
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Ref No: <span className="font-bold text-slate-900">{requisition.requisitionNo}</span>
              </p>
              <p className="text-xs text-slate-600">
                Date: <span className="font-bold text-slate-900">{requisition.requisitionDate}</span>
              </p>
            </div>
          </div>

          {/* Key Indent Particulars Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Site Location</span>
              <span className="font-bold text-slate-900 text-sm">VTR Site</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Bowser Vehicle</span>
              <span className="font-bold text-slate-900 text-sm">{requisition.bowserVehicleNo}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Tanker Capacity</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{requisition.bowserCapacityLiters} Ltr</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Status</span>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {requisition.status}
              </span>
            </div>
          </div>

          {/* Requested Details Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-200 font-mono uppercase text-slate-700">
                <tr>
                  <th className="p-3">Sr.</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Assigned Party / Petrol Pump</th>
                  <th className="p-3 text-right">Requested Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 font-mono font-bold text-slate-600">01</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">High Speed Diesel (HSD)</div>
                    <div className="text-[11px] text-slate-500">For Heavy Civil Site Fleet & Machinery Bowser Dispensing</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">
                      {requisition.partyName || 'To be selected by Operator / GM'}
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                    {requisition.requestedLiters.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Liters
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Previous Consumption Notes */}
          {requisition.previousConsumptionNotes && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                Field Consumption Statement & Justification:
              </span>
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {requisition.previousConsumptionNotes}
              </p>
            </div>
          )}

          {/* Verification Notes */}
          {requisition.verificationNotes && (
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 text-xs text-blue-900 space-y-0.5">
              <span className="font-bold block">Scrutiny / Verification Remarks:</span>
              <p className="text-[11px] text-blue-800">{requisition.verificationNotes}</p>
            </div>
          )}

          {/* Approval Notes */}
          {requisition.approvalNotes && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs text-emerald-900 space-y-0.5">
              <span className="font-bold block">General Manager Approval Notes:</span>
              <p className="text-[11px] text-emerald-800">{requisition.approvalNotes}</p>
            </div>
          )}

          {/* Attached Proofs Thumbnails if any */}
          {requisition.attachmentUrls && requisition.attachmentUrls.length > 0 && (
            <div className="space-y-2 print:hidden">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                Attached Documents / Meter Photos ({requisition.attachmentUrls.length})
              </span>
              <div className="flex gap-3 flex-wrap">
                {requisition.attachmentUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono text-slate-700"
                  >
                    <span>View Proof #{idx + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 3-Tier Digital Authorization Signatures */}
          <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center">
            {/* 1. Requisitioner */}
            <div className="space-y-2 p-3 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-[10px] font-mono uppercase text-slate-500">1. Requisitioned By</div>
              <div className="text-xs font-bold text-slate-900">
                {requisition.createdByName || 'Site In-Charge'}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {new Date(requisition.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <div className="text-[9px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
                SUBMITTED
              </div>
            </div>

            {/* 2. Verifier */}
            <div className="space-y-2 p-3 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-[10px] font-mono uppercase text-slate-500">2. Checked & Verified By</div>
              <div className="text-xs font-bold text-slate-900">
                {requisition.verifiedByName || 'Pending Scrutiny'}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {requisition.verifiedAt
                  ? new Date(requisition.verifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'}
              </div>
              <div
                className={`text-[9px] font-mono font-semibold px-1 py-0.5 rounded ${
                  requisition.verifiedByName
                    ? 'text-blue-700 bg-blue-50 border border-blue-200'
                    : 'text-slate-500 bg-slate-100'
                }`}
              >
                {requisition.verifiedByName ? 'VERIFIED' : 'PENDING'}
              </div>
            </div>

            {/* 3. Approver (GM) */}
            <div className="space-y-2 p-3 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-[10px] font-mono uppercase text-slate-500">3. Final Approval (GM)</div>
              <div className="text-xs font-bold text-slate-900">
                {requisition.approvedByName || 'General Manager'}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {requisition.approvedAt
                  ? new Date(requisition.approvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'}
              </div>
              <div
                className={`text-[9px] font-mono font-semibold px-1 py-0.5 rounded ${
                  isApproved
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                }`}
              >
                {requisition.status}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


import React, { useState } from 'react'
import {
  X,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  PhoneCall,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react'
import { PeopleRepository, type PasswordResetRequest } from '../../../repositories/admin/people-repository'

interface IssueTempPasswordModalProps {
  isOpen: boolean
  request?: PasswordResetRequest | null
  targetUser?: { userId: string; email: string; name?: string } | null
  onClose: () => void
  onSuccess: () => void
}

function generateRandomTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const numbers = '23456789'
  let code = ''
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  for (let i = 0; i < 4; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length))
  }
  return `Temp#${code}`
}

export function IssueTempPasswordModal({
  isOpen,
  request,
  targetUser,
  onClose,
  onSuccess,
}: IssueTempPasswordModalProps) {
  const [tempPassword, setTempPassword] = useState<string>(() => generateRandomTempPassword())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const email = request?.email || targetUser?.email || ''

  if (!isOpen || (!request && !targetUser)) return null

  const handleRegenerate = () => {
    setTempPassword(generateRandomTempPassword())
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tempPassword.trim()) {
      setError('Please enter or generate a temporary password.')
      return
    }

    if (tempPassword.trim().length < 6) {
      setError('Temporary password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    setError(null)

    let res: { success: boolean; tempPassword?: string; error?: string }
    if (request) {
      res = await PeopleRepository.issueTempPassword(request.id, tempPassword.trim())
    } else if (targetUser) {
      res = await PeopleRepository.adminResetUserPassword(targetUser.userId, tempPassword.trim())
    } else {
      res = { success: false, error: 'No user specified.' }
    }

    if (res.success) {
      setIssuedPassword(res.tempPassword || tempPassword.trim())
    } else {
      setError(res.error || 'Failed to issue temporary password.')
      setSubmitting(false)
    }
  }

  const handleFinish = () => {
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {issuedPassword ? 'Temporary Password Issued' : 'Issue Temporary Password'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {request ? `Request ID: ${request.id.slice(0, 8)}...` : 'Direct Helpline Assignment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={issuedPassword ? handleFinish : onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-left">
          {issuedPassword ? (
            /* Success View */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-white">Temporary Password Active in Database</p>
                  <p className="text-emerald-300/90 leading-relaxed">
                    The user can now log in using their email and this temporary password. Upon login, they will be strictly required to set their own permanent password.
                  </p>
                </div>
              </div>

              {/* Target User Info */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Employee Account
                </span>
                <p className="text-sm font-semibold text-white">{email}</p>
              </div>

              {/* Generated Temp Password Display */}
              <div className="rounded-xl bg-slate-950 border border-amber-700/50 p-4 space-y-2 text-center">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block font-bold">
                  Temporary Password to Provide User
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-bold tracking-widest text-white select-all">
                    {issuedPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(issuedPassword)}
                    className="p-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors cursor-pointer"
                    title="Copy Temporary Password"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Helpline Call reminder */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-300 text-xs">
                <PhoneCall className="h-4 w-4 text-blue-400 shrink-0" />
                <span>
                  Share this temporary password with the user when they call the Admin Helpline at{' '}
                  <strong className="text-white font-mono">7770002696</strong>.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            /* Issue Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Employee Detail Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    Requested For
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {request?.requestedAt ? new Date(request.requestedAt).toLocaleString() : 'Direct Helpline Request'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white">{email}</p>
              </div>

              {/* Instructions */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200/90 text-xs flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">How This Works</p>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    1. When you issue this temporary password, the system hashes it directly into PostgreSQL `auth.users`.<br />
                    2. The user will be required to change their password to their own permanent password on their first login.<br />
                    3. Provide this password to the employee when they call on helpline <strong>7770002696</strong>.
                  </p>
                </div>
              </div>

              {/* Temporary Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Temporary Password to Assign
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    required
                    className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono tracking-wider focus:border-blue-500 focus:outline-none"
                    placeholder="Enter or generate temporary password"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    title="Generate New Password"
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(tempPassword)}
                    title="Copy to clipboard"
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Minimum 6 characters. Contains letters, numbers, and symbols.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>Issuing...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Issue Temporary Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

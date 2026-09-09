import React, { useState } from 'react'
import { X, UserPlus, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Role, Department, Site } from '../../../types/rbac'
import { PeopleRepository } from '../../../repositories/admin/people-repository'

interface CreateUserModalProps {
  organizationId: string
  roles: Role[]
  departments: Department[]
  sites: Site[]
  onClose: () => void
  onSuccess: () => void
}

export function CreateUserModal({
  organizationId,
  roles,
  departments,
  sites,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'ADMIN' | 'USER'>('USER')
  const [customRoleId, setCustomRoleId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [siteId, setSiteId] = useState(sites.length > 0 ? sites[0].id : '')
  const [designation, setDesignation] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [phone, setPhone] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!fullName.trim()) {
      setErrorMessage('Please enter the user full name.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid corporate email address.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      setErrorMessage('Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).')
      return
    }

    setIsLoading(true)

    try {
      const result = await PeopleRepository.createUser({
        organizationId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        customRoleId: customRoleId || null,
        departmentId: departmentId || null,
        siteId: siteId || null,
        designation: designation.trim() || null,
        employeeCode: employeeCode.trim().toUpperCase() || null,
        phone: phone.trim() || null,
      })

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to create user.')
        return
      }

      setSuccessMessage(`User "${fullName.trim()}" created successfully! Login email: ${email.trim().toLowerCase()}`)
      setTimeout(() => {
        onSuccess()
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error during user creation.'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Create New User / Operator</h2>
              <p className="text-xs text-slate-400">Assign work email login, credentials, and organizational duties</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Notices */}
        <div className="px-6 pt-4 space-y-3">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-900/80 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-900/80 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Work Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@rachana.com"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Initial Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Initial Password <span className="text-rose-400">*</span> (min 6 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              User will log in using this email and password. They can reset it anytime via 5-minute OTP.
            </p>
          </div>

          {/* Role & Operational Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                System Role <span className="text-rose-400">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="USER">Standard User / Operator</option>
                <option value="ADMIN">System Administrator (Full Access)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Operational Role
              </label>
              <select
                value={customRoleId}
                onChange={(e) => setCustomRoleId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Select Duty Profile --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Site & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Assigned Site
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- None / All Sites --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- None / General --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone & Employee Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Phone Number
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Employee Code / ID
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. EMP-104"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono uppercase"
              />
            </div>
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Designation / Title
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Transit Mixer Operator / Assistant Store Keeper"
              disabled={isLoading}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-medium text-white transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

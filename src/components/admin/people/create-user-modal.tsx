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

    if (!siteId) {
      setErrorMessage('Please select an assigned site. Every user must be strictly bound to their designated project site.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create New User / Operator</h2>
              <p className="text-xs text-slate-500">Assign work email login, credentials, and organizational duties</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Notices */}
        <div className="px-6 pt-4 space-y-3">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@rachana.com"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Initial Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Initial Password <span className="text-rose-500">*</span> (min 6 characters)
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
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                System Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
              >
                <option value="USER">Standard User / Operator</option>
                <option value="ADMIN">System Administrator (Full Access)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Operational Role
              </label>
              <select
                value={customRoleId}
                onChange={(e) => setCustomRoleId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Assigned Site <span className="text-rose-500">* (Strict Site-Lock)</span>
              </label>
              <select
                required
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
              >
                <option value="">-- Select Specific Site --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                User is strictly locked to this site. Any new sites created later will not be accessible.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Phone Number
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none font-mono transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Employee Code / ID
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. EMP-104"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none font-mono uppercase transition-colors"
              />
            </div>
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Designation / Title
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Transit Mixer Operator / Assistant Store Keeper"
              disabled={isLoading}
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
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

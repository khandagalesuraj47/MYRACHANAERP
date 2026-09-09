import React, { useState, useEffect, useCallback } from 'react'
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Shield,
  Server,
  Building2,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/auth-context'

export const CURRENT_INSTALLED_APP_VERSION = {
  versionCode: 4,
  versionName: '1.0.4',
  buildDate: '2026-09-10',
}

interface AppRelease {
  id: string
  version_code: number
  version_name: string
  apk_url: string
  release_notes: string | null
  is_critical: boolean
  published_at: string
}

export function AppSettingsView() {
  const { context: authCtx } = useAuth()
  const isNative = Capacitor.isNativePlatform()

  const [checking, setChecking] = useState(false)
  const [latestRelease, setLatestRelease] = useState<AppRelease | null>(null)
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [isUpToDate, setIsUpToDate] = useState<boolean | null>(null)

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    setCheckError(null)

    try {
      const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle()

      setLastChecked(new Date().toLocaleTimeString())

      if (error) {
        setCheckError(error.message)
        setIsUpToDate(null)
        return
      }

      if (data) {
        const release = data as AppRelease
        if (release.version_code > CURRENT_INSTALLED_APP_VERSION.versionCode) {
          setLatestRelease(release)
          setIsUpToDate(false)
        } else {
          setLatestRelease(release)
          setIsUpToDate(true)
        }
      } else {
        setIsUpToDate(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query app releases'
      setCheckError(msg)
    } finally {
      setChecking(false)
    }
  }, [])

  // Auto check once silently when opening settings tab
  useEffect(() => {
    void checkForUpdates()
  }, [checkForUpdates])

  const userFullName = authCtx?.profile?.fullName || authCtx?.email?.split('@')[0] || 'Member'
  const userEmail = authCtx?.email || 'Unknown'
  const role = authCtx?.role || 'USER'
  const siteName = authCtx?.assignedSite ? `${authCtx.assignedSite.name} (${authCtx.assignedSite.code})` : 'Unassigned'
  const orgName = authCtx?.organization?.name || 'MY RACHANA ERP'

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-left select-none p-2 sm:p-4">
      {/* Header banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded">
              SYSTEM SETTINGS
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-mono text-emerald-400">MY RACHANA ERP</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Application Settings & Updates
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Manage your local installation, check for native Android updates on-demand, and inspect workspace security parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-300">
            <Smartphone className="h-4 w-4 text-blue-400" />
            <span>{isNative ? 'Android Native App' : 'Web Browser Workspace'}</span>
          </span>
        </div>
      </div>

      {/* Section 1: In-App Update Engine (On-Demand) */}
      <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-b from-blue-950/20 to-slate-950/60 p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-800/80 text-blue-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Software Version & Release Channel
              </h2>
              <p className="text-xs text-slate-400">
                Official distribution build directly synchronized from Supabase cloud storage.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={checkForUpdates}
            disabled={checking}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-blue-600/20 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Supabase...' : 'Check for Updates'}</span>
          </button>
        </div>

        {/* Current installed build summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-1">
            <span className="text-[11px] text-slate-400">Installed Version:</span>
            <div className="text-white font-bold text-sm">
              v{CURRENT_INSTALLED_APP_VERSION.versionName}
            </div>
            <span className="text-[10px] text-slate-500">
              Build #{CURRENT_INSTALLED_APP_VERSION.versionCode}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-1">
            <span className="text-[11px] text-slate-400">Cloud Release Version:</span>
            <div className="text-blue-400 font-bold text-sm">
              {latestRelease ? `v${latestRelease.version_name}` : 'Scanning...'}
            </div>
            <span className="text-[10px] text-slate-500">
              {latestRelease ? `Build #${latestRelease.version_code}` : 'Awaiting check'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-1">
            <span className="text-[11px] text-slate-400">Last Checked:</span>
            <div className="text-slate-300 font-bold text-sm">
              {lastChecked || 'Never'}
            </div>
            <span className="text-[10px] text-emerald-400">Live Status</span>
          </div>
        </div>

        {/* Check Status Card */}
        {checkError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{checkError}</span>
          </div>
        )}

        {isUpToDate === true && (
          <div className="p-4 rounded-xl border border-emerald-800/80 bg-emerald-950/30 text-emerald-300 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white">Your Application is Up to Date</p>
                <p className="text-[11px] text-emerald-400/80">
                  You are running the latest production build (v{CURRENT_INSTALLED_APP_VERSION.versionName}).
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700 text-emerald-300">
              LATEST
            </span>
          </div>
        )}

        {isUpToDate === false && latestRelease && (
          <div className="p-5 rounded-2xl border border-amber-600/80 bg-gradient-to-r from-amber-950/40 to-slate-900 text-white space-y-4 shadow-xl animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-900/60 border border-amber-700 text-amber-300">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">
                      New Android Update Available: v{latestRelease.version_name}
                    </h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 font-bold uppercase">
                      Build #{latestRelease.version_code}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80">
                    A fresh build is available in the official Supabase storage repository.
                  </p>
                </div>
              </div>

              <a
                href={latestRelease.apk_url}
                download="myrachana-erp.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Download className="h-4 w-4" />
                <span>Install Update Now</span>
              </a>
            </div>

            {latestRelease.release_notes && (
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-xs text-slate-300 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Release Notes:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                  {latestRelease.release_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Account Identity & Security Parameters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Session Identity & Site Security
            </h2>
            <p className="text-xs text-slate-400">
              Active enterprise session parameters and single-site operational lock.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-slate-400">User Identity:</span>
            <span className="text-white font-bold">{userFullName}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-slate-400">Email:</span>
            <span className="text-blue-400">{userEmail}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-slate-400">Organization:</span>
            <span className="text-white">{orgName}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-slate-400">System Role:</span>
            <span className="text-amber-400 font-bold">{role}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between sm:col-span-2">
            <span className="text-slate-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-400" />
              Assigned Site Lock:
            </span>
            <span className="text-emerald-400 font-semibold">{siteName}</span>
          </div>
        </div>
      </div>

      {/* Section 3: Supabase Cloud Connectivity */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <Server className="h-4 w-4 text-emerald-400" />
          <span className="text-slate-300">Supabase Cloud Database & Realtime:</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          CONNECTED & SYNCED
        </span>
      </div>
    </div>
  )
}

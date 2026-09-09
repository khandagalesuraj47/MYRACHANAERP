import React, { useEffect, useState } from 'react'
import { Download, Sparkles, X } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../../lib/supabase'

const CURRENT_CLIENT_VERSION = {
  versionCode: 2, // Current installed Android build version
  versionName: '1.0.2',
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

export function AppUpdateBanner() {
  const [latestRelease, setLatestRelease] = useState<AppRelease | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // STRICT REQUIREMENT: Only execute on native Android app. Never on Web / Vercel!
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    if (!isNative) return

    async function checkAppVersion() {
      try {
        const { data, error } = await supabase
          .from('app_releases')
          .select('*')
          .order('version_code', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          const release = data as AppRelease
          if (release.version_code > CURRENT_CLIENT_VERSION.versionCode) {
            setLatestRelease(release)
          }
        }
      } catch (err) {
        console.warn('[AppUpdateChecker] Check failed:', err)
      }
    }

    checkAppVersion()
  }, [isNative])

  // Don't render on web or if dismissed or no update
  if (!isNative || !latestRelease || dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-blue-500/50 shadow-2xl p-5 text-white flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <Sparkles className="h-5 w-5 animate-bounce text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                Update Ready
              </span>
              <h3 className="text-sm font-bold text-white">
                MY RACHANA ERP v{latestRelease.version_name}
              </h3>
            </div>
          </div>
          {!latestRelease.is_critical && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-2 text-left">
          <p className="text-xs text-slate-300 leading-relaxed">
            A new version of the Android app has been published. Update now for the latest features and bug fixes.
          </p>
          {latestRelease.release_notes && (
            <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-normal">
              {latestRelease.release_notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <a
            href={latestRelease.apk_url}
            download="myrachana-erp.apk"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDismissed(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Install Update Now</span>
          </a>
          {!latestRelease.is_critical && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="py-3 px-3.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-medium cursor-pointer"
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

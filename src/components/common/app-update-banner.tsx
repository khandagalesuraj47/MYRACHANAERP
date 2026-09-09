import React, { useEffect, useState } from 'react'
import { Download, Sparkles, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CURRENT_CLIENT_VERSION = {
  versionCode: 1, // Current base release; when Supabase has versionCode >= 2, update banner appears
  versionName: '1.0.0',
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

  useEffect(() => {
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
        console.warn('[AppUpdateBanner] Check failed:', err)
      }
    }

    checkAppVersion()
  }, [])

  if (!latestRelease || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="rounded-2xl border border-blue-500/40 bg-slate-950/95 backdrop-blur-md p-4 text-white shadow-2xl shadow-blue-900/30 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  Update Ready
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-900/50 border border-blue-700/50 text-blue-200">
                  v{latestRelease.version_name}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                New App Version Available
              </h4>
            </div>
          </div>

          {!latestRelease.is_critical && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {latestRelease.release_notes && (
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
            {latestRelease.release_notes}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <a
            href={latestRelease.apk_url}
            download="myrachana-erp.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download & Install APK</span>
          </a>

          {!latestRelease.is_critical && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

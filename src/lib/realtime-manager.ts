import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeChangeCallback = (payload: any) => void

interface SubscriptionEntry {
  table: string
  filter?: string
  callback: RealtimeChangeCallback
}

class RealtimeSyncManager {
  private channel: RealtimeChannel | null = null
  private subscriptions: Map<string, SubscriptionEntry> = new Map()
  private isSubscribed = false
  private heartbeatInterval: any = null
  private rebuildTimer: any = null
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.setupLifecycleListeners()
  }

  private setupLifecycleListeners() {
    if (typeof window === 'undefined') return

    // 1. Reconnect & trigger refresh when user returns to app/tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.ensureConnected()
        this.notifyAllListeners()
      }
    })

    window.addEventListener('focus', () => {
      this.ensureConnected()
      this.notifyAllListeners()
    })

    window.addEventListener('online', () => {
      this.reconnect()
      this.notifyAllListeners()
    })

    // 2. Subtle 15-second heartbeat to ensure data is always 100% fresh 24x7
    this.heartbeatInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.notifyAllListeners()
      }
    }, 15000)
  }

  public registerListener(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyAllListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch (e) {
        console.warn('[RealtimeSyncManager] Listener notification error:', e)
      }
    })
  }

  public subscribe(
    key: string,
    table: string,
    callback: RealtimeChangeCallback,
    filter?: string
  ): () => void {
    this.subscriptions.set(key, { table, callback, filter })
    this.queueRebuildChannel()

    return () => {
      this.subscriptions.delete(key)
      this.queueRebuildChannel()
    }
  }

  private queueRebuildChannel() {
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer)
    this.rebuildTimer = setTimeout(() => {
      this.rebuildChannel()
    }, 50)
  }

  private rebuildChannel() {
    if (this.channel) {
      void supabase.removeChannel(this.channel)
      this.channel = null
      this.isSubscribed = false
    }

    if (this.subscriptions.size === 0) return

    const channelName = `myrachana-erp-live-hub-${Date.now()}`
    let newChannel = supabase.channel(channelName)

    this.subscriptions.forEach((sub) => {
      const opts: any = {
        event: '*',
        schema: 'public',
        table: sub.table,
      }
      if (sub.filter) {
        opts.filter = sub.filter
      }

      newChannel = newChannel.on('postgres_changes', opts, (payload) => {
        try {
          sub.callback(payload)
        } catch (err) {
          console.error(`[RealtimeSyncManager] Error in ${sub.table} callback:`, err)
        }
      })
    })

    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.isSubscribed = true
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        this.isSubscribed = false
        setTimeout(() => this.reconnect(), 2000)
      }
    })

    this.channel = newChannel
  }

  public reconnect() {
    this.rebuildChannel()
  }

  private ensureConnected() {
    if (!this.isSubscribed || !this.channel) {
      this.reconnect()
    }
  }

  public destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.channel) {
      void supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.subscriptions.clear()
    this.listeners.clear()
  }
}

export const realtimeManager = new RealtimeSyncManager()

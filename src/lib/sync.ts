import { createClient, type Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import type { Food } from './foods'
import { actions, DEFAULT_STATE, getState, onLocalChange, type Entry, type Settings, type State } from './store'

// Public project URL + publishable key: safe to ship in the browser.
// Row Level Security makes sure each user can only read and write their own rows.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wdwxxctxooycopzlqgbs.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_eLPPU-BaN5P_Ljr6KgLcWQ_fIHO5a66'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'fityo:auth' },
})

// ── Sync status (observable) ────────────────────────────────────────────
export type SyncStatus = 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'
interface SyncInfo { status: SyncStatus; email: string | null; pending: number; error: string | null; lastSync: number | null }
let info: SyncInfo = { status: 'signed-out', email: null, pending: 0, error: null, lastSync: null }
const subs = new Set<() => void>()
const setInfo = (p: Partial<SyncInfo>) => { info = { ...info, ...p }; subs.forEach((s) => s()) }
export const useSync = () => useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l) }, () => info)

// ── Pending-changes queue (survives reloads and offline periods) ─────────
// `entries` maps entry id → change counter. At flush time an id that still exists
// locally is upserted; one that doesn't is deleted on the server.
const QKEY = 'fityo:queue'
interface Queue { entries: Record<string, number>; state: number }
function loadQueue(): Queue {
  try {
    const raw = localStorage.getItem(QKEY)
    if (raw) return JSON.parse(raw) as Queue
  } catch { /* ignore */ }
  // First run with sync: everything already logged on this device needs uploading.
  const s = getState()
  return { entries: Object.fromEntries(s.entries.map((e) => [e.id, 1])), state: s.entries.length || s.customFoods.length ? 1 : 0 }
}
let queue = loadQueue()
let tick = Math.max(0, queue.state, ...Object.values(queue.entries))
const saveQueue = () => {
  try { localStorage.setItem(QKEY, JSON.stringify(queue)) } catch { /* ignore */ }
  setInfo({ pending: Object.keys(queue.entries).length + (queue.state ? 1 : 0) })
}
saveQueue()

onLocalChange((c) => {
  tick++
  for (const id of c.entries ?? []) queue.entries[id] = tick
  if (c.state) queue.state = tick
  saveQueue()
  scheduleFlush()
})
actions.flushBackfill()

let session: Session | null = null
let flushTimer: number | undefined
let flushing = false
function scheduleFlush(delay = 700) {
  clearTimeout(flushTimer)
  flushTimer = window.setTimeout(flush, delay)
}

// ── Row mapping ──────────────────────────────────────────────────────────
interface EntryRow { id: string; user_id: string; date: string; meal: Entry['meal']; food_id: string; name: string; grams: number; kcal: number; p: number; c: number; f: number; fib: number; sug: number; na: number; per100: Entry['per100']; created_at: number }
const toRow = (e: Entry, uid: string): EntryRow => ({
  id: e.id, user_id: uid, date: e.date, meal: e.meal, food_id: e.foodId, name: e.name, grams: e.grams,
  kcal: e.kcal, p: e.p, c: e.c, f: e.f, fib: e.fib ?? 0, sug: e.sug ?? 0, na: e.na ?? 0, per100: e.per100, created_at: e.createdAt,
})
const fromRow = (r: EntryRow): Entry => ({
  id: r.id, date: r.date, meal: r.meal, foodId: r.food_id, name: r.name, grams: Number(r.grams),
  kcal: Math.round(Number(r.kcal)), p: Number(r.p), c: Number(r.c), f: Number(r.f),
  // Rows written before fiber was tracked have no fib in per100: leave undefined so the store backfills them.
  ...(r.per100?.fib != null ? { fib: Number(r.fib), sug: Number(r.sug), na: Math.round(Number(r.na)) } : {}),
  per100: r.per100, createdAt: Number(r.created_at),
})

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

// ── Push local changes ───────────────────────────────────────────────────
export async function flush() {
  if (!session || flushing) return
  const ids = Object.keys(queue.entries)
  if (!ids.length && !queue.state) { setInfo({ status: 'synced' }); return }
  if (!navigator.onLine) { setInfo({ status: 'offline' }); return }
  flushing = true
  setInfo({ status: 'syncing', error: null })
  const snap = { entries: { ...queue.entries }, state: queue.state }
  const uid = session.user.id
  try {
    const s = getState()
    const local = new Map(s.entries.map((e) => [e.id, e]))
    const ups = ids.filter((id) => local.has(id)).map((id) => toRow(local.get(id)!, uid))
    const dels = ids.filter((id) => !local.has(id))
    for (const part of chunk(ups, 500)) {
      const { error } = await supabase.from('entries').upsert(part)
      if (error) throw error
    }
    for (const part of chunk(dels, 200)) {
      const { error } = await supabase.from('entries').delete().in('id', part)
      if (error) throw error
    }
    if (snap.state) {
      const { error } = await supabase.from('user_state').upsert({
        user_id: uid, settings: s.settings, week_goals: s.weekGoals, custom_foods: s.customFoods, updated_at: new Date().toISOString(),
      })
      if (error) throw error
    }
    // Only clear what we sent and that hasn't changed again meanwhile.
    for (const [id, v] of Object.entries(snap.entries)) if (queue.entries[id] === v) delete queue.entries[id]
    if (queue.state === snap.state) queue.state = 0
    saveQueue()
    setInfo({ status: 'synced', lastSync: Date.now() })
  } catch (e) {
    setInfo({ status: navigator.onLine ? 'error' : 'offline', error: (e as Error).message })
    scheduleFlush(15000)
  } finally {
    flushing = false
    if (Object.keys(queue.entries).length || queue.state) {
      if (info.status === 'synced') scheduleFlush(300)
    }
  }
}

// ── Pull everything from the cloud and merge with pending local changes ──
let lastPull = 0
export async function pull() {
  if (!session) return
  if (!navigator.onLine) { setInfo({ status: 'offline' }); return }
  lastPull = Date.now()
  setInfo({ status: 'syncing', error: null })
  try {
    const rows: EntryRow[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('entries').select('*').order('created_at').range(from, from + 999)
      if (error) throw error
      rows.push(...(data as EntryRow[]))
      if (!data || data.length < 1000) break
    }
    const { data: st, error: stErr } = await supabase.from('user_state').select('*').maybeSingle()
    if (stErr) throw stErr

    const local = getState()
    const pending = new Set(Object.keys(queue.entries))
    const localById = new Map(local.entries.map((e) => [e.id, e]))
    const merged = new Map<string, Entry>()
    for (const r of rows) if (!pending.has(r.id)) merged.set(r.id, fromRow(r))
    for (const id of pending) { const e = localById.get(id); if (e) merged.set(id, e) } // pending upserts win; pending deletes stay deleted

    let next: State = { ...local, entries: [...merged.values()] }
    if (!queue.state) {
      if (st) {
        next = {
          ...next,
          settings: { ...DEFAULT_STATE.settings, ...(st.settings as Partial<Settings>) },
          weekGoals: (st.week_goals as Record<string, number>) ?? {},
          customFoods: (st.custom_foods as Food[]) ?? [],
        }
      } else {
        queue.state = ++tick // nothing in the cloud yet: upload this device's settings
        saveQueue()
      }
    }
    actions.hydrate(next)
    setInfo({ status: 'synced', lastSync: Date.now() })
    await flush()
  } catch (e) {
    setInfo({ status: navigator.onLine ? 'error' : 'offline', error: (e as Error).message })
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────
const appUrl = () => location.origin + location.pathname

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/** Returns true when the account still needs email confirmation. */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } })
  if (error) throw error
  return !data.session
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  await flush() // don't lose anything that hasn't been uploaded yet
  await supabase.auth.signOut()
  queue = { entries: {}, state: 0 }
  saveQueue()
  actions.clearLocal()
}

let recoveryHandler: (() => void) | null = null
export const onPasswordRecovery = (fn: () => void) => { recoveryHandler = fn }

let started = false
export function startSync() {
  if (started) return
  started = true
  supabase.auth.onAuthStateChange((event, s) => {
    const prevUser = session?.user.id
    session = s
    setInfo({ email: s?.user.email ?? null, status: s ? info.status === 'signed-out' ? 'syncing' : info.status : 'signed-out' })
    if (event === 'PASSWORD_RECOVERY') recoveryHandler?.()
    if (s && s.user.id !== prevUser) {
      // defer: supabase-js warns against awaiting inside this callback
      setTimeout(pull, 0)
    }
  })
  window.addEventListener('online', () => { if (session) pull() })
  window.addEventListener('offline', () => { if (session) setInfo({ status: 'offline' }) })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session && Date.now() - lastPull > 30_000) pull()
    if (document.visibilityState === 'hidden' && session) flush()
  })
}

import { useState } from 'react'
import { flush, pull, resetPassword, signIn, signOut, signUp, updatePassword, useSync } from '../lib/sync'
import { Icon } from './Icon'

const timeAgo = (t: number | null) => {
  if (!t) return 'never'
  const s = Math.round((Date.now() - t) / 1000)
  return s < 10 ? 'just now' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Small status pill for the top bar. */
export function SyncPill({ onOpen }: { onOpen: () => void }) {
  const { status, pending } = useSync()
  const map = {
    'signed-out': { icon: 'cloudOff', label: 'Sign in to sync', color: 'var(--amber)' },
    syncing: { icon: 'refresh', label: 'Syncing…', color: 'var(--cyan)' },
    synced: { icon: 'cloud', label: 'Synced', color: 'var(--green)' },
    offline: { icon: 'cloudOff', label: pending ? `Offline · ${pending} pending` : 'Offline', color: 'var(--text-2)' },
    error: { icon: 'cloudOff', label: 'Sync error', color: 'var(--red)' },
  }[status]
  return (
    <button className="chip sync-pill" onClick={onOpen} title={map.label} style={{ color: map.color }}>
      <Icon name={map.icon} size={15} /> <span className="sync-label">{map.label}</span>
    </button>
  )
}

/** Sign-in / sign-up form, or account details when signed in. */
export function AccountPanel({ toast, onDone }: { toast: (m: string) => void; onDone?: () => void }) {
  const sync = useSync()
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  if (sync.email) {
    return (
      <div className="stack" style={{ gap: 12 }}>
        <div className="row">
          <div className="avatar"><Icon name="user" size={18} /></div>
          <div className="grow">
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sync.email}</div>
            <div className="tiny muted">
              {sync.status === 'synced' && <>✓ Backed up · last sync {timeAgo(sync.lastSync)}</>}
              {sync.status === 'syncing' && 'Syncing…'}
              {sync.status === 'offline' && `Offline — ${sync.pending} change${sync.pending === 1 ? '' : 's'} will upload when you're back online`}
              {sync.status === 'error' && <span style={{ color: 'var(--red)' }}>Sync failed: {sync.error} — will retry</span>}
            </div>
          </div>
        </div>
        <div className="row wrap">
          <button className="btn btn-sm" onClick={() => { pull(); flush() }}><Icon name="refresh" size={14} /> Sync now</button>
          <button className="btn btn-sm btn-ghost" onClick={async () => { await signOut(); toast('Signed out'); onDone?.() }}>Sign out</button>
        </div>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null); setNote(null)
    try {
      if (mode === 'in') {
        await signIn(email.trim(), pw)
        toast('Signed in — syncing your log')
        onDone?.()
      } else if (mode === 'up') {
        const needsConfirm = await signUp(email.trim(), pw)
        if (needsConfirm) {
          setNote('Check your inbox and click the confirmation link, then come back here and sign in.')
          setMode('in')
        } else { toast('Account created — your log is now backed up'); onDone?.() }
      } else {
        await resetPassword(email.trim())
        setNote('Password reset email sent. Open the link in it to set a new password.')
        setMode('in')
      }
    } catch (e) {
      const m = (e as Error).message
      setErr(/email not confirmed/i.test(m) ? 'Please confirm your email first — check your inbox (and spam).' : m)
    } finally { setBusy(false) }
  }

  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
      <div className="small muted">
        {mode === 'up' ? 'Create an account so your log is saved in the cloud and works on all your devices.' : mode === 'forgot' ? 'We’ll email you a link to set a new password.' : 'Sign in to back up your log and sync across devices.'}
      </div>
      <input className="input" type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {mode !== 'forgot' && (
        <input className="input" type="password" required minLength={6} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} placeholder="Password (min 6 characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
      )}
      {err && <div className="err">{err}</div>}
      {note && <div className="badge good" style={{ whiteSpace: 'normal', padding: '8px 12px', fontSize: 13 }}>{note}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
      </button>
      <div className="row between tiny">
        {mode === 'in'
          ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode('up'); setErr(null) }}>New here? Create account</button>
          : <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode('in'); setErr(null) }}>Have an account? Sign in</button>}
        {mode === 'in' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode('forgot'); setErr(null) }}>Forgot password?</button>}
      </div>
    </form>
  )
}

export function AccountModal({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ width: 'min(440px, 100%)' }} role="dialog" aria-label="Account">
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2 className="h1" style={{ fontSize: 22 }}>Cloud backup</h2>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <AccountPanel toast={toast} onDone={onClose} />
      </div>
    </div>
  )
}

export function NewPasswordModal({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  return (
    <div className="overlay">
      <form className="sheet stack" style={{ width: 'min(440px, 100%)', gap: 12 }} onSubmit={async (e) => {
        e.preventDefault()
        try { await updatePassword(pw); toast('Password updated'); onClose() } catch (x) { setErr((x as Error).message) }
      }}>
        <h2 className="h1" style={{ fontSize: 22 }}>Set a new password</h2>
        <input className="input" type="password" minLength={6} required autoFocus placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn btn-primary" type="submit">Save password</button>
      </form>
    </div>
  )
}

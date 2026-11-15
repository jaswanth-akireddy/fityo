import { useEffect, useRef, useState } from 'react'
import { Icon } from './components/Icon'
import { Settings } from './components/Settings'
import { Today } from './components/Today'
import { Week } from './components/Week'
import { today } from './lib/store'

type Tab = 'today' | 'week' | 'settings'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Log', icon: 'today' },
  { id: 'week', label: 'Week', icon: 'week' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

function initialTab(): Tab {
  const h = location.hash.slice(1) as Tab
  return TABS.some((t) => t.id === h) ? h : 'today'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [date, setDate] = useState(today())
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => { history.replaceState(null, '', `#${tab}`) }, [tab])

  const toast = (m: string) => {
    setToastMsg(m)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastMsg(null), 2600)
  }

  const nav = (
    <>
      {TABS.map((t) => (
        <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
          <Icon name={t.icon} size={17} /> {t.label}
        </button>
      ))}
    </>
  )

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Icon name="bolt" size={18} stroke={2.4} /></span>fityo</div>
        <nav className="tabs">{nav}</nav>
      </header>
      <main>
        {tab === 'today' && <Today date={date} setDate={setDate} toast={toast} />}
        {tab === 'week' && <Week date={date} setDate={setDate} goToDay={(d) => { setDate(d); setTab('today') }} />}
        {tab === 'settings' && <Settings toast={toast} />}
      </main>
      <nav className="bottom-nav">{nav}</nav>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}

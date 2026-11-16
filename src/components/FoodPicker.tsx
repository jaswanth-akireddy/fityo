import { useEffect, useMemo, useState } from 'react'
import type { Food } from '../lib/foods'
import { allFoods, searchFoods, searchUSDA } from '../lib/nutrition'
import { useStore } from '../lib/store'
import { Icon } from './Icon'

interface Props {
  initialQuery?: string
  extra?: Food[] // e.g. USDA candidates already fetched for a draft
  onPick: (food: Food) => void
  autoFocus?: boolean
  placeholder?: string
}

export function FoodPicker({ initialQuery = '', extra = [], onPick, autoFocus, placeholder }: Props) {
  const { customFoods, settings } = useStore()
  const [q, setQ] = useState(initialQuery)
  const [online, setOnline] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [branded, setBranded] = useState(false)

  const local = useMemo(() => searchFoods(q, allFoods(customFoods), 8), [q, customFoods])

  useEffect(() => { setOnline([]); setErr(null) }, [q])

  async function goOnline(b = branded) {
    if (!q.trim()) return
    setLoading(true); setErr(null)
    try { setOnline(await searchUSDA(q, settings.usdaKey, b)) }
    catch (e) { setErr((e as Error).message || 'Could not reach USDA') }
    finally { setLoading(false) }
  }

  const seen = new Set<string>()
  const list = [...local, ...extra, ...online].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))

  return (
    <div>
      <div className="row">
        <div className="grow" style={{ position: 'relative' }}>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            value={q}
            autoFocus={autoFocus}
            placeholder={placeholder ?? 'Search foods — e.g. paneer, banana, oats'}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { if (local[0] && !online.length) onPick(local[0]); else goOnline() } }}
          />
          <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }}><Icon name="search" size={16} /></span>
        </div>
        <button className="btn" onClick={() => goOnline()} disabled={!q.trim() || loading} title="Search the USDA food database">
          <Icon name="globe" size={16} /> {loading ? 'Searching…' : 'USDA'}
        </button>
      </div>
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      {online.length > 0 && (
        <div className="row tiny muted" style={{ marginTop: 8 }}>
          <div className="seg">
            <button className={!branded ? 'on' : ''} onClick={() => { setBranded(false); goOnline(false) }}>Generic</button>
            <button className={branded ? 'on' : ''} onClick={() => { setBranded(true); goOnline(true) }}>Branded</button>
          </div>
          <span>values per 100 g</span>
        </div>
      )}
      {q.trim() && (
        <div className="results">
          {list.map((f) => (
            <button key={f.id} className="result" onClick={() => onPick(f)}>
              <div className="grow">
                <div className="r-name">{f.name}</div>
                <div className="r-meta">P {f.p}g · C {f.c}g · F {f.f}g · Fiber {f.fib ?? 0}g per 100 g</div>
              </div>
              <div className="row">
                {f.id.startsWith('usda:') && <span className="badge usda">USDA</span>}
                {f.id.startsWith('custom:') && <span className="badge">Mine</span>}
                <span className="num" style={{ fontWeight: 600 }}>{f.kcal}</span>
                <span className="tiny muted">kcal</span>
              </div>
            </button>
          ))}
          {!list.length && !loading && (
            <div className="empty">No local match. Hit <b>USDA</b> to search 300k+ foods online.</div>
          )}
        </div>
      )}
    </div>
  )
}

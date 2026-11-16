import { useMemo, useState } from 'react'
import type { Food } from '../lib/foods'
import { allFoods, bestMatch, macrosFor, searchUSDA } from '../lib/nutrition'
import { describeAmount, detectMeal, parseFoodText } from '../lib/parser'
import { speechSupported, useSpeech } from '../lib/speech'
import { actions, addDays, fromISO, goalsOf, MEALS, sumEntries, today, useStore, type Entry, type Meal, type Totals } from '../lib/store'
import { FoodPicker } from './FoodPicker'
import { Icon } from './Icon'
import { ReviewSheet, type Draft } from './ReviewSheet'

const guessMeal = (): Meal => {
  const h = new Date().getHours()
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner'
}

export function prettyDate(iso: string) {
  const t = today()
  if (iso === t) return 'Today'
  if (iso === addDays(t, -1)) return 'Yesterday'
  if (iso === addDays(t, 1)) return 'Tomorrow'
  return fromISO(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function Today({ date, setDate, toast }: { date: string; setDate: (d: string) => void; toast: (m: string) => void }) {
  const { entries, settings, customFoods } = useStore()
  const [text, setText] = useState('')
  const [drafts, setDraftsState] = useState<Draft[] | null>(null)
  const [heard, setHeard] = useState('')
  const [meal, setMeal] = useState<Meal>(guessMeal())
  const [showSearch, setShowSearch] = useState(false)

  const setDrafts = (fn: (d: Draft[]) => Draft[]) => setDraftsState((d) => (d ? fn(d) : d))

  const dayEntries = useMemo(() => entries.filter((e) => e.date === date), [entries, date])
  const totals = sumEntries(dayEntries)

  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: Entry[] = []
    for (const e of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
      if (seen.has(e.foodId)) continue
      seen.add(e.foodId); out.push(e)
      if (out.length >= 8) break
    }
    return out
  }, [entries])

  function openDrafts(list: Draft[], said: string) {
    setHeard(said)
    setDraftsState(list)
  }

  function interpret(input: string) {
    const items = parseFoodText(input)
    if (!items.length) { toast("Couldn't find any foods in that — try “200 g chicken and 1 cup rice”"); return }
    const m = detectMeal(input)
    if (m) setMeal(m)
    const pool = allFoods(customFoods)
    const list: Draft[] = items.map((it, i) => {
      const food = bestMatch(it.text, pool)
      return {
        key: `${Date.now()}-${i}`,
        said: `${describeAmount(it.qty, it.unit)} ${it.text}`,
        query: it.text,
        qty: it.qty,
        unit: it.unit,
        food,
        options: [],
        status: food ? 'ok' : 'searching',
      }
    })
    openDrafts(list, input)
    setText('')
    // Look up anything we don't know locally in USDA
    for (const d of list.filter((x) => !x.food)) {
      searchUSDA(d.query, settings.usdaKey)
        .then((res: Food[]) => setDrafts((ds) => ds.map((x) => (x.key === d.key ? { ...x, food: res[0] ?? null, options: res, status: res[0] ? 'ok' : 'notfound' } : x))))
        .catch(() => setDrafts((ds) => ds.map((x) => (x.key === d.key ? { ...x, status: 'notfound' } : x))))
    }
  }

  const speech = useSpeech(settings.speechLang, interpret)

  function quickAdd(food: Food, label = food.name) {
    openDrafts([{ key: String(Date.now()), said: label, query: food.name, qty: null, unit: null, food, options: [], status: 'ok' }], '')
    setShowSearch(false)
  }

  const goal = settings.dailyGoal
  const goals = goalsOf(settings)
  const left = goal - totals.kcal

  return (
    <div className="grid grid-today">
      {/* ── Left column: summary ── */}
      <div className="stack">
        <div className="card c-summary">
          <div className="row between" style={{ marginBottom: 8 }}>
            <div className="datenav">
              <button className="btn btn-ghost icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="left" /></button>
              <div className="label">{prettyDate(date)}</div>
              <button className="btn btn-ghost icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><Icon name="right" /></button>
            </div>
            {date !== today() && <button className="btn btn-sm" onClick={() => setDate(today())}>Today</button>}
          </div>
          <Ring value={totals.kcal} goal={goal} />
          <div className="row between small" style={{ margin: '4px 0 18px' }}>
            <div><div className="muted tiny">Eaten</div><b className="num" style={{ fontSize: 18 }}>{totals.kcal}</b></div>
            <div style={{ textAlign: 'center' }}><div className="muted tiny">Goal</div><b className="num" style={{ fontSize: 18 }}>{goal}</b></div>
            <div style={{ textAlign: 'right' }}><div className="muted tiny">{settings.maintenance >= totals.kcal ? 'Deficit' : 'Surplus'}</div><b className="num" style={{ fontSize: 18, color: settings.maintenance >= totals.kcal ? 'var(--green)' : 'var(--red)' }}>{Math.abs(settings.maintenance - totals.kcal)}</b></div>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <Macro label="Protein" value={totals.p} goal={goals.p} color="var(--protein)" />
            <Macro label="Carbs" value={totals.c} goal={goals.c} color="var(--carbs)" />
            <Macro label="Fat" value={totals.f} goal={goals.f} color="var(--fat)" />
            <Macro label="Fiber" value={totals.fib} goal={goals.fib} color="var(--fiber)" />
          </div>
          <div className="sub-title">Keep under</div>
          <div className="stack" style={{ gap: 12 }}>
            <Macro label="Sugar" value={totals.sug} goal={goals.sug} color="var(--sugar)" limit />
            <Macro label="Sodium" value={totals.na} goal={goals.na} unit="mg" color="var(--sodium)" limit />
          </div>
          <CalorieSplit t={totals} />
          {left < 0 && <div className="badge warn" style={{ marginTop: 14 }}>{-left} kcal over today’s goal</div>}
        </div>
      </div>

      {/* ── Right column: logging ── */}
      <div className="stack">
        <div className="card voice c-voice">
          <div className="row" style={{ gap: 18 }}>
            <button
              className={`mic ${speech.listening ? 'on' : ''}`}
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-label={speech.listening ? 'Stop listening' : 'Start voice logging'}
            >
              <Icon name={speech.listening ? 'stop' : 'mic'} size={30} stroke={2.2} />
            </button>
            <div className="grow">
              <div className="card-title" style={{ margin: '0 0 4px' }}>
                {speech.listening ? <><span className="wave"><i /><i /><i /><i /><i /></span> Listening… tap to finish</> : 'Voice log'}
              </div>
              <div className={`transcript ${speech.transcript ? '' : 'placeholder'}`}>
                {speech.transcript || (speechSupported ? '“I had 200 grams of chicken, 200 grams of rice and 100 grams of dal”' : 'Voice needs Chrome, Edge or Safari — you can type below.')}
              </div>
              {speech.error && <div className="err" style={{ marginTop: 6 }}>{speech.error}</div>}
            </div>
          </div>
          <form className="compose" onSubmit={(e) => { e.preventDefault(); if (text.trim()) interpret(text) }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="…or type it: 2 rotis, 1 bowl dal, 150g paneer" />
            <button className="btn btn-primary" type="submit" disabled={!text.trim()}><Icon name="send" size={16} /></button>
            <button className="btn" type="button" onClick={() => setShowSearch((s) => !s)} title="Search foods"><Icon name="search" size={16} /></button>
          </form>
          {showSearch && <div style={{ marginTop: 14 }}><FoodPicker autoFocus onPick={(f) => quickAdd(f)} /></div>}
          {recent.length > 0 && !showSearch && (
            <div className="row wrap" style={{ marginTop: 14, gap: 6 }}>
              <span className="tiny muted" style={{ marginRight: 2 }}>Recent</span>
              {recent.map((e) => {
                const food: Food = { id: e.foodId, name: e.name, aliases: [], fib: 0, sug: 0, na: 0, ...e.per100 }
                const pool = allFoods(customFoods).find((f) => f.id === e.foodId)
                return (
                  <button key={e.id} className="chip" onClick={() => quickAdd(pool ?? food)}>
                    <Icon name="plus" size={12} /> {e.name.split(/[(·,]/)[0].trim()}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="card c-meals">
          <div className="card-title"><Icon name="flame" size={15} /> {prettyDate(date)}’s meals</div>
          {MEALS.map((m) => {
            const list = dayEntries.filter((e) => e.meal === m.id).sort((a, b) => a.createdAt - b.createdAt)
            const kcal = list.reduce((a, e) => a + e.kcal, 0)
            return (
              <div className="meal" key={m.id}>
                <div className="meal-head">
                  <h3>{m.emoji} {m.label}</h3>
                  <div className="row">
                    <span className="num small" style={{ color: 'var(--text-2)' }}>{kcal} kcal</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setMeal(m.id); setShowSearch(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name="plus" size={14} /></button>
                  </div>
                </div>
                {list.length === 0 ? <div className="tiny muted" style={{ padding: '2px 0 4px' }}>Nothing logged</div> : list.map((e) => <EntryRow key={e.id} e={e} />)}
              </div>
            )
          })}
        </div>
      </div>

      {drafts && (
        <ReviewSheet
          drafts={drafts}
          setDrafts={setDrafts}
          meal={meal}
          setMeal={setMeal}
          date={date}
          transcript={heard}
          onClose={() => setDraftsState(null)}
          onLogged={(n, kcal) => { setDraftsState(null); toast(`Logged ${n} item${n === 1 ? '' : 's'} · ${kcal} kcal`) }}
        />
      )}
    </div>
  )
}

function EntryRow({ e }: { e: Entry }) {
  const [editing, setEditing] = useState(false)
  const [grams, setGrams] = useState(String(e.grams))
  const save = () => {
    const g = Math.max(0, +grams || 0)
    actions.updateEntry(e.id, { grams: g, ...macrosFor(e.per100, g) })
    setEditing(false)
  }
  return (
    <div className="entry">
      <div className="grow">
        <div className="name">{e.name}</div>
        {editing ? (
          <form className="row" style={{ marginTop: 6 }} onSubmit={(ev) => { ev.preventDefault(); save() }}>
            <input className="input num" style={{ width: 100, padding: '6px 10px' }} type="number" value={grams} autoFocus onChange={(ev) => setGrams(ev.target.value)} />
            <span className="tiny muted">g</span>
            <button className="btn btn-sm btn-primary" type="submit">Save</button>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        ) : (
          <div className="meta">{e.grams} g · P {Math.round(e.p)} · C {Math.round(e.c)} · F {Math.round(e.f)} · Fiber {Math.round(e.fib ?? 0)}</div>
        )}
      </div>
      {!editing && (
        <div className="actions">
          <button className="btn btn-ghost icon-btn" onClick={() => setEditing(true)} aria-label="Edit amount"><Icon name="edit" size={15} /></button>
          <button className="btn btn-ghost icon-btn btn-danger" onClick={() => actions.removeEntry(e.id)} aria-label="Delete"><Icon name="trash" size={15} /></button>
        </div>
      )}
      <div className="kcal num">{e.kcal}<span className="tiny muted"> kcal</span></div>
    </div>
  )
}

function Ring({ value, goal }: { value: number; goal: number }) {
  const size = 220, sw = 16, r = (size - sw) / 2, c = 2 * Math.PI * r
  const pct = goal > 0 ? value / goal : 0
  const over = pct > 1
  const left = goal - value
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={over ? '#ffb547' : '#b5f23d'} />
            <stop offset="1" stopColor={over ? '#ff5d6c' : '#2fd6f0'} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={sw} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#ringG)" strokeWidth={sw} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(pct, 1))}
          style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="ring-center">
        <div>
          <div className="big num">{Math.abs(left)}</div>
          <div className="sub">{left >= 0 ? 'kcal left' : 'kcal over'}</div>
        </div>
      </div>
    </div>
  )
}

function Macro({ label, value, goal, color, unit = 'g', limit }: { label: string; value: number; goal: number; color: string; unit?: string; limit?: boolean }) {
  const pct = value / Math.max(goal, 1)
  const over = limit && pct > 1
  const hit = !limit && pct >= 1
  return (
    <div className="macro">
      <div className="kv">
        <span style={{ color: 'var(--text-2)' }}>
          {label}
          {hit && <span className="badge good" style={{ marginLeft: 6 }}>✓ goal</span>}
          {over && <span className="badge bad" style={{ marginLeft: 6 }}>over limit</span>}
        </span>
        <span><b className="num">{Math.round(value).toLocaleString()}</b><span className="muted"> / {goal.toLocaleString()} {unit}{limit ? ' max' : ''}</span></span>
      </div>
      <div className="bar"><div style={{ width: `${Math.min(100, pct * 100)}%`, background: over ? 'var(--red)' : color }} /></div>
    </div>
  )
}

/** Share of calories from protein / carbs / fat (4 / 4 / 9 kcal per gram). */
function CalorieSplit({ t }: { t: Totals }) {
  const parts = [
    { label: 'Protein', kcal: t.p * 4, color: 'var(--protein)' },
    { label: 'Carbs', kcal: t.c * 4, color: 'var(--carbs)' },
    { label: 'Fat', kcal: t.f * 9, color: 'var(--fat)' },
  ]
  const sum = parts.reduce((a, p) => a + p.kcal, 0)
  return (
    <>
      <div className="sub-title">Calories from</div>
      {sum === 0 ? (
        <div className="tiny muted">Log food to see your protein / carbs / fat split.</div>
      ) : (
        <>
          <div className="split-bar">
            {parts.map((p) => p.kcal > 0 && <div key={p.label} title={`${p.label}: ${Math.round((p.kcal / sum) * 100)}%`} style={{ flex: p.kcal, background: p.color }} />)}
          </div>
          <div className="row between tiny" style={{ marginTop: 8 }}>
            {parts.map((p) => (
              <span key={p.label} className="row" style={{ gap: 6 }}>
                <i className="dot" style={{ background: p.color }} />
                <span className="muted">{p.label}</span>
                <b className="num">{Math.round((p.kcal / sum) * 100)}%</b>
              </span>
            ))}
          </div>
        </>
      )}
    </>
  )
}

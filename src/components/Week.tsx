import { useMemo, useState } from 'react'
import { actions, addDays, fromISO, goalsOf, NUTRIENTS, sumEntries, today, useStore, weekDays, weekStart, type Entry, type NutrientKey, type Totals } from '../lib/store'
import { Icon } from './Icon'

const KCAL_PER_KG_FAT = 7700
const fmt = (n: number) => Math.round(n).toLocaleString()
const dShort = (iso: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => fromISO(iso).toLocaleDateString(undefined, o)

export interface WeekStats {
  start: string
  days: { date: string; kcal: number; logged: boolean; t: Totals }[]
  consumed: number
  budget: number
  loggedDays: number
  deficit: number // vs maintenance, on logged days only
  targetDeficit: number
  avg: number
  status: 'past' | 'current' | 'future'
  daysLeft: number
  avgs: Totals // per logged day
}

export function computeWeek(start: string, entries: Entry[], weekGoals: Record<string, number>, dailyGoal: number, maintenance: number): WeekStats {
  const t = today()
  const end = addDays(start, 6)
  const byDay = weekDays(start).map((date) => {
    const list = entries.filter((e) => e.date === date)
    const t = sumEntries(list)
    return { date, kcal: t.kcal, t, logged: list.length > 0 }
  })
  const consumed = byDay.reduce((a, d) => a + d.kcal, 0)
  const loggedDays = byDay.filter((d) => d.logged).length
  const budget = weekGoals[start] ?? dailyGoal * 7
  const status = end < t ? 'past' : start > t ? 'future' : 'current'
  return {
    start,
    days: byDay,
    consumed,
    budget,
    loggedDays,
    deficit: maintenance * loggedDays - consumed,
    targetDeficit: maintenance * 7 - budget,
    avg: loggedDays ? consumed / loggedDays : 0,
    status,
    daysLeft: status === 'current' ? byDay.filter((d) => d.date >= t).length : status === 'future' ? 7 : 0,
    avgs: Object.fromEntries(
      NUTRIENTS.map((n) => [n.key, loggedDays ? byDay.reduce((a, d) => a + d.t[n.key], 0) / loggedDays : 0]),
    ) as Totals,
  }
}

export function Week({ date, setDate, goToDay }: { date: string; setDate: (d: string) => void; goToDay: (d: string) => void }) {
  const { entries, weekGoals, settings } = useStore()
  const start = weekStart(date)
  const w = useMemo(() => computeWeek(start, entries, weekGoals, settings.dailyGoal, settings.maintenance), [start, entries, weekGoals, settings])
  const [goalInput, setGoalInput] = useState<string | null>(null)
  const [metric, setMetric] = useState<NutrientKey>('kcal')
  const meta = NUTRIENTS.find((n) => n.key === metric)!
  const goals = goalsOf(settings)

  const history = useMemo(() => {
    if (!entries.length) return []
    const first = weekStart(entries.reduce((m, e) => (e.date < m ? e.date : m), entries[0].date))
    const out: WeekStats[] = []
    for (let s = weekStart(today()); s >= first && out.length < 12; s = addDays(s, -7)) {
      out.push(computeWeek(s, entries, weekGoals, settings.dailyGoal, settings.maintenance))
    }
    return out
  }, [entries, weekGoals, settings])

  const usedPct = w.budget ? (w.consumed / w.budget) * 100 : 0
  const remaining = w.budget - w.consumed
  const allowance = w.daysLeft ? remaining / w.daysLeft : 0
  const fatKg = w.deficit / KCAL_PER_KG_FAT
  const setGoal = () => {
    const v = Math.round(+(goalInput ?? ''))
    actions.setWeekGoal(start, v > 0 ? v : null)
    setGoalInput(null)
  }

  return (
    <div className="stack">
      <div className="row between wrap">
        <div>
          <div className="sub">Week of</div>
          <h1 className="h1">{dShort(start)} – {dShort(addDays(start, 6))}</h1>
        </div>
        <div className="datenav">
          <button className="btn icon-btn" onClick={() => setDate(addDays(start, -7))} aria-label="Previous week"><Icon name="left" /></button>
          <button className="btn btn-sm" onClick={() => setDate(today())} disabled={w.status === 'current'}>This week</button>
          <button className="btn icon-btn" onClick={() => setDate(addDays(start, 7))} aria-label="Next week"><Icon name="right" /></button>
        </div>
      </div>

      <Report w={w} fatKg={fatKg} allowance={allowance} />

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title"><Icon name="target" size={15} /> Weekly goal</div>
          {goalInput == null ? (
            <div className="row between">
              <div>
                <div className="num" style={{ fontSize: 32, fontWeight: 700 }}>{fmt(w.budget)} <span className="small muted">kcal</span></div>
                <div className="tiny muted">
                  {weekGoals[start] ? 'Custom for this week' : `Default · ${fmt(settings.dailyGoal)} × 7 days`} · ≈ {fmt(w.budget / 7)}/day
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => setGoalInput(String(w.budget))}><Icon name="edit" size={14} /> Set</button>
            </div>
          ) : (
            <form className="stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); setGoal() }}>
              <div className="row">
                <input className="input num" type="number" autoFocus value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
                <span className="small muted">kcal / week</span>
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                {[250, 500, 750].map((d) => (
                  <button type="button" key={d} className="chip" onClick={() => setGoalInput(String((settings.maintenance - d) * 7))}>
                    −{d}/day ({fmt((d * 7) / KCAL_PER_KG_FAT * 1000)} g fat)
                  </button>
                ))}
              </div>
              <div className="row">
                <button className="btn btn-primary btn-sm" type="submit">Save goal</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setGoalInput(null)}>Cancel</button>
                {weekGoals[start] && <button className="btn btn-ghost btn-sm" type="button" onClick={() => { actions.setWeekGoal(start, null); setGoalInput(null) }}>Reset to default</button>}
              </div>
            </form>
          )}
          <div style={{ marginTop: 18 }}>
            <div className="kv" style={{ marginBottom: 8 }}>
              <span className="muted">Used {fmt(w.consumed)} of {fmt(w.budget)}</span>
              <b className="num">{Math.round(usedPct)}%</b>
            </div>
            <div className={`progress ${usedPct > 100 ? 'over' : ''}`}><div style={{ width: `${Math.min(usedPct, 100)}%` }} /></div>
          </div>
          <div className="tiny muted" style={{ marginTop: 12 }}>
            Planned deficit: <b style={{ color: 'var(--text)' }}>{fmt(w.targetDeficit)} kcal</b> vs maintenance ({fmt(settings.maintenance)}/day)
            {w.targetDeficit > 0 && <> ≈ {(w.targetDeficit / KCAL_PER_KG_FAT).toFixed(2)} kg fat</>}
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <Stat label="Consumed" value={fmt(w.consumed)} hint={`${w.loggedDays}/7 days logged`} />
          <Stat label="Daily average" value={fmt(w.avg)} hint="on logged days" />
          <Stat
            label={w.deficit >= 0 ? 'Deficit' : 'Surplus'}
            value={fmt(Math.abs(w.deficit))}
            hint="vs maintenance, logged days"
            color={w.deficit >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          <Stat label="Est. fat change" value={`${fatKg >= 0 ? '−' : '+'}${Math.abs(fatKg).toFixed(2)} kg`} hint="7,700 kcal ≈ 1 kg" color={fatKg >= 0 ? 'var(--green)' : 'var(--red)'} />
        </div>
      </div>

      <div className="card">
        <div className="row between wrap" style={{ marginBottom: 10, gap: 10 }}>
          <div className="seg">
            {NUTRIENTS.map((n) => <button key={n.key} className={metric === n.key ? 'on' : ''} onClick={() => setMetric(n.key)}>{n.label}</button>)}
          </div>
          <div className="row tiny muted" style={{ gap: 14 }}>
            <span className="row" style={{ gap: 6 }}><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke={meta.limit ? 'var(--red)' : 'var(--lime)'} strokeWidth="2" /></svg> {metric === 'kcal' ? 'Daily target' : meta.limit ? 'Daily limit' : 'Daily goal'}</span>
            {metric === 'kcal' && <span className="row" style={{ gap: 6 }}><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="var(--text-2)" strokeWidth="2" strokeDasharray="4 3" /></svg> Maintenance</span>}
          </div>
        </div>
        <BarChart
          days={w.days.map((d) => ({ date: d.date, v: d.t[metric], logged: d.logged }))}
          target={metric === 'kcal' ? w.budget / 7 : goals[metric]}
          maintenance={metric === 'kcal' ? settings.maintenance : undefined}
          unit={meta.unit}
          color={meta.color}
          kind={metric === 'kcal' ? 'kcal' : meta.limit ? 'limit' : 'goal'}
          onPick={goToDay}
        />
      </div>

      <NutrientAverages w={w} goals={goals} />
      <DayTable w={w} goals={goals} onPick={goToDay} />

      {history.length > 0 && (
        <div className="card">
          <div className="card-title">History</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="hist">
              <thead>
                <tr><th>Week</th><th className="right">Eaten</th><th className="right">Goal</th><th className="right">Deficit</th><th className="right">Days</th><th className="right">Result</th></tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const ok = h.consumed <= h.budget
                  return (
                    <tr key={h.start} className="clickable" onClick={() => setDate(h.start)}>
                      <td>{dShort(h.start)}{h.status === 'current' && <span className="badge" style={{ marginLeft: 8 }}>now</span>}</td>
                      <td className="right num">{fmt(h.consumed)}</td>
                      <td className="right num muted">{fmt(h.budget)}</td>
                      <td className="right num" style={{ color: h.deficit >= 0 ? 'var(--green)' : 'var(--red)' }}>{h.deficit >= 0 ? '−' : '+'}{fmt(Math.abs(h.deficit))}</td>
                      <td className="right num muted">{h.loggedDays}/7</td>
                      <td className="right">
                        {h.status === 'current' ? <span className="badge">In progress</span> : ok ? <span className="badge good">✓ Under</span> : <span className="badge bad">✕ Over</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Report({ w, fatKg, allowance }: { w: WeekStats; fatKg: number; allowance: number }) {
  const diff = w.budget - w.consumed
  if (w.status === 'future') {
    return <div className="report"><div className="tiny muted">UPCOMING WEEK</div><div className="verdict">Set your goal ahead of time</div><div className="sub">Budget: {fmt(w.budget)} kcal · planned deficit {fmt(w.targetDeficit)} kcal.</div></div>
  }
  if (w.status === 'past') {
    const ok = diff >= 0
    return (
      <div className={`report ${ok ? '' : 'over'}`}>
        <div className="tiny muted">WEEK REPORT</div>
        <div className="verdict">{w.loggedDays === 0 ? 'Nothing logged this week' : ok ? `🎉 Goal hit — ${fmt(diff)} kcal under budget` : `${fmt(-diff)} kcal over budget`}</div>
        {w.loggedDays > 0 && (
          <div className="sub">
            You ate <b>{fmt(w.consumed)}</b> kcal across {w.loggedDays} logged day{w.loggedDays === 1 ? '' : 's'} (avg {fmt(w.avg)}/day).{' '}
            That’s a <b style={{ color: w.deficit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(Math.abs(w.deficit))} kcal {w.deficit >= 0 ? 'deficit' : 'surplus'}</b> vs maintenance —
            roughly <b>{Math.abs(fatKg).toFixed(2)} kg</b> of fat {fatKg >= 0 ? 'lost' : 'gained'}.
            {w.loggedDays < 7 && <> <span className="muted">({7 - w.loggedDays} unlogged day{7 - w.loggedDays === 1 ? '' : 's'} not counted.)</span></>}
          </div>
        )}
      </div>
    )
  }
  const onTrack = diff >= 0
  return (
    <div className={`report ${onTrack ? '' : 'over'}`}>
      <div className="tiny muted">THIS WEEK SO FAR</div>
      <div className="verdict">
        {onTrack ? <>{fmt(diff)} kcal left this week</> : <>{fmt(-diff)} kcal over the weekly budget</>}
      </div>
      <div className="sub">
        {onTrack
          ? <>Spread it out: about <b>{fmt(allowance)} kcal/day</b> for the remaining {w.daysLeft} day{w.daysLeft === 1 ? '' : 's'} (including today). </>
          : <>Eat at maintenance or a little below for the rest of the week to limit the damage. </>}
        Current deficit: <b style={{ color: w.deficit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(w.deficit)} kcal</b> ({fatKg >= 0 ? '−' : '+'}{Math.abs(fatKg).toFixed(2)} kg).
      </div>
    </div>
  )
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value num" style={{ color }}>{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

interface ChartDay { date: string; v: number; logged: boolean }
type ChartKind = 'kcal' | 'goal' | 'limit'

const niceStep = (max: number) => {
  const raw = max / 5
  const pow = 10 ** Math.floor(Math.log10(raw || 1))
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10
}

function BarChart({ days, target, maintenance, unit, color, kind, onPick }: {
  days: ChartDay[]; target: number; maintenance?: number; unit: string; color: string; kind: ChartKind; onPick: (d: string) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 700, H = 260, padL = 48, padR = 8, padT = 16, padB = 34
  const max = Math.max(maintenance ?? 0, target, ...days.map((d) => d.v)) * 1.12 || 1
  const step = niceStep(max)
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
  const iw = W - padL - padR, ih = H - padT - padB
  const y = (v: number) => padT + ih - (v / max) * ih
  const bw = (iw / 7) * 0.5
  const x = (i: number) => padL + (iw / 7) * (i + 0.5)
  const t = today()
  const tick = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(+v.toFixed(1)))
  const isOver = (v: number) => kind !== 'goal' && v > target
  const hd = hover != null ? days[hover] : null

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Daily ${unit} this week`}>
        <defs>
          <linearGradient id="barG" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#2fd6f0" />
            <stop offset="1" stopColor="#b5f23d" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b7584">{tick(v)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const h = Math.max(0, ih - (y(d.v) - padT))
          const r = Math.min(4, h / 2)
          const x0 = x(i) - bw / 2, y0 = y(d.v)
          const fill = isOver(d.v) ? '#ffb547' : kind === 'kcal' ? 'url(#barG)' : color
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick(d.date)} style={{ cursor: 'pointer' }}>
              <rect x={x(i) - iw / 14} y={padT} width={iw / 7} height={ih} fill={hover === i ? 'rgba(255,255,255,0.04)' : 'transparent'} rx="8" />
              {h > 0 && (
                <path
                  d={`M${x0},${padT + ih} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${padT + ih} Z`}
                  fill={fill}
                  opacity={hover == null || hover === i ? 1 : 0.55}
                />
              )}
              {d.logged && <text x={x(i)} y={y0 - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#a4adbb">{fmt(d.v)}</text>}
              <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="12" fontWeight={d.date === t ? 700 : 500} fill={d.date === t ? '#eef2f7' : '#6b7584'}>
                {fromISO(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </text>
            </g>
          )
        })}
        {maintenance != null && <line x1={padL} x2={W - padR} y1={y(maintenance)} y2={y(maintenance)} stroke="#a4adbb" strokeWidth="1.5" strokeDasharray="5 4" pointerEvents="none" />}
        <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke={kind === 'limit' ? '#ff5d6c' : '#b5f23d'} strokeWidth="2" pointerEvents="none" />
      </svg>
      {hd && (
        <div className="tooltip" style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(Math.min(y(hd.v), y(target)) / H) * 100 - 4}%` }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{dShort(hd.date, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
          <div><span className="num" style={{ fontWeight: 600 }}>{fmt(hd.v)}</span> {unit} {hd.logged ? '' : '(not logged)'}</div>
          <div className="muted">
            {kind === 'goal'
              ? hd.v >= target ? '✓ goal reached' : `${fmt(target - hd.v)} ${unit} short of goal`
              : hd.v > target ? `${fmt(hd.v - target)} ${unit} over ${kind === 'limit' ? 'limit' : 'target'}` : `${fmt(target - hd.v)} ${unit} under ${kind === 'limit' ? 'limit' : 'target'}`}
            {' '}· click to open
          </div>
        </div>
      )}
    </div>
  )
}

/** Average per logged day for every nutrient, against the daily goal or limit. */
function NutrientAverages({ w, goals }: { w: WeekStats; goals: ReturnType<typeof goalsOf> }) {
  return (
    <div className="card">
      <div className="card-title">Daily average this week <span className="muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>· {w.loggedDays} logged day{w.loggedDays === 1 ? '' : 's'}</span></div>
      <div className="nutri-grid">
        {NUTRIENTS.map((n) => {
          const avg = w.avgs[n.key]
          const goal = n.key === 'kcal' ? w.budget / 7 : goals[n.key]
          const pct = goal ? avg / goal : 0
          const limitish = n.limit || n.key === 'kcal'
          const status = !w.loggedDays ? null : limitish ? (pct > 1 ? 'bad' : 'good') : pct >= 0.9 ? 'good' : pct >= 0.6 ? 'warn' : 'bad'
          return (
            <div key={n.key} className="stat">
              <div className="row between">
                <span className="label row" style={{ gap: 6 }}><i className="dot" style={{ background: n.color }} />{n.label}</span>
                {status && <span className={`badge ${status}`}>{status === 'good' ? '✓' : status === 'warn' ? 'low' : limitish ? 'over' : 'low'}</span>}
              </div>
              <div className="value num" style={{ fontSize: 22 }}>{fmt(avg)}<span className="small muted"> {n.unit}</span></div>
              <div className="hint">{limitish ? (n.key === 'kcal' ? 'target' : 'limit') : 'goal'} {fmt(goal)} {n.unit}/day</div>
              <div className="bar mini"><div style={{ width: `${Math.min(100, pct * 100)}%`, background: limitish && pct > 1 ? 'var(--red)' : n.color }} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** One row per day with every nutrient. */
function DayTable({ w, goals, onPick }: { w: WeekStats; goals: ReturnType<typeof goalsOf>; onPick: (d: string) => void }) {
  const cls = (key: NutrientKey, v: number, logged: boolean) => {
    if (!logged) return 'muted'
    const n = NUTRIENTS.find((x) => x.key === key)!
    const goal = key === 'kcal' ? w.budget / 7 : goals[key]
    if (n.limit || key === 'kcal') return v > goal ? 'cell-bad' : ''
    return key === 'p' || key === 'fib' ? (v >= goal ? 'cell-good' : '') : ''
  }
  return (
    <div className="card">
      <div className="card-title">Day by day</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="hist">
          <thead>
            <tr>
              <th>Day</th>
              {NUTRIENTS.map((n) => <th key={n.key} className="right">{n.label}<div className="tiny muted" style={{ fontWeight: 400 }}>{n.unit}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {w.days.map((d) => (
              <tr key={d.date} className="clickable" onClick={() => onPick(d.date)}>
                <td>{dShort(d.date, { weekday: 'short', day: 'numeric' })}</td>
                {NUTRIENTS.map((n) => (
                  <td key={n.key} className={`right num ${cls(n.key, d.t[n.key], d.logged)}`}>{d.logged ? fmt(d.t[n.key]) : '–'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tiny muted" style={{ marginTop: 10 }}>
        <span className="cell-good">Green</span> = protein / fiber goal hit · <span className="cell-bad">Red</span> = over calorie target, sugar or sodium limit
      </div>
    </div>
  )
}

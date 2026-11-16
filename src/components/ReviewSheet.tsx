import { useState } from 'react'
import type { Food } from '../lib/foods'
import { isQuick, macrosFor, per100Of, quickFood } from '../lib/nutrition'
import { resolveGrams, UNIT_OPTIONS } from '../lib/parser'
import { actions, MEALS, type Meal } from '../lib/store'
import { FoodPicker } from './FoodPicker'
import { Icon } from './Icon'

export interface Draft {
  key: string
  said: string // what the user said / typed for this item
  query: string
  qty: number | null
  unit: string | null
  food: Food | null
  options: Food[]
  status: 'ok' | 'searching' | 'notfound'
  msg?: string
  quick?: boolean // calories typed in directly instead of a food from the database
}

export const quickDraft = (name = '', kcal = 0, said = 'Custom calories'): Draft => ({
  key: Math.random().toString(36).slice(2), said, query: name, qty: null, unit: null,
  food: quickFood(name, kcal), options: [], status: 'ok', quick: true,
})

export const draftGrams = (d: Draft) => (d.food ? Math.round(resolveGrams(d.food, d.qty, d.unit)) : 0)

interface Props {
  drafts: Draft[]
  setDrafts: (fn: (d: Draft[]) => Draft[]) => void
  meal: Meal
  setMeal: (m: Meal) => void
  date: string
  transcript?: string
  onClose: () => void
  onLogged: (n: number, kcal: number) => void
}

export function ReviewSheet({ drafts, setDrafts, meal, setMeal, date, transcript, onClose, onLogged }: Props) {
  const [picking, setPicking] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const remove = (key: string) => setDrafts((ds) => ds.filter((d) => d.key !== key))

  const ready = drafts.filter((d) => d.food && (!d.quick || d.food.kcal > 0))
  const total = ready.reduce((a, d) => a + macrosFor(d.food!, draftGrams(d)).kcal, 0)

  function logAll() {
    actions.addEntries(
      ready.map((d) => {
        const grams = draftGrams(d)
        const m = macrosFor(d.food!, grams)
        return { date, meal, foodId: d.food!.id, name: d.food!.name, grams, ...m, per100: per100Of(d.food!) }
      }),
    )
    onLogged(ready.length, total)
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label="Review foods">
        <div className="row between" style={{ marginBottom: 6 }}>
          <h2 className="h1" style={{ fontSize: 22 }}>Review & log</h2>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {transcript && <p className="sub" style={{ margin: '0 0 14px' }}>“{transcript}”</p>}

        <div className="row wrap" style={{ marginBottom: 14 }}>
          <div className="seg">
            {MEALS.map((m) => (
              <button key={m.id} className={meal === m.id ? 'on' : ''} onClick={() => setMeal(m.id)}>{m.emoji} {m.label}</button>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {drafts.map((d) => {
            const grams = draftGrams(d)
            const m = d.food ? macrosFor(d.food, grams) : null
            const unitOpts = Array.from(new Set(['g', ...(d.food?.units ? Object.keys(d.food.units) : []), ...UNIT_OPTIONS])).filter((u) => u !== 'ml' || d.food?.units?.ml)
            return (
              <div key={d.key} className={`draft ${!d.food && d.status !== 'searching' ? 'bad' : ''}`}>
                <div className="row between">
                  <div className="grow">
                    <div className="tiny muted">{d.quick ? 'Custom calories' : <>You said: “{d.said}”</>}</div>
                    {d.quick ? (
                      <input
                        className="input"
                        style={{ marginTop: 6 }}
                        placeholder="Name (optional), e.g. Office lunch"
                        value={d.food!.name === 'Quick add' ? '' : d.food!.name}
                        onChange={(e) => update(d.key, { food: { ...quickFood(e.target.value, d.food!.kcal, d.food!) } })}
                      />
                    ) : d.status === 'searching' ? (
                      <div className="row small" style={{ marginTop: 4 }}><span className="wave"><i /><i /><i /></span> Looking up “{d.query}” in USDA…</div>
                    ) : (
                      <button className="draft-food" onClick={() => setPicking(picking === d.key ? null : d.key)}>
                        {d.food ? d.food.name : <span style={{ color: 'var(--red)' }}>No match — tap to pick a food</span>}
                        {d.food?.id.startsWith('usda:') && <span className="badge usda">USDA</span>}
                        <Icon name="chevron" size={14} />
                      </button>
                    )}
                  </div>
                  <button className="btn btn-ghost icon-btn" onClick={() => remove(d.key)} aria-label="Remove"><Icon name="trash" size={16} /></button>
                </div>

                {picking === d.key && (
                  <FoodPicker
                    initialQuery={d.query}
                    extra={d.options}
                    autoFocus
                    onPick={(food) => { update(d.key, { food, status: 'ok' }); setPicking(null) }}
                  />
                )}

                {d.quick && d.food && <QuickFields food={d.food} onChange={(food) => update(d.key, { food })} />}

                {d.food && !d.quick && (
                  <div className="amount">
                    <input
                      className="input num"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={d.qty ?? ''}
                      placeholder="1"
                      onChange={(e) => update(d.key, { qty: e.target.value === '' ? null : Math.max(0, +e.target.value) })}
                    />
                    <select className="select" value={d.unit ?? ''} onChange={(e) => update(d.key, { unit: e.target.value || null })}>
                      <option value="">{d.food.units?.piece ? 'pieces' : 'serving'}</option>
                      {unitOpts.map((u) => (
                        <option key={u} value={u}>{u}{d.food?.units?.[u] && u !== 'ml' ? ` (${d.food.units[u]} g)` : ''}</option>
                      ))}
                    </select>
                    <div className="right" style={{ minWidth: 92 }}>
                      <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{m!.kcal} <span className="tiny muted">kcal</span></div>
                      <div className="tiny muted">{grams} g · P{Math.round(m!.p)} C{Math.round(m!.c)} F{Math.round(m!.f)} Fib{Math.round(m!.fib)}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {adding ? (
            <div className="draft">
              <FoodPicker
                autoFocus
                onPick={(food) => {
                  setDrafts((ds) => [...ds, { key: Math.random().toString(36), said: food.name, query: food.name, qty: null, unit: null, food, options: [], status: 'ok', quick: isQuick(food.id) }])
                  setAdding(false)
                }}
              />
            </div>
          ) : (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Add another food</button>
              <button className="btn btn-ghost" onClick={() => setDrafts((ds) => [...ds, quickDraft()])}><Icon name="flame" size={16} /> Custom calories</button>
            </div>
          )}
        </div>

        <div className="total-bar">
          <div>
            <div className="tiny muted">Total</div>
            <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{total} <span className="small muted">kcal</span></div>
          </div>
          <button className="btn btn-primary" disabled={!ready.length} onClick={logAll}>
            <Icon name="check" size={16} /> Log {ready.length} item{ready.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Calorie + optional macro inputs for a custom-calories draft. */
function QuickFields({ food, onChange }: { food: Food; onChange: (f: Food) => void }) {
  const set = (k: 'kcal' | 'p' | 'c' | 'f' | 'fib', v: string) => onChange({ ...food, [k]: Math.max(0, +v || 0) })
  const val = (n: number) => (n ? String(n) : '')
  return (
    <div className="quick-grid">
      <label className="field quick-kcal">Calories
        <input className="input num" type="number" inputMode="decimal" autoFocus={!food.kcal} placeholder="e.g. 650" value={val(food.kcal)} onChange={(e) => set('kcal', e.target.value)} />
      </label>
      <label className="field">Protein g<input className="input num" type="number" inputMode="decimal" placeholder="–" value={val(food.p)} onChange={(e) => set('p', e.target.value)} /></label>
      <label className="field">Carbs g<input className="input num" type="number" inputMode="decimal" placeholder="–" value={val(food.c)} onChange={(e) => set('c', e.target.value)} /></label>
      <label className="field">Fat g<input className="input num" type="number" inputMode="decimal" placeholder="–" value={val(food.f)} onChange={(e) => set('f', e.target.value)} /></label>
      <label className="field">Fiber g<input className="input num" type="number" inputMode="decimal" placeholder="–" value={val(food.fib)} onChange={(e) => set('fib', e.target.value)} /></label>
    </div>
  )
}

import { useState } from 'react'
import { actions, getState, mifflinTDEE, useStore, type Profile, type State } from '../lib/store'
import { Icon } from './Icon'

const ACTIVITY = [
  { v: 1.2, l: 'Sedentary (desk job, little exercise)' },
  { v: 1.375, l: 'Light (1–3 workouts/week)' },
  { v: 1.55, l: 'Moderate (3–5 workouts/week)' },
  { v: 1.725, l: 'Very active (6–7 workouts/week)' },
  { v: 1.9, l: 'Athlete / physical job' },
]

const LANGS = [
  ['en-IN', 'English (India)'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['hi-IN', 'Hindi'], ['te-IN', 'Telugu'], ['ta-IN', 'Tamil'],
]

export function Settings({ toast }: { toast: (m: string) => void }) {
  const { settings, customFoods } = useStore()
  const [p, setP] = useState<Profile>(settings.profile ?? { sex: 'male', age: 25, heightCm: 175, weightKg: 75, activity: 1.375 })
  const tdee = mifflinTDEE(p)
  const [cf, setCf] = useState({ name: '', kcal: '', p: '', c: '', f: '', serving: '' })

  const num = (v: string) => Math.max(0, +v || 0)

  function exportData() {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fityo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function importData(file: File) {
    file.text().then((t) => {
      try {
        const s = JSON.parse(t) as State
        if (!Array.isArray(s.entries)) throw new Error()
        actions.replaceAll(s)
        toast(`Imported ${s.entries.length} entries`)
      } catch { toast('That file is not a Fityo backup') }
    })
  }

  return (
    <div className="stack">
      <h1 className="h1">Settings</h1>
      <div className="grid grid-2">
        <div className="card stack" style={{ gap: 14 }}>
          <div className="card-title" style={{ margin: 0 }}><Icon name="target" size={15} /> Goals</div>
          <label className="field">Daily calorie goal (what you aim to eat)
            <input className="input num" type="number" value={settings.dailyGoal} onChange={(e) => actions.updateSettings({ dailyGoal: num(e.target.value) })} />
          </label>
          <label className="field">Maintenance calories / TDEE (what you burn)
            <input className="input num" type="number" value={settings.maintenance} onChange={(e) => actions.updateSettings({ maintenance: num(e.target.value) })} />
          </label>
          <label className="field">Daily protein goal (g)
            <input className="input num" type="number" value={settings.proteinGoal} onChange={(e) => actions.updateSettings({ proteinGoal: num(e.target.value) })} />
          </label>
          <div className="tiny muted">
            Daily deficit at this goal: <b style={{ color: 'var(--text)' }}>{settings.maintenance - settings.dailyGoal} kcal</b> ≈ {(((settings.maintenance - settings.dailyGoal) * 7) / 7700).toFixed(2)} kg fat / week.
            Weekly goals default to daily goal × 7 and can be changed per week on the Week tab.
          </div>
        </div>

        <div className="card stack" style={{ gap: 14 }}>
          <div className="card-title" style={{ margin: 0 }}><Icon name="flame" size={15} /> Maintenance calculator</div>
          <div className="grid grid-2" style={{ gap: 10 }}>
            <label className="field">Sex
              <select className="select" value={p.sex} onChange={(e) => setP({ ...p, sex: e.target.value as Profile['sex'] })}>
                <option value="male">Male</option><option value="female">Female</option>
              </select>
            </label>
            <label className="field">Age<input className="input num" type="number" value={p.age} onChange={(e) => setP({ ...p, age: num(e.target.value) })} /></label>
            <label className="field">Height (cm)<input className="input num" type="number" value={p.heightCm} onChange={(e) => setP({ ...p, heightCm: num(e.target.value) })} /></label>
            <label className="field">Weight (kg)<input className="input num" type="number" value={p.weightKg} onChange={(e) => setP({ ...p, weightKg: num(e.target.value) })} /></label>
          </div>
          <label className="field">Activity
            <select className="select" value={p.activity} onChange={(e) => setP({ ...p, activity: +e.target.value })}>
              {ACTIVITY.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
            </select>
          </label>
          <div className="row between">
            <div><div className="tiny muted">Estimated TDEE</div><div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{tdee} kcal</div></div>
            <button className="btn btn-primary btn-sm" onClick={() => {
              actions.updateSettings({ profile: p, maintenance: tdee, proteinGoal: Math.round(p.weightKg * 1.6) })
              toast('Maintenance updated')
            }}>Use this</button>
          </div>
          <div className="tiny muted">Mifflin-St Jeor formula. Also sets protein to 1.6 g/kg.</div>
        </div>

        <div className="card stack" style={{ gap: 14 }}>
          <div className="card-title" style={{ margin: 0 }}><Icon name="mic" size={15} /> Voice & food data</div>
          <label className="field">Voice language
            <select className="select" value={settings.speechLang} onChange={(e) => actions.updateSettings({ speechLang: e.target.value })}>
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="field">USDA FoodData Central API key (optional)
            <input className="input" value={settings.usdaKey} placeholder="Using DEMO_KEY (limited to ~30 searches/hour)" onChange={(e) => actions.updateSettings({ usdaKey: e.target.value.trim() })} />
          </label>
          <div className="tiny muted">
            Common foods (incl. Indian dishes) are built in and work offline. Anything else is looked up in USDA. Get a free key in a minute at{' '}
            <a href="https://fdc.nal.usda.gov/api-key-signup" target="_blank" rel="noreferrer">fdc.nal.usda.gov</a>.
          </div>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <div className="card-title" style={{ margin: 0 }}><Icon name="plus" size={15} /> My foods</div>
          <form className="stack" style={{ gap: 10 }} onSubmit={(e) => {
            e.preventDefault()
            if (!cf.name.trim() || !cf.kcal) return
            actions.addCustomFood({
              id: 'custom:' + Date.now().toString(36),
              name: cf.name.trim(),
              aliases: [cf.name.trim().toLowerCase()],
              kcal: num(cf.kcal), p: num(cf.p), c: num(cf.c), f: num(cf.f),
              units: cf.serving ? { serving: num(cf.serving), piece: num(cf.serving) } : undefined,
            })
            setCf({ name: '', kcal: '', p: '', c: '', f: '', serving: '' })
            toast('Food saved — you can now say it by name')
          }}>
            <input className="input" placeholder="Name, e.g. Mom's chicken curry" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} />
            <div className="grid grid-4" style={{ gap: 8 }}>
              <input className="input num" placeholder="kcal" type="number" value={cf.kcal} onChange={(e) => setCf({ ...cf, kcal: e.target.value })} />
              <input className="input num" placeholder="Protein" type="number" value={cf.p} onChange={(e) => setCf({ ...cf, p: e.target.value })} />
              <input className="input num" placeholder="Carbs" type="number" value={cf.c} onChange={(e) => setCf({ ...cf, c: e.target.value })} />
              <input className="input num" placeholder="Fat" type="number" value={cf.f} onChange={(e) => setCf({ ...cf, f: e.target.value })} />
            </div>
            <div className="row">
              <input className="input num" placeholder="Serving size in g (optional)" type="number" value={cf.serving} onChange={(e) => setCf({ ...cf, serving: e.target.value })} />
              <button className="btn btn-primary" type="submit">Save</button>
            </div>
            <div className="tiny muted">Values per 100 g (check the nutrition label).</div>
          </form>
          {customFoods.map((f) => (
            <div key={f.id} className="entry">
              <div className="grow"><div className="name">{f.name}</div><div className="meta">{f.kcal} kcal · P{f.p} C{f.c} F{f.f} per 100 g</div></div>
              <button className="btn btn-ghost icon-btn btn-danger" onClick={() => actions.removeCustomFood(f.id)} aria-label="Delete"><Icon name="trash" size={15} /></button>
            </div>
          ))}
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>Your data</div>
          <div className="small muted">Everything is stored in this browser. Export a backup to move it to another device.</div>
          <div className="row wrap">
            <button className="btn" onClick={exportData}>Export backup</button>
            <label className="btn">Import backup<input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} /></label>
            <button className="btn btn-danger" onClick={() => { if (confirm('Delete ALL your logged food and settings?')) { actions.reset(); toast('All data cleared') } }}>Clear all</button>
          </div>
        </div>
      </div>
    </div>
  )
}

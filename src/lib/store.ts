import { useSyncExternalStore } from 'react'
import type { Food } from './foods'

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: { id: Meal; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'snack', label: 'Snacks', emoji: '🍎' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
]

export interface Entry {
  id: string
  date: string // YYYY-MM-DD (local)
  meal: Meal
  foodId: string
  name: string
  grams: number
  kcal: number
  p: number
  c: number
  f: number
  per100: { kcal: number; p: number; c: number; f: number }
  createdAt: number
}

export interface Profile {
  sex: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  activity: number
}

export interface Settings {
  dailyGoal: number // kcal you aim to eat per day
  maintenance: number // kcal you burn per day (TDEE)
  proteinGoal: number
  usdaKey: string
  speechLang: string
  profile: Profile | null
}

export interface State {
  entries: Entry[]
  customFoods: Food[]
  weekGoals: Record<string, number> // week start (Monday, YYYY-MM-DD) → weekly kcal budget
  settings: Settings
}

const KEY = 'fityo:v1'

const DEFAULT: State = {
  entries: [],
  customFoods: [],
  weekGoals: {},
  settings: { dailyGoal: 2000, maintenance: 2500, proteinGoal: 120, usdaKey: '', speechLang: 'en-IN', profile: null },
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const s = JSON.parse(raw) as Partial<State>
    return { ...DEFAULT, ...s, settings: { ...DEFAULT.settings, ...s.settings } }
  } catch {
    return DEFAULT
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full / private mode */ }
  listeners.forEach((l) => l())
}

export const useStore = () =>
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
  )

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const actions = {
  addEntries(items: Omit<Entry, 'id' | 'createdAt'>[]) {
    const now = Date.now()
    commit({ ...state, entries: [...state.entries, ...items.map((e, i) => ({ ...e, id: uid(), createdAt: now + i }))] })
  },
  updateEntry(id: string, patch: Partial<Entry>) {
    commit({ ...state, entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
  },
  removeEntry(id: string) {
    commit({ ...state, entries: state.entries.filter((e) => e.id !== id) })
  },
  setWeekGoal(weekStart: string, kcal: number | null) {
    const weekGoals = { ...state.weekGoals }
    if (kcal == null) delete weekGoals[weekStart]
    else weekGoals[weekStart] = kcal
    commit({ ...state, weekGoals })
  },
  updateSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } })
  },
  addCustomFood(food: Food) {
    commit({ ...state, customFoods: [food, ...state.customFoods.filter((f) => f.id !== food.id)] })
  },
  removeCustomFood(id: string) {
    commit({ ...state, customFoods: state.customFoods.filter((f) => f.id !== id) })
  },
  replaceAll(next: State) {
    commit({ ...DEFAULT, ...next, settings: { ...DEFAULT.settings, ...next.settings } })
  },
  reset() {
    commit(DEFAULT)
  },
}

export const getState = () => state

// ── Date helpers (local time) ──
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const today = () => toISO(new Date())
export const addDays = (iso: string, n: number) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d) }
export const weekStart = (iso: string) => { const d = fromISO(iso); const dow = (d.getDay() + 6) % 7; return addDays(iso, -dow) }
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i))

export function mifflinTDEE(p: Profile) {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  return Math.round(bmr * p.activity)
}

export function sumEntries(list: Entry[]) {
  return list.reduce(
    (a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  )
}

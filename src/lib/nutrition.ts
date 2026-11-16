import { FOODS, type Food } from './foods'

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

const singular = (w: string) =>
  w.length > 3 && w.endsWith('ies') ? w.slice(0, -3) + 'y'
  : w.length > 3 && /(ches|shes|oes)$/.test(w) ? w.slice(0, -2)
  : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1)
  : w

const STOP = new Set(['of', 'the', 'a', 'an', 'some', 'with', 'my', 'fresh', 'plain', 'cooked', 'homemade'])

function tokens(s: string) {
  return norm(s).split(' ').filter((t) => t && !STOP.has(t)).map(singular)
}

/** Score how well `query` names `food` (0 = no match, 100 = exact alias). */
function score(query: string, food: Food): number {
  const q = norm(query)
  const qs = tokens(query).join(' ')
  let best = 0
  for (const alias of [food.name.toLowerCase(), ...food.aliases]) {
    const a = norm(alias)
    const as = tokens(alias).join(' ')
    if (a === q || as === qs) return 100
    // whole alias appears in the query ("200 grams of grilled chicken breast")
    if (as && (` ${qs} `).includes(` ${as} `)) best = Math.max(best, 70 + Math.min(as.length, 20))
    // query appears in the alias ("chick" → "chicken")
    else if (qs.length >= 3 && as.startsWith(qs)) best = Math.max(best, 60)
    else if (qs.length >= 3 && as.includes(qs)) best = Math.max(best, 45)
    else {
      const qt = new Set(tokens(query))
      const at = tokens(alias)
      const hit = at.filter((t) => qt.has(t)).length
      if (hit) best = Math.max(best, (hit / Math.max(at.length, qt.size)) * 50)
    }
  }
  return best
}

export function searchFoods(query: string, pool: Food[], limit = 8): Food[] {
  if (!norm(query)) return []
  return pool
    .map((f) => ({ f, s: score(query, f) }))
    .filter((x) => x.s > 15)
    .sort((a, b) => b.s - a.s || a.f.name.length - b.f.name.length)
    .slice(0, limit)
    .map((x) => x.f)
}

export function bestMatch(query: string, pool: Food[]): Food | null {
  const [top] = pool
    .map((f) => ({ f, s: score(query, f) }))
    .sort((a, b) => b.s - a.s || a.f.name.length - b.f.name.length)
  return top && top.s >= 40 ? top.f : null
}

export const allFoods = (custom: Food[]) => [...custom, ...FOODS]

// ── USDA FoodData Central ────────────────────────────────────────────────
// Free API: https://fdc.nal.usda.gov/api-key-signup — DEMO_KEY works but is rate-limited.

interface FdcNutrient { nutrientId?: number; nutrientNumber?: string; value?: number; unitName?: string }
interface FdcFood { fdcId: number; description: string; dataType?: string; brandOwner?: string; brandName?: string; foodNutrients?: FdcNutrient[]; servingSize?: number; servingSizeUnit?: string }

function nutrient(f: FdcFood, ids: number[], nums: string[]) {
  for (const n of f.foodNutrients ?? []) {
    if ((n.nutrientId && ids.includes(n.nutrientId)) || (n.nutrientNumber && nums.includes(n.nutrientNumber))) {
      if (n.unitName && n.unitName.toUpperCase() === 'KJ') continue
      return n.value ?? 0
    }
  }
  return 0
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s,(])([a-z])/g, (_, a, b) => a + b.toUpperCase())

const cache = new Map<string, Food[]>()

export async function searchUSDA(query: string, apiKey: string, branded = false): Promise<Food[]> {
  const key = `${branded}|${norm(query)}`
  if (cache.has(key)) return cache.get(key)!
  const params = new URLSearchParams({
    api_key: apiKey || 'DEMO_KEY',
    query,
    pageSize: '12',
    dataType: branded ? 'Branded' : 'Foundation,SR Legacy,Survey (FNDDS)',
  })
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`)
  if (res.status === 429) throw new Error('USDA rate limit hit — add your own free API key in Settings.')
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`)
  const data = (await res.json()) as { foods?: FdcFood[] }
  const foods: Food[] = (data.foods ?? [])
    .map((f) => {
      const kcal = nutrient(f, [1008, 2047, 2048], ['208', '957', '958'])
      const units: Record<string, number> = {}
      if (f.servingSize && f.servingSizeUnit && /^(g|grm|ml|mlt)$/i.test(f.servingSizeUnit)) units.serving = f.servingSize
      const brand = f.brandName || f.brandOwner
      return {
        id: `usda:${f.fdcId}`,
        name: titleCase(f.description) + (brand ? ` · ${titleCase(brand)}` : ''),
        aliases: [f.description.toLowerCase()],
        kcal: Math.round(kcal),
        p: +nutrient(f, [1003], ['203']).toFixed(1),
        c: +nutrient(f, [1005], ['205']).toFixed(1),
        f: +nutrient(f, [1004], ['204']).toFixed(1),
        fib: +nutrient(f, [1079], ['291']).toFixed(1),
        sug: +nutrient(f, [2000, 1063], ['269', '269.3']).toFixed(1),
        na: Math.round(nutrient(f, [1093], ['307'])),
        units: Object.keys(units).length ? units : undefined,
      }
    })
    .filter((f) => f.kcal > 0)
  cache.set(key, foods)
  return foods
}

type Per100 = Pick<Food, 'kcal' | 'p' | 'c' | 'f'> & Partial<Pick<Food, 'fib' | 'sug' | 'na'>>

/** Nutrients for `grams` of a food (values are stored per 100 g). */
export function macrosFor(food: Per100, grams: number) {
  const k = grams / 100
  return {
    kcal: Math.round(food.kcal * k),
    p: +(food.p * k).toFixed(1),
    c: +(food.c * k).toFixed(1),
    f: +(food.f * k).toFixed(1),
    fib: +((food.fib ?? 0) * k).toFixed(1),
    sug: +((food.sug ?? 0) * k).toFixed(1),
    na: Math.round((food.na ?? 0) * k),
  }
}

export const per100Of = (f: Food) => ({ kcal: f.kcal, p: f.p, c: f.c, f: f.f, fib: f.fib, sug: f.sug, na: f.na })

import type { Food } from './foods'
import type { Meal } from './store'

// Turns "I had 200 grams of chicken, 2 rotis and a bowl of dal for lunch"
// into [{qty:200, unit:'g', text:'chicken'}, {qty:2, unit:null, text:'rotis'}, ...]

export interface ParsedItem {
  qty: number | null
  unit: string | null // canonical unit, e.g. 'g', 'ml', 'cup', 'piece'
  text: string
  raw: string
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  hundred: 100, couple: 2, few: 3, half: 0.5, quarter: 0.25, single: 1, dozen: 12,
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gm: 'g', gms: 'g', gr: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', mls: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  cup: 'cup', cups: 'cup', bowl: 'bowl', bowls: 'bowl', katori: 'bowl', katoris: 'bowl',
  plate: 'plate', plates: 'plate', piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece',
  slice: 'slice', slices: 'slice', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', spoon: 'tbsp', spoons: 'tbsp',
  glass: 'glass', glasses: 'glass', scoop: 'scoop', scoops: 'scoop', handful: 'handful', handfuls: 'handful',
  can: 'can', cans: 'can', bottle: 'bottle', bottles: 'bottle', packet: 'packet', packets: 'packet', pack: 'packet',
  serving: 'serving', servings: 'serving', portion: 'serving', portions: 'serving', bar: 'bar', bars: 'bar',
  cube: 'cube', cubes: 'cube', pint: 'pint', pints: 'pint',
}

/** Generic weights when a food has no specific unit size. */
const GENERIC_GRAMS: Record<string, number> = {
  cup: 200, bowl: 150, plate: 250, piece: 100, slice: 30, tbsp: 15, tsp: 5, glass: 250,
  scoop: 30, handful: 28, can: 330, bottle: 500, packet: 50, serving: 100, bar: 50, cube: 15, pint: 473, oz: 28.35,
}

export const UNIT_OPTIONS = ['g', 'ml', 'piece', 'cup', 'bowl', 'plate', 'slice', 'tbsp', 'tsp', 'glass', 'scoop', 'serving']

const SPLIT = /\s*(?:,|;|\.\s|\band then\b|\bthen\b|\balong with\b|\bwith\b|\bplus\b|\band\b|&|\+)\s*/i
const FILLER = /\b(i\s+(?:just\s+)?(?:had|ate|have had|'ve had|drank|consumed|eaten)|i've had|i have|today|this morning|tonight|yesterday|for (?:breakfast|lunch|dinner|snacks?|supper)|in (?:breakfast|lunch|dinner)|at (?:breakfast|lunch|dinner)|approximately|approx|around|about|roughly|like|some|of my|my)\b/gi

export function detectMeal(text: string): Meal | null {
  const t = text.toLowerCase()
  if (/\bbreakfast\b/.test(t)) return 'breakfast'
  if (/\blunch\b/.test(t)) return 'lunch'
  if (/\b(dinner|supper)\b/.test(t)) return 'dinner'
  if (/\bsnacks?\b/.test(t)) return 'snack'
  return null
}

function wordToNumber(w: string): number | null {
  if (/^\d+(\.\d+)?$/.test(w)) return parseFloat(w)
  if (/^\d+\/\d+$/.test(w)) { const [a, b] = w.split('/').map(Number); return b ? a / b : null }
  return NUMBER_WORDS[w] ?? null
}

function preprocess(text: string) {
  return text
    .toLowerCase()
    .replace(/(\d),(\d{3})/g, '$1$2') // 1,000 → 1000
    .replace(/(\d)\s*(g|gm|gms|kg|ml|l|oz)\b/g, '$1 $2') // 200g → 200 g
    .replace(/(\d)(k?cals?|kcal)\b/g, '$1 $2') // 650kcal → 650 kcal
    .replace(/\b(\w+) and a half\b/g, (m, w) => { const n = wordToNumber(w); return n != null ? String(n + 0.5) : m })
    .replace(/\bhalf (?:a|an)\b/g, 'half')
    .replace(/\b(\w+) hundred\b/g, (m, w) => { const n = wordToNumber(w); return n != null && n < 10 ? String(n * 100) : m })
    .replace(/\b(\d+) (\d+) (g|gram|grams|ml)\b/g, '$1$2 $3') // speech glitch "2 50 grams"
}

function parseSegment(seg: string): ParsedItem | null {
  const raw = seg.trim()
  let s = raw.replace(FILLER, ' ').replace(/\s+/g, ' ').trim()
  if (!s) return null
  // "650 calories", "a 650 kcal burger", "office lunch 900 cal" → calories entered directly
  const kc = s.match(/(\d+(?:\.\d+)?)\s*(?:k?cals?|kilo ?calories?|calories?)\b/)
  if (kc) {
    const text = s.replace(kc[0], ' ').replace(/\b(of|worth|about|around)\b/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:(?:had|ate|drank|having|eaten|a|an|the|one)\s+)+/, '')
    return { qty: parseFloat(kc[1]), unit: 'kcal', text, raw }
  }
  let words = s.split(' ')
  let qty: number | null = null
  let unit: string | null = null

  // leading quantity: "200", "two", "1.5", "1/2"
  const n = wordToNumber(words[0])
  if (n != null && words.length > 1) { qty = n; words = words.slice(1) }
  // leading unit
  if (words.length > 1 && UNIT_ALIASES[words[0]]) { unit = UNIT_ALIASES[words[0]]; words = words.slice(1) }
  if (words[0] === 'of' && words.length > 1) words = words.slice(1)

  // trailing quantity + unit: "chicken 200 grams"
  if (qty == null && words.length >= 3) {
    const u = UNIT_ALIASES[words[words.length - 1]]
    const q = wordToNumber(words[words.length - 2])
    if (u && q != null) { qty = q; unit = u; words = words.slice(0, -2) }
  }
  // "a cup" with no number → qty 1
  if (unit && qty == null) qty = 1

  const text = words.join(' ').replace(/^(a|an|the)\s+/, '').trim()
  if (!text || /^\d+$/.test(text)) return null
  return { qty, unit, text, raw }
}

export function parseFoodText(text: string): ParsedItem[] {
  return preprocess(text)
    .split(SPLIT)
    .map(parseSegment)
    .filter((x): x is ParsedItem => !!x)
}

/** Grams for a parsed quantity of a given food. */
export function resolveGrams(food: Food, qty: number | null, unit: string | null): number {
  const units = food.units ?? {}
  const q = qty ?? 1
  if (unit === 'g') return q
  if (unit === 'kg') return q * 1000
  if (unit === 'ml') return q * (units.ml ?? 1)
  if (unit === 'l') return q * 1000 * (units.ml ?? 1)
  if (unit === 'oz') return q * 28.35
  if (unit) return q * (units[unit] ?? GENERIC_GRAMS[unit] ?? 100)
  // No unit: "2 eggs", "3 rotis", "a banana" → count of the food's natural piece
  const countUnit = Object.keys(units).find((u) => !['ml', 'tbsp', 'tsp'].includes(u))
  if (qty != null) return q * (units.piece ?? (countUnit ? units[countUnit] : 100))
  // Nothing said at all: one natural serving
  return countUnit ? units[countUnit] : 100
}

/** Best guess of how to show the amount back to the user. */
export function describeAmount(qty: number | null, unit: string | null) {
  if (unit === 'g' || unit === 'ml') return `${qty}${unit}`
  if (unit === 'kcal') return `${qty} kcal`
  if (unit) return `${qty ?? 1} ${unit}${(qty ?? 1) > 1 ? 's' : ''}`
  if (qty != null) return `× ${qty}`
  return '1 serving'
}

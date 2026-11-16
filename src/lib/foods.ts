// Built-in food database. Values are per 100 g (cooked / as-eaten where relevant),
// approximated from USDA FoodData Central and the Indian Food Composition Tables.
// `units` maps a household unit to its weight in grams, so "2 rotis" or "1 bowl dal" work.

export interface Food {
  id: string
  name: string
  aliases: string[]
  kcal: number
  p: number
  c: number
  f: number
  fib: number // fiber, g
  sug: number // sugar, g
  na: number // sodium, mg
  units?: Record<string, number>
}

type Row = [name: string, aliases: string, kcal: number, p: number, c: number, f: number, units?: Record<string, number>]

const BOWL = 150
const CUP = 240

const rows: Row[] = [
  // ── Proteins ──
  ['Chicken breast (cooked)', 'chicken, chicken breast, grilled chicken, boiled chicken, chicken boneless', 165, 31, 0, 3.6, { piece: 120 }],
  ['Chicken thigh (cooked)', 'chicken thigh, chicken leg', 209, 26, 0, 10.9, { piece: 100 }],
  ['Chicken curry', 'chicken curry, chicken gravy, chicken masala', 150, 14, 4, 8.5, { bowl: BOWL, cup: CUP }],
  ['Butter chicken', 'butter chicken, murgh makhani', 190, 13, 5, 13, { bowl: BOWL }],
  ['Chicken tikka', 'chicken tikka, tandoori chicken', 150, 25, 3, 4.5, { piece: 30 }],
  ['Chicken biryani', 'chicken biryani, biryani', 165, 8, 22, 5, { plate: 300, bowl: 200, cup: 200 }],
  ['Mutton curry', 'mutton, mutton curry, goat curry, lamb curry', 190, 16, 4, 12, { bowl: BOWL }],
  ['Fish (cooked)', 'fish, grilled fish, fish fillet', 140, 24, 0, 4.5, { piece: 100 }],
  ['Fish curry', 'fish curry', 120, 13, 4, 6, { bowl: BOWL }],
  ['Salmon (cooked)', 'salmon', 206, 22, 0, 12, { piece: 120 }],
  ['Tuna (canned in water)', 'tuna', 116, 26, 0, 0.8, { can: 120 }],
  ['Prawns (cooked)', 'prawn, prawns, shrimp', 99, 24, 0.2, 0.3],
  ['Egg (whole, boiled)', 'egg, eggs, boiled egg, whole egg, hard boiled egg', 155, 13, 1.1, 11, { piece: 50, egg: 50 }],
  ['Egg white', 'egg white, egg whites', 52, 11, 0.7, 0.2, { piece: 33 }],
  ['Omelette', 'omelette, omelet, egg omelette', 154, 11, 1, 12, { piece: 120 }],
  ['Scrambled eggs', 'scrambled egg, scrambled eggs, egg bhurji, anda bhurji', 166, 11, 2, 12.5, { cup: 150 }],
  ['Paneer', 'paneer, cottage cheese indian', 265, 18, 3.6, 20, { cube: 15 }],
  ['Paneer butter masala', 'paneer butter masala, paneer makhani, paneer curry', 220, 8, 8, 17, { bowl: BOWL }],
  ['Palak paneer', 'palak paneer, saag paneer', 160, 7, 6, 12, { bowl: BOWL }],
  ['Tofu (firm)', 'tofu', 144, 17, 3, 8.7],
  ['Soya chunks (cooked)', 'soya chunks, soy chunks, meal maker', 120, 17, 10, 0.5, { cup: 100 }],
  ['Whey protein', 'whey, whey protein, protein powder, protein shake', 400, 80, 8, 6, { scoop: 30 }],
  ['Beef (lean, cooked)', 'beef, steak', 217, 26, 0, 12, { piece: 150 }],
  ['Pork (cooked)', 'pork', 242, 27, 0, 14],

  // ── Lentils & legumes ──
  ['Dal (cooked, toor/moong)', 'dal, daal, dhal, toor dal, arhar dal, moong dal, yellow dal, dal tadka, sambar dal', 116, 7, 17, 2.5, { bowl: BOWL, cup: CUP, katori: 150 }],
  ['Dal makhani', 'dal makhani, black dal, maa ki dal', 150, 6, 15, 7.5, { bowl: BOWL }],
  ['Chana masala', 'chana, chole, chana masala, chickpea curry', 150, 7, 20, 5, { bowl: BOWL }],
  ['Rajma', 'rajma, kidney beans, rajma curry', 140, 7, 19, 4, { bowl: BOWL }],
  ['Chickpeas (boiled)', 'chickpeas, boiled chana, garbanzo', 164, 9, 27, 2.6, { cup: 165 }],
  ['Sambar', 'sambar, sambhar', 70, 3, 10, 2, { bowl: BOWL, cup: CUP }],
  ['Rasam', 'rasam', 35, 1, 5, 1.2, { bowl: BOWL, cup: CUP }],
  ['Sprouts (moong)', 'sprouts, moong sprouts', 30, 3, 6, 0.2, { cup: 100 }],

  // ── Grains & staples ──
  ['White rice (cooked)', 'rice, white rice, steamed rice, plain rice, boiled rice, chawal', 130, 2.7, 28, 0.3, { cup: 160, bowl: BOWL, plate: 250 }],
  ['Brown rice (cooked)', 'brown rice', 112, 2.3, 23.5, 0.8, { cup: 160, bowl: BOWL }],
  ['Jeera rice', 'jeera rice, cumin rice', 160, 3, 28, 4, { bowl: BOWL }],
  ['Curd rice', 'curd rice, thayir sadam', 120, 3.5, 18, 3.5, { bowl: 200 }],
  ['Lemon rice', 'lemon rice, pulihora, tamarind rice', 170, 3, 29, 5, { bowl: 200 }],
  ['Pulao / veg fried rice', 'pulao, veg pulao, fried rice, veg fried rice', 165, 3.5, 26, 5.5, { plate: 250, bowl: 200 }],
  ['Khichdi', 'khichdi, khichri', 120, 4.5, 20, 2.5, { bowl: 200 }],
  ['Roti / chapati', 'roti, chapati, chapathi, phulka, rotis, chapatis', 297, 10, 52, 7, { piece: 40, roti: 40, chapati: 40 }],
  ['Paratha (plain)', 'paratha, parotta', 326, 7, 45, 13, { piece: 80 }],
  ['Aloo paratha', 'aloo paratha, stuffed paratha', 260, 5.5, 36, 10.5, { piece: 120 }],
  ['Naan', 'naan, butter naan', 290, 9, 50, 5.5, { piece: 90 }],
  ['Poori', 'poori, puri', 340, 6.5, 42, 16, { piece: 25 }],
  ['Idli', 'idli, idly', 130, 4, 27, 0.5, { piece: 40 }],
  ['Dosa (plain)', 'dosa, plain dosa', 168, 4, 29, 3.7, { piece: 80 }],
  ['Masala dosa', 'masala dosa', 190, 4, 28, 7, { piece: 160 }],
  ['Upma', 'upma, rava upma', 140, 3.5, 20, 5, { bowl: 200, plate: 200 }],
  ['Poha', 'poha, aval, flattened rice', 130, 2.5, 23, 3.5, { bowl: 150, plate: 200 }],
  ['Oats (cooked with water)', 'oatmeal, porridge, cooked oats', 71, 2.5, 12, 1.5, { bowl: 250, cup: 234 }],
  ['Oats (dry)', 'oats, rolled oats', 389, 17, 66, 7, { cup: 80, tbsp: 5 }],
  ['Bread (white)', 'bread, white bread, toast', 265, 9, 49, 3.2, { slice: 28, piece: 28 }],
  ['Bread (whole wheat)', 'brown bread, whole wheat bread, multigrain bread', 247, 13, 41, 3.4, { slice: 32, piece: 32 }],
  ['Pasta (cooked)', 'pasta, spaghetti, macaroni, penne', 158, 5.8, 31, 0.9, { cup: 140, bowl: 200, plate: 250 }],
  ['Noodles (cooked)', 'noodles, maggi, instant noodles, hakka noodles', 190, 4.5, 27, 7, { bowl: 200, plate: 250, packet: 280 }],
  ['Quinoa (cooked)', 'quinoa', 120, 4.4, 21, 1.9, { cup: 185 }],
  ['Potato (boiled)', 'potato, boiled potato, aloo', 87, 1.9, 20, 0.1, { piece: 150 }],
  ['Sweet potato (boiled)', 'sweet potato, shakarkandi', 76, 1.4, 17.7, 0.1, { piece: 130 }],
  ['Corn (boiled)', 'corn, sweet corn, bhutta', 96, 3.4, 21, 1.5, { cup: 150, piece: 100 }],

  // ── Vegetables & curries ──
  ['Mixed veg curry', 'sabzi, sabji, vegetable curry, mixed veg, veg curry, curry', 100, 2.5, 9, 6, { bowl: BOWL }],
  ['Aloo sabzi', 'aloo sabzi, potato curry, aloo curry, aloo gobi', 120, 2, 15, 6, { bowl: BOWL }],
  ['Bhindi fry', 'bhindi, okra, ladies finger', 110, 2.3, 9, 7.5, { bowl: 120 }],
  ['Salad (mixed greens)', 'salad, green salad, veg salad', 20, 1.3, 3.5, 0.2, { bowl: 100, cup: 50 }],
  ['Broccoli', 'broccoli', 35, 2.4, 7, 0.4, { cup: 90 }],
  ['Spinach (cooked)', 'spinach, palak', 23, 3, 3.8, 0.3, { cup: 180 }],
  ['Cucumber', 'cucumber, kheera', 15, 0.7, 3.6, 0.1, { piece: 200 }],
  ['Tomato', 'tomato, tomatoes', 18, 0.9, 3.9, 0.2, { piece: 120 }],
  ['Carrot', 'carrot, carrots', 41, 0.9, 10, 0.2, { piece: 60 }],
  ['Onion', 'onion', 40, 1.1, 9, 0.1, { piece: 110 }],
  ['Mushrooms (cooked)', 'mushroom, mushrooms', 28, 2.2, 5.3, 0.5, { cup: 156 }],

  // ── Dairy ──
  ['Milk (toned / 3% fat)', 'milk, toned milk', 60, 3.2, 4.8, 3, { cup: CUP, glass: 250, ml: 1 }],
  ['Milk (full cream)', 'full cream milk, whole milk, full fat milk', 67, 3.3, 4.8, 3.8, { cup: CUP, glass: 250, ml: 1 }],
  ['Skimmed milk', 'skim milk, skimmed milk', 35, 3.4, 5, 0.1, { cup: CUP, glass: 250, ml: 1 }],
  ['Curd / dahi', 'curd, dahi, yogurt, yoghurt, plain yogurt', 61, 3.5, 4.7, 3.3, { bowl: BOWL, cup: 245, katori: 100 }],
  ['Greek yogurt', 'greek yogurt, hung curd', 97, 9, 3.9, 5, { cup: 200 }],
  ['Buttermilk', 'buttermilk, chaas, chaach', 40, 3.3, 4.8, 0.9, { glass: 250, cup: CUP, ml: 1 }],
  ['Lassi (sweet)', 'lassi, sweet lassi', 100, 3, 15, 3, { glass: 250 }],
  ['Cheese (cheddar)', 'cheese, cheddar', 403, 25, 1.3, 33, { slice: 20 }],
  ['Butter', 'butter', 717, 0.9, 0.1, 81, { tbsp: 14, tsp: 5 }],
  ['Ghee', 'ghee, clarified butter', 900, 0, 0, 100, { tbsp: 13, tsp: 5 }],

  // ── Fruits ──
  ['Banana', 'banana, bananas', 89, 1.1, 23, 0.3, { piece: 118 }],
  ['Apple', 'apple, apples', 52, 0.3, 14, 0.2, { piece: 182 }],
  ['Orange', 'orange, oranges', 47, 0.9, 12, 0.1, { piece: 130 }],
  ['Mango', 'mango, mangoes', 60, 0.8, 15, 0.4, { piece: 200, cup: 165 }],
  ['Papaya', 'papaya', 43, 0.5, 11, 0.3, { cup: 145 }],
  ['Watermelon', 'watermelon', 30, 0.6, 7.6, 0.2, { cup: 152, slice: 280 }],
  ['Grapes', 'grapes', 69, 0.7, 18, 0.2, { cup: 150 }],
  ['Pomegranate', 'pomegranate, anar', 83, 1.7, 19, 1.2, { cup: 174, piece: 280 }],
  ['Guava', 'guava, amrood', 68, 2.6, 14, 1, { piece: 55 }],
  ['Dates', 'dates, khajur', 282, 2.5, 75, 0.4, { piece: 8 }],

  // ── Nuts, seeds & fats ──
  ['Almonds', 'almonds, badam', 579, 21, 22, 50, { piece: 1.2, handful: 28 }],
  ['Peanuts (roasted)', 'peanuts, groundnuts', 585, 24, 21, 50, { handful: 30, tbsp: 9 }],
  ['Peanut butter', 'peanut butter', 588, 25, 20, 50, { tbsp: 16, tsp: 5 }],
  ['Cashews', 'cashews, kaju', 553, 18, 30, 44, { piece: 1.5, handful: 28 }],
  ['Walnuts', 'walnuts, akhrot', 654, 15, 14, 65, { piece: 4, handful: 28 }],
  ['Chia seeds', 'chia, chia seeds', 486, 17, 42, 31, { tbsp: 12 }],
  ['Olive oil', 'olive oil', 884, 0, 0, 100, { tbsp: 13.5, tsp: 4.5 }],
  ['Cooking oil', 'oil, cooking oil, sunflower oil, vegetable oil', 884, 0, 0, 100, { tbsp: 13.5, tsp: 4.5 }],

  // ── Snacks & sweets ──
  ['Samosa', 'samosa, samosas', 262, 4.5, 30, 14, { piece: 70 }],
  ['Pakora / bhaji', 'pakora, pakoda, bhaji, bajji', 300, 7, 28, 18, { piece: 25, plate: 150 }],
  ['Vada', 'vada, medu vada, vadai', 290, 9, 30, 15, { piece: 50 }],
  ['Pani puri', 'pani puri, golgappa, puchka', 200, 4, 35, 5, { piece: 15, plate: 90 }],
  ['Pav bhaji', 'pav bhaji', 190, 4.5, 25, 8, { plate: 300 }],
  ['Biscuits', 'biscuit, biscuits, cookie, cookies', 480, 7, 70, 20, { piece: 10 }],
  ['Potato chips', 'chips, potato chips, crisps, lays', 536, 7, 53, 35, { packet: 52 }],
  ['Dark chocolate', 'dark chocolate, chocolate', 546, 5, 61, 31, { piece: 10, bar: 50 }],
  ['Gulab jamun', 'gulab jamun', 330, 4, 50, 13, { piece: 50 }],
  ['Rasgulla', 'rasgulla, rasagola', 186, 4, 40, 1.7, { piece: 50 }],
  ['Kheer', 'kheer, payasam, rice pudding', 140, 3.5, 20, 5, { bowl: 150 }],
  ['Ice cream', 'ice cream', 207, 3.5, 24, 11, { scoop: 66, cup: 132 }],
  ['Pizza', 'pizza', 266, 11, 33, 10, { slice: 107 }],
  ['Burger', 'burger, veg burger, chicken burger', 250, 12, 30, 9, { piece: 200 }],
  ['French fries', 'fries, french fries', 312, 3.4, 41, 15, { serving: 117 }],
  ['Sandwich (veg)', 'sandwich, veg sandwich', 230, 7, 32, 8, { piece: 150 }],

  // ── Drinks ──
  ['Tea with milk & sugar', 'tea, chai, masala chai', 45, 1.2, 7, 1.3, { cup: 150, ml: 1 }],
  ['Coffee with milk & sugar', 'coffee, filter coffee, latte', 50, 1.5, 7, 1.5, { cup: 150, ml: 1 }],
  ['Black coffee', 'black coffee, americano, espresso', 2, 0.1, 0, 0, { cup: 240, ml: 1 }],
  ['Orange juice', 'juice, orange juice, fruit juice', 45, 0.7, 10, 0.2, { glass: 250, cup: CUP, ml: 1 }],
  ['Coconut water', 'coconut water, tender coconut', 19, 0.7, 3.7, 0.2, { glass: 250, ml: 1 }],
  ['Soft drink / cola', 'coke, cola, soda, soft drink, pepsi', 42, 0, 10.6, 0, { can: 330, glass: 250, ml: 1 }],
  ['Beer', 'beer', 43, 0.5, 3.6, 0, { can: 330, bottle: 650, pint: 473, ml: 1 }],
  ['Sugar', 'sugar', 387, 0, 100, 0, { tsp: 4, tbsp: 12.5 }],
  ['Honey', 'honey', 304, 0.3, 82, 0, { tsp: 7, tbsp: 21 }],
]


// Fiber (g) | sugar (g) | sodium (mg) per 100 g. Prepared dishes assume normal home salt.
const EXTRA = `
Chicken breast (cooked)|0|0|74
Chicken thigh (cooked)|0|0|95
Chicken curry|1|1.5|400
Butter chicken|1|3|450
Chicken tikka|0.5|1|500
Chicken biryani|1|1|400
Mutton curry|1|1.5|400
Fish (cooked)|0|0|80
Fish curry|1|1.5|400
Salmon (cooked)|0|0|61
Tuna (canned in water)|0|0|247
Prawns (cooked)|0|0|220
Egg (whole, boiled)|0|1.1|124
Egg white|0|0.7|166
Omelette|0|1|300
Scrambled eggs|0|1.5|300
Paneer|0|2.6|20
Paneer butter masala|1.5|4|450
Palak paneer|2.5|2|400
Tofu (firm)|2.3|0.6|14
Soya chunks (cooked)|4|2|10
Whey protein|0|6|250
Beef (lean, cooked)|0|0|65
Pork (cooked)|0|0|60
Dal (cooked, toor/moong)|2.5|1|250
Dal makhani|4|1.5|350
Chana masala|6|2|350
Rajma|5.5|1.5|350
Chickpeas (boiled)|7.6|4.8|7
Sambar|2.5|2|350
Rasam|0.7|1.5|400
Sprouts (moong)|1.8|4|6
White rice (cooked)|0.4|0.1|1
Brown rice (cooked)|1.8|0.4|5
Jeera rice|0.6|0.2|250
Curd rice|0.4|2|250
Lemon rice|1|0.5|300
Pulao / veg fried rice|1.2|1|350
Khichdi|2|0.5|250
Roti / chapati|5|1.5|300
Paratha (plain)|4|1.5|400
Aloo paratha|3.5|1.5|400
Naan|2.2|3.5|450
Poori|3|1|300
Idli|1.5|0.5|250
Dosa (plain)|1.5|0.5|300
Masala dosa|2|1.5|350
Upma|1.5|1|350
Poha|1.5|1|300
Oats (cooked with water)|1.7|0.3|4
Oats (dry)|10.6|1|2
Bread (white)|2.7|5|490
Bread (whole wheat)|6|6|450
Pasta (cooked)|1.8|0.6|1
Noodles (cooked)|1.5|1|600
Quinoa (cooked)|2.8|0.9|7
Potato (boiled)|1.8|0.9|4
Sweet potato (boiled)|2.5|5.7|27
Corn (boiled)|2.4|4.5|1
Mixed veg curry|3|3|350
Aloo sabzi|2.5|2|350
Bhindi fry|3.5|1.5|300
Salad (mixed greens)|2|2|20
Broccoli|2.6|1.7|33
Spinach (cooked)|2.4|0.4|70
Cucumber|0.5|1.7|2
Tomato|1.2|2.6|5
Carrot|2.8|4.7|69
Onion|1.7|4.2|4
Mushrooms (cooked)|2.2|2.3|2
Milk (toned / 3% fat)|0|4.8|45
Milk (full cream)|0|5|43
Skimmed milk|0|5|42
Curd / dahi|0|4.7|46
Greek yogurt|0|3.2|36
Buttermilk|0|4.8|120
Lassi (sweet)|0|14|40
Cheese (cheddar)|0|0.5|650
Butter|0|0.1|640
Ghee|0|0|2
Banana|2.6|12|1
Apple|2.4|10|1
Orange|2.4|9|0
Mango|1.6|14|1
Papaya|1.7|8|8
Watermelon|0.4|6.2|1
Grapes|0.9|15.5|2
Pomegranate|4|13.7|3
Guava|5.4|8.9|2
Dates|8|63|2
Almonds|12.5|4.4|1
Peanuts (roasted)|8.5|4.2|6
Peanut butter|6|9|430
Cashews|3.3|6|12
Walnuts|6.7|2.6|2
Chia seeds|34|0|16
Olive oil|0|0|2
Cooking oil|0|0|0
Samosa|3|2|450
Pakora / bhaji|3.5|2|500
Vada|4|1|450
Pani puri|3|4|500
Pav bhaji|3|4|500
Biscuits|2|25|400
Potato chips|4.4|0.3|525
Dark chocolate|7|48|20
Gulab jamun|0.5|40|40
Rasgulla|0|38|15
Kheer|0.3|15|50
Ice cream|0.7|21|80
Pizza|2.3|3.6|600
Burger|1.5|5|500
French fries|3.8|0.3|210
Sandwich (veg)|3|3|450
Tea with milk & sugar|0|6.5|15
Coffee with milk & sugar|0|6.5|20
Black coffee|0|0|2
Orange juice|0.2|8.4|1
Coconut water|1.1|2.6|105
Soft drink / cola|0|10.6|4
Beer|0|0|4
Sugar|0|100|1
Honey|0.2|82|4
`
const extras = new Map(
  EXTRA.trim().split('\n').map((l) => { const [n, fib, sug, na] = l.split('|'); return [n, { fib: +fib, sug: +sug, na: +na }] }),
)

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export const FOODS: Food[] = rows.map(([name, aliases, kcal, p, c, f, units]) => ({
  id: 'local:' + slug(name),
  name,
  aliases: aliases.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean),
  kcal,
  p,
  c,
  f,
  ...(extras.get(name) ?? { fib: 0, sug: 0, na: 0 }),
  units,
}))

export const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]))

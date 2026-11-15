# fityo — calorie tracker with voice logging

A fast, good-looking calorie tracker. Say *"I had 200 grams of chicken, 200 grams of rice and 100 grams of dal"*, check what it understood, and log it with one tap. You can set a calorie goal for each week and see your deficit.

## Features
- **Voice logging** uses the browser's speech recognition (Chrome, Edge, Safari). It understands grams, kg, ml, cups, bowls/katoris, plates, slices, spoons and counts ("2 rotis", "a banana", "one and a half cup milk"). It also picks up the meal from "for lunch…".
- **You can also type** the same sentence, or search for a food and add it.
- **Food data:** about 130 common foods are built in, including many Indian dishes (dal, roti, idli, dosa, biryani, paneer…), and work offline. Anything else is looked up in the [USDA FoodData Central](https://fdc.nal.usda.gov/) API, which has 300k+ foods (generic and branded).
- **Review step** before saving. You can change any match, amount or unit.
- **Today view:** a calorie ring, protein/carbs/fat bars, and meals grouped as breakfast / lunch / snacks / dinner. You can edit or delete any entry.
- **Week view:** set a calorie budget for each week (or use daily goal × 7) and see:
  - consumed vs budget
  - deficit vs maintenance
  - estimated fat change (7,700 kcal ≈ 1 kg)
  - a daily bar chart
  - an end-of-week report
  - a history of past weeks
- **Settings:**
  - daily and protein goals
  - maintenance (TDEE) calculator (Mifflin-St Jeor)
  - voice language
  - USDA API key
  - your own custom foods
  - JSON export and import

## Run it
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (deploy to Vercel/Netlify/etc.)
```
Voice input needs either `localhost` or HTTPS, and microphone permission.

## USDA API key (optional)
Without a key the app uses `DEMO_KEY`, which allows only about 30 lookups per hour. A free personal key takes a minute to get at https://fdc.nal.usda.gov/api-key-signup. Paste it into **Settings**.

## Data
Everything is stored in the browser (localStorage). To move it to another device, use Settings → Export / Import. Cloud sync with Supabase is not built yet.

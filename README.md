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

## Data & cloud sync (Supabase)
- The app works without an account; data then lives only in that browser.
- Sign in (Settings or the cloud pill in the top bar) and your log, goals, custom foods and USDA key are saved to Supabase and synced across devices.
- Changes are saved locally first, so the app stays instant and works offline; pending changes upload when you're back online.
- Tables `entries` and `user_state` use Row Level Security, so each account can only read and write its own rows.
- The Supabase URL and publishable key are in `src/lib/sync.ts`. They are public by design. Override them with `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` if needed.

## Hosting on GitHub Pages
`.github/workflows/deploy.yml` builds and deploys on every push to `main`. It needs a one-time setup: **Settings → Pages → Source: GitHub Actions**.
The site is then at https://jaswanth-akireddy.github.io/fityo/

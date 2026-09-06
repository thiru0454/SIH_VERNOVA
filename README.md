# Vernova

AI-powered vernacular pedagogy and real-time translation tool for mother-tongue
primary education — built for **SIH26042** (Government of Jharkhand).

Prototype scope: one-way and bidirectional Hindi <-> Santhali voice translation,
plus a rule-based bilingual worksheet generator aligned to NIPUN Bharat FLN
outcomes.

## Tech stack

- Framework: Next.js 15 (App Router, TypeScript)
- Styling: Tailwind CSS v4
- Translation backbone: Bhashini (ULCA / Dhruva) government APIs
- Icons: lucide-react

No database is required for the prototype — sample curriculum lessons are
seeded directly in src/data/curriculum.ts.

## Getting started

```bash
npm install
cp .env.example .env.local
# then fill in BHASHINI_USER_ID and BHASHINI_API_KEY in .env.local
npm run dev
```

Open http://localhost:3000. For the best feel, open it on your phone (same
Wi-Fi network, use your machine's local IP instead of localhost) or in your
browser's device-emulation mode — the UI is built mobile-first.

## Demo mode (no API key yet)

The app runs and is fully click-through-able even without Bhashini
credentials. If BHASHINI_USER_ID / BHASHINI_API_KEY are missing, every API
call in src/lib/bhashiniClient.ts automatically falls back to a
clearly-labelled mock response instead of failing — so you can demo the full
UI flow today, and it'll start using live translation the moment you add real
keys to .env.local. No code changes needed to switch over.

## Project structure

```
src/
  app/
    page.tsx                        Home screen
    translate/page.tsx              Voice translation screen (mic, direction toggle)
    worksheet/page.tsx              Worksheet generator screen
    api/
      translate-voice/route.ts      ASR -> NMT -> TTS pipeline endpoint
      generate-worksheet/route.ts   Worksheet generation endpoint
      curriculum/route.ts           Serves seeded sample lessons
      health/route.ts               Health check + Bhashini config status
  components/
    BottomNav.tsx                   Mobile tab bar
    ScreenHeader.tsx                Shared screen header
  lib/
    bhashiniClient.ts               Bhashini API wrapper (with mock fallback)
    worksheetEngine.ts              Rule-based worksheet template engine
  data/
    curriculum.ts                   Seeded sample FLN lessons
```

## Getting Bhashini API credentials

1. Register as an integrator at bhashini.gov.in
2. Once approved, you'll receive a userID and ulcaApiKey
3. Check the model explorer (bhashini.gov.in/ulca/model/explore-models) to
   confirm which Pipeline ID supports Santhali ASR/NMT/TTS, and set
   BHASHINI_PIPELINE_ID in .env.local if different from the default

## What's intentionally NOT built yet (roadmap, not missing)

- Multi-language classroom mode (Ho, Mundari simultaneously)
- Fully offline on-device models (this prototype calls Bhashini's cloud APIs;
  offline deployment via quantized on-device models is the next engineering
  phase)
- The adaptive diagnostic layer (linguistic vs. conceptual error detection)

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # run production build
npm run lint     # lint
```

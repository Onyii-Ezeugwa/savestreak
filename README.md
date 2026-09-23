# $aveStreak

A student financial wellness landing page built with Next.js, TypeScript, and Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## OpenRouter

The AI Goal Planner calls `/api/goal-plan` on the server. Set `OPENROUTER_API_KEY` and optional `OPENROUTER_MODELS` in `.env` or `.env.local`.

The API tries each free model in order until one returns a usable plan. OpenAI models are not used. If `OPENROUTER_API_KEY` is missing, it returns a clearly labeled mock savings plan so the UI still works in development.

Never put the API key in client-side code.

## Deploy on Vercel

1. Import this GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Add these environment variables before the first deploy:
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODELS` (optional; defaults to the free-model queue in the app)
3. Deploy.

Do not add a `.env` file to the repo. Set secrets only in the Vercel project settings.

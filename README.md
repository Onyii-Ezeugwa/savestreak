# $aveStreak

**Save smarter. Build habits.**

A gamified savings coach for students. Set a goal, keep a streak, pick up money habits that actually stick, and get a nudge when you need one.

**Live:** [savestreak.org](https://savestreak.org)

No bank account required to get started.

## Why $aveStreak

Most money apps are built for people who already have a paycheck, a credit score, and a lot of jargon. $aveStreak is built for students: high school and college, first jobs, first apartments, first time trying to save on purpose.

Goals become quests. Deposits keep streaks alive. Short lessons earn XP. An AI Goal Planner turns “I want to save for X by Y” into a plan you can actually follow.

## What you can do

- **Set a savings quest** with a target amount and a date
- **Follow a weekly plan** instead of guessing how much to put aside
- **Keep a savings streak** and watch progress on your dashboard
- **Try the AI Goal Planner** on the homepage, even before you sign up
- **Learn in a few minutes** with practical lessons tied to real student choices
- **Create an account** with your school, so the experience matches where you actually are

## How it works

1. **Set your quest.** Tell $aveStreak what you are saving for and when you need it.
2. **Unlock your plan.** Get a path that fits the goal and the timeline.
3. **Build your streak.** Log deposits, earn XP, and keep the habit going.

## Accounts and safety

$aveStreak is for students 13 and older.

- **18 and over:** sign up, confirm your email, and start using the dashboard.
- **Under 18:** a parent or guardian has to approve the account by email before it becomes active.

We do not give investment, credit, tax, or professional financial advice. $aveStreak is a savings habit coach, not a bank, broker, or lender.

## Built with

- [Next.js](https://nextjs.org/) and React
- [Supabase](https://supabase.com/) for auth and Postgres
- [Resend](https://resend.com/) for email
- [OpenRouter](https://openrouter.ai/) for the Goal Planner

The app runs on Vercel at [savestreak.org](https://savestreak.org).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Put secrets in `.env.local`. Restart the dev server after you change it.

| Variable | What it is for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key for the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access |
| `RESEND_API_KEY` | Transactional email |
| `OPENROUTER_API_KEY` | AI Goal Planner |
| `DATA_GOV_API_KEY` | Optional. Better US college search. Falls back to a demo key. |

Preview the guardian consent email locally with:

```bash
npm run email
```

Then open [http://localhost:3001](http://localhost:3001).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app locally |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint the project |
| `npm run email` | Preview email templates |

## Contact

Questions or account issues: [savestreak.org/contact](https://savestreak.org/contact)

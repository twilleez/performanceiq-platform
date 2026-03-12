# PerformanceIQ

Athlete-first sport-science training platform. Coach-powered teams. Apple-native feel.

---

## Stack

| Layer       | Tech                          |
|-------------|-------------------------------|
| Build       | Vite 5                        |
| Auth + DB   | Supabase (Postgres + RLS)     |
| Deploy      | GitHub Pages via Actions      |
| Tests       | Vitest                        |
| Runtime     | Vanilla JS ES modules         |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/twilleez/performanceiq-platform.git
cd performanceiq-platform
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Open **SQL Editor** → New Query
3. Paste the contents of `supabase-schema.sql` and run it
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key

### 3. Set environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Enable Email auth in Supabase

**Authentication → Providers → Email** — make sure it's enabled.
For magic links, no extra config needed.

### 5. Run locally

```bash
npm run dev
```

Open `http://localhost:5173/performanceiq-platform/`

---

## Deploy to GitHub Pages

### Add secrets to your repo

Go to **Settings → Secrets and variables → Actions** and add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Push to main

GitHub Actions runs tests, then builds and deploys automatically on every push to `main`.

---

## Project Structure

```
src/
├── app.js                  # Entry point — auth listener, data loading, render loop
├── router.js               # Screen routing
├── state/
│   └── state.js            # UI-only state (data lives in Supabase)
├── services/
│   ├── supabase.js         # Client singleton
│   ├── auth.js             # signIn, signUp, signOut, magic link, onAuthChange
│   ├── profiles.js         # getProfile, updateProfile
│   ├── workouts.js         # getTodaysWorkout, createWorkout, saveProgress, complete
│   ├── readiness.js        # getTodaysReadiness, saveReadiness, getReadinessTrend
│   ├── prs.js              # getPersonalRecords, maybeSetPR
│   └── teams.js            # getCoachTeams, getAthleteTeam, createTeam, addAthlete
├── features/
│   ├── trainingEngine.js   # Pure functions — exercise lookup, swap, set toggle, auto-generate
│   └── microcycle.js       # Weekly plan templates per sport, real-date status
├── data/
│   └── exercises.js        # 40 exercises across 6 sports
├── views/
│   ├── auth.js             # Email + password + magic link login
│   ├── athleteHome.js      # Today tab
│   ├── session.js          # Train tab
│   ├── progress.js         # Progress tab with real sparklines
│   ├── profile.js          # Profile tab
│   ├── sheets.js           # Bottom sheets (readiness, sets, swap, detail, video)
│   └── team.js             # Coach views (home, schedule, roster, activity)
├── __tests__/
│   └── trainingEngine.test.js
└── styles.css
```

---

## Data Model

```
profiles          — one per user, created on signup via trigger
  └─ workouts     — one per day per athlete
  └─ readiness_logs — one per day, upserted on check-in
  └─ personal_records — one per exercise PR

teams
  └─ team_members  — athlete ↔ team join table
  └─ team_announcements
  └─ coach_notes

workout_templates  — reusable plans coaches or the system defines
```

Row-Level Security is enabled on all tables. Athletes only ever see their own data. Coaches see data for athletes on their teams.

---

## Running Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

---

## Environment Variables

| Variable                | Required | Description                        |
|-------------------------|----------|------------------------------------|
| `VITE_SUPABASE_URL`     | Yes      | Your Supabase project URL          |
| `VITE_SUPABASE_ANON_KEY`| Yes      | Supabase anon/public key           |

Never commit `.env.local`. It's gitignored.

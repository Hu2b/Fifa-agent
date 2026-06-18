# ⚽ FIFA World Cup 2026 Live Agent

Live scores, results, and head-to-head history for the 2026 FIFA World Cup.

## Setup (5 minutes)

### 1. Get a free API key
Go to [football-data.org/client/register](https://www.football-data.org/client/register)  
Sign up → check your email → copy your API key.

### 2. Install and configure
```bash
npm install
cp .env.example .env
# Edit .env and paste your API key
```

### 3. Run locally
```bash
npm run dev
# Open http://localhost:5173
```

### 4. Deploy to Vercel (free, live URL in 60 seconds)
```bash
npm install -g vercel
vercel
# Follow prompts — it auto-detects Vite
# When asked for environment variables, add VITE_FD_API_KEY
```

Or use the Vercel dashboard:
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variable: `VITE_FD_API_KEY` = your key
4. Deploy → get a live URL like `https://fifa-agent.vercel.app`

## Features
- ✅ Live scores with auto-refresh every hour
- ✅ Refreshes when you return to the tab
- ✅ Manual refresh button
- ✅ Head-to-head history for every match
- ✅ Today's matches + yesterday's results
- ✅ CET times throughout
- ✅ Works on mobile, tablet, desktop

## Data
- Scores & fixtures: [football-data.org](https://www.football-data.org) (free tier)
- H2H history: curated manually for each WC 2026 matchup

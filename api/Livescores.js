// /api/livescores
// Fetches live scores from API-Football for today's WC matches
// Only calls the external API if cache is older than 15 minutes
// All users share the same Redis cache

const REDIS_URL   = process.env.KV_REST_API_URL
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN
const AF_KEY      = process.env.API_FOOTBALL_KEY  // x-rapidapi-key

const CACHE_KEY     = 'livescores:wc2026'
const CACHE_TTL_MIN = 15

// Status mapping from API-Football to our display
function mapStatus(s, elapsed) {
  if (!s) return null
  if (['TBD','NS'].includes(s))           return { status: 'Upcoming', minute: null }
  if (['1H','ET'].includes(s))            return { status: elapsed ? `${elapsed}'` : 'LIVE', minute: elapsed }
  if (s === 'HT')                         return { status: 'HT', minute: null }
  if (['2H','P'].includes(s))             return { status: elapsed ? `${elapsed}'` : 'LIVE', minute: elapsed }
  if (['FT','AET','PEN'].includes(s))     return { status: 'FT', minute: null }
  if (s === 'PST')                        return { status: 'Postponed', minute: null }
  return { status: s, minute: elapsed || null }
}

async function kvGet(key) {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    })
    const d = await r.json()
    if (d.result === null || d.result === undefined) return null
    if (typeof d.result === 'string') {
      try { return JSON.parse(d.result) } catch(_) { return null }
    }
    return d.result
  } catch(e) { return null }
}

async function kvSet(key, value, ttlSeconds) {
  if (!REDIS_URL || !REDIS_TOKEN) return
  const encoded = encodeURIComponent(JSON.stringify(value))
  const url = ttlSeconds
    ? `${REDIS_URL}/set/${encodeURIComponent(key)}/${encoded}/EX/${ttlSeconds}`
    : `${REDIS_URL}/set/${encodeURIComponent(key)}/${encoded}`
  await fetch(url, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  })
}

async function fetchFromAPIFootball() {
  if (!AF_KEY) throw new Error('NO_API_FOOTBALL_KEY')

  // WC 2026 league ID = 1 (FIFA World Cup), season = 2026
  const url = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026&live=all'
  const r = await fetch(url, {
    headers: {
      'x-rapidapi-key': AF_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    }
  })

  if (!r.ok) throw new Error(`API-Football ${r.status}`)
  const data = await r.json()

  // If no live matches, also fetch today's fixtures to get final scores
  let fixtures = data.response || []

  if (fixtures.length === 0) {
    // Fetch today's completed/upcoming WC matches
    const today = new Date().toISOString().slice(0, 10)
    const r2 = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${today}`,
      { headers: { 'x-rapidapi-key': AF_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' } }
    )
    if (r2.ok) {
      const d2 = await r2.json()
      fixtures = d2.response || []
    }
  }

  // Build a lookup map: home_team_name → score/status
  const scores = {}
  for (const f of fixtures) {
    const home = f.teams?.home?.name
    const away = f.teams?.away?.name
    const s = f.fixture?.status?.short
    const elapsed = f.fixture?.status?.elapsed
    const mapped = mapStatus(s, elapsed)

    if (home && away && mapped) {
      const key = `${home}|${away}`
      scores[key] = {
        status: mapped.status,
        minute: mapped.minute,
        home_score: f.goals?.home ?? null,
        away_score: f.goals?.away ?? null,
        home_name: home,
        away_name: away,
      }
    }
  }

  return scores
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!AF_KEY) {
    return res.status(200).json({
      source: 'no_key',
      message: 'API_FOOTBALL_KEY not configured',
      scores: {},
      cached_at: null,
    })
  }

  try {
    // Check Redis cache
    const cached = await kvGet(CACHE_KEY)

    if (cached && cached.cached_at) {
      const ageMin = (Date.now() - new Date(cached.cached_at).getTime()) / 60000
      console.log(`Cache age: ${ageMin.toFixed(1)} min`)

      if (ageMin < CACHE_TTL_MIN) {
        return res.status(200).json({
          source: 'cache',
          cached_at: cached.cached_at,
          age_minutes: Math.round(ageMin),
          next_refresh_in: Math.round(CACHE_TTL_MIN - ageMin),
          scores: cached.scores,
        })
      }
    }

    // Cache miss or expired — fetch from API-Football
    console.log('Fetching live scores from API-Football...')
    const scores = await fetchFromAPIFootball()
    const now = new Date().toISOString()

    const payload = { scores, cached_at: now }
    // Cache for 20 min in Redis (TTL slightly longer than our 15-min gate)
    await kvSet(CACHE_KEY, payload, 1200)

    return res.status(200).json({
      source: 'fetched',
      cached_at: now,
      age_minutes: 0,
      next_refresh_in: CACHE_TTL_MIN,
      scores,
    })

  } catch(err) {
    console.error('livescores error:', err.message)
    return res.status(200).json({
      source: 'error',
      error: err.message,
      scores: {},
      cached_at: null,
    })
  }
}

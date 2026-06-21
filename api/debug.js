export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const AF_KEY = process.env.API_FOOTBALL_KEY
  const REDIS_URL = process.env.KV_REST_API_URL
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN

  // Check what's in Redis cache
  let cached = null
  try {
    const r = await fetch(`${REDIS_URL}/get/livescores:wc2026`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    })
    const d = await r.json()
    if (d.result) cached = JSON.parse(d.result)
  } catch(e) {}

  // Fetch fresh from API-Football
  let fresh = null
  let freshError = null
  if (AF_KEY) {
    try {
      const today = new Date().toISOString().slice(0,10)
      const r = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${today}`,
        { headers: { 'x-apisports-key': AF_KEY } }
      )
      const d = await r.json()
      fresh = {
        results: d.results,
        errors: d.errors,
        matches: (d.response || []).map(f => ({
          home: f.teams?.home?.name,
          away: f.teams?.away?.name,
          status: f.fixture?.status?.short,
          elapsed: f.fixture?.status?.elapsed,
          home_score: f.goals?.home,
          away_score: f.goals?.away,
        }))
      }
    } catch(e) { freshError = e.message }
  }

  return res.status(200).json({
    has_key: !!AF_KEY,
    cached_keys: cached ? Object.keys(cached.scores || {}) : null,
    cached_at: cached?.cached_at,
    fresh,
    fresh_error: freshError,
  })
}

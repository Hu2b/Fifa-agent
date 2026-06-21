// /api/livescores
// Reads live scores directly from openfootball worldcup.json
// Same source as fixtures - no extra API key needed
// Cache 15 min in Redis to avoid hammering the source

const RAW = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
const REDIS_URL   = process.env.KV_REST_API_URL
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN
const CACHE_KEY   = 'livescores:wc2026'
const CACHE_TTL_MIN = 15

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
  await fetch(url, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } })
}

function toStatus(m) {
  if (!m.score) return null // no score data = skip, keep openfootball status
  if (m.score.ft) return 'FT'
  if (m.score.ht) return 'HT'
  return null
}

function parseMatchUTC(dateStr, timeStr) {
  const clean = (timeStr || '00:00').trim()
  const match = clean.match(/(\d{2}:\d{2})\s*(?:UTC([+-]\d+))?/)
  if (!match) return new Date(`${dateStr}T00:00:00Z`)
  const [hh, mm] = match[1].split(':').map(Number)
  const offset = match[2] ? parseInt(match[2]) : 0
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCHours(hh - offset, mm, 0, 0)
  return d
}

async function fetchScores() {
  const res = await fetch(RAW)
  if (!res.ok) throw new Error(`openfootball ${res.status}`)
  const data = await res.json()
  const matches = data.matches || []

  // Build scores map: "team1|team2" -> { status, home_score, away_score }
  const scores = {}
  for (const m of matches) {
    const status = toStatus(m)
    if (!status) continue // skip matches with no score data

    const key = `${m.team1}|${m.team2}`
    const scored = status === 'FT' || status === 'HT'
    scores[key] = {
      status,
      home_score: scored ? (m.score?.ft?.[0] ?? m.score?.ht?.[0] ?? null) : null,
      away_score: scored ? (m.score?.ft?.[1] ?? m.score?.ht?.[1] ?? null) : null,
      home_name: m.team1,
      away_name: m.team2,
    }
  }

  return scores
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    // Check Redis cache
    const cached = await kvGet(CACHE_KEY)
    if (cached && cached.cached_at) {
      const ageMin = (Date.now() - new Date(cached.cached_at).getTime()) / 60000
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

    // Fetch fresh from openfootball
    const scores = await fetchScores()
    const now = new Date().toISOString()
    const payload = { scores, cached_at: now }
    await kvSet(CACHE_KEY, payload, 1200) // 20 min TTL in Redis

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

// Vercel Serverless Function: /api/h2h
// GET /api/h2h?team1=Netherlands&team2=Sweden
//
// Flow:
// 1. Check Upstash Redis cache — if found, return immediately  
// 2. If not found: call Anthropic API with web search
// 3. Store in Redis forever (H2H is immutable historical data)
// 4. Return result

// Upstash Redis — credentials injected by Vercel via environment variables
// KV_REST_API_URL and KV_REST_API_TOKEN are set automatically by Vercel
// when you connect the Upstash database to this project in Vercel dashboard

const REDIS_URL   = process.env.KV_REST_API_URL
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

// ── Upstash Redis REST client (no npm package needed) ─────────────────────
async function redisGet(key) {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  })
  const data = await res.json()
  if (data.result === null || data.result === undefined) return null
  try { return JSON.parse(data.result) } catch (_) { return data.result }
}

async function redisSet(key, value) {
  if (!REDIS_URL || !REDIS_TOKEN) return
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: JSON.stringify(value) }),
  })
}

// ── Team name normalization ────────────────────────────────────────────────
const ALIASES = {
  'korea republic':      'south korea',
  'korea dpr':           'north korea',
  "cote d'ivoire":       'ivory coast',
  "côte d'ivoire":       'ivory coast',
  'ir iran':             'iran',
  'türkiye':             'turkey',
  'czechia':             'czech republic',
  'czech rep.':          'czech republic',
  'dr congo':            'congo dr',
  'bosnia & herz.':      'bosnia herzegovina',
  'bosnia & herzegovina':'bosnia herzegovina',
  'bosnia and herzegovina':'bosnia herzegovina',
  'usa':                 'united states',
  'united states':       'usa',
}

function normalize(name) {
  const lower = (name || '').toLowerCase().trim()
  return ALIASES[lower] || lower
}

function cacheKey(team1, team2) {
  // Always sort so Netherlands_Sweden === Sweden_Netherlands
  const sorted = [normalize(team1), normalize(team2)].sort()
  return `h2h:${sorted[0]}:${sorted[1]}`
}

// ── Fetch H2H from Claude with web search ─────────────────────────────────
async function fetchH2HFromClaude(team1, team2) {
  if (!ANTHROPIC_KEY) throw new Error('NO_ANTHROPIC_KEY')

  const prompt =
    `Search the web and find the last 3 completed senior international football matches ` +
    `between ${team1} and ${team2}. ` +
    `Return ONLY a JSON array, no prose, no markdown:\n` +
    `[{ "date": "DD Mon YYYY", "home": "Team", "away": "Team", "score": "X-X", "note": "Competition" }]\n` +
    `Rules: most recent first, max 3, only senior internationals, ` +
    `empty array [] if never met, score format "2-1" or "1-1 (4-2p)" for penalties.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Anthropic ${res.status}: ${err?.error?.message || 'unknown'}`)
  }

  const data = await res.json()
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()

  // Parse JSON — try direct, then extract array
  try { return JSON.parse(text) } catch (_) {}
  const match = text.match(/\[[\s\S]*?\]/)
  if (match) { try { return JSON.parse(match[0]) } catch (_) {} }

  console.error('H2H parse failed:', team1, 'vs', team2, '— raw:', text.slice(0, 200))
  return [] // graceful fallback
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Cache-Control', 'public, s-maxage=86400') // CDN cache 24h

  const { team1, team2 } = req.query
  if (!team1 || !team2) {
    return res.status(400).json({ error: 'team1 and team2 required' })
  }

  const key = cacheKey(team1, team2)

  try {
    // 1. Check Redis cache
    const cached = await redisGet(key)
    if (cached !== null) {
      console.log(`CACHE HIT: ${key}`)
      return res.status(200).json({ source: 'cache', team1, team2, h2h: cached })
    }

    console.log(`CACHE MISS: ${key} — calling Claude...`)

    // 2. Fetch from Claude with web search
    const h2h = await fetchH2HFromClaude(team1, team2)

    // 3. Store in Redis permanently
    await redisSet(key, h2h)
    console.log(`STORED: ${key} → ${h2h.length} matches`)

    return res.status(200).json({ source: 'fetched', team1, team2, h2h })

  } catch (err) {
    console.error('H2H error:', err.message)
    // Return empty array — app still works, just no H2H data
    return res.status(200).json({ source: 'error', error: err.message, team1, team2, h2h: [] })
  }
}

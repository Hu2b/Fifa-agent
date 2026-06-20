// Vercel Serverless Function: /api/h2h
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=86400')

  const { team1, team2 } = req.query
  if (!team1 || !team2) {
    return res.status(400).json({ error: 'team1 and team2 required' })
  }

  const REDIS_URL   = process.env.KV_REST_API_URL
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

  const ALIASES = {
    'korea republic': 'south korea', 'korea dpr': 'north korea',
    "cote d'ivoire": 'ivory coast', "côte d'ivoire": 'ivory coast',
    'ir iran': 'iran', 'türkiye': 'turkey', 'czechia': 'czech republic',
    'czech rep.': 'czech republic', 'dr congo': 'congo dr',
    'bosnia & herz.': 'bosnia herzegovina',
    'bosnia & herzegovina': 'bosnia herzegovina',
    'bosnia and herzegovina': 'bosnia herzegovina',
    'usa': 'united states', 'united states': 'usa',
  }
  const normalize = n => { const l=(n||'').toLowerCase().trim(); return ALIASES[l]||l }
  const cacheKey = (t1,t2) => `h2h:${[normalize(t1),normalize(t2)].sort().join(':')}`

  // Upstash REST API — correct usage
  async function kvGet(key) {
    if (!REDIS_URL || !REDIS_TOKEN) return null
    try {
      const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      })
      const d = await r.json()
      if (d.result === null || d.result === undefined) return null
      // d.result is a string — parse it as JSON to get the array
      if (typeof d.result === 'string') {
        try { return JSON.parse(d.result) } catch(_) { return d.result }
      }
      return d.result
    } catch(e) { return null }
  }

  async function kvSet(key, value) {
    if (!REDIS_URL || !REDIS_TOKEN) return
    // Upstash SET via URL path: /set/key/value
    // Value must be a string — JSON stringify the array
    const encoded = encodeURIComponent(JSON.stringify(value))
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}/${encoded}`, {
      method: 'GET', // Upstash supports GET for simple set
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    })
  }

  async function fetchFromClaude(t1, t2) {
    if (!ANTHROPIC_KEY) throw new Error('NO_ANTHROPIC_KEY')
    const prompt = `Search the web for the last 3 completed senior international football matches between ${t1} and ${t2}. Return ONLY a JSON array, nothing else:\n[{"date":"DD Mon YYYY","home":"Team","away":"Team","score":"X-X","note":"Competition"}]\nIf never met: []. Max 3 matches, most recent first.`
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':ANTHROPIC_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 800,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!r.ok) throw new Error(`Anthropic ${r.status}`)
    const d = await r.json()
    const text = (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim()
    try { const p=JSON.parse(text); if(Array.isArray(p)) return p } catch(_) {}
    const m = text.match(/\[[\s\S]*?\]/)
    if (m) { try { const p=JSON.parse(m[0]); if(Array.isArray(p)) return p } catch(_) {} }
    console.error('Parse failed:', text.slice(0,200))
    return null // null = error, different from [] = no meetings
  }

  const key = cacheKey(team1, team2)

  try {
    // Check cache
    const cached = await kvGet(key)
    console.log(`Cache check ${key}:`, cached === null ? 'MISS' : `HIT (${Array.isArray(cached) ? cached.length : typeof cached} items)`)

    if (cached !== null && Array.isArray(cached)) {
      return res.status(200).json({ source: 'cache', team1, team2, h2h: cached })
    }

    // Fetch from Claude
    console.log(`Fetching H2H for ${team1} vs ${team2}...`)
    const h2h = await fetchFromClaude(team1, team2)

    if (h2h !== null) {
      await kvSet(key, h2h)
      console.log(`Stored ${key}: ${h2h.length} matches`)
    }

    return res.status(200).json({
      source: h2h === null ? 'error' : 'fetched',
      team1, team2,
      h2h: h2h || []
    })
  } catch(err) {
    console.error('H2H error:', err.message)
    return res.status(200).json({ source: 'error', error: err.message, team1, team2, h2h: [] })
  }
}

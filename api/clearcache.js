// One-time cache clear endpoint
// Visit /api/clearcache to delete all h2h: keys from Redis
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const REDIS_URL   = process.env.KV_REST_API_URL
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'No Redis credentials' })
  }

  try {
    // Scan for all h2h: keys
    const scanRes = await fetch(`${REDIS_URL}/scan/0/match/h2h:*`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    })
    const scanData = await scanRes.json()
    const keys = scanData.result?.[1] || []

    // Delete each key
    const deleted = []
    for (const key of keys) {
      await fetch(`${REDIS_URL}/del/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      })
      deleted.push(key)
    }

    return res.status(200).json({
      message: `Cleared ${deleted.length} cached H2H entries`,
      deleted,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

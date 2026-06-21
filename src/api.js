// src/api.js — Frontend data fetching
// Matches come from openfootball (free, no key)
// H2H comes from /api/h2h (serverless function → Vercel KV → Claude web search)

const RAW = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

// ET offset: EDT=UTC-4 (Mar-Nov), EST=UTC-5
function etOffset(date) {
  return (date.getUTCMonth() >= 2 && date.getUTCMonth() <= 10) ? -4 : -5
}

// CET offset: CEST=UTC+2 (Mar-Oct), CET=UTC+1
function cetOffset(date) {
  return (date.getUTCMonth() >= 2 && date.getUTCMonth() <= 9) ? 2 : 1
}

// YYYY-MM-DD in US Eastern Time — for today/yesterday filtering
function toETDateString(utcDate) {
  const et = new Date(utcDate.getTime() + etOffset(utcDate) * 60 * 60 * 1000)
  return et.toISOString().slice(0, 10)
}

// Display date and time in CET
function toCETDisplay(utcDate) {
  const cet = new Date(utcDate.getTime() + cetOffset(utcDate) * 60 * 60 * 1000)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return {
    date_cet: `${days[cet.getUTCDay()]} ${cet.getUTCDate()} ${months[cet.getUTCMonth()]} ${cet.getUTCFullYear()}`,
    kickoff_cet: `${String(cet.getUTCHours()).padStart(2,'0')}:${String(cet.getUTCMinutes()).padStart(2,'0')} CET`,
  }
}

// Parse match local time + UTC offset → UTC Date
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

function toStatus(m) {
  if (!m.score) return 'Upcoming'
  if (m.score.ft) return 'FT'
  if (m.score.ht) return 'HT'
  return 'Upcoming'
}

// Detect if a team name is a real team or a TBD placeholder
// openfootball uses codes like "W49" (winner match 49) for knockout TBDs
function isRealTeam(name) {
  if (!name || name === '?') return false
  // Placeholder patterns: "W49", "L12", "R1A" (runner-up group A), etc.
  if (/^[WLRA]\d+$/.test(name)) return false
  if (/^(winner|loser|runner)/i.test(name)) return false
  return true
}

function isGroupStage(round) {
  return !round || round.toLowerCase().includes('match') ||
    round.toLowerCase().includes('group') ||
    /matchday/i.test(round)
}

function transform(m) {
  const home = m.team1 || '?'
  const away = m.team2 || '?'
  const status = toStatus(m)
  const utcDate = parseMatchUTC(m.date, m.time)
  const { date_cet, kickoff_cet } = toCETDisplay(utcDate)
  const et_date = toETDateString(utcDate)
  const scored = status === 'FT' || status === 'HT'
  const teamsKnown = isRealTeam(home) && isRealTeam(away)

  return {
    id: `${m.date}_${home}_${away}`,
    home_team: home,
    away_team: away,
    home_score: scored ? (m.score?.ft?.[0] ?? m.score?.ht?.[0] ?? null) : null,
    away_score: scored ? (m.score?.ft?.[1] ?? m.score?.ht?.[1] ?? null) : null,
    status,
    round: m.round || 'Group Stage',
    competition: `FIFA World Cup 2026 · ${m.round || 'Group Stage'}`,
    stadium: m.stadium?.name || m.venue || '',
    city: m.stadium?.city || m.city || '',
    date_cet, kickoff_cet, et_date,
    utc_ms: utcDate.getTime(),
    scorers: null,
    teams_known: teamsKnown,
    h2h: null,        // null = not yet loaded
    h2h_status: teamsKnown ? 'pending' : 'tbd', // pending|loading|loaded|tbd|error
  }
}

// Fetch H2H for a single match from our serverless function
// Returns the h2h array or null on error
export async function fetchH2H(team1, team2) {
  try {
    const url = `/api/h2h?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`H2H API ${res.status}`)
    const data = await res.json()
    const raw = data.h2h
    return Array.isArray(raw) ? raw : []
  } catch (err) {
    console.error(`H2H fetch failed for ${team1} vs ${team2}:`, err.message)
    return null // null signals error, different from [] (no meetings)
  }
}

// Main: fetch all matches + H2H in parallel

// Check if a match is currently ongoing (between kickoff and kickoff + 130 min)
function isMatchOngoing(utc_ms) {
  const now = Date.now()
  const kickoff = utc_ms
  const end = utc_ms + 130 * 60 * 1000 // 130 min after kickoff
  return now >= kickoff && now <= end
}

// Fetch live scores from our serverless function
// Only called when user taps Refresh and a match is ongoing
// Returns null if no live data available
export async function fetchLiveScores() {
  try {
    const r = await fetch('/api/livescores')
    if (!r.ok) return null
    const data = await r.json()
    if (data.source === 'no_key' || data.source === 'error') return null
    return data // { scores, cached_at, age_minutes, next_refresh_in }
  } catch(e) {
    console.error('fetchLiveScores error:', e.message)
    return null
  }
}

// Match live score data onto openfootball matches
// scores is keyed by "home_name|away_name" from API-Football
function matchName(n) {
  // Normalize for fuzzy matching between openfootball and API-Football names
  return (n || '').toLowerCase()
    .replace(/&/g,'and').replace(/\./g,'').replace(/\s+/g,' ').trim()
}

export function applyLiveScores(matches, liveData) {
  if (!liveData || !liveData.scores) return matches
  const scores = liveData.scores

  return matches.map(m => {
    // Try to find matching live score entry
    let found = null
    const mHome = matchName(m.home_team)
    const mAway = matchName(m.away_team)

    for (const [key, val] of Object.entries(scores)) {
      const [lHome, lAway] = key.split('|').map(matchName)
      if ((lHome.includes(mHome) || mHome.includes(lHome)) &&
          (lAway.includes(mAway) || mAway.includes(lAway))) {
        found = val
        break
      }
    }

    if (!found) return m

    return {
      ...m,
      status:     found.status,
      home_score: found.home_score,
      away_score: found.away_score,
    }
  })
}

// Check if any match in the list is currently ongoing
export function hasOngoingMatch(matches) {
  return matches.some(m => isMatchOngoing(m.utc_ms))
}

export async function fetchMatches() {
  // 1. Fetch all WC matches
  const res = await fetch(RAW)
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)
  const data = await res.json()
  const allMatches = (data.matches || []).map(transform)

  // 2. Determine today + yesterday in US Eastern Time
  const nowUTC = new Date()
  const nowET = new Date(nowUTC.getTime() + etOffset(nowUTC) * 60 * 60 * 1000)
  const todayET = nowET.toISOString().slice(0, 10)
  const yesterdayET = new Date(nowET.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const byUTC = (a, b) => a.utc_ms - b.utc_ms
  const today_matches = allMatches.filter(m => m.et_date === todayET).sort(byUTC)
  const yesterday_matches = allMatches.filter(m => m.et_date === yesterdayET).sort(byUTC)

  return {
    today_matches,
    yesterday_matches,
    generated_at: new Date().toISOString(),
  }
}

// Fetch H2H for a batch of matches in parallel (max 5 at a time to avoid rate limits)
export async function fetchH2HBatch(matches) {
  const pending = matches.filter(m => m.teams_known && m.h2h_status === 'pending')
  if (pending.length === 0) return {}

  const results = {}
  // Process in chunks of 5
  for (let i = 0; i < pending.length; i += 5) {
    const chunk = pending.slice(i, i + 5)
    const fetches = chunk.map(async m => {
      const h2h = await fetchH2H(m.home_team, m.away_team)
      results[m.id] = h2h
    })
    await Promise.all(fetches)
  }
  return results
}

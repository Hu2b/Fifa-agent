const BASE = 'https://api.football-data.org/v4'
const KEY  = import.meta.env.VITE_FD_API_KEY || ''
const headers = { 'X-Auth-Token': KEY }

const H2H_DATA = {
  'England_Croatia': [
    { date: '13 Jun 2021', home: 'England', away: 'Croatia', score: '1-0', note: 'EURO 2020 Group D' },
    { date: '18 Nov 2018', home: 'Croatia', away: 'England', score: '2-1', note: 'UEFA Nations League' },
    { date: '11 Jul 2018', home: 'Croatia', away: 'England', score: '2-1 aet', note: 'WC 2018 Semi-Final' },
  ],
  'Ghana_Panama': [],
  'Portugal_DR Congo': [
    { date: '15 Nov 2014', home: 'Portugal', away: 'DR Congo', score: '2-0', note: 'Friendly' },
  ],
  'Uzbekistan_Colombia': [
    { date: '15 Oct 2023', home: 'Colombia', away: 'Uzbekistan', score: '2-2', note: 'Friendly' },
  ],
  'Czechia_South Africa': [
    { date: '14 Jun 1997', home: 'South Africa', away: 'Czech Rep.', score: '2-2', note: 'FIFA Confederations Cup' },
  ],
  'Switzerland_Bosnia & Herz.': [
    { date: '29 May 2016', home: 'Bosnia & Herz.', away: 'Switzerland', score: '1-0', note: 'Friendly' },
  ],
  'Canada_Qatar': [],
  'Mexico_South Korea': [
    { date: '23 Jun 2018', home: 'Mexico', away: 'South Korea', score: '2-1', note: 'WC 2018 Group F' },
    { date: '22 Jun 2014', home: 'South Korea', away: 'Mexico', score: '0-1', note: 'Friendly' },
    { date: '28 Jul 2012', home: 'South Korea', away: 'Mexico', score: '0-0 (3-4p)', note: 'Olympic Bronze' },
  ],
}

function getH2H(home, away) {
  const key1 = `${home}_${away}`
  const key2 = `${away}_${home}`
  return H2H_DATA[key1] || H2H_DATA[key2] || []
}

function toMinuteStatus(match) {
  const { status, minute } = match
  if (status === 'FINISHED')  return 'FT'
  if (status === 'IN_PLAY')   return minute ? `${minute}'` : 'LIVE'
  if (status === 'HALFTIME')  return 'HT'
  if (status === 'PAUSED')    return 'HT'
  if (status === 'SCHEDULED') return 'Upcoming'
  if (status === 'TIMED')     return 'Upcoming'
  if (status === 'POSTPONED') return 'Postponed'
  return status
}

function formatKickoff(utcDate) {
  const d = new Date(utcDate)
  const cet = new Date(d.getTime() + 2 * 60 * 60 * 1000)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const day = days[cet.getUTCDay()]
  const date = cet.getUTCDate()
  const mon = months[cet.getUTCMonth()]
  const yr = cet.getUTCFullYear()
  const hh = String(cet.getUTCHours()).padStart(2,'0')
  const mm = String(cet.getUTCMinutes()).padStart(2,'0')
  return { date_cet: `${day} ${date} ${mon} ${yr}`, kickoff_cet: `${hh}:${mm} CET` }
}

function transformMatch(m) {
  const home = m.homeTeam?.shortName || m.homeTeam?.name || '?'
  const away = m.awayTeam?.shortName || m.awayTeam?.name || '?'
  const status = toMinuteStatus(m)
  const scored = status === 'FT' || status === 'HT' || m.status === 'IN_PLAY' || m.status === 'PAUSED'
  const { date_cet, kickoff_cet } = formatKickoff(m.utcDate)
  return {
    id: m.id, home_team: home, away_team: away,
    home_score: scored ? (m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null) : null,
    away_score: scored ? (m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null) : null,
    status, competition: `FIFA World Cup 2026 · ${m.group || 'Group Stage'}`,
    stadium: m.venue || '', city: '', date_cet, kickoff_cet, scorers: null, h2h: getH2H(home, away),
  }
}

export async function fetchMatches() {
  if (!KEY) throw new Error('NO_API_KEY')
  const res = await fetch(`${BASE}/competitions/WC/matches?stage=GROUP_STAGE`, { headers })
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (res.status === 403) throw new Error('INVALID_KEY')
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)
  const data = await res.json()
  const matches = data.matches || []
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const yestDate = new Date(now); yestDate.setDate(now.getDate() - 1)
  const yestStr = yestDate.toISOString().slice(0, 10)
  const today_matches = matches.filter(m => m.utcDate.slice(0, 10) === todayStr).map(transformMatch)
  const yesterday_matches = matches.filter(m => m.utcDate.slice(0, 10) === yestStr).map(transformMatch)
  const byTime = (a, b) => a.kickoff_cet.localeCompare(b.kickoff_cet)
  today_matches.sort(byTime)
  yesterday_matches.sort(byTime)
  return { today_matches, yesterday_matches, generated_at: new Date().toISOString() }
}

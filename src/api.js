const BASE = 'https://worldcup26.ir/get'

const H2H_DATA = {
  'England_Croatia': [
    { date: '13 Jun 2021', home: 'England', away: 'Croatia', score: '1-0', note: 'EURO 2020' },
    { date: '18 Nov 2018', home: 'Croatia', away: 'England', score: '2-1', note: 'Nations League' },
    { date: '11 Jul 2018', home: 'Croatia', away: 'England', score: '2-1 aet', note: 'WC 2018 SF' },
  ],
  'Ghana_Panama': [],
  'Portugal_DR Congo': [
    { date: '15 Nov 2014', home: 'Portugal', away: 'DR Congo', score: '2-0', note: 'Friendly' },
  ],
  'Uzbekistan_Colombia': [
    { date: '15 Oct 2023', home: 'Colombia', away: 'Uzbekistan', score: '2-2', note: 'Friendly' },
  ],
  'Czechia_South Africa': [
    { date: '14 Jun 1997', home: 'South Africa', away: 'Czech Rep.', score: '2-2', note: 'Confed. Cup' },
  ],
  'Switzerland_Bosnia': [
    { date: '29 May 2016', home: 'Bosnia', away: 'Switzerland', score: '1-0', note: 'Friendly' },
  ],
  'Canada_Qatar': [],
  'Mexico_South Korea': [
    { date: '23 Jun 2018', home: 'Mexico', away: 'South Korea', score: '2-1', note: 'WC 2018' },
    { date: '22 Jun 2014', home: 'South Korea', away: 'Mexico', score: '0-1', note: 'Friendly' },
    { date: '28 Jul 2012', home: 'South Korea', away: 'Mexico', score: '0-0 (3-4p)', note: 'Olympic Bronze' },
  ],
}

function getH2H(t1, t2) {
  for (const [key, val] of Object.entries(H2H_DATA)) {
    const [a, b] = key.split('_')
    if ((t1.includes(a) || a.includes(t1)) && (t2.includes(b) || b.includes(t2))) return val
    if ((t2.includes(a) || a.includes(t2)) && (t1.includes(b) || b.includes(t1))) return val
  }
  return []
}

function formatKickoff(dateStr, timeStr) {
  const d = new Date(`${dateStr}T${timeStr || '00:00'}:00Z`)
  const cet = new Date(d.getTime() + 2 * 60 * 60 * 1000)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return {
    date_cet: `${days[cet.getUTCDay()]} ${cet.getUTCDate()} ${months[cet.getUTCMonth()]} ${cet.getUTCFullYear()}`,
    kickoff_cet: `${String(cet.getUTCHours()).padStart(2,'0')}:${String(cet.getUTCMinutes()).padStart(2,'0')} CET`
  }
}

function toStatus(m) {
  if (m.status === 'completed') return 'FT'
  if (m.status === 'in_progress') return 'LIVE'
  return 'Upcoming'
}

function transform(m) {
  const home = m.home_team?.name || m.team1 || '?'
  const away = m.away_team?.name || m.team2 || '?'
  const status = toStatus(m)
  const scored = status === 'FT' || status === 'LIVE'
  const { date_cet, kickoff_cet } = formatKickoff(m.datetime?.slice(0,10) || m.date, m.datetime?.slice(11,16) || m.time)
  return {
    id: m.id || m.num,
    home_team: home, away_team: away,
    home_score: scored ? (m.home_team?.goals ?? m.score1 ?? null) : null,
    away_score: scored ? (m.away_team?.goals ?? m.score2 ?? null) : null,
    status,
    competition: `FIFA World Cup 2026 · ${m.group || 'Group Stage'}`,
    stadium: m.stadium?.name || m.venue || '',
    city: m.stadium?.city || m.city || '',
    date_cet, kickoff_cet, scorers: null, h2h: getH2H(home, away)
  }
}

export async function fetchMatches() {
  const res = await fetch(`${BASE}/games`)
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)
  const data = await res.json()
  const matches = Array.isArray(data) ? data : (data.matches || data.games || [])
  const now = new Date()
  const today = now.toISOString().slice(0,10)
  const yest = new Date(now.setDate(now.getDate()-1)).toISOString().slice(0,10)
  const byTime = (a,b) => a.kickoff_cet.localeCompare(b.kickoff_cet)
  const today_matches = matches.filter(m=>(m.datetime||m.date||'').slice(0,10)===today).map(transform).sort(byTime)
  const yesterday_matches = matches.filter(m=>(m.datetime||m.date||'').slice(0,10)===yest).map(transform).sort(byTime)
  return { today_matches, yesterday_matches, generated_at: new Date().toISOString() }
}

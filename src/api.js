const RAW = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

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
    if (t1.includes(a) && t2.includes(b)) return val
    if (t2.includes(a) && t1.includes(b)) return val
    if (a.includes(t1) && b.includes(t2)) return val
    if (a.includes(t2) && b.includes(t1)) return val
  }
  return []
}

function formatKickoff(dateStr, timeStr) {
  const clean = (timeStr || '00:00').replace(/\s*UTC[+-]\d+/, '').trim().slice(0, 5)
  const utcOffset = (timeStr || '').match(/UTC([+-]\d+)/)
  const offsetH = utcOffset ? parseInt(utcOffset[1]) : 0
  const d = new Date(`${dateStr}T${clean}:00Z`)
  const adjusted = new Date(d.getTime() - offsetH * 60 * 60 * 1000)
  const cet = new Date(adjusted.getTime() + 2 * 60 * 60 * 1000)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return {
    date_cet: `${days[cet.getUTCDay()]} ${cet.getUTCDate()} ${months[cet.getUTCMonth()]} ${cet.getUTCFullYear()}`,
    kickoff_cet: `${String(cet.getUTCHours()).padStart(2,'0')}:${String(cet.getUTCMinutes()).padStart(2,'0')} CET`,
    date_iso: cet.toISOString().slice(0, 10)
  }
}

function toStatus(m) {
  if (!m.score) return 'Upcoming'
  if (m.score.ft) return 'FT'
  if (m.score.ht) return 'HT'
  return 'Upcoming'
}

function transform(m) {
  const home = m.team1 || '?'
  const away = m.team2 || '?'
  const status = toStatus(m)
  const { date_cet, kickoff_cet, date_iso } = formatKickoff(m.date, m.time)
  const scored = status === 'FT' || status === 'HT'
  return {
    id: `${m.date}_${home}_${away}`,
    home_team: home, away_team: away,
    home_score: scored ? (m.score?.ft?.[0] ?? m.score?.ht?.[0] ?? null) : null,
    away_score: scored ? (m.score?.ft?.[1] ?? m.score?.ht?.[1] ?? null) : null,
    status,
    competition: `FIFA World Cup 2026 · ${m.round || 'Group Stage'}`,
    stadium: m.stadium?.name || m.venue || '',
    city: m.stadium?.city || m.city || '',
    date_cet, kickoff_cet, date_iso,
    scorers: null, h2h: getH2H(home, away)
  }
}

export async function fetchMatches() {
  const res = await fetch(RAW)
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)
  const data = await res.json()
  const allMatches = (data.matches || []).map(transform)
  const now = new Date()
  const cetNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const today = cetNow.toISOString().slice(0, 10)
  const yestDate = new Date(cetNow)
  yestDate.setDate(cetNow.getDate() - 1)
  const yest = yestDate.toISOString().slice(0, 10)
  const byTime = (a, b) => a.kickoff_cet.localeCompare(b.kickoff_cet)
  const today_matches = allMatches.filter(m => m.date_iso === today).sort(byTime)
  const yesterday_matches = allMatches.filter(m => m.date_iso === yest).sort(byTime)
  return { today_matches, yesterday_matches, generated_at: new Date().toISOString() }
}

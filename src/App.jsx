import { useState, useEffect, useCallback } from 'react'
import { fetchMatches, fetchH2HBatch, fetchLiveScores, applyLiveScores, hasOngoingMatch } from './api.js'

const FLAGS = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'Czechia': '🇨🇿', 'Czech Republic': '🇨🇿', 'Switzerland': '🇨🇭',
  'Bosnia & Herzegovina': '🇧🇦', 'Bosnia Herzegovina': '🇧🇦', 'Bosnia & Herz.': '🇧🇦',
  'Canada': '🇨🇦', 'Qatar': '🇶🇦', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷',
  'Ghana': '🇬🇭', 'Panama': '🇵🇦', 'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩',
  'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Spain': '🇪🇸', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪', 'Italy': '🇮🇹', 'USA': '🇺🇸', 'United States': '🇺🇸',
  'Japan': '🇯🇵', 'Australia': '🇦🇺', 'Morocco': '🇲🇦', 'Senegal': '🇸🇳',
  'Uruguay': '🇺🇾', 'Serbia': '🇷🇸', 'Denmark': '🇩🇰', 'Poland': '🇵🇱',
  'Tunisia': '🇹🇳', 'Cameroon': '🇨🇲', 'Ecuador': '🇪🇨', 'Saudi Arabia': '🇸🇦',
  'Iran': '🇮🇷', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Austria': '🇦🇹',
  'Turkey': '🇹🇷', 'Türkiye': '🇹🇷', 'Ukraine': '🇺🇦', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Algeria': '🇩🇿', 'Egypt': '🇪🇬', 'Nigeria': '🇳🇬',
  "Ivory Coast": '🇨🇮', "Côte d'Ivoire": '🇨🇮', 'Mali': '🇲🇱',
  'New Zealand': '🇳🇿', 'Peru': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Honduras': '🇭🇳', 'Costa Rica': '🇨🇷',
  'Jamaica': '🇯🇲', 'Haiti': '🇭🇹', 'Cuba': '🇨🇺', 'Iraq': '🇮🇶', 'Jordan': '🇯🇴',
  'Cape Verde': '🇨🇻', 'Slovakia': '🇸🇰', 'Romania': '🇷🇴', 'Hungary': '🇭🇺',
  'Greece': '🇬🇷', 'Curaçao': '🇨🇼', 'Curacao': '🇨🇼',
}

function getFlag(name) {
  if (!name || name === '?') return '🏳️'
  if (FLAGS[name]) return FLAGS[name]
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (name.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(name.toLowerCase())) return flag
  }
  return '🏳️'
}

const TROPHY_SRC = "data:image/png;base64,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"

function WCTrophy() {
  return (
    <img
      src={TROPHY_SRC}
      alt="FIFA World Cup Trophy"
      style={{ height: 48, width: 'auto', objectFit: 'contain' }}
    />
  )
}

function TeamFlag({ name, isTBD }) {
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
      background: isTBD ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${isTBD ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: isTBD ? 18 : 30,
    }}>{isTBD ? '?' : getFlag(name)}</div>
  )
}

function H2HRow({ m, i }) {
  const parts = (m.score || '').match(/^(\S+)-(\S+.*)$/)
  const scoreL = parts ? parts[1] : m.score
  const scoreR = parts ? parts[2] : ''
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '76px 1fr 28px 10px 28px 1fr',
      alignItems: 'center', padding: '7px 12px', gap: 0,
      background: i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
    }}>
      <span style={{ color: '#666', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{m.date}</span>
      <span style={{ color: '#ccc', fontSize: 11, textAlign: 'right', paddingRight: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff', fontSize: 12,
        textAlign: 'right', background: 'rgba(255,255,255,0.10)',
        borderRadius: '4px 0 0 4px', padding: '2px 5px', display: 'block' }}>{scoreL}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#666', fontSize: 12,
        textAlign: 'center', background: 'rgba(255,255,255,0.10)', padding: '2px 0', display: 'block' }}>-</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff', fontSize: 12,
        textAlign: 'left', background: 'rgba(255,255,255,0.10)',
        borderRadius: '0 4px 4px 0', padding: '2px 5px', display: 'block' }}>{scoreR}</span>
      <span style={{ color: '#ccc', fontSize: 11, paddingLeft: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {m.away}{m.note && <span style={{ color: '#555', fontSize: 9, marginLeft: 5 }}>{m.note}</span>}
      </span>
    </div>
  )
}

function StatusBadge({ status }) {
  const isFT = status === 'FT', isHT = status === 'HT'
  const isLive = !isFT && !isHT && status !== 'Upcoming' && status !== 'Postponed'
  const color = isFT ? '#3fd475' : isLive ? '#ff4444' : isHT ? '#f7a03f' : '#aaa'
  const bg = isFT ? 'rgba(63,212,117,0.15)' : isLive ? 'rgba(255,68,68,0.2)' : isHT ? 'rgba(247,160,63,0.15)' : 'rgba(255,255,255,0.08)'
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
      color, background: bg, padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap',
      border: `1px solid ${color}33`,
      animation: isLive ? 'pulse 1.5s ease-in-out infinite' : 'none',
    }}>{status}</span>
  )
}

function H2HSection({ m }) {
  const [open, setOpen] = useState(false)
  if (!m.teams_known) return (
    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8,
      background: 'rgba(255,255,255,0.03)', border: '1px solid #222',
      fontSize: 11, color: '#444', fontStyle: 'italic' }}>
      ⚔️ Head-to-head available once teams are confirmed
    </div>
  )
  if (m.h2h_status === 'loading' || m.h2h_status === 'pending') return (
    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8,
      background: 'rgba(255,255,255,0.03)', border: '1px solid #222',
      fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
      Loading head-to-head history...
    </div>
  )
  if (m.h2h_status === 'error') return (
    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8,
      background: 'rgba(255,255,255,0.03)', border: '1px solid #222',
      fontSize: 11, color: '#555' }}>⚔️ Head-to-head data unavailable</div>
  )
  const h2h = Array.isArray(m.h2h) ? m.h2h : (typeof m.h2h === 'string' ? [] : [])
  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '8px 12px', cursor: 'pointer',
        background: open ? 'rgba(123,140,247,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${open ? 'rgba(123,140,247,0.5)' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 8, color: open ? '#a0acff' : '#ccc',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
        display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
      }}>
        ⚔️ <span>HEAD TO HEAD</span>
        <span style={{ color: open ? '#7b8cf7' : '#777', fontWeight: 400, fontSize: 10 }}>
          {!h2h || h2h.length === 0 ? '— first ever meeting' : `· ${h2h.length} previous meeting${h2h.length === 1 ? '' : 's'}`}
        </span>
        <span style={{ marginLeft: 'auto', color: '#aaa' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 5, borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
          {!h2h || h2h.length === 0
            ? <div style={{ padding: '12px 14px', color: '#666', fontSize: 11, fontStyle: 'italic' }}>
                No previous senior international meetings recorded.
              </div>
            : h2h.map((h, i) => {
              try { return <H2HRow key={i} m={h || {}} i={i} /> }
              catch(e) { return <div key={i} style={{padding:'6px 12px',color:'#555',fontSize:10}}>—</div> }
            })
          }
        </div>
      )}
    </div>
  )
}

function MatchCard({ m, isResult }) {
  const isTBD = !m.teams_known
  const scored = m.home_score !== null && m.away_score !== null
  return (
    <div style={{
      background: 'linear-gradient(145deg,#161616,#1e1e1e)',
      border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', marginBottom: 14,
    }}>
      <div style={{
        background: isResult ? 'linear-gradient(90deg,#0a1f0a,#162416)' : 'linear-gradient(90deg,#0a0a1f,#141428)',
        padding: '9px 16px', borderBottom: '1px solid #2a2a2a',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em',
          textTransform: 'uppercase', color: isResult ? '#3fd475' : '#7b8cf7' }}>
          {m.competition}
        </span>
      </div>
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
        padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#ccc', fontFamily: 'monospace' }}>🗓 {m.date_cet}</span>
        <span style={{ fontSize: 11, color: '#444' }}>·</span>
        <span style={{ fontSize: 12, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>⏱ {m.kickoff_cet}</span>
      </div>
      <div style={{ padding: '18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <TeamFlag name={m.home_team} isTBD={isTBD} />
            <span style={{ fontSize: 12, fontWeight: 700, color: isTBD ? '#555' : '#eee',
              textAlign: 'center', lineHeight: 1.3, fontStyle: isTBD ? 'italic' : 'normal' }}>
              {isTBD ? 'TBD' : m.home_team}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 90 }}>
            {scored ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{m.home_score}</span>
                <span style={{ fontSize: 22, color: '#333' }}>–</span>
                <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{m.away_score}</span>
              </div>
            ) : (
              <span style={{ fontSize: 20, fontWeight: 700, color: isTBD ? '#333' : '#7b8cf7' }}>VS</span>
            )}
            <StatusBadge status={m.status} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <TeamFlag name={m.away_team} isTBD={isTBD} />
            <span style={{ fontSize: 12, fontWeight: 700, color: isTBD ? '#555' : '#eee',
              textAlign: 'center', lineHeight: 1.3, fontStyle: isTBD ? 'italic' : 'normal' }}>
              {isTBD ? 'TBD' : m.away_team}
            </span>
          </div>
        </div>
        {m.stadium && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.05)',
            borderRadius: 8, display: 'flex', gap: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span>📍</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>{m.stadium}</div>
              {m.city && <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>{m.city}</div>}
            </div>
          </div>
        )}
        <H2HSection m={m} />
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          height: 220, borderRadius: 16,
          background: 'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)',
          backgroundSize: '400% 100%',
          animation: `shimmer 1.5s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

export default function App() {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [tab, setTab]             = useState('today')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [h2hData, setH2hData]     = useState({})
  const [h2hLoading, setH2hLoading] = useState(false)
  const [liveData, setLiveData]     = useState(null)
  const [liveInfo, setLiveInfo]     = useState(null) // { age_minutes, next_refresh_in }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await fetchMatches()
      setData(result); setLastRefresh(new Date())
      if (result.today_matches.length > 0) setTab('today')
      else if (result.yesterday_matches.length > 0) setTab('yesterday')
      const allVisible = [...result.today_matches, ...result.yesterday_matches]
      if (allVisible.some(m => m.teams_known)) {
        setH2hLoading(true)
        fetchH2HBatch(allVisible).then(results => {
          setH2hData(prev => ({ ...prev, ...results }))
          setH2hLoading(false)
        }).catch(() => setH2hLoading(false))
      }
      // Fetch live scores if any match is ongoing and user manually refreshed
      const allVisible2 = [...result.today_matches, ...result.yesterday_matches]
      if (hasOngoingMatch(allVisible2)) {
        const live = await fetchLiveScores()
        if (live) {
          setLiveData(live.scores)
          setLiveInfo({ age_minutes: live.age_minutes, next_refresh_in: live.next_refresh_in })
        }
      } else {
        setLiveData(null)
        setLiveInfo(null)
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const fn = () => {
      if (document.visibilityState === 'visible') {
        const age = lastRefresh ? Date.now() - lastRefresh.getTime() : Infinity
        if (age > 5 * 60 * 1000) load()
      }
    }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [load, lastRefresh])

  function enrichMatches(matches) {
    // Apply live scores overlay if available
    const withLive = liveData ? applyLiveScores(matches, { scores: liveData }) : matches
    return withLive.map(m => {
      if (!m.teams_known) return m
      if (m.id in h2hData) return { ...m, h2h: h2hData[m.id], h2h_status: h2hData[m.id] === null ? 'error' : 'loaded' }
      return { ...m, h2h_status: h2hLoading ? 'loading' : 'pending' }
    })
  }

  const todayM  = enrichMatches(data?.today_matches     ?? [])
  const yesterM = enrichMatches(data?.yesterday_matches ?? [])
  const matches = tab === 'today' ? todayM : yesterM
  const tabs = [
    { id: 'today',     label: 'Today',     count: todayM.length,  col: '#f7a03f' },
    { id: 'yesterday', label: 'Yesterday', count: yesterM.length, col: '#3fd475' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a',
      fontFamily: "'Inter',-apple-system,sans-serif", color: '#e8e8e8' }}>
      <div style={{
        background: 'linear-gradient(180deg,#0c1018,#0a0a0a)',
        borderBottom: '1px solid #222', padding: '14px 20px',
        position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WCTrophy />
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                FIFA World Cup 2026™
              </h1>
              <p style={{ margin: 0, fontSize: 10, color: '#7b8cf7',
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                USA · Canada · Mexico
              </p>
            </div>
          </div>
          <button onClick={load} disabled={loading} style={{
            padding: '8px 14px', border: '1px solid #333', borderRadius: 8,
            background: '#181818', color: loading ? '#555' : '#ccc',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↺</span>
            <span style={{ fontSize: 11 }}>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
        </div>
        {lastRefresh && !loading && (
          <div style={{ maxWidth: 680, margin: '4px auto 0', fontSize: 10, color: '#333', textAlign: 'right' }}>
            Updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every hour
            {h2hLoading && <span style={{ color: '#555' }}> · fetching H2H…</span>}
            {liveInfo && <span style={{ color: '#3fd475' }}> · live scores {liveInfo.age_minutes < 1 ? 'just updated' : `${liveInfo.age_minutes}min ago`}{liveInfo.next_refresh_in > 0 ? ` · next in ${liveInfo.next_refresh_in}min` : ''}</span>}
          </div>
        )}
      </div>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 14px 40px' }}>
        {error && !loading && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 12,
            background: '#180a0a', border: '1px solid #4a1a1a', color: '#f74e4e', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}
        {data && (
          <>
            <div style={{ display: 'flex', gap: 6, marginTop: 16, marginBottom: 16 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                  background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${tab === t.id ? '#333' : '#1a1a1a'}`,
                  color: tab === t.id ? '#fff' : '#3a3a3a', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {t.label}
                  <span style={{
                    background: tab === t.id ? t.col : '#181818',
                    color: tab === t.id ? '#000' : '#333',
                    borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 900,
                  }}>{t.count}</span>
                </button>
              ))}
            </div>
            {matches.length === 0
              ? <div style={{ textAlign: 'center', color: '#333', padding: 48, fontSize: 14 }}>
                  No matches for {tab === 'today' ? 'today' : 'yesterday'}
                </div>
              : matches.map((m, i) => (
                  <MatchCard key={m.id || i} m={m} isResult={tab === 'yesterday' || m.status === 'FT'} />
                ))
            }
          </>
        )}
        {loading && !data && <Skeleton />}
      </div>
      <style>{`
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; } body { margin: 0; }
      `}</style>
    </div>
  )
}

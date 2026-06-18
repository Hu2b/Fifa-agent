import { useState, useEffect, useCallback } from 'react'
import { fetchMatches } from './api.js'

const FLAGS = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'Czechia': '🇨🇿', 'Czech Republic': '🇨🇿', 'Switzerland': '🇨🇭', 'Bosnia & Herzegovina': '🇧🇦',
  'Bosnia & Herz.': '🇧🇦', 'Canada': '🇨🇦', 'Qatar': '🇶🇦', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦', 'Portugal': '🇵🇹',
  'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Brazil': '🇧🇷',
  'Argentina': '🇦🇷', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Italy': '🇮🇹',
  'USA': '🇺🇸', 'United States': '🇺🇸', 'Japan': '🇯🇵', 'Australia': '🇦🇺',
  'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Uruguay': '🇺🇾', 'Serbia': '🇷🇸',
  'Denmark': '🇩🇰', 'Poland': '🇵🇱', 'Tunisia': '🇹🇳', 'Cameroon': '🇨🇲',
  'Ecuador': '🇪🇨', 'Saudi Arabia': '🇸🇦', 'Iran': '🇮🇷', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Austria': '🇦🇹', 'Turkey': '🇹🇷', 'Ukraine': '🇺🇦',
  'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Algeria': '🇩🇿', 'Egypt': '🇪🇬',
  'Nigeria': '🇳🇬', 'Ivory Coast': '🇨🇮', 'Mali': '🇲🇱', 'Kenya': '🇰🇪',
  'New Zealand': '🇳🇿', 'Peru': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Honduras': '🇭🇳', 'Costa Rica': '🇨🇷',
  'Jamaica': '🇯🇲', 'Cuba': '🇨🇺', 'Iraq': '🇮🇶', 'Jordan': '🇯🇴',
  'Cape Verde': '🇨🇻', 'Slovakia': '🇸🇰', 'Romania': '🇷🇴', 'Czech Rep.': '🇨🇿',
}

function getFlag(name) {
  if (!name) return '🏳️'
  if (FLAGS[name]) return FLAGS[name]
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (name.includes(key) || key.includes(name)) return flag
  }
  return '🏳️'
}

function TeamFlag({ name }) {
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 30,
    }}>{getFlag(name)}</div>
  )
}

function H2HRow({ m, i }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
      background: i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
    }}>
      <span style={{ color: '#888', minWidth: 82, fontSize: 10, fontFamily: 'monospace' }}>{m.date}</span>
      <span style={{ color: '#ccc', flex: 1, textAlign: 'right', fontSize: 11 }}>{m.home}</span>
      <span style={{
        background: 'rgba(255,255,255,0.12)', borderRadius: 4,
        padding: '2px 8px', fontFamily: 'monospace', fontWeight: 700,
        color: '#fff', minWidth: 42, textAlign: 'center', fontSize: 12, flexShrink: 0,
      }}>{m.score}</span>
      <span style={{ color: '#ccc', flex: 1, fontSize: 11 }}>{m.away}</span>
      {m.note && <span style={{ color: '#777', fontSize: 9, whiteSpace: 'nowrap' }}>{m.note}</span>}
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

function MatchCard({ m, isResult }) {
  const [open, setOpen] = useState(false)
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
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase',
          color: isResult ? '#3fd475' : '#7b8cf7' }}>{m.competition}</span>
      </div>

      <div style={{
        background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
        padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 11, color: '#ccc', fontFamily: 'monospace' }}>🗓 {m.date_cet}</span>
        <span style={{ fontSize: 11, color: '#555' }}>·</span>
        <span style={{ fontSize: 12, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>⏱ {m.kickoff_cet}</span>
      </div>

      <div style={{ padding: '18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <TeamFlag name={m.home_team} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#eee', textAlign: 'center', lineHeight: 1.3 }}>{m.home_team}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 90 }}>
            {scored ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{m.home_score}</span>
                <span style={{ fontSize: 22, color: '#444' }}>–</span>
                <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{m.away_score}</span>
              </div>
            ) : (
              <span style={{ fontSize: 20, fontWeight: 700, color: '#7b8cf7' }}>VS</span>
            )}
            <StatusBadge status={m.status} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <TeamFlag name={m.away_team} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#eee', textAlign: 'center', lineHeight: 1.3 }}>{m.away_team}</span>
          </div>
        </div>

        {m.stadium && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', gap: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span>📍</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>{m.stadium}</div>
              {m.city && <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{m.city}</div>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button onClick={() => setOpen(!open)} style={{
            width: '100%', padding: '8px 12px', cursor: 'pointer',
            background: open ? 'rgba(123,140,247,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${open ? 'rgba(123,140,247,0.5)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 8, color: open ? '#a0acff' : '#ccc',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
          }}>
            ⚔️ <span style={{ color: open ? '#a0acff' : '#ccc' }}>HEAD TO HEAD</span>
            <span style={{ color: open ? '#7b8cf7' : '#888', fontWeight: 400, fontSize: 10 }}>
              {m.h2h.length === 0 ? '— first ever meeting' : `· ${m.h2h.length} previous meeting${m.h2h.length === 1 ? '' : 's'}`}
            </span>
            <span style={{ marginLeft: 'auto', color: '#aaa' }}>{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <div style={{ marginTop: 5, borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              {m.h2h.length === 0
                ? <div style={{ padding: '12px 14px', color: '#888', fontSize: 11, fontStyle: 'italic' }}>No previous senior international meetings recorded.</div>
                : m.h2h.map((h, i) => <H2HRow key={i} m={h} i={i} />)
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('today')
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await fetchMatches()
      setData(result); setLastRefresh(new Date())
      if (result.today_matches.length > 0) setTab('today')
      else if (result.yesterday_matches.length > 0) setTab('yesterday')
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 60 * 60 * 1000); return () => clearInterval(t) }, [load])
  useEffect(() => {
    const fn = () => { if (document.visibilityState === 'visible') { const age = lastRefresh ? Date.now() - lastRefresh.getTime() : Infinity; if (age > 5 * 60 * 1000) load() } }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [load, lastRefresh])

  const todayM = data?.today_matches ?? []
  const yesterM = data?.yesterday_matches ?? []
  const matches = tab === 'today' ? todayM : yesterM

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Inter',-apple-system,sans-serif", color: '#e8e8e8' }}>
      <div style={{ background: 'linear-gradient(180deg,#0c1018,#0a0a0a)', borderBottom: '1px solid #222', padding: '18px 20px 14px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, background: 'linear-gradient(90deg,#fff 20%,#7b8cf7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FIFA World Cup 2026™</h1>
              <p style={{ margin: 0, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>USA · Canada · Mexico</p>
            </div>
          </div>
          <button onClick={load} disabled={loading} style={{ padding: '8px 14px', border: '1px solid #333', borderRadius: 8, background: '#181818', color: loading ? '#555' : '#ccc', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↺</span>
            <span style={{ fontSize: 11 }}>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
        </div>
        {lastRefresh && !loading && <div style={{ maxWidth: 680, margin: '4px auto 0', fontSize: 10, color: '#444', textAlign: 'right' }}>Updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every hour</div>}
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 14px 40px' }}>
        {error && !loading && <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: '#180a0a', border: '1px solid #4a1a1a', color: '#f74e4e', fontSize: 13 }}>⚠️ {error}</div>}
        {data && (
          <>
            <div style={{ display: 'flex', gap: 6, marginTop: 16, marginBottom: 16 }}>
              {[
                { id: 'today', label: 'Today', count: todayM.length, col: '#f7a03f' },
                { id: 'yesterday', label: 'Yesterday', count: yesterM.length, col: '#3fd475' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                  background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${tab === t.id ? '#333' : '#1a1a1a'}`,
                  color: tab === t.id ? '#fff' : '#555', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {t.label}
                  <span style={{ background: tab === t.id ? t.col : '#222', color: tab === t.id ? '#000' : '#444', borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 900 }}>{t.count}</span>
                </button>
              ))}
            </div>
            {matches.length === 0
              ? <div style={{ textAlign: 'center', color: '#444', padding: 48, fontSize: 14 }}>No matches for {tab === 'today' ? 'today' : 'yesterday'}</div>
              : matches.map((m, i) => <MatchCard key={m.id || i} m={m} isResult={tab === 'yesterday' || m.status === 'FT'} />)
            }
          </>
        )}
        {loading && !data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ height: 200, borderRadius: 16, background: 'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)', backgroundSize: '400% 100%', animation: `shimmer 1.5s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; } body { margin: 0; }
      `}</style>
    </div>
  )
}

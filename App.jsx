import { useState, useEffect, useCallback } from 'react'
import { fetchMatches } from './api.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ name }) {
  const ini = (name || '?').split(/[\s&.-]/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase()
  const pals = [
    ['#1a3a6b','#4e8ef7'],['#6b1a1a','#f74e4e'],['#1a6b2a','#4ef76e'],
    ['#5a4a1a','#f7c94e'],['#4a1a6b','#a44ef7'],['#1a5a6b','#4ecdf7'],
    ['#6b1a4a','#f74ebc'],['#2a6b1a','#8ef74e'],['#6b3a1a','#f79c4e'],
    ['#1a6b5a','#4ef7d4'],['#3a1a6b','#7b4ef7'],['#6b1a5a','#f74ed4'],
  ]
  const [bg, ac] = pals[(name || '').charCodeAt(0) % pals.length]
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${bg},${ac})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: 13, color: '#fff',
      boxShadow: `0 3px 10px ${ac}55`, letterSpacing: '0.05em',
    }}>{ini}</div>
  )
}

function H2HRow({ m, i }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
      background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
    }}>
      <span style={{ color: '#484848', minWidth: 82, fontSize: 10, fontFamily: 'monospace' }}>{m.date}</span>
      <span style={{ color: '#bbb', flex: 1, textAlign: 'right', fontSize: 11, fontWeight: 500 }}>{m.home}</span>
      <span style={{
        background: 'rgba(255,255,255,0.09)', borderRadius: 4,
        padding: '2px 8px', fontFamily: 'monospace', fontWeight: 700,
        color: '#fff', minWidth: 42, textAlign: 'center', fontSize: 12, flexShrink: 0,
      }}>{m.score}</span>
      <span style={{ color: '#bbb', flex: 1, fontSize: 11, fontWeight: 500 }}>{m.away}</span>
      {m.note && <span style={{ color: '#333', fontSize: 9, whiteSpace: 'nowrap' }}>{m.note}</span>}
    </div>
  )
}

function StatusBadge({ status }) {
  const isLive     = status !== 'FT' && status !== 'Upcoming' && status !== 'Postponed'
                     && !status.startsWith('HT') && status !== 'FT'
  const isHT       = status === 'HT'
  const isFT       = status === 'FT'
  const isUpcoming = status === 'Upcoming'

  const color = isFT ? '#3fd475'
    : isLive   ? '#ff4444'
    : isHT     ? '#f7a03f'
    : '#555'
  const bg = isFT ? 'rgba(63,212,117,0.1)'
    : isLive   ? 'rgba(255,68,68,0.15)'
    : isHT     ? 'rgba(247,160,63,0.1)'
    : 'rgba(255,255,255,0.05)'

  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
      color, background: bg, padding: '3px 9px', borderRadius: 10, whiteSpace: 'nowrap',
      animation: isLive ? 'pulse 1.5s ease-in-out infinite' : 'none',
    }}>{status}</span>
  )
}

function MatchCard({ m, isResult }) {
  const [open, setOpen] = useState(false)
  const scored = m.home_score !== null && m.away_score !== null

  return (
    <div style={{
      background: 'linear-gradient(145deg,#131313,#1a1a1a)',
      border: '1px solid #222', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      transition: 'transform .15s, box-shadow .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,.7)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.5)' }}
    >
      {/* Competition stripe */}
      <div style={{
        background: isResult ? 'linear-gradient(90deg,#0a1f0a,#162416)' : 'linear-gradient(90deg,#0a0a1f,#141428)',
        padding: '9px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase',
          color: isResult ? '#3fd475' : '#6b7ef7' }}>{m.competition}</span>
      </div>

      {/* Date + kickoff */}
      <div style={{
        background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid #1a1a1a',
        padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10, color: '#484848', fontFamily: 'monospace' }}>🗓 {m.date_cet}</span>
        <span style={{ fontSize: 10, color: '#333' }}>·</span>
        <span style={{ fontSize: 11, color: '#585858', fontFamily: 'monospace', fontWeight: 700 }}>⏱ {m.kickoff_cet}</span>
      </div>

      <div style={{ padding: '16px 16px' }}>
        {/* Teams + score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: 1 }}>
            <Badge name={m.home_team} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0', textAlign: 'center', lineHeight: 1.3 }}>{m.home_team}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 90 }}>
            {scored ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{m.home_score}</span>
                <span style={{ fontSize: 20, color: '#333' }}>–</span>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{m.away_score}</span>
              </div>
            ) : (
              <span style={{ fontSize: 20, fontWeight: 700, color: '#6b7ef7' }}>VS</span>
            )}
            <StatusBadge status={m.status} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: 1 }}>
            <Badge name={m.away_team} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0', textAlign: 'center', lineHeight: 1.3 }}>{m.away_team}</span>
          </div>
        </div>

        {/* Scorers (if available) */}
        {m.scorers && (
          <div style={{ marginTop: 10, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11, color: '#555', textAlign: 'center' }}>
            ⚽ {m.scorers}
          </div>
        )}

        {/* Venue */}
        {m.stadium && (
          <div style={{ marginTop: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#bbb' }}>{m.stadium}</div>
              {m.city && <div style={{ fontSize: 10, color: '#484848', marginTop: 1 }}>{m.city}</div>}
            </div>
          </div>
        )}

        {/* H2H */}
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setOpen(!open)} style={{
            width: '100%', padding: '7px 12px', cursor: 'pointer',
            background: open ? 'rgba(107,126,247,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${open ? 'rgba(107,126,247,0.3)' : '#222'}`,
            borderRadius: 8, color: open ? '#6b7ef7' : '#444',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
          }}>
            ⚔️ HEAD TO HEAD
            <span style={{ color: open ? '#6b7ef7' : '#333', fontWeight: 400, fontSize: 10 }}>
              {m.h2h.length === 0 ? '— first ever meeting' : `· ${m.h2h.length} previous ${m.h2h.length === 1 ? 'meeting' : 'meetings'}`}
            </span>
            <span style={{ marginLeft: 'auto' }}>{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <div style={{ marginTop: 5, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
              {m.h2h.length === 0
                ? <div style={{ padding: '12px 14px', color: '#444', fontSize: 11, fontStyle: 'italic' }}>
                    No previous senior international meetings recorded.
                  </div>
                : m.h2h.map((h, i) => <H2HRow key={i} m={h} i={i} />)
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          height: 200, borderRadius: 16,
          background: 'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)',
          backgroundSize: '400% 100%',
          animation: `shimmer 1.5s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

function NoKeyScreen() {
  return (
    <div style={{
      marginTop: 24, padding: 24, borderRadius: 16,
      background: 'linear-gradient(145deg,#1a1208,#221a0a)',
      border: '1px solid #3a2a10',
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>🔑</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f7c94e', marginBottom: 8 }}>API Key Required</div>
      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7, marginBottom: 16 }}>
        To fetch live World Cup data, you need a free API key from{' '}
        <a href="https://www.football-data.org/client/register" target="_blank" rel="noreferrer"
          style={{ color: '#6b7ef7' }}>football-data.org</a>.
        It takes 30 seconds to sign up.
      </div>
      <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', marginBottom: 6 }}>Then create a <code style={{color:'#f7c94e'}}>.env</code> file in the project root:</div>
      <div style={{
        background: '#0a0a0a', borderRadius: 8, padding: '10px 14px',
        fontFamily: 'monospace', fontSize: 12, color: '#4ef794',
        border: '1px solid #1a1a1a', marginBottom: 16,
      }}>
        VITE_FD_API_KEY=your_key_here
      </div>
      <div style={{ fontSize: 12, color: '#555' }}>Then run <code style={{color:'#f7c94e', fontFamily:'monospace'}}>npm run dev</code> again.</div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const AUTO_REFRESH_MS = 60 * 60 * 1000 // 1 hour

export default function App() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('today')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [noKey,   setNoKey]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNoKey(false)
    try {
      const result = await fetchMatches()
      setData(result)
      setLastRefresh(new Date())
      // Auto-switch to today tab if matches exist, else yesterday
      if (result.today_matches.length > 0) setTab('today')
      else if (result.yesterday_matches.length > 0) setTab('yesterday')
    } catch (e) {
      if (e.message === 'NO_API_KEY') { setNoKey(true) }
      else if (e.message === 'RATE_LIMIT') { setError('Rate limit hit — try again in a minute.') }
      else if (e.message === 'INVALID_KEY') { setError('Invalid API key. Check your .env file.') }
      else { setError(e.message) }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount + auto-refresh every hour
  useEffect(() => {
    load()
    const interval = setInterval(load, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [load])

  // Also refresh when tab becomes visible again (user comes back)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const age = lastRefresh ? Date.now() - lastRefresh.getTime() : Infinity
        if (age > 5 * 60 * 1000) load() // refresh if data is >5min old
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load, lastRefresh])

  const todayM = data?.today_matches     ?? []
  const yesterM = data?.yesterday_matches ?? []

  const tabs = [
    { id: 'today',     label: 'Today',     count: todayM.length,  col: '#f7a03f' },
    { id: 'yesterday', label: 'Yesterday', count: yesterM.length, col: '#3fd475' },
  ]
  const matches = tab === 'today' ? todayM : yesterM

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      color: '#e8e8e8',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg,#0c1018 0%,#0a0a0a 100%)',
        borderBottom: '1px solid #161616', padding: '20px 20px 16px',
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🏆</span>
              <div>
                <h1 style={{
                  margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg,#fff 20%,#6b7ef7 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>FIFA World Cup 2026™</h1>
                <p style={{ margin: 0, fontSize: 10, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  USA · Canada · Mexico
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <button onClick={load} disabled={loading} title="Refresh" style={{
              padding: '8px 14px', border: '1px solid #222', borderRadius: 8,
              background: loading ? '#111' : '#181818',
              color: loading ? '#333' : '#888', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all .2s',
            }}>
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↺</span>
              <span style={{ fontSize: 11 }}>{loading ? 'Loading…' : 'Refresh'}</span>
            </button>
          </div>

          {/* Last refresh time */}
          {lastRefresh && !loading && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#2a2a2a', textAlign: 'right' }}>
              Updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every hour
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 14px 40px' }}>

        {/* No key screen */}
        {noKey && <NoKeyScreen />}

        {/* Error */}
        {error && !loading && (
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 12,
            background: '#180a0a', border: '1px solid #4a1a1a',
            color: '#f74e4e', fontSize: 13,
          }}>⚠️ {error}</div>
        )}

        {/* Tabs */}
        {data && !noKey && (
          <>
            <div style={{ display: 'flex', gap: 6, marginTop: 16, marginBottom: 16 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, padding: '9px 8px', borderRadius: 10, cursor: 'pointer',
                  background: tab === t.id ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${tab === t.id ? '#2a2a2a' : '#161616'}`,
                  color: tab === t.id ? '#fff' : '#3a3a3a',
                  fontWeight: 700, fontSize: 12, transition: 'all .2s',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {matches.length === 0
                ? <div style={{ textAlign: 'center', color: '#333', padding: 48, fontSize: 14 }}>
                    No matches scheduled for {tab === 'today' ? 'today' : 'yesterday'}
                  </div>
                : matches.map((m, i) => (
                    <MatchCard key={m.id || i} m={m} isResult={tab === 'yesterday' || m.status === 'FT'} />
                  ))
              }
            </div>
          </>
        )}

        {/* Loading skeleton */}
        {loading && !data && <div style={{ marginTop: 20 }}><Skeleton /></div>}
      </div>

      <style>{`
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { color: #6b7ef7; }
        code { background: #111; padding: 1px 5px; border-radius: 4px; }
      `}</style>
    </div>
  )
}

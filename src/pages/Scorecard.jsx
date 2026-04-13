import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

// ── Ícones de status (idênticos ao original) ──────────────────────────────────
function StatusIcon({ status }) {
  if (status === 'green')  return <span className="sc-dot green" />
  if (status === 'yellow') return <span className="sc-dot yellow" />
  if (status === 'red')    return <span className="sc-tri" />
  if (status === 'blue')   return <span className="sc-diamond" />
  if (status === 'orange') return <span className="sc-tri-up" />
  return <span className="sc-dot gray" />
}

function fmtNum(v) {
  if (v === null || v === undefined) return '–'
  return Number(Math.abs(v)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function fmtDelta(v) {
  if (v === null || v === undefined) return '–'
  return `${Number(v).toFixed(1)}%`
}

const STICKY0 = { position: 'sticky', left: 0, zIndex: 2, background: '#fff' }
const STICKY1 = { position: 'sticky', left: '40px', zIndex: 2, background: '#fff', boxShadow: '3px 0 6px -2px rgba(0,0,0,.10)' }

function classify(realizado, orcado) {
  if (realizado == null || orcado == null) return null
  const r = parseFloat(realizado), o = parseFloat(orcado)
  if (!o) return null
  const ratio = Math.abs(r) / Math.abs(o) * 100
  if (ratio <= 100) return 'green'
  if (ratio <= 105) return 'yellow'
  return 'red'
}

function getMesValues(ind, mesIdx) {
  if (mesIdx === null) {
    const rea   = ind.ytd_rea
    const met   = ind.ytd_orc
    const delta = (rea != null && met) ? Math.abs(rea) / Math.abs(met) * 100 : null
    return { rea, met, delta }
  }
  const m = ind.monthly?.[mesIdx]
  if (!m) return { rea: null, met: null, delta: null }
  const delta = (m.realizado != null && m.orcado) ? Math.abs(m.realizado) / Math.abs(m.orcado) * 100 : null
  return { rea: m.realizado, met: m.orcado, delta }
}


const MONTH_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTH_SHORT_L = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtBRL(v) {
  if (v == null) return '–'
  return Number(Math.abs(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
}

function fmtPct(v) {
  if (v == null) return '–'
  return `${Number(v).toFixed(1)}%`
}

function classifyStatus(realizado, orcado) {
  if (realizado == null || orcado == null) return null
  const ratio = Math.abs(realizado) / Math.abs(orcado) * 100
  if (ratio <= 100) return 'green'
  if (ratio <= 105) return 'yellow'
  return 'red'
}

function DetalheModal({ ind, atividade, onClose }) {
  const chartRef  = useRef()
  const chartInst = useRef()
  const [aba, setAba] = useState('grafico')

  useEffect(() => {
    if (!ind || !chartRef.current) return
    if (aba !== 'grafico') return
    if (chartInst.current) chartInst.current.destroy()

    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: MONTH_SHORT_L,
        datasets: [
          {
            label: 'Realizado',
            data: ind.monthly.map(m => m.realizado != null ? Math.abs(m.realizado) : null),
            backgroundColor: ind.monthly.map(m => {
              const s = classifyStatus(m.realizado, m.orcado)
              return s === 'green' ? 'rgba(22,163,74,.85)' : s === 'yellow' ? 'rgba(202,138,4,.85)' : s === 'red' ? 'rgba(220,38,38,.85)' : 'rgba(203,213,225,.6)'
            }),
            borderRadius: 5, order: 2,
          },
          {
            label: 'Orçado',
            data: ind.monthly.map(m => m.orcado != null ? Math.abs(m.orcado) : null),
            type: 'line', borderColor: '#1a1d23', borderWidth: 2,
            borderDash: [5,3], pointRadius: 4, fill: false, tension: 0.1, order: 1,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { afterBody: items => {
            const m = ind.monthly[items[0]?.dataIndex]
            if (!m) return []
            const pct = m.orcado ? Math.abs(m.realizado) / Math.abs(m.orcado) * 100 : null
            return pct != null ? [`% Execução: ${pct.toFixed(1)}%`] : []
          }}}
        },
        scales: { y: { beginAtZero: true, ticks: { callback: v => `R$ ${(v/1000).toFixed(0)}k` } } }
      }
    })
    return () => chartInst.current?.destroy()
  }, [ind, aba])

  if (!ind) return null

  const ytdRea = ind.monthly.reduce((s, m) => s + (m.realizado || 0), 0)
  const ytdOrc = ind.monthly.reduce((s, m) => s + (m.orcado    || 0), 0)
  const ytdPct = ytdOrc ? Math.abs(ytdRea) / Math.abs(ytdOrc) * 100 : null
  const ytdBom = ytdPct != null && ytdPct <= 100

  // Estatísticas para aba Detalhes
  const comDados   = ind.monthly.filter(m => m.realizado != null && m.orcado != null)
  const pcts       = comDados.map(m => Math.abs(m.realizado) / Math.abs(m.orcado) * 100)
  const melhorMes  = pcts.length ? MONTH_FULL[ind.monthly.findIndex((m,i) => pcts[i] === Math.min(...pcts))] : '–'
  const piorMes    = pcts.length ? MONTH_FULL[ind.monthly.findIndex((m,i) => pcts[i] === Math.max(...pcts))] : '–'
  const mediaPct   = pcts.length ? pcts.reduce((a,b) => a+b, 0) / pcts.length : null
  const mesesComDado = comDados.length

  // Tendência simples: compara segunda metade vs primeira metade
  const primeira = pcts.slice(0, 6).reduce((a,b) => a+b, 0) / (pcts.slice(0,6).length || 1)
  const segunda  = pcts.slice(6).reduce((a,b) => a+b, 0)   / (pcts.slice(6).length  || 1)
  const tendencia = pcts.length >= 6
    ? (segunda < primeira ? '↓ Melhorando' : segunda > primeira ? '↑ Piorando' : '→ Estável')
    : '–'
  const tendCor = tendencia.includes('Melhorando') ? '#16a34a' : tendencia.includes('Piorando') ? '#dc2626' : '#ca8a04'

  const TABS = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'grafico',  label: 'Gráfico'  },
  ]

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 820,
                 maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{atividade}</div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1d23' }}>{ind.nome}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          {/* Abas */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setAba(t.id)} style={{
                padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '.85rem', fontWeight: aba === t.id ? 700 : 400,
                color: aba === t.id ? '#1a1d23' : '#94a3b8',
                borderBottom: aba === t.id ? '2px solid #1a1d23' : '2px solid transparent',
                marginBottom: -1, transition: 'all .15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 24 }}>

          {/* ── ABA DETALHES ── */}
          {aba === 'detalhes' && (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'YTD Realizado', value: fmtBRL(ytdRea), accent: '#0369a1', sub: 'Acumulado anual' },
                  { label: 'YTD Orçado',    value: fmtBRL(ytdOrc), accent: '#475569', sub: 'Acumulado anual' },
                  { label: '% Execução',    value: fmtPct(ytdPct), accent: ytdBom ? '#16a34a' : '#dc2626',
                    color: ytdBom ? 'var(--green)' : 'var(--red)', sub: ytdBom ? 'Dentro do orçado ✓' : 'Acima do orçado ✗' },
                ].map(k => (
                  <div key={k.label} className="stat-card" style={{ '--accent': k.accent }}>
                    <div className="label">{k.label}</div>
                    <div className="value" style={{ fontSize: '1.1rem', color: k.color }}>{k.value}</div>
                    <div className="sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Informações */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Informações
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
                    <tbody>
                      {[
                        ['Grupo',           atividade],
                        ['Indicador',       ind.nome],
                        ['Meses com dados', `${mesesComDado} de 12`],
                        ['Média de execução', mediaPct != null ? fmtPct(mediaPct) : '–'],
                        ['Tendência',       tendencia],
                      ].map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 600, width: '50%' }}>{k}</td>
                          <td style={{ padding: '8px 4px', fontWeight: 500, color: k === 'Tendência' ? tendCor : 'inherit' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Valores de Referência
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
                    <tbody>
                      {[
                        ['Melhor mês (menor %)', melhorMes],
                        ['Pior mês (maior %)',   piorMes],
                        ['Min Realizado', fmtBRL(Math.min(...comDados.map(m => m.realizado)))],
                        ['Max Realizado', fmtBRL(Math.max(...comDados.map(m => m.realizado)))],
                        ['Min Orçado',   fmtBRL(Math.min(...comDados.map(m => m.orcado)))],
                        ['Max Orçado',   fmtBRL(Math.max(...comDados.map(m => m.orcado)))],
                      ].map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 600 }}>{k}</td>
                          <td style={{ padding: '8px 4px', fontFamily: 'DM Mono,monospace', fontSize: '.82rem' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── ABA GRÁFICO ── */}
          {aba === 'grafico' && (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'YTD Realizado', value: fmtBRL(ytdRea), accent: '#0369a1', sub: 'Acumulado anual' },
                  { label: 'YTD Orçado',    value: fmtBRL(ytdOrc), accent: '#475569', sub: 'Acumulado anual' },
                  { label: '% Execução',    value: fmtPct(ytdPct), accent: ytdBom ? '#16a34a' : '#dc2626',
                    color: ytdBom ? 'var(--green)' : 'var(--red)', sub: ytdBom ? 'Dentro do orçado ✓' : 'Acima do orçado ✗' },
                ].map(k => (
                  <div key={k.label} className="stat-card" style={{ '--accent': k.accent }}>
                    <div className="label">{k.label}</div>
                    <div className="value" style={{ fontSize: '1.1rem', color: k.color }}>{k.value}</div>
                    <div className="sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Gráfico */}
              <div style={{ position: 'relative', height: 220, marginBottom: 20 }}>
                <canvas ref={chartRef} />
              </div>

              {/* Tabela mensal */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--muted)', fontWeight: 600 }}>Mês</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--muted)', fontWeight: 600 }}>Realizado</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--muted)', fontWeight: 600 }}>Orçado</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--muted)', fontWeight: 600 }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {ind.monthly.map((m, i) => {
                    const pct = m.orcado ? Math.abs(m.realizado) / Math.abs(m.orcado) * 100 : null
                    const cor = pct == null ? 'var(--muted)' : pct <= 100 ? '#16a34a' : pct <= 105 ? '#ca8a04' : '#dc2626'
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 600 }}>{MONTH_FULL[i]}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'DM Mono,monospace' }}>{fmtBRL(m.realizado)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'DM Mono,monospace', color: '#94a3b8' }}>{fmtBRL(m.orcado)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'DM Mono,monospace', fontWeight: 600, color: cor }}>{fmtPct(pct)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default function Scorecard() {
  const [params, setParams]     = useSearchParams()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selMes, setSelMes]     = useState(null)
  const [expanded, setExpanded] = useState({})
  const [modal, setModal]         = useState(null)  // { ind, atividade }

  const q       = params.get('q')        || ''
  const ativFil = params.get('atividade') || ''
  const ano_f   = params.get('ano')       || ''

  const buildQS = useCallback(() => {
    const p = {}
    if (q)       p.q         = q
    if (ativFil) p.atividade = ativFil
    if (ano_f)   p.ano       = ano_f
    return new URLSearchParams(p).toString()
  }, [q, ativFil, ano_f])

  useEffect(() => {
    setLoading(true)
    api.get(`/scorecard/?${buildQS()}`)
      .then(r => {
        setData(r.data)
        setLoading(false)
        const exp = {}
        r.data.groups.forEach(g => { exp[g.atividade] = true })
        setExpanded(exp)
      })
  }, [q, ativFil, ano_f])

  const setFilter    = (key, val) => { const n = new URLSearchParams(params); val ? n.set(key, val) : n.delete(key); setParams(n) }
  const clearFilters = () => setParams({})
  const toggleMes    = (i)   => setSelMes(p => p === i ? null : i)
  const toggleGroup  = (atv) => setExpanded(p => ({ ...p, [atv]: !p[atv] }))

  const hasFilter = q || ativFil || ano_f
  const months    = data?.months  || []
  const filters   = data?.filters || {}
  const colLabel  = selMes !== null ? months[selMes] : 'YTD'

  const groups = useMemo(() => {
    if (!data) return []
    // Filtra por busca no frontend
    if (!q.trim()) return data.groups
    const qL = q.toLowerCase()
    return data.groups.map(g => ({
      ...g,
      indicadores: g.indicadores.filter(ind => ind.nome.toLowerCase().includes(qL))
    })).filter(g => g.indicadores.length > 0)
  }, [data, q])

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="sc-toolbar">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', flex: 1 }}>
          <div className="form-group">
            <label>Buscar</label>
            <input type="text" value={q} placeholder="Nome do indicador..."
              onChange={e => setFilter('q', e.target.value)} style={{ minWidth: 180 }} />
          </div>
          <div className="form-group">
            <label>Grupo</label>
            <select value={ativFil} onChange={e => setFilter('atividade', e.target.value)}>
              <option value="">Todos</option>
              {filters.atividades?.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Ano</label>
            <select value={ano_f} onChange={e => setFilter('ano', e.target.value)}>
              <option value="">Todos</option>
              {filters.anos?.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {hasFilter && (
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Limpar</button>
          )}
        </div>
      </div>

      {/* ── Legenda + indicador de mês ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '.72rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span><span className="sc-dot green"  style={{ marginRight: 4 }} />Dentro do orçado (≤100%)</span>
          <span><span className="sc-dot yellow" style={{ marginRight: 4 }} />Até 5% acima</span>
          <span><span className="sc-tri"        style={{ marginRight: 4 }} />Acima de 5%</span>
          <span><span className="sc-dot gray"   style={{ marginRight: 4 }} />Sem dados</span>
        </div>
        {selMes !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#2563eb', color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 600 }}>
              📅 Exibindo: {months[selMes]}
            </span>
            <button onClick={() => setSelMes(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: '.72rem', cursor: 'pointer', color: 'var(--muted)' }}>
              ✕ Ver YTD
            </button>
          </div>
        )}
      </div>

      {loading && <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>}

      {/* ── Tabela scorecard ── */}
      {!loading && (
        <div className="card">
          <div className="sc-wrap">
            <table className="sc-table">
              <thead>
                <tr>
                  <th className="left sticky" style={{ left: 0, width: 40, zIndex: 3 }}></th>
                  <th className="left sticky sticky-last" style={{ left: 40, minWidth: 260, zIndex: 3 }}>Indicador</th>
                  <th className="sc-num" style={{ whiteSpace: 'nowrap' }}>
                    {colLabel} Real
                    {selMes !== null && <div style={{ fontSize: '.6rem', fontWeight: 400, color: '#2563eb' }}>clique mês p/ mudar</div>}
                  </th>
                  <th className="sc-num" style={{ whiteSpace: 'nowrap' }}>{colLabel} Orç.</th>
                  <th className="sc-num">%</th>
                  {months.map((m, i) => (
                    <th key={m} onClick={() => toggleMes(i)}
                      className={`sc-dot-cell${i === 0 ? ' sc-month-sep' : ''}`}
                      style={{ cursor: 'pointer', userSelect: 'none',
                        background: selMes === i ? '#2563eb' : undefined,
                        color:      selMes === i ? '#fff'    : undefined,
                        borderRadius: selMes === i ? 4 : undefined,
                        transition: 'background .15s' }}>
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(grp => {
                  const isOpen = expanded[grp.atividade]

                  // Totais do grupo para linha pai
                  const gRea = selMes !== null
                    ? grp.indicadores.reduce((s, ind) => s + (ind.monthly[selMes]?.realizado || 0), 0)
                    : grp.indicadores.reduce((s, ind) => s + (ind.ytd_rea || 0), 0)
                  const gOrc = selMes !== null
                    ? grp.indicadores.reduce((s, ind) => s + (ind.monthly[selMes]?.orcado || 0), 0)
                    : grp.indicadores.reduce((s, ind) => s + (ind.ytd_orc || 0), 0)
                  const gPct = gOrc ? Math.abs(gRea) / Math.abs(gOrc) * 100 : null

                  return [
                    /* ── Linha PAI (Atividade) — clicável para expandir ── */
                    <tr key={`grp-${grp.atividade}`} className="sc-group-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleGroup(grp.atividade)}>
                      <td style={{ textAlign: 'center', fontSize: '.85rem', fontWeight: 700 }}>
                        {isOpen ? '−' : '+'}
                      </td>
                      <td style={{ fontWeight: 700 }} colSpan={1}>
                        <span
                          onClick={e => { e.stopPropagation(); setModal({ ind: {
                            nome: grp.atividade,
                            monthly: grp.monthly.map(m => ({ realizado: m.realizado, orcado: m.orcado, status: m.status })),
                            ytd_rea: grp.indicadores.reduce((s,i) => s + (i.ytd_rea||0), 0),
                            ytd_orc: grp.indicadores.reduce((s,i) => s + (i.ytd_orc||0), 0),
                          }, atividade: 'Grupo' }) }}
                          style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                          title="Ver detalhe do grupo"
                        >
                          {grp.atividade}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: '.72rem', fontWeight: 400, color: 'var(--muted)' }}>
                          ({grp.indicadores.length})
                        </span>
                      </td>
                      <td className="sc-num" style={{ fontWeight: 700 }}>{fmtNum(gRea)}</td>
                      <td className="sc-num" style={{ color: 'var(--muted)' }}>{fmtNum(gOrc)}</td>
                      <td className={`sc-num ${gPct === null ? '' : gPct <= 100 ? 'sc-delta-pos' : 'sc-delta-neg'}`} style={{ fontWeight: 700 }}>
                        {fmtDelta(gPct)}
                      </td>
                      {months.map((_, i) => {
                        const mR = grp.indicadores.reduce((s, ind) => s + (ind.monthly[i]?.realizado || 0), 0)
                        const mO = grp.indicadores.reduce((s, ind) => s + (ind.monthly[i]?.orcado    || 0), 0)
                        return (
                          <td key={i} onClick={e => { e.stopPropagation(); toggleMes(i) }}
                            className={`sc-dot-cell${i === 0 ? ' sc-month-sep' : ''}`}
                            style={{ cursor: 'pointer', background: selMes === i ? 'rgba(37,99,235,.07)' : undefined }}>
                            <StatusIcon status={classify(mR, mO)} />
                          </td>
                        )
                      })}
                    </tr>,

                    /* ── Linhas FILHAS (Descrição) ── */
                    ...(!isOpen ? [] : grp.indicadores.map((ind, idx) => {
                      const { rea, met, delta } = getMesValues(ind, selMes)
                      return (
                        <tr key={ind.id}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td className="sticky" style={{ ...STICKY0, width: 40, color: 'var(--muted)', fontSize: '.7rem' }}>
                            {idx + 1}
                          </td>
                          <td className="sc-name sticky sticky-last indent-1" style={STICKY1}>
                            <span
                              onClick={() => setModal({ ind, atividade: grp.atividade })}
                              style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline dotted' }}
                              title="Ver detalhe"
                            >
                              {ind.nome}
                            </span>
                          </td>
                          <td className="sc-num"
                            title={met != null ? `Orçado: ${fmtNum(met)}` : ''}
                            style={{ cursor: 'help' }}>
                            {fmtNum(rea)}
                          </td>
                          <td className="sc-num" style={{ color: 'var(--muted)' }}>{fmtNum(met)}</td>
                          <td className={`sc-num ${delta === null ? '' : delta <= 100 ? 'sc-delta-pos' : 'sc-delta-neg'}`}>
                            {fmtDelta(delta)}
                          </td>
                          {ind.monthly.map((m, mi) => (
                            <td key={mi} onClick={() => toggleMes(mi)}
                              className={`sc-dot-cell${mi === 0 ? ' sc-month-sep' : ''}`}
                              style={{ cursor: 'pointer', background: selMes === mi ? 'rgba(37,99,235,.07)' : undefined, transition: 'background .1s' }}>
                              <StatusIcon status={m.status || classify(m.realizado, m.orcado)} />
                            </td>
                          ))}
                        </tr>
                      )
                    }))
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {modal && <DetalheModal ind={modal.ind} atividade={modal.atividade} onClose={() => setModal(null)} />}
    </>
  )
}
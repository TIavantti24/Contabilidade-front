import { useEffect, useRef, useState, useMemo } from 'react'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

const MONTH_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTH_ABBR  = ['J','F','M','A','M','J','J','A','S','O','N','D']

const FILHO_COLORS = {
  'Energia': '#0369a1',
  'Imobiliaria': '#7c3aed',
  'Desp. Gerais e Res. Financ.': '#047857',
}
const filhoColor = nome => FILHO_COLORS[nome] || '#0891b2'

function fmtBRL(v) {
  if (v == null) return '–'
  return Number(Math.abs(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function labelToMes(label) {
  if (!label) return -1
  if (label.includes('/')) return parseInt(label.split('/')[1]) - 1
  if (label.includes('-')) return parseInt(label.split('-')[1]) - 1
  return -1
}
function labelToAno(label) {
  if (!label) return ''
  if (label.includes('/')) return label.split('/')[2]
  if (label.includes('-')) return label.split('-')[0]
  return ''
}
function fmtLabel(label) {
  const m = labelToMes(label)
  return m < 0 ? label : `${MONTH_SHORT[m]}/${labelToAno(label)}`
}

function buildHierarquia(registros) {
  const grupos = {}
  for (const r of registros) {
    const pai   = r.descricao || 'Sem Grupo'
    const filho = r.atividade
    const mes   = labelToMes(r.data)
    if (!grupos[pai]) grupos[pai] = {}
    if (!grupos[pai][filho]) grupos[pai][filho] = {}
    if (!grupos[pai][filho][mes]) grupos[pai][filho][mes] = { rea: 0, orc: 0 }
    grupos[pai][filho][mes].rea += (r.realizado || 0)
    grupos[pai][filho][mes].orc += (r.orcado || 0)
  }
  return grupos
}

function somarMes(filhos, mes) {
  let rea = 0, orc = 0
  for (const meses of Object.values(filhos)) {
    rea += meses[mes]?.rea || 0
    orc += meses[mes]?.orc || 0
  }
  return { rea, orc }
}

function somarTudo(filhos) {
  let rea = 0, orc = 0
  for (const meses of Object.values(filhos)) {
    for (const v of Object.values(meses)) {
      rea += v.rea || 0
      orc += v.orc || 0
    }
  }
  return { rea, orc }
}

// ── LÓGICA INVERTIDA: receita maior que orçado = BOM ──
function StatusBadge({ rea, orc }) {
  if (!rea && !orc) return null
  const bom = Math.abs(rea) >= Math.abs(orc)
  return (
    <span style={{
      background: bom ? '#dcfce7' : '#fee2e2',
      color: bom ? '#166534' : '#991b1b',
      padding: '2px 8px', borderRadius: 20, fontSize: '.68rem', fontWeight: 600
    }}>
      {bom ? 'Acima ✓' : 'Abaixo ✗'}
    </span>
  )
}

export default function Receita() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [descFilt, setDescFilt]     = useState('')
  const [ativFilt, setAtivFilt]     = useState('')
  const [anoFilt, setAnoFilt]       = useState('')
  const [selMes, setSelMes]         = useState(null)
  const [expandidos, setExpandidos] = useState({})
  const [selAtiv, setSelAtiv]       = useState(null)
  const chartRef  = useRef()
  const chartInst = useRef()

  const load = (ativ = '', ano = '', desc = '') => {
    setLoading(true)
    api.get(`/receita/?atividade=${ativ}&ano=${ano}&descricao=${desc}`)
      .then(r => {
        setData(r.data)
        setLoading(false)
        const exp = {}
        for (const reg of r.data.registros) if (reg.descricao) exp[reg.descricao] = true
        setExpandidos(exp)
        setSelAtiv(null)
      })
  }

  useEffect(() => { load() }, [])

  const hierarquia = useMemo(() => data ? buildHierarquia(data.registros) : {}, [data])
  const mesesComDados = useMemo(() =>
    new Set(data?.registros.map(r => labelToMes(r.data)).filter(i => i >= 0) || []),
  [data])

  useEffect(() => {
    if (!data || !chartRef.current) return
    if (chartInst.current) chartInst.current.destroy()

    let labels = [], datasets = []

    if (selAtiv) {
      for (const filhos of Object.values(hierarquia)) {
        if (!filhos[selAtiv]) continue
        const meses = filhos[selAtiv]
        if (selMes !== null) {
          labels = [MONTH_FULL[selMes]]
          datasets = [
            { label: 'Realizado', data: [Math.abs(meses[selMes]?.rea || 0)], backgroundColor: filhoColor(selAtiv), borderRadius: 6 },
            { label: 'Orçado',    data: [Math.abs(meses[selMes]?.orc || 0)], backgroundColor: '#cbd5e1', borderRadius: 6 },
          ]
        } else {
          labels = MONTH_SHORT
          datasets = [
            { label: 'Realizado', data: MONTH_SHORT.map((_, i) => Math.abs(meses[i]?.rea || 0)), backgroundColor: filhoColor(selAtiv), borderRadius: 4 },
            { label: 'Orçado', data: MONTH_SHORT.map((_, i) => Math.abs(meses[i]?.orc || 0)), type: 'line', borderColor: '#94a3b8', borderWidth: 2, borderDash: [5,3], pointRadius: 3, fill: false },
          ]
        }
        break
      }
    } else if (selMes !== null) {
      const atividadesSet = new Set()
      for (const filhos of Object.values(hierarquia))
        for (const filho of Object.keys(filhos)) atividadesSet.add(filho)
      labels = Array.from(atividadesSet)

      datasets = [
        {
          label: 'Realizado',
          data: labels.map(filho => {
            let total = 0
            for (const filhos of Object.values(hierarquia))
              if (filhos[filho]) total += Math.abs(filhos[filho][selMes]?.rea || 0)
            return total
          }),
          backgroundColor: labels.map(filhoColor),
          borderRadius: 6,
        },
        {
          label: 'Orçado',
          data: labels.map(filho => {
            let total = 0
            for (const filhos of Object.values(hierarquia))
              if (filhos[filho]) total += Math.abs(filhos[filho][selMes]?.orc || 0)
            return total
          }),
          backgroundColor: '#cbd5e1',
          borderRadius: 6,
        },
      ]
    } else {
      labels = MONTH_SHORT
      const atividadesSet = new Set()
      for (const filhos of Object.values(hierarquia))
        for (const f of Object.keys(filhos)) atividadesSet.add(f)

      datasets = Array.from(atividadesSet).map(filho => ({
        label: filho,
        data: MONTH_SHORT.map((_, i) => {
          let total = 0
          for (const filhos of Object.values(hierarquia))
            if (filhos[filho]) total += Math.abs(filhos[filho][i]?.rea || 0)
          return total
        }),
        backgroundColor: filhoColor(filho),
        borderRadius: 0,
        stack: 'rea',
      }))

      const totalOrc = MONTH_SHORT.map((_, i) => {
        let s = 0
        for (const filhos of Object.values(hierarquia))
          for (const meses of Object.values(filhos)) s += Math.abs(meses[i]?.orc || 0)
        return s
      })
      datasets.push({
        label: 'Orçado Total', data: totalOrc,
        type: 'line', borderColor: '#1a1d23', borderWidth: 2,
        borderDash: [5,3], pointRadius: 3, fill: false, stack: undefined,
      })
    }

    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { stacked: !selAtiv && selMes === null },
          y: {
            stacked: !selAtiv && selMes === null,
            beginAtZero: true,
            ticks: { callback: v => `R$ ${(v/1000).toFixed(0)}k` }
          }
        }
      }
    })
  }, [data, selAtiv, selMes, hierarquia])

  const togglePai = (desc) => setExpandidos(prev => ({ ...prev, [desc]: !prev[desc] }))
  const toggleMes = (i) => setSelMes(prev => prev === i ? null : i)

  if (loading) return <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>
  if (!data)   return null

  const { totals, filters } = data

  // KPIs com lógica invertida — receita maior = bom
  const kpiRea = selMes !== null
    ? data.registros.filter(r => labelToMes(r.data) === selMes).reduce((s,r) => s + (r.realizado||0), 0)
    : totals.realizado
  const kpiOrc = selMes !== null
    ? data.registros.filter(r => labelToMes(r.data) === selMes).reduce((s,r) => s + (r.orcado||0), 0)
    : totals.orcado
  const kpiVar  = kpiRea - kpiOrc
  const kpiBom  = Math.abs(kpiRea) >= Math.abs(kpiOrc) // INVERTIDO
  const kpiPct  = kpiOrc ? Math.abs(kpiRea / kpiOrc * 100) : 0
  const kpiPctBom = kpiPct >= 100 // INVERTIDO

  return (
    <>
      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ '--accent': '#0369a1' }}>
          <div className="label">Total Realizado</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{fmtBRL(kpiRea)}</div>
          <div className="sub">{selMes !== null ? MONTH_FULL[selMes] : 'Acumulado anual'}</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#475569' }}>
          <div className="label">Total Orçado</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{fmtBRL(kpiOrc)}</div>
          <div className="sub">{selMes !== null ? MONTH_FULL[selMes] : 'Acumulado anual'}</div>
        </div>
        <div className="stat-card" style={{ '--accent': kpiBom ? '#16a34a' : '#c0392b' }}>
          <div className="label">Variação (Real − Orç.)</div>
          <div className="value" style={{ fontSize: '1.3rem', color: kpiBom ? 'var(--green)' : 'var(--red)' }}>
            {fmtBRL(kpiVar)}
          </div>
          <div className="sub">{kpiBom ? 'Acima do orçado ✓' : 'Abaixo do orçado ✗'}</div>
        </div>
        <div className="stat-card" style={{ '--accent': kpiPctBom ? '#16a34a' : '#c0392b' }}>
          <div className="label">% Execução</div>
          <div className="value" style={{ fontSize: '1.3rem', color: kpiPctBom ? 'var(--green)' : 'var(--red)' }}>
            {kpiPct.toFixed(1)}%
          </div>
          <div className="sub">{kpiPctBom ? 'Acima do orçado ✓' : 'Abaixo do orçado ✗'}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label>Descrição</label>
              <select value={descFilt} onChange={e => setDescFilt(e.target.value)}>
                <option value="">Todas</option>
                {(filters.descricoes || []).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Atividade</label>
              <select value={ativFilt} onChange={e => setAtivFilt(e.target.value)}>
                <option value="">Todas</option>
                {filters.atividades.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Ano</label>
              <select value={anoFilt} onChange={e => setAnoFilt(e.target.value)}>
                <option value="">Todos</option>
                {filters.anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={() => { load(ativFilt, anoFilt, descFilt); setSelMes(null) }}>Filtrar</button>
            </div>
            {(descFilt || ativFilt || anoFilt) && (
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label>&nbsp;</label>
                <button className="btn btn-outline" onClick={() => { setDescFilt(''); setAtivFilt(''); setAnoFilt(''); setSelMes(null); load() }}>✕ Limpar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h2>
              {selAtiv
                ? `${selAtiv}${selMes !== null ? ` — ${MONTH_FULL[selMes]}` : ' — Anual'}`
                : selMes !== null ? `Total — ${MONTH_FULL[selMes]}` : 'Total Anual por Atividade'}
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {selAtiv && <button className="btn btn-sm btn-outline" onClick={() => setSelAtiv(null)}>✕ Ver total</button>}
              {selMes !== null && <button className="btn btn-sm btn-outline" onClick={() => setSelMes(null)}>✕ Ver anual</button>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '.75rem', color: 'var(--muted)', marginRight: 4 }}>Mês:</span>
            <button onClick={() => setSelMes(null)} style={{
              padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: '.78rem', fontWeight: 600,
              background: selMes === null ? '#1a1d23' : 'var(--bg)',
              color: selMes === null ? '#fff' : 'var(--text)'
            }}>Acum.</button>
            {MONTH_ABBR.map((abbr, idx) => {
              const temDado = mesesComDados.has(idx)
              const ativo   = selMes === idx
              return (
                <button key={idx} onClick={() => temDado && toggleMes(idx)} style={{
                  width: 32, height: 32, borderRadius: '50%', border: `2px solid ${ativo ? '#0369a1' : 'var(--border)'}`,
                  cursor: temDado ? 'pointer' : 'default', fontSize: '.8rem', fontWeight: ativo ? 700 : 400,
                  background: ativo ? '#0369a1' : temDado ? 'var(--bg)' : 'transparent',
                  color: ativo ? '#fff' : temDado ? 'var(--text)' : 'var(--muted)',
                  opacity: temDado ? 1 : 0.3, transition: 'all .15s'
                }}>{abbr}</button>
              )
            })}
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          <div style={{ position: 'relative', height: 240 }}>
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>

      {/* Tabela hierárquica */}
      <div className="card">
        <div className="card-header">
          <h2>
            Detalhamento
            {selMes !== null && <span style={{ fontWeight: 400, fontSize: '.85rem', marginLeft: 8, color: 'var(--muted)' }}>— {MONTH_FULL[selMes]}</span>}
          </h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '.72rem' }}>
            <span style={{ color: 'var(--muted)' }}><strong>+/−</strong> expandir · clique mês = filtrar</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#1a1d23', fontSize: '.72rem' }}>■ Realizado</span>
              <span style={{ color: '#94a3b8', fontSize: '.72rem' }}>■ Orçado</span>
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th style={{ width: 160, fontSize: '.78rem' }}>Grupo / Atividade</th>
                {selMes !== null ? (
                  <th style={{ textAlign: 'center', width: 90 }}>{MONTH_SHORT[selMes]}</th>
                ) : (
                  MONTH_SHORT.map((m, i) => (
                    <th key={i} onClick={() => toggleMes(i)} style={{
                      textAlign: 'center', width: 60, cursor: 'pointer', fontSize: '.68rem',
                      padding: '6px 2px',
                      background: mesesComDados.has(i) ? 'transparent' : '#f8fafc',
                      userSelect: 'none'
                    }}>{m}</th>
                  ))
                )}
                <th style={{ textAlign: 'right', width: 80, fontSize: '.72rem' }}>{selMes !== null ? 'Real.' : 'Total Real.'}</th>
                <th style={{ textAlign: 'right', width: 80, fontSize: '.72rem' }}>{selMes !== null ? 'Orç.' : 'Total Orç.'}</th>
                <th style={{ textAlign: 'center', width: 60, fontSize: '.72rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(hierarquia).map(([pai, filhos]) => {
                const expandido = expandidos[pai]
                const { rea: paiRea, orc: paiOrc } = selMes !== null ? somarMes(filhos, selMes) : somarTudo(filhos)

                return [
                  <tr key={`pai-${pai}`} style={{ background: '#f1f5f9', fontWeight: 700 }}>
                    <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                      <button onClick={() => togglePai(pai)} style={{
                        background: expandido ? '#1a1d23' : '#e2e8f0',
                        color: expandido ? '#fff' : '#475569',
                        border: 'none', borderRadius: 4, width: 22, height: 22,
                        cursor: 'pointer', fontWeight: 800, fontSize: '1rem', lineHeight: '20px'
                      }}>{expandido ? '−' : '+'}</button>
                    </td>
                    <td style={{ paddingLeft: 6, fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pai}</td>

                    {selMes !== null ? (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '.8rem', color: '#1a1d23' }}>{fmtBRL(paiRea)}</div>
                        <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 1 }}>{fmtBRL(paiOrc)}</div>
                      </td>
                    ) : (
                      MONTH_SHORT.map((_, i) => {
                        const { rea, orc } = somarMes(filhos, i)
                        return (
                          <td key={i} onClick={() => toggleMes(i)} style={{ textAlign: 'center', cursor: 'pointer', padding: '4px 1px' }}>
                            {rea || orc ? (
                              <>
                                <div style={{ fontSize: '.65rem', fontWeight: 700, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtBRL(rea)}</div>
                                <div style={{ fontSize: '.6rem', color: '#94a3b8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtBRL(orc)}</div>
                              </>
                            ) : <span style={{ color: '#e2e8f0', fontSize: '.65rem' }}>–</span>}
                          </td>
                        )
                      })
                    )}

                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a1d23' }}>{fmtBRL(paiRea)}</td>
                    <td style={{ textAlign: 'right', color: '#94a3b8' }}>{fmtBRL(paiOrc)}</td>
                    <td style={{ textAlign: 'center' }}><StatusBadge rea={paiRea} orc={paiOrc} /></td>
                  </tr>,

                  ...(!expandido ? [] : Object.entries(filhos).map(([filho, meses]) => {
                    const { rea: fRea, orc: fOrc } = selMes !== null
                      ? { rea: meses[selMes]?.rea || 0, orc: meses[selMes]?.orc || 0 }
                      : Object.values(meses).reduce((acc, v) => ({ rea: acc.rea + (v.rea||0), orc: acc.orc + (v.orc||0) }), { rea: 0, orc: 0 })
                    const ativo = selAtiv === filho

                    return (
                      <tr key={`filho-${filho}`}
                        style={{ background: ativo ? '#eff6ff' : undefined, cursor: 'pointer' }}
                        onClick={() => setSelAtiv(ativo ? null : filho)}>
                        <td></td>
                        <td style={{ paddingLeft: 20, fontSize: '.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {filho}
                          {ativo && <span style={{ marginLeft: 6, fontSize: '.67rem', color: '#0369a1', fontWeight: 600 }}>● gráfico</span>}
                        </td>

                        {selMes !== null ? (
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#1a1d23' }}>{fmtBRL(meses[selMes]?.rea)}</div>
                            <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 1 }}>{fmtBRL(meses[selMes]?.orc)}</div>
                          </td>
                        ) : (
                          MONTH_SHORT.map((_, i) => (
                            <td key={i} onClick={e => { e.stopPropagation(); toggleMes(i) }}
                              style={{ textAlign: 'center', cursor: 'pointer', padding: '4px 1px' }}>
                              {meses[i] ? (
                                <>
                                  <div style={{ fontSize: '.65rem', fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtBRL(meses[i].rea)}</div>
                                  <div style={{ fontSize: '.6rem', color: '#94a3b8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtBRL(meses[i].orc)}</div>
                                </>
                              ) : <span style={{ color: '#e2e8f0', fontSize: '.65rem' }}>–</span>}
                            </td>
                          ))
                        )}

                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '.84rem', color: '#1a1d23' }}>{fmtBRL(fRea)}</td>
                        <td style={{ textAlign: 'right', fontSize: '.84rem', color: '#94a3b8' }}>{fmtBRL(fOrc)}</td>
                        <td style={{ textAlign: 'center' }}><StatusBadge rea={fRea} orc={fOrc} /></td>
                      </tr>
                    )
                  }))
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

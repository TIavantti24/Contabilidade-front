import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

// ── Ícones de status ──────────────────────────────────────────────────────────
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
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function fmtDelta(v) {
  if (v === null || v === undefined) return '–'
  return `${Number(v).toFixed(1)}%`
}

const STICKY0 = { position: 'sticky', left: 0, zIndex: 2, background: '#fff' }
const STICKY1 = { position: 'sticky', left: '40px', zIndex: 2, background: '#fff', boxShadow: '3px 0 6px -2px rgba(0,0,0,.10)' }

// ── Calcula valor/meta/delta para um mês específico ou YTD ───────────────────
function getMesValues(ind, mesIdx) {
  if (mesIdx === null) {
    // YTD — recalcula delta como rea/met*100
    const rea = ind.ytd_rea
    const met = ind.ytd_met
    const delta = (rea !== null && rea !== undefined && met)
      ? (rea / met) * 100
      : null
    return { rea, met, delta }
  }
  const m = ind.monthly?.[mesIdx]
  if (!m) return { rea: null, met: null, delta: null }
  const rea = m.realizado
  const met = m.meta
  let delta = null
  if (rea !== null && rea !== undefined && met) {
    delta = (rea / met) * 100
  }
  return { rea, met, delta }
}

export default function Scorecard() {
  const [params, setParams]     = useSearchParams()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [viewMode, setViewMode] = useState('scorecard')
  const [tablePag, setTablePag] = useState(null)
  const [tablePage, setTablePage] = useState(1)

  // Mês selecionado: null = YTD acumulado, 0–11 = mês específico
  const [selMes, setSelMes] = useState(null)

  const q        = params.get('q') || ''
  const unidade  = params.get('unidade') || ''
  const area     = params.get('area') || ''
  const status_f = params.get('status') || ''
  const ano_f    = params.get('ano') || ''

  const buildQS = useCallback(() => {
    const p = {}
    if (q)        p.q = q
    if (unidade)  p.unidade = unidade
    if (area)     p.area = area
    if (status_f) p.status = status_f
    if (ano_f)    p.ano = ano_f
    return new URLSearchParams(p).toString()
  }, [q, unidade, area, status_f, ano_f])

  useEffect(() => {
    setLoading(true)
    const qs = buildQS()
    if (viewMode === 'scorecard') {
      api.get(`/indicadores/scorecard?${qs}`).then(r => { setData(r.data); setLoading(false) })
    } else {
      api.get(`/indicadores/?${qs}&page=${tablePage}&per_page=20`).then(r => { setTablePag(r.data); setLoading(false) })
    }
  }, [q, unidade, area, status_f, ano_f, viewMode, tablePage])

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params)
    if (val) next.set(key, val)
    else next.delete(key)
    setParams(next)
  }

  const clearFilters = () => setParams({})
  const toggleMes = (i) => setSelMes(prev => prev === i ? null : i)

  const hasFilter = q || unidade || area || status_f || ano_f
  const filters   = data?.filters || {}
  const months    = data?.months  || []
  const groups    = data?.groups  || {}

  // Label das colunas numéricas dependendo do mês selecionado
  const colLabel = selMes !== null ? months[selMes] : 'YTD'

  return (
    <>
      {/* Toolbar */}
      <div className="sc-toolbar">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', flex: 1 }}>
          <div className="form-group">
            <label>Buscar</label>
            <input type="text" value={q} placeholder="Nome do indicador..."
              onChange={e => setFilter('q', e.target.value)} style={{ minWidth: 180 }} />
          </div>
          <div className="form-group">
            <label>Unidade</label>
            <select value={unidade} onChange={e => setFilter('unidade', e.target.value)}>
              <option value="">Todas</option>
              {filters.unidades?.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Área</label>
            <select value={area} onChange={e => setFilter('area', e.target.value)}>
              <option value="">Todas</option>
              {filters.areas?.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status_f} onChange={e => setFilter('status', e.target.value)}>
              <option value="">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
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

        <div className="view-toggle">
          <button className={viewMode === 'scorecard' ? 'active' : ''} onClick={() => setViewMode('scorecard')}>
            ◉ Scorecard
          </button>
          <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
            ▤ Tabela
          </button>
        </div>
      </div>

      {/* Legenda + mês ativo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '.72rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span><span className="sc-tri-up" style={{ marginRight: 4 }} />≥121% Superado</span>
          <span><span className="sc-diamond" style={{ marginRight: 4 }} />101–120% Acima</span>
          <span><span className="sc-dot green" style={{ marginRight: 4 }} />100% Meta</span>
          <span><span className="sc-dot yellow" style={{ marginRight: 4 }} />90–99% Atenção</span>
          <span><span className="sc-tri" style={{ marginRight: 4 }} />≤89% Abaixo</span>
          <span><span className="sc-dot gray" style={{ marginRight: 4 }} />Sem dados</span>
        </div>

        {/* Indicador do mês selecionado */}
        {selMes !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: '#2563eb', color: '#fff',
              padding: '3px 12px', borderRadius: 20,
              fontSize: '.78rem', fontWeight: 600,
            }}>
              📅 Exibindo: {months[selMes]}
            </span>
            <button
              onClick={() => setSelMes(null)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 20, padding: '3px 10px',
                fontSize: '.72rem', cursor: 'pointer', color: 'var(--muted)',
              }}
            >
              ✕ Ver YTD
            </button>
          </div>
        )}
      </div>

      {loading && <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>}

      {/* ── SCORECARD VIEW ── */}
      {!loading && viewMode === 'scorecard' && (
        <div className="card">
          <div className="sc-wrap">
            <table className="sc-table">
              <thead>
                <tr>
                  <th className="left sticky" style={{ left: 0, width: 40, zIndex: 3 }}>#</th>
                  <th className="left sticky sticky-last" style={{ left: 40, minWidth: 240, zIndex: 3 }}>Indicador</th>

                  {/* Colunas numéricas — label muda com mês selecionado */}
                  <th className="sc-num" style={{ whiteSpace: 'nowrap' }}>
                    {colLabel} Real
                    {selMes !== null && (
                      <div style={{ fontSize: '.6rem', fontWeight: 400, color: '#2563eb' }}>clique mês p/ mudar</div>
                    )}
                  </th>
                  <th className="sc-num" style={{ whiteSpace: 'nowrap' }}>{colLabel} Meta</th>
                  <th className="sc-num">Δ%</th>

                  {/* Cabeçalho dos meses — clicável */}
                  {months.map((m, i) => (
                    <th
                      key={m}
                      onClick={() => toggleMes(i)}
                      className={`sc-dot-cell${i === 0 ? ' sc-month-sep' : ''}`}
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: selMes === i ? '#2563eb' : undefined,
                        color: selMes === i ? '#fff' : undefined,
                        borderRadius: selMes === i ? 4 : undefined,
                        transition: 'background .15s',
                      }}
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groups).map(([grp, inds]) => (
                  inds.length === 0 ? null : [
                    <tr key={`grp-${grp}`} className="sc-group-row">
                      <td colSpan={5 + months.length}>{grp} ({inds.length})</td>
                    </tr>,
                    ...inds.map((ind, idx) => {
                      const indent = ind.nivel === 1 ? 'indent-1' : ind.nivel >= 2 ? 'indent-2' : ''
                      const { rea, met, delta } = getMesValues(ind, selMes)

                      return (
                        <tr key={ind.id}>
                          <td className="sticky" style={{ ...STICKY0, width: 40, color: 'var(--muted)', fontSize: '.7rem' }}>{idx + 1}</td>
                          <td className={`sc-name sticky sticky-last ${indent}`} style={STICKY1}>
                            <Link to={`/scorecard/${ind.id}`}>{ind.nome}</Link>
                          </td>

                          {/* Real */}
                          <td className="sc-num">{fmtNum(rea)}</td>

                          {/* Meta */}
                          <td className="sc-num">{fmtNum(met)}</td>

                          {/* Δ% */}
                          <td className={`sc-num ${delta === null ? '' : delta >= 100 ? 'sc-delta-pos' : 'sc-delta-neg'}`}>
                            {fmtDelta(delta)}
                          </td>

                          {/* Símbolos mensais — clicável individualmente */}
                          {ind.monthly.map((m, mi) => (
                            <td
                              key={mi}
                              onClick={() => toggleMes(mi)}
                              className={`sc-dot-cell${mi === 0 ? ' sc-month-sep' : ''}`}
                              style={{
                                cursor: 'pointer',
                                background: selMes === mi ? 'rgba(37,99,235,.07)' : undefined,
                                transition: 'background .1s',
                              }}
                            >
                              <StatusIcon status={m.status} />
                            </td>
                          ))}
                        </tr>
                      )
                    })
                  ]
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {!loading && viewMode === 'table' && tablePag && (
        <>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Unidade</th>
                    <th>Área</th>
                    <th>Status</th>
                    <th>Ano</th>
                    <th>Responsável</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tablePag.items.map(ind => (
                    <tr key={ind.id}>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind.nome}</td>
                      <td>{ind.sigla_unidade}</td>
                      <td>{ind.area_resultado}</td>
                      <td>
                        <span style={{
                          background: ind.status === 'Ativo' ? '#dcfce7' : '#f3f4f6',
                          color: ind.status === 'Ativo' ? '#166534' : '#6b7280',
                          padding: '2px 8px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600
                        }}>{ind.status}</span>
                      </td>
                      <td>{ind.plano_gestao}</td>
                      <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{ind.responsavel}</td>
                      <td><Link to={`/scorecard/${ind.id}`} className="btn btn-outline btn-sm">Ver</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pagination">
            <button disabled={tablePage === 1} onClick={() => setTablePage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(tablePag.pages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={p === tablePage ? 'active' : ''} onClick={() => setTablePage(p)}>{p}</button>
            ))}
            <button disabled={tablePage === tablePag.pages} onClick={() => setTablePage(p => p + 1)}>›</button>
            <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
              {tablePag.total} registros
            </span>
          </div>
        </>
      )}
    </>
  )
}
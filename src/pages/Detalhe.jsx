import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

function fmtNum(v) {
  if (v === null || v === undefined) return '–'
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function StatusBadge({ status }) {
  const styles = {
    'Ativo':   { background: '#dcfce7', color: '#166534' },
    'Inativo': { background: '#f3f4f6', color: '#6b7280' },
  }
  const s = styles[status] || styles['Inativo']
  return (
    <span style={{...s, padding:'3px 10px', borderRadius:20, fontSize:'.72rem', fontWeight:700}}>{status}</span>
  )
}

export default function Detalhe() {
  const { id } = useParams()
  const [ind, setInd] = useState(null)
  const [loading, setLoading] = useState(true)
  const chartRef = useRef()

  useEffect(() => {
    api.get(`/indicadores/${id}`).then(r => { setInd(r.data); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (!ind || !chartRef.current) return
    const c = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: ind.chart_data.labels,
        datasets: [
          {
            label: 'Realizado',
            data: ind.chart_data.realizado,
            backgroundColor: 'rgba(192,57,43,.85)',
            borderRadius: 5,
            order: 1,
          },
          {
            label: 'Meta',
            data: ind.chart_data.meta,
            type: 'line',
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,.15)',
            borderWidth: 2,
            pointRadius: 4,
            fill: false,
            tension: 0.3,
            order: 0,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: false } }
      }
    })
    return () => c.destroy()
  }, [ind])

  if (loading) return <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>
  if (!ind)    return <div className="alert alert-danger">Indicador não encontrado.</div>

  const info = [
    ['Unidade', ind.sigla_unidade],
    ['Área de Resultado', ind.area_resultado],
    ['Tipo', ind.tipo],
    ['Frequência', ind.frequencia],
    ['Unidade de Medida', ind.unidade_medida],
    ['Melhor', ind.melhor],
    ['Forma Acúmulo', ind.forma_acumulo],
    ['Responsável', ind.responsavel],
    ['Ponderação', ind.ponderacao != null ? `${ind.ponderacao}%` : '–'],
    ['Tol. Verde', ind.tolerancia_verde != null ? `${ind.tolerancia_verde}%` : '–'],
    ['Tol. Amarelo', ind.tolerancia_amar != null ? `${ind.tolerancia_amar}%` : '–'],
    ['Plano de Gestão', ind.plano_gestao],
    ['Nível', ind.nivel],
  ]

  const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const vals = ind.valores || {}

  return (
    <>
      <div style={{marginBottom:16}}>
        <Link to="/scorecard" className="btn btn-outline btn-sm">← Voltar ao Scorecard</Link>
      </div>

      <div className="detalhe-header">
        <div style={{display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
          <div style={{flex:1}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:6}}>{ind.nome}</h2>
            <div className="detalhe-meta">
              <StatusBadge status={ind.status} />
              {ind.pai && <span className="meta-badge">⤴ {ind.pai.nome}</span>}
              {ind.sigla_unidade && <span className="meta-badge">{ind.sigla_unidade}</span>}
              {ind.area_resultado && <span className="meta-badge">{ind.area_resultado}</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        {/* Chart */}
        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-header"><h2>Realizado vs Meta — {ind.plano_gestao}</h2></div>
          <div className="card-body"><canvas ref={chartRef} height="120" /></div>
        </div>

        {/* Monthly table */}
        <div className="card">
          <div className="card-header"><h2>Valores Mensais</h2></div>
          <div className="card-body" style={{padding:0}}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th style={{textAlign:'right'}}>Realizado</th>
                    <th style={{textAlign:'right'}}>Meta</th>
                    <th style={{textAlign:'right'}}>% Ating.</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map(m => {
                    const rea = vals[`rea_${m}`]
                    const met = vals[`met_${m}`]
                    const pct = rea != null && met != null && met !== 0
                      ? (ind.melhor?.toLowerCase() === 'menor' ? (met / rea) * 100 : (rea / met) * 100)
                      : null
                    return (
                      <tr key={m}>
                        <td style={{fontWeight:600,textTransform:'uppercase',fontSize:'.75rem'}}>{m}</td>
                        <td style={{textAlign:'right',fontFamily:'DM Mono,monospace'}}>{fmtNum(rea)}</td>
                        <td style={{textAlign:'right',fontFamily:'DM Mono,monospace'}}>{fmtNum(met)}</td>
                        <td style={{
                          textAlign:'right', fontFamily:'DM Mono,monospace',
                          color: pct == null ? 'var(--muted)' : pct >= 100 ? 'var(--green)' : pct >= 90 ? 'var(--amber)' : 'var(--red)',
                          fontWeight: pct != null ? 600 : 400
                        }}>
                          {pct != null ? `${pct.toFixed(1)}%` : '–'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="card">
          <div className="card-header"><h2>Informações</h2></div>
          <div className="card-body" style={{padding:0}}>
            <table>
              <tbody>
                {info.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{color:'var(--muted)',fontSize:'.75rem',fontWeight:600,width:'45%'}}>{k}</td>
                    <td style={{fontWeight:500}}>{v ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Filhos */}
      {ind.filhos?.length > 0 && (
        <div className="card">
          <div className="card-header"><h2>Indicadores Filhos ({ind.filhos.length})</h2></div>
          <div className="card-body" style={{padding:0}}>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ind.filhos.map(f => (
                  <tr key={f.id}>
                    <td>{f.nome}</td>
                    <td>{f.sigla_unidade}</td>
                    <td>{f.status}</td>
                    <td><Link to={`/scorecard/${f.id}`} className="btn btn-outline btn-sm">Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
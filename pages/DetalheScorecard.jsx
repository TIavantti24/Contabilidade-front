import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

const MONTH_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtBRL(v) {
  if (v == null) return '–'
  return Number(Math.abs(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
}

function fmtPct(v) {
  if (v == null) return '–'
  return `${Number(v).toFixed(1)}%`
}

function classify(realizado, orcado) {
  if (realizado == null || orcado == null) return null
  const ratio = Math.abs(realizado) / Math.abs(orcado) * 100
  if (ratio <= 100) return 'green'
  if (ratio <= 105) return 'yellow'
  return 'red'
}

function StatusDot({ status }) {
  const colors = { green: '#16a34a', yellow: '#ca8a04', red: '#dc2626', gray: '#d1d5db' }
  const c = colors[status] || colors.gray
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, verticalAlign: 'middle' }} />
}

export default function DetalheScorecard() {
  const { atividade, descricao } = useParams()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const chartRef  = useRef()
  const chartInst = useRef()

  useEffect(() => {
    // Busca todos os dados do scorecard e filtra pelo indicador
    api.get(`/scorecard/?atividade=${encodeURIComponent(atividade)}`)
      .then(r => {
        const grp = r.data.groups.find(g => g.atividade === atividade)
        const ind = grp?.indicadores.find(i => i.nome === decodeURIComponent(descricao))
        if (ind) setDados({ ind, atividade: grp.atividade })
        setLoading(false)
      })
  }, [atividade, descricao])

  useEffect(() => {
    if (!dados || !chartRef.current) return
    if (chartInst.current) chartInst.current.destroy()

    const ind = dados.ind
    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: MONTH_SHORT,
        datasets: [
          {
            label: 'Realizado',
            data: ind.monthly.map(m => m.realizado != null ? Math.abs(m.realizado) : null),
            backgroundColor: ind.monthly.map(m => {
              const s = classify(m.realizado, m.orcado)
              return s === 'green' ? 'rgba(22,163,74,.85)' : s === 'yellow' ? 'rgba(202,138,4,.85)' : 'rgba(220,38,38,.85)'
            }),
            borderRadius: 5,
            order: 2,
          },
          {
            label: 'Orçado',
            data: ind.monthly.map(m => m.orcado != null ? Math.abs(m.orcado) : null),
            type: 'line',
            borderColor: '#1a1d23',
            borderWidth: 2,
            borderDash: [5, 3],
            pointRadius: 4,
            fill: false,
            tension: 0.1,
            order: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const mi = items[0]?.dataIndex
                const m  = ind.monthly[mi]
                if (!m) return []
                const pct = m.orcado ? Math.abs(m.realizado) / Math.abs(m.orcado) * 100 : null
                return pct != null ? [`% Execução: ${pct.toFixed(1)}%`] : []
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => `R$ ${(v/1000).toFixed(0)}k` }
          }
        }
      }
    })
  }, [dados])

  if (loading) return <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>
  if (!dados)  return <div className="alert alert-danger">Indicador não encontrado.</div>

  const { ind } = dados

  // YTD
  const ytdRea = ind.monthly.reduce((s, m) => s + (m.realizado || 0), 0)
  const ytdOrc = ind.monthly.reduce((s, m) => s + (m.orcado    || 0), 0)
  const ytdPct = ytdOrc ? Math.abs(ytdRea) / Math.abs(ytdOrc) * 100 : null
  const ytdBom = ytdPct != null && ytdPct <= 100

  return (
    <>
      {/* Voltar */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/scorecard" className="btn btn-outline btn-sm">← Voltar ao Scorecard</Link>
      </div>

      {/* Header */}
      <div className="detalhe-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{ind.nome}</h2>
            <div className="detalhe-meta">
              <span className="meta-badge">{dados.atividade}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs YTD */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ '--accent': '#0369a1' }}>
          <div className="label">YTD Realizado</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{fmtBRL(ytdRea)}</div>
          <div className="sub">Acumulado anual</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#475569' }}>
          <div className="label">YTD Orçado</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{fmtBRL(ytdOrc)}</div>
          <div className="sub">Acumulado anual</div>
        </div>
        <div className="stat-card" style={{ '--accent': ytdBom ? '#16a34a' : '#dc2626' }}>
          <div className="label">% Execução YTD</div>
          <div className="value" style={{ fontSize: '1.3rem', color: ytdBom ? 'var(--green)' : 'var(--red)' }}>
            {fmtPct(ytdPct)}
          </div>
          <div className="sub">{ytdBom ? 'Dentro do orçado ✓' : 'Acima do orçado ✗'}</div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2>Realizado vs Orçado — {dados.atividade}</h2>
        </div>
        <div className="card-body">
          <div style={{ position: 'relative', height: 280 }}>
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>

      {/* Tabela mensal */}
      <div className="card">
        <div className="card-header"><h2>Valores Mensais</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th style={{ textAlign: 'right' }}>Realizado</th>
                <th style={{ textAlign: 'right' }}>Orçado</th>
                <th style={{ textAlign: 'right' }}>% Execução</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ind.monthly.map((m, i) => {
                const pct = m.orcado ? Math.abs(m.realizado) / Math.abs(m.orcado) * 100 : null
                const st  = classify(m.realizado, m.orcado)
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: '.85rem' }}>{MONTH_FULL[i]}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono,monospace' }}>{fmtBRL(m.realizado)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono,monospace', color: 'var(--muted)' }}>{fmtBRL(m.orcado)}</td>
                    <td style={{
                      textAlign: 'right', fontFamily: 'DM Mono,monospace', fontWeight: 600,
                      color: pct == null ? 'var(--muted)' : pct <= 100 ? 'var(--green)' : pct <= 105 ? 'var(--amber)' : 'var(--red)'
                    }}>
                      {fmtPct(pct)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {st ? <StatusDot status={st} /> : <span style={{ color: 'var(--muted)' }}>–</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
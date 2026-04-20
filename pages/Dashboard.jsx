import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

const RED = '#c0392b', BLUE = '#2563eb', GREEN = '#16a34a', AMBER = '#d97706', GRAY = '#9ca3af'

function useChart(ref, config, deps) {
  useEffect(() => {
    if (!ref.current) return
    const c = new Chart(ref.current, config)
    return () => c.destroy()
  }, deps)
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const rAreas    = useRef(), rUnidades = useRef()
  const rAnos     = useRef(), rStatus   = useRef()

  useEffect(() => {
    api.get('/dashboard/stats').then(r => { setData(r.data); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!data) return
    const charts = []

    const mkBar = (ref, labels, values, colors) => new Chart(ref.current, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors || [RED,BLUE,GREEN,AMBER,GRAY], borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    })

    const mkDoughnut = (ref, labels, values, colors) => new Chart(ref.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors || [RED,BLUE,GREEN,AMBER,GRAY] }] },
      options: { plugins: { legend: { position: 'right' } }, cutout: '65%' }
    })

    charts.push(mkBar(rAreas, data.areas.map(a => a.nome), data.areas.map(a => a.total)))
    charts.push(mkDoughnut(rUnidades, data.unidades.map(u => u.nome), data.unidades.map(u => u.total)))
    charts.push(mkBar(rAnos, data.anos.map(a => a.ano), data.anos.map(a => a.total), BLUE))
    charts.push(new Chart(rStatus.current, {
      type: 'doughnut',
      data: { labels: ['Ativos','Inativos'], datasets: [{ data: [data.ativos, data.inativos], backgroundColor: [GREEN,GRAY] }] },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
    }))

    return () => charts.forEach(c => c.destroy())
  }, [data])

  if (loading) return <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>

  const fmt = n => n?.toLocaleString('pt-BR') ?? '–'

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card" style={{'--accent': RED}}>
          <div className="label">Total de Indicadores</div>
          <div className="value">{fmt(data.total)}</div>
          <div className="sub">Todos os anos e unidades</div>
        </div>
        <div className="stat-card" style={{'--accent': GREEN}}>
          <div className="label">Ativos</div>
          <div className="value">{fmt(data.ativos)}</div>
          <div className="sub">Em acompanhamento</div>
        </div>
        <div className="stat-card" style={{'--accent': GRAY}}>
          <div className="label">Inativos</div>
          <div className="value">{fmt(data.inativos)}</div>
          <div className="sub">Desativados</div>
        </div>
        <div className="stat-card" style={{'--accent': BLUE}}>
          <div className="label">Unidades Gerenciais</div>
          <div className="value">{data.unidades.length}</div>
          <div className="sub">Áreas de negócio</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><h2>Indicadores por Área de Resultado</h2></div>
          <div className="card-body"><canvas ref={rAreas} height="220" /></div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Indicadores por Unidade Gerencial</h2></div>
          <div className="card-body"><canvas ref={rUnidades} height="220" /></div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Evolução por Plano de Gestão</h2></div>
          <div className="card-body"><canvas ref={rAnos} height="220" /></div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Distribuição por Status</h2></div>
          <div className="card-body" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:220}}>
            <canvas ref={rStatus} height="200" width="200" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Unidades Gerenciais</h2>
          <Link to="/scorecard" className="btn btn-outline btn-sm">Ver todos →</Link>
        </div>
        <div className="card-body">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Unidade Gerencial</th>
                  <th>Total de Indicadores</th>
                </tr>
              </thead>
              <tbody>
                {data.unidades.map(u => (
                  <tr key={u.nome}>
                    <td><Link to={`/scorecard?unidade=${u.nome}`} style={{color:'var(--red)',textDecoration:'none',fontWeight:500}}>{u.nome}</Link></td>
                    <td>{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data.last_import && (
        <p style={{marginTop:14,fontSize:'.75rem',color:'var(--muted)',textAlign:'right'}}>
          Última importação: <strong>{data.last_import.filename}</strong> — {new Date(data.last_import.imported_at).toLocaleString('pt-BR')} por {data.last_import.imported_by}
        </p>
      )}
    </>
  )
}
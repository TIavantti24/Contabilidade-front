import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

function StatusIcon({ status }) {
  if (status === 'green')  return <span className="sc-dot green" />
  if (status === 'yellow') return <span className="sc-dot yellow" />
  if (status === 'red')    return <span className="sc-tri" />
  if (status === 'blue')   return <span className="sc-diamond" />
  if (status === 'orange') return <span className="sc-tri-up" />
  return <span className="sc-dot gray" />
}

function fmtNum(v) {
  if (v == null) return '–'
  return Number(Math.abs(v)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
function fmtPct(v) {
  if (v == null) return '–'
  return `${Number(v).toFixed(1)}%`
}
function fmtBRL(v) {
  if (v == null) return '–'
  return Number(Math.abs(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
}

function classify(realizado, orcado, seta = 'maior') {
  if (realizado == null || orcado == null) return null
  const r = Math.abs(parseFloat(realizado))
  const o = Math.abs(parseFloat(orcado))
  if (!o) return null
  const ratio = seta === 'menor' ? (o / r * 100) : (r / o * 100)
  if (ratio <= 89)  return 'red'
  if (ratio <= 99)  return 'yellow'
  if (ratio <= 100) return 'green'
  if (ratio <= 120) return 'blue'
  return 'orange'
}

function pctVal(rea, orc) {
  if (rea == null || !orc) return null
  return Math.abs(rea) / Math.abs(orc) * 100
}

const STICKY0 = { position: 'sticky', left: 0, zIndex: 2, background: '#fff' }
const STICKY1 = { position: 'sticky', left: '40px', zIndex: 2, background: '#fff', boxShadow: '3px 0 6px -2px rgba(0,0,0,.10)' }
const MONTH_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function DetalheModal({ ind, pai, onClose }) {
  const chartRef  = useRef()
  const chartInst = useRef()
  const [aba, setAba] = useState('grafico')
  const seta = ind.seta || 'maior'

  useEffect(() => {
    if (!ind || !chartRef.current || aba !== 'grafico') return
    if (chartInst.current) chartInst.current.destroy()
    const stColor = s => s==='green'?'rgba(22,163,74,.85)':s==='yellow'?'rgba(202,138,4,.85)':s==='red'?'rgba(220,38,38,.85)':s==='blue'?'rgba(37,99,235,.85)':s==='orange'?'rgba(234,88,12,.85)':'rgba(203,213,225,.6)'
    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: MONTH_SHORT,
        datasets: [
          { label:'Realizado', data: ind.monthly.map(m=>m.realizado!=null?Math.abs(m.realizado):null), backgroundColor: ind.monthly.map(m=>stColor(classify(m.realizado,m.orcado,seta))), borderRadius:5, order:2 },
          { label:'Orçado', data: ind.monthly.map(m=>m.orcado!=null?Math.abs(m.orcado):null), type:'line', borderColor:'#1a1d23', borderWidth:2, borderDash:[5,3], pointRadius:4, fill:false, tension:0.1, order:1 }
        ]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top'}}, scales:{y:{beginAtZero:true, ticks:{callback:v=>`R$ ${(v/1000).toFixed(0)}k`}}} }
    })
    return () => chartInst.current?.destroy()
  }, [ind, aba, seta])

  if (!ind) return null
  const ytdRea = ind.ytd_rea ?? ind.monthly.reduce((s,m)=>s+(m.realizado||0),0)
  const ytdOrc = ind.ytd_orc ?? ind.monthly.reduce((s,m)=>s+(m.orcado||0),0)
  const ytdPct = pctVal(ytdRea, ytdOrc)
  const ytdSt  = classify(ytdRea, ytdOrc, seta)
  const ytdBom = ytdSt==='green'||ytdSt==='blue'||ytdSt==='orange'
  const comDados = ind.monthly.filter(m=>m.realizado!=null&&m.orcado!=null)
  const pcts = comDados.map(m=>pctVal(m.realizado,m.orcado)||0)
  const mediaPct = pcts.length ? pcts.reduce((a,b)=>a+b,0)/pcts.length : null

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:820,maxHeight:'90vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.25)'}}>
        <div style={{padding:'20px 24px 0',borderBottom:'1px solid #e5e7eb'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div>
              {pai && <div style={{fontSize:'.72rem',color:'var(--muted)',fontWeight:600,marginBottom:4}}>{pai}</div>}
              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#1a1d23'}}>{ind.nome}</h2>
              <div style={{fontSize:'.7rem',color:'#94a3b8',marginTop:2}}>{seta==='maior'?'↑ Quanto maior melhor':'↓ Quanto menor melhor'}</div>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'#94a3b8'}}>×</button>
          </div>
          <div style={{display:'flex',gap:0}}>
            {['detalhes','grafico'].map(t=>(
              <button key={t} onClick={()=>setAba(t)} style={{padding:'8px 20px',border:'none',background:'none',cursor:'pointer',fontSize:'.85rem',fontWeight:aba===t?700:400,color:aba===t?'#1a1d23':'#94a3b8',borderBottom:aba===t?'2px solid #1a1d23':'2px solid transparent',marginBottom:-1}}>
                {t==='detalhes'?'Detalhes':'Gráfico'}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:24}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
            {[
              {label:'YTD Realizado',value:fmtBRL(ytdRea),accent:'#0369a1',sub:'Acumulado anual'},
              {label:'YTD Orçado',value:fmtBRL(ytdOrc),accent:'#475569',sub:'Acumulado anual'},
              {label:'% Execução',value:fmtPct(ytdPct),accent:ytdBom?'#16a34a':'#dc2626',color:ytdBom?'var(--green)':'var(--red)',sub:ytdBom?'✓':'✗'},
            ].map(k=>(
              <div key={k.label} className="stat-card" style={{'--accent':k.accent}}>
                <div className="label">{k.label}</div>
                <div className="value" style={{fontSize:'1.1rem',color:k.color}}>{k.value}</div>
                <div className="sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {aba==='detalhes' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div>
                <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Informações</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                  <tbody>
                    {[['Indicador',ind.nome],['Grupo pai',pai||'–'],['Direção',seta==='maior'?'↑ Maior melhor':'↓ Menor melhor'],['Meses com dados',`${comDados.length} de 12`],['Média %',mediaPct!=null?fmtPct(mediaPct):'–']].map(([k,v])=>(
                      <tr key={k} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'8px 4px',color:'var(--muted)',fontWeight:600,width:'50%'}}>{k}</td>
                        <td style={{padding:'8px 4px',fontWeight:500}}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Valores de Referência</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                  <tbody>
                    {comDados.length>0?[
                      ['Melhor mês',MONTH_FULL[ind.monthly.findIndex(m=>pctVal(m.realizado,m.orcado)===Math.min(...pcts))]],
                      ['Pior mês',MONTH_FULL[ind.monthly.findIndex(m=>pctVal(m.realizado,m.orcado)===Math.max(...pcts))]],
                      ['Min Realizado',fmtBRL(Math.min(...comDados.map(m=>m.realizado)))],
                      ['Max Realizado',fmtBRL(Math.max(...comDados.map(m=>m.realizado)))],
                    ].map(([k,v])=>(
                      <tr key={k} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'8px 4px',color:'var(--muted)',fontWeight:600}}>{k}</td>
                        <td style={{padding:'8px 4px',fontFamily:'DM Mono,monospace',fontSize:'.82rem'}}>{v}</td>
                      </tr>
                    )):<tr><td colSpan={2} style={{color:'var(--muted)',padding:8}}>Sem dados</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aba==='grafico' && (
            <>
              <div style={{position:'relative',height:220,marginBottom:20}}><canvas ref={chartRef} /></div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.82rem'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #e5e7eb'}}>
                    {['Mês','Realizado','Orçado','%',''].map((h,i)=>(
                      <th key={i} style={{padding:'6px 8px',color:'var(--muted)',fontWeight:600,textAlign:i===0?'left':'right'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ind.monthly.map((m,i)=>{
                    const pct=pctVal(m.realizado,m.orcado)
                    const st=classify(m.realizado,m.orcado,seta)
                    const cor=st==='green'?'#16a34a':st==='yellow'?'#ca8a04':st==='red'?'#dc2626':st==='blue'?'#2563eb':st==='orange'?'#ea580c':'var(--muted)'
                    return (
                      <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'5px 8px',fontWeight:600}}>{MONTH_FULL[i]}</td>
                        <td style={{padding:'5px 8px',textAlign:'right',fontFamily:'DM Mono,monospace'}}>{fmtBRL(m.realizado)}</td>
                        <td style={{padding:'5px 8px',textAlign:'right',fontFamily:'DM Mono,monospace',color:'#94a3b8'}}>{fmtBRL(m.orcado)}</td>
                        <td style={{padding:'5px 8px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:600,color:cor}}>{fmtPct(pct)}</td>
                        <td style={{padding:'5px 8px',textAlign:'right'}}>{st?<StatusIcon status={st}/>:'–'}</td>
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
  const [modal, setModal]       = useState(null)

  const q        = params.get('q')     || ''
  const grupoFil = params.get('grupo') || ''
  const ano_f    = params.get('ano')   || ''

  const buildQS = useCallback(()=>{
    const p={}
    if(q) p.q=q
    if(grupoFil) p.grupo=grupoFil
    if(ano_f) p.ano=ano_f
    return new URLSearchParams(p).toString()
  },[q,grupoFil,ano_f])

  useEffect(()=>{
    setLoading(true)
    api.get(`/scorecard/?${buildQS()}`).then(r=>{
      setData(r.data)
      setLoading(false)
      setExpanded({}) // começa minimizado
    })
  },[q,grupoFil,ano_f])

  const setFilter    = (k,v)=>{const n=new URLSearchParams(params);v?n.set(k,v):n.delete(k);setParams(n)}
  const clearFilters = ()=>setParams({})
  const toggleMes    = i=>setSelMes(p=>p===i?null:i)
  const toggleKey    = k=>setExpanded(p=>({...p,[k]:!p[k]}))

  const hasFilter = q||grupoFil||ano_f
  const months    = data?.months  || []
  const filters   = data?.filters || {}
  const colLabel  = selMes!==null ? months[selMes] : 'YTD'

  const grupos = useMemo(()=>{
    if(!data) return []
    if(!q.trim()) return data.groups
    const qL=q.toLowerCase()
    return data.groups.map(grp=>({
      ...grp,
      indicadores: grp.indicadores.map(pai=>({
        ...pai,
        indicadores: pai.indicadores.filter(f=>f.nome.toLowerCase().includes(qL))
      })).filter(pai=>pai.indicadores.length>0)
    })).filter(grp=>grp.indicadores.length>0)
  },[data,q])

  return (
    <>
      <div className="sc-toolbar">
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',flex:1}}>
          <div className="form-group">
            <label>Buscar</label>
            <input value={q} placeholder="Nome do indicador..." onChange={e=>setFilter('q',e.target.value)} style={{minWidth:180}} />
          </div>
          <div className="form-group">
            <label>Grupo</label>
            <select value={grupoFil} onChange={e=>setFilter('grupo',e.target.value)}>
              <option value="">Todos</option>
              {filters.grupos?.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Ano</label>
            <select value={ano_f} onChange={e=>setFilter('ano',e.target.value)}>
              <option value="">Todos</option>
              {filters.anos?.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {hasFilter && <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Limpar</button>}
        </div>
      </div>

      <center><div style={{display:'flex',justifyContent:'center',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:14,alignItems:'center',fontSize:'.72rem',color:'var(--muted)',flexWrap:'wrap'}}>
        <span style={{fontWeight:700,color:'#1a1d23'}}>▲ Indicador Positivo</span>
        <span><span className="sc-tri-up" style={{marginRight:4}}/>≥121%</span>
        <span><span className="sc-diamond" style={{marginRight:4}}/>101–120%</span>
        <span><span className="sc-dot green" style={{marginRight:4}}/>100%</span>
        <span><span className="sc-dot yellow" style={{marginRight:4}}/>90–99%</span>
        <span><span className="sc-tri" style={{marginRight:4}}/>≤89%</span>

        <span style={{color:'#d1d5db'}}>|</span>

        <span style={{fontWeight:700,color:'#1a1d23'}}>▼ Indicador Negativo</span>
        <span><span className="sc-tri" style={{marginRight:4}}/>≥121%</span>
        <span><span className="sc-dot yellow" style={{marginRight:4}}/>101–120%</span>
        <span><span className="sc-dot green" style={{marginRight:4}}/>100%</span>
        <span><span className="sc-diamond" style={{marginRight:4}}/>90–99%</span>
        <span><span className="sc-tri-up" style={{marginRight:4}}/>≤89%</span>

        <span><span className="sc-dot gray" style={{marginRight:4}}/>Sem dados</span>
        </div>
        {selMes!==null && (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{background:'#2563eb',color:'#fff',padding:'3px 12px',borderRadius:20,fontSize:'.78rem',fontWeight:600}}>📅 {months[selMes]}</span>
            <button onClick={()=>setSelMes(null)} style={{background:'none',border:'1px solid var(--border)',borderRadius:20,padding:'3px 10px',fontSize:'.72rem',cursor:'pointer',color:'var(--muted)'}}>✕ Ver YTD</button>
          </div>
        )}
      </div></center>

      {loading && <div className="loading-center"><span className="spinner spinner-dark"/> Carregando...</div>}

      {!loading && (
        <div className="card">
          <div className="sc-wrap">
            <table className="sc-table">
              <thead>
                <tr>
                  <th className="left sticky" style={{left:0,width:40,zIndex:3}}></th>
                  <th className="left sticky sticky-last" style={{left:40,minWidth:260,zIndex:3}}>Indicador</th>
                  <th className="sc-num" style={{whiteSpace:'nowrap'}}>
                    {colLabel} Real
                    {selMes!==null && <div style={{fontSize:'.6rem',fontWeight:400,color:'#2563eb'}}>clique mês p/ mudar</div>}
                  </th>
                  <th className="sc-num" style={{whiteSpace:'nowrap'}}>{colLabel} Orç.</th>
                  <th className="sc-num">%</th>
                  {months.map((m,i)=>(
                    <th key={m} onClick={()=>toggleMes(i)}
                      className={`sc-dot-cell${i===0?' sc-month-sep':''}`}
                      style={{cursor:'pointer',userSelect:'none',background:selMes===i?'#2563eb':undefined,color:selMes===i?'#fff':undefined,borderRadius:selMes===i?4:undefined,transition:'background .15s'}}>
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map(grp=>{
                  const grpKey=`grp:${grp.grupo}`
                  const grpOpen=expanded[grpKey]
                  return [
                    /* ══ GRUPO ══ */
                    <tr key={grpKey} className="sc-section-row" style={{cursor:'pointer'}} onClick={()=>toggleKey(grpKey)}>
                      <td style={{textAlign:'center',fontSize:'.85rem',fontWeight:700}}>{grpOpen?'−':'+'}</td>
                      <td colSpan={4+months.length+1}>
                        {grp.grupo} ({grp.indicadores.length})
                      </td>
                    </tr>,

                    ...(!grpOpen?[]:grp.indicadores.map(pai=>{
                      const paiKey=`pai:${grp.grupo}|${pai.atividade}`
                      const paiOpen=expanded[paiKey]
                      const seta=pai.seta||'maior'
                      const pRea=selMes!==null?pai.indicadores.reduce((s,f)=>s+(f.monthly[selMes]?.realizado||0),0):pai.ytd_rea
                      const pOrc=selMes!==null?pai.indicadores.reduce((s,f)=>s+(f.monthly[selMes]?.orcado||0),0):pai.ytd_orc
                      const pPct=pctVal(pRea,pOrc)
                      const pSt=classify(pRea,pOrc,seta)
                      const pBom=pSt==='green'||pSt==='blue'||pSt==='orange'

                      return [
                        /* ── PAI ── */
                        <tr key={paiKey} className="sc-group-row" style={{cursor:'pointer'}} onClick={()=>toggleKey(paiKey)}>
                          <td style={{textAlign:'center',fontSize:'.85rem'}}>{paiOpen?'−':'+'}</td>
                          <td>
                            <span onClick={e=>{e.stopPropagation();setModal({ind:{...pai,nome:pai.atividade},pai:grp.grupo})}}
                              style={{cursor:'pointer',textDecoration:'underline dotted'}} title="Ver detalhe">
                              {pai.atividade}
                            </span>
                            <span style={{marginLeft:8,fontSize:'.8rem',fontWeight:900,color:'#1a1d23'}}>
                              {seta==='maior'?'▲':'▼'}
                            </span>
                          </td>
                          <td className="sc-num">{fmtNum(pRea)}</td>
                          <td className="sc-num" style={{opacity:.7}}>{fmtNum(pOrc)}</td>
                          <td className={`sc-num ${pBom?'sc-delta-pos':'sc-delta-neg'}`}>{fmtPct(pPct)}</td>
                          {months.map((_,i)=>{
                            const mR=pai.indicadores.reduce((s,f)=>s+(f.monthly[i]?.realizado||0),0)
                            const mO=pai.indicadores.reduce((s,f)=>s+(f.monthly[i]?.orcado||0),0)
                            return (
                              <td key={i} onClick={e=>{e.stopPropagation();toggleMes(i)}}
                                className={`sc-dot-cell${i===0?' sc-month-sep':''}`}
                                style={{cursor:'pointer',background:selMes===i?'rgba(37,99,235,.15)':undefined}}>
                                <StatusIcon status={classify(mR,mO,seta)}/>
                              </td>
                            )
                          })}
                        </tr>,

                        /* ── FILHOS ── */
                        ...(!paiOpen?[]:pai.indicadores.map((filho,idx)=>{
                          const fRea=selMes!==null?(filho.monthly[selMes]?.realizado??null):filho.ytd_rea
                          const fOrc=selMes!==null?(filho.monthly[selMes]?.orcado??null):filho.ytd_orc
                          const fPct=pctVal(fRea,fOrc)
                          const fSt=classify(fRea,fOrc,seta)
                          const fBom=fSt==='green'||fSt==='blue'||fSt==='orange'
                          return (
                            <tr key={filho.id}
                              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                              onMouseLeave={e=>e.currentTarget.style.background=''}>
                              <td className="sticky" style={{...STICKY0,width:40,color:'var(--muted)',fontSize:'.7rem'}}>{idx+1}</td>
                              <td className="sc-name sticky sticky-last indent-1" style={STICKY1}>
                                <span onClick={()=>setModal({ind:{...filho,nome:filho.nome,seta},pai:pai.atividade})}
                                  style={{cursor:'pointer',color:'var(--primary)',textDecoration:'underline dotted'}}>
                                  {filho.nome}
                                </span>
                              </td>
                              <td className="sc-num" title={fOrc!=null?`Orçado: ${fmtNum(fOrc)}`:''} style={{cursor:'help'}}>{fmtNum(fRea)}</td>
                              <td className="sc-num" style={{color:'var(--muted)'}}>{fmtNum(fOrc)}</td>
                              <td className={`sc-num ${fPct==null?'':fBom?'sc-delta-pos':'sc-delta-neg'}`}>{fmtPct(fPct)}</td>
                              {filho.monthly.map((m,mi)=>(
                                <td key={mi} onClick={()=>toggleMes(mi)}
                                  className={`sc-dot-cell${mi===0?' sc-month-sep':''}`}
                                  style={{cursor:'pointer',background:selMes===mi?'rgba(37,99,235,.07)':undefined,transition:'background .1s'}}>
                                  <StatusIcon status={m.status||classify(m.realizado,m.orcado,seta)}/>
                                </td>
                              ))}
                            </tr>
                          )
                        }))
                      ]
                    }))
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {modal && <DetalheModal ind={modal.ind} pai={modal.pai} onClose={()=>setModal(null)}/>}
    </>
  )
}
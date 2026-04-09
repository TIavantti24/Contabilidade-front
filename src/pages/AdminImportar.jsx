import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import api from '../services/api'

function DropArea({ label, fieldName, onUpload, loading }) {
  const [file, setFile] = useState(null)
  const [msg,  setMsg]  = useState(null)

  const onDrop = useCallback(files => { if (files[0]) setFile(files[0]) }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.ms-excel': ['.xls', '.xlsx'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }, maxFiles: 1 })

  const submit = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append(fieldName, file)
    setMsg(null)
    try {
      const { data } = await onUpload(fd)
      setMsg({ type:'success', text: data.message })
      setFile(null)
    } catch(e) {
      setMsg({ type:'danger', text: e.response?.data?.error || 'Erro no upload.' })
    }
  }

  return (
    <div>
      <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
        <input {...getInputProps()} />
        <div style={{fontSize:'2rem'}}>📊</div>
        <p><strong>{label}</strong></p>
        {file ? (
          <p style={{color:'var(--text)',fontWeight:600,marginTop:8}}>📎 {file.name}</p>
        ) : (
          <p>Arraste o arquivo .xlsx/.xls ou clique para selecionar</p>
        )}
      </div>
      {msg && <div className={`alert alert-${msg.type}`} style={{marginTop:10}}>{msg.text}</div>}
      {file && (
        <div style={{marginTop:10,display:'flex',gap:8}}>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" /> : '↑ Importar'}
          </button>
          <button className="btn btn-outline" onClick={() => { setFile(null); setMsg(null) }}>Cancelar</button>
        </div>
      )}
    </div>
  )
}

export default function AdminImportar() {
  const [logs, setLogs]       = useState([])
  const [totalInd, setTotalInd] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadLogs = () => api.get('/admin/import/logs').then(r => { setLogs(r.data.logs); setTotalInd(r.data.total_ind) })
  useEffect(() => { loadLogs() }, [])

  const uploadInd   = fd => api.post('/admin/import/indicadores', fd).finally(loadLogs)
  const uploadCusto = fd => api.post('/admin/import/custo-fixo', fd).finally(loadLogs)

  return (
    <>
      <div className="stats-grid" style={{marginBottom:20}}>
        <div className="stat-card" style={{'--accent':'var(--red)'}}>
          <div className="label">Indicadores Cadastrados</div>
          <div className="value">{totalInd}</div>
          <div className="sub">No banco de dados</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        <div className="card">
          <div className="card-header"><h2>Importar Indicadores</h2></div>
          <div className="card-body">
            <p style={{fontSize:'.8rem',color:'var(--muted)',marginBottom:16}}>
              Planilha com aba <strong>Indicadores</strong>. Colunas obrigatórias: NOME DO INDICADOR, SIGLA UNIDADE, ÁREA DE RESULTADO.
            </p>
            <DropArea label="Planilha de Indicadores" fieldName="planilha" onUpload={uploadInd} loading={loading} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Importar Custo Fixo</h2></div>
          <div className="card-body">
            <p style={{fontSize:'.8rem',color:'var(--muted)',marginBottom:16}}>
              Planilha com colunas: <strong>Atividade, Data, REALIZADO, ORÇADO</strong>.
            </p>
            <DropArea label="Planilha de Custo Fixo" fieldName="planilha_custo" onUpload={uploadCusto} loading={loading} />
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card">
          <div className="card-header"><h2>Histórico de Importações</h2></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Arquivo</th>
                  <th>Total</th>
                  <th>Importado por</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>
                      <span style={{
                        background: l.tipo === 'indicadores' ? '#dbeafe' : '#dcfce7',
                        color: l.tipo === 'indicadores' ? '#1e40af' : '#166534',
                        padding:'2px 8px', borderRadius:20, fontSize:'.72rem', fontWeight:600
                      }}>{l.tipo}</span>
                    </td>
                    <td style={{fontFamily:'DM Mono,monospace',fontSize:'.78rem'}}>{l.filename}</td>
                    <td style={{fontFamily:'DM Mono,monospace'}}>{l.total}</td>
                    <td>{l.imported_by}</td>
                    <td style={{fontSize:'.75rem',color:'var(--muted)'}}>
                      {l.imported_at ? new Date(l.imported_at).toLocaleString('pt-BR') : '–'}
                    </td>
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
import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import api from '../services/api'

function DropArea({ label, fieldName, onUpload, loading }) {
  const [file, setFile] = useState(null)
  const [msg,  setMsg]  = useState(null)

  const onDrop = useCallback(files => { if (files[0]) setFile(files[0]) }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  })

  const submit = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append(fieldName, file)
    setMsg(null)
    try {
      const { data } = await onUpload(fd)
      setMsg({ type: 'success', text: data.message })
      setFile(null)
    } catch(e) {
      setMsg({ type: 'danger', text: e.response?.data?.error || 'Erro no upload.' })
    }
  }

  return (
    <div>
      <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
        <input {...getInputProps()} />
        <div style={{ fontSize: '2rem' }}>📊</div>
        <p><strong>{label}</strong></p>
        {file ? (
          <p style={{ color: 'var(--text)', fontWeight: 600, marginTop: 8 }}>📎 {file.name}</p>
        ) : (
          <p>Arraste o arquivo .xlsx/.xls ou clique para selecionar</p>
        )}
      </div>
      {msg && <div className={`alert alert-${msg.type}`} style={{ marginTop: 10 }}>{msg.text}</div>}
      {file && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
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
  const [logs, setLogs]         = useState([])
  const [totalInd, setTotalInd] = useState(0)
  const [loading, setLoading]   = useState(false)

  const loadLogs = () =>
    api.get('/admin/import/logs').then(r => {
      setLogs(r.data.logs)
      setTotalInd(r.data.total_ind)
    })

  useEffect(() => { loadLogs() }, [])

  const uploadInd     = fd => api.post('/admin/import/indicadores', fd).finally(loadLogs)
  const uploadCusto   = fd => api.post('/admin/import/custo-fixo',  fd).finally(loadLogs)
  const uploadReceita   = fd => api.post('/admin/import/receita',    fd).finally(loadLogs)
  const uploadScorecard = fd => api.post('/admin/import/scorecard', fd).finally(loadLogs)

  // Badge de tipo colorido
  const tipoBadge = (tipo) => {
    const map = {
      indicadores: { bg: '#dbeafe', color: '#1e40af' },
      custo:       { bg: '#dcfce7', color: '#166534' },
      receita:     { bg: '#fef9c3', color: '#854d0e' },
      scorecard:   { bg: '#dbeafe', color: '#1e3a8a' },
    }
    const s = map[tipo] || { bg: '#f3f4f6', color: '#6b7280' }
    return (
      <span style={{
        background: s.bg, color: s.color,
        padding: '2px 8px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600
      }}>
        {tipo}
      </span>
    )
  }

  return (
    <>
      {/* KPI */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ '--accent': 'var(--red)' }}>
          <div className="label">Indicadores Cadastrados</div>
          <div className="value">{totalInd}</div>
          <div className="sub">No banco de dados</div>
        </div>
      </div>

      {/* Grid de importação — 3 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Indicadores */}
        <div className="card">
          <div className="card-header"><h2>Importar Indicadores</h2></div>
          <div className="card-body">
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 16 }}>
              Planilha com aba <strong>Indicadores</strong>. Colunas obrigatórias: NOME DO INDICADOR, SIGLA UNIDADE, ÁREA DE RESULTADO.
            </p>
            <DropArea label="Planilha de Indicadores" fieldName="planilha" onUpload={uploadInd} loading={loading} />
          </div>
        </div>

        {/* Custo Fixo */}
        <div className="card">
          <div className="card-header"><h2>Importar Custo Fixo</h2></div>
          <div className="card-body">
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 16 }}>
              Planilha com colunas: <strong>Atividade, Descrição, Data, REALIZADO, ORÇADO</strong>.
            </p>
            <DropArea label="Planilha de Custo Fixo" fieldName="planilha_custo" onUpload={uploadCusto} loading={loading} />
          </div>
        </div>

        {/* Receita */}
        <div className="card">
          <div className="card-header"><h2>Importar Receita</h2></div>
          <div className="card-body">
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 16 }}>
              Planilha com colunas: <strong>Atividade, Descrição, Data, REALIZADO, ORÇADO</strong>. Receita maior que orçado = positivo.
            </p>
            <DropArea label="Planilha de Receita" fieldName="planilha_receita" onUpload={uploadReceita} loading={loading} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Importar Scorecard</h2></div>
          <div className="card-body">
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 16 }}>
              Mesma planilha do Custo Fixo: <strong>Atividade, Descrição, Data, Realizado, Orçado</strong>. Monta o scorecard hierárquico com bolinhas de status mensais.
            </p>
            <DropArea label="Planilha de Scorecard" fieldName="planilha_scorecard" onUpload={uploadScorecard} loading={loading} />
          </div>
        </div>
      </div>

      {/* Histórico */}
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
                    <td>{tipoBadge(l.tipo)}</td>
                    <td style={{ fontFamily: 'DM Mono,monospace', fontSize: '.78rem' }}>{l.filename}</td>
                    <td style={{ fontFamily: 'DM Mono,monospace' }}>{l.total}</td>
                    <td>{l.imported_by}</td>
                    <td style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
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
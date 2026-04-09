import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

function Modal({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ username:'', email:'', password:'', is_admin:false })
  if (!open) return null
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Novo Usuário</h3>
        <div className="form-group" style={{marginBottom:12}}>
          <label>Usuário</label>
          <input type="text" value={form.username} onChange={set('username')} required />
        </div>
        <div className="form-group" style={{marginBottom:12}}>
          <label>E-mail</label>
          <input type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="form-group" style={{marginBottom:12}}>
          <label>Senha</label>
          <input type="password" value={form.password} onChange={set('password')} required />
        </div>
        <div className="form-group" style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <input type="checkbox" id="is_admin" checked={form.is_admin} onChange={set('is_admin')} />
          <label htmlFor="is_admin" style={{textTransform:'none',letterSpacing:0,color:'var(--text)'}}>Administrador</label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSubmit(form)} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)

  const load = () => api.get('/admin/users').then(r => { setUsers(r.data); setLoading(false) })
  useEffect(() => { load() }, [])

  const create = async form => {
    setSaving(true)
    try {
      await api.post('/admin/users', form)
      setMsg({ type:'success', text:'Usuário criado com sucesso.' })
      setModal(false)
      load()
    } catch (e) {
      setMsg({ type:'danger', text: e.response?.data?.error || 'Erro ao criar usuário.' })
    } finally { setSaving(false) }
  }

  const del = async uid => {
    if (!confirm('Remover este usuário?')) return
    try {
      await api.delete(`/admin/users/${uid}`)
      setMsg({ type:'success', text:'Usuário removido.' })
      load()
    } catch (e) {
      setMsg({ type:'danger', text: e.response?.data?.error || 'Erro.' })
    }
  }

  const toggleAdmin = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}`, { is_admin: !u.is_admin })
      load()
    } catch (e) {
      setMsg({ type:'danger', text: 'Erro ao atualizar.' })
    }
  }

  return (
    <>
      <Modal open={modal} onClose={() => setModal(false)} onSubmit={create} loading={saving} />
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo Usuário</button>
      </div>

      {loading ? (
        <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Admin</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{color:'var(--muted)',fontSize:'.75rem'}}>{u.id}</td>
                    <td style={{fontWeight:600}}>{u.username}</td>
                    <td style={{color:'var(--muted)'}}>{u.email}</td>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{ background: u.is_admin ? '#fee2e2' : '#f3f4f6', color: u.is_admin ? 'var(--red)' : 'var(--muted)' }}
                        onClick={() => toggleAdmin(u)}
                        disabled={u.id === me.id}
                      >
                        {u.is_admin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td>
                      <span style={{
                        background: u.is_active ? '#dcfce7' : '#f3f4f6',
                        color: u.is_active ? '#166534' : '#6b7280',
                        padding:'2px 8px', borderRadius:20, fontSize:'.72rem', fontWeight:600
                      }}>{u.is_active ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td style={{fontSize:'.75rem',color:'var(--muted)'}}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '–'}
                    </td>
                    <td>
                      {u.id !== me.id && (
                        <button className="btn btn-danger btn-sm" onClick={() => del(u.id)}>Remover</button>
                      )}
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
import { useEffect, useState, useMemo } from 'react'
import api from '../services/api'

// ── Cores por tipo ────────────────────────────────────────────────────────────
const TIPO_CONFIG = {
  IC: { label: 'IC', color: '#7c3aed', bg: '#f5f3ff', nivel: 0 },
  IE: { label: 'IE', color: '#1d4ed8', bg: '#eff6ff', nivel: 1 },
  IO: { label: 'IO', color: '#0369a1', bg: '#f0f9ff', nivel: 2 },
  IT: { label: 'IT', color: '#047857', bg: '#f0fdf4', nivel: 3 },
  IV: { label: 'IV', color: '#b45309', bg: '#fffbeb', nivel: 4 },
}
const NIVEL_ORDER = { IC: 0, IE: 1, IO: 2, IT: 3, IV: 4 }

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || { label: tipo, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      padding: '1px 7px', borderRadius: 20,
      fontSize: '.67rem', fontWeight: 700, flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Nó recursivo da árvore ────────────────────────────────────────────────────
function TreeNode({ ind, allInds, depth = 0, onSelect, selectedId, expandedAll }) {
  const [open, setOpen] = useState(depth < 2)
  const children = allInds.filter(x => x.pai_id === ind.id)
  const hasChildren = children.length > 0
  const isSelected = selectedId === ind.id
  const cfg = TIPO_CONFIG[ind.tipo] || { color: '#6b7280' }

  useEffect(() => { setOpen(expandedAll) }, [expandedAll])

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div
        onClick={() => onSelect(ind)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
          background: isSelected ? '#eff6ff' : 'transparent',
          border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
          marginBottom: 2,
          transition: 'background .1s',
        }}
      >
        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          style={{
            width: 18, height: 18, border: 'none', borderRadius: 3,
            background: hasChildren ? (open ? '#1a1d23' : '#e2e8f0') : 'transparent',
            color: hasChildren ? (open ? '#fff' : '#475569') : 'transparent',
            cursor: hasChildren ? 'pointer' : 'default',
            fontSize: '.7rem', lineHeight: '16px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {hasChildren ? (open ? '−' : '+') : ''}
        </button>

        {/* Bolinha colorida */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: cfg.color, flexShrink: 0,
        }} />

        <TipoBadge tipo={ind.tipo} />

        <span style={{
          fontSize: '.82rem', flex: 1,
          fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400,
          color: '#1a1d23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {ind.nome}
        </span>

        {hasChildren && (
          <span style={{ fontSize: '.65rem', color: 'var(--muted)', flexShrink: 0 }}>
            ({children.length})
          </span>
        )}
      </div>

      {/* Filhos */}
      {open && hasChildren && (
        <div style={{
          borderLeft: `2px solid ${cfg.color}30`,
          marginLeft: 16, paddingLeft: 4,
        }}>
          {children.map(child => (
            <TreeNode
              key={child.id}
              ind={child}
              allInds={allInds}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedAll={expandedAll}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Hierarquia() {
  const [inds, setInds]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)   // indicador selecionado
  const [searchQ, setSearchQ]     = useState('')
  const [areaFilt, setAreaFilt]   = useState('')
  const [tipoFilt, setTipoFilt]   = useState('')
  const [expandAll, setExpandAll] = useState(false)
  const [autoMsg, setAutoMsg]     = useState('')
  const [saving, setSaving]       = useState(false)

  // Para vincular pai: busca de pai
  const [paiSearch, setPaiSearch] = useState('')
  const [paiSugest, setPaiSugest] = useState([])

  const load = () => {
    setLoading(true)
    api.get('/admin/hierarquia').then(r => {
      setInds(r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  // Sugestões de pai ao digitar
  useEffect(() => {
    if (paiSearch.length < 2) { setPaiSugest([]); return }
    const q = paiSearch.toLowerCase()
    const sugs = inds
      .filter(x =>
        x.id !== selected?.id &&
        x.nome?.toLowerCase().includes(q) &&
        (NIVEL_ORDER[x.tipo] || 99) < (NIVEL_ORDER[selected?.tipo] || 99)
      )
      .slice(0, 8)
    setPaiSugest(sugs)
  }, [paiSearch, inds, selected])

  // Árvore: raízes = sem pai
  const areas   = useMemo(() => [...new Set(inds.map(x => x.area_resultado).filter(Boolean))].sort(), [inds])
  const raizes  = useMemo(() =>
    inds.filter(x => !x.pai_id &&
      (!areaFilt || x.area_resultado === areaFilt) &&
      (!tipoFilt || x.tipo === tipoFilt) &&
      (!searchQ   || x.nome?.toLowerCase().includes(searchQ.toLowerCase()))
    ), [inds, areaFilt, tipoFilt, searchQ])

  // Filhos do selecionado
  const filhosDiretos = useMemo(() =>
    selected ? inds.filter(x => x.pai_id === selected.id) : [],
  [inds, selected])

  const paiDoSelecionado = useMemo(() =>
    selected?.pai_id ? inds.find(x => x.id === selected.pai_id) : null,
  [inds, selected])

  const setPai = async (filhoId, paiId) => {
    setSaving(true)
    await api.post('/admin/hierarquia/set-pai', { filho_id: filhoId, pai_id: paiId })
    await load()
    setSaving(false)
    setPaiSearch('')
    setPaiSugest([])
    setSelected(s => inds.find(x => x.id === s?.id) || s)
  }

  const removerPai = async (indId) => {
    setSaving(true)
    await api.post(`/admin/hierarquia/${indId}/remover-pai`)
    await load()
    setSaving(false)
    setSelected(s => inds.find(x => x.id === s?.id) || s)
  }

  const autoDetectar = async () => {
    setSaving(true)
    setAutoMsg('')
    const r = await api.post('/admin/hierarquia/auto-detectar')
    setAutoMsg(r.data.message)
    await load()
    setSaving(false)
  }

  // Estatísticas
  const stats = useMemo(() => {
    const vinculados = inds.filter(x => x.pai_id).length
    return {
      total: inds.length,
      vinculados,
      raiz: inds.filter(x => !x.pai_id).length,
      pct: inds.length ? Math.round(vinculados / inds.length * 100) : 0,
    }
  }, [inds])

  if (loading) return <div className="loading-center"><span className="spinner spinner-dark" /> Carregando...</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, height: 'calc(100vh - 110px)' }}>

      {/* ── COLUNA ESQUERDA: Árvore ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>

        {/* Stats + Auto-detectar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="stat-card" style={{ '--accent': '#1d4ed8', flex: 1, minWidth: 100, padding: '10px 16px' }}>
            <div className="label" style={{ fontSize: '.65rem' }}>Total</div>
            <div className="value" style={{ fontSize: '1.4rem' }}>{stats.total}</div>
          </div>
          <div className="stat-card" style={{ '--accent': '#047857', flex: 1, minWidth: 100, padding: '10px 16px' }}>
            <div className="label" style={{ fontSize: '.65rem' }}>Vinculados</div>
            <div className="value" style={{ fontSize: '1.4rem' }}>{stats.vinculados}</div>
            <div className="sub" style={{ fontSize: '.65rem' }}>{stats.pct}%</div>
          </div>
          <div className="stat-card" style={{ '--accent': '#b45309', flex: 1, minWidth: 100, padding: '10px 16px' }}>
            <div className="label" style={{ fontSize: '.65rem' }}>Sem pai</div>
            <div className="value" style={{ fontSize: '1.4rem' }}>{stats.raiz}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn btn-primary"
              onClick={autoDetectar}
              disabled={saving}
              style={{ fontSize: '.78rem', whiteSpace: 'nowrap' }}
            >
              ⚡ Auto-detectar hierarquia
            </button>
            {autoMsg && (
              <span style={{ fontSize: '.72rem', color: '#047857', fontWeight: 600 }}>✓ {autoMsg}</span>
            )}
          </div>
        </div>

        {/* Filtros da árvore */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="🔍 Buscar indicador..."
            style={{ flex: 2, minWidth: 160, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.82rem' }}
          />
          <select value={areaFilt} onChange={e => setAreaFilt(e.target.value)}
            style={{ flex: 1, minWidth: 120, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.82rem' }}>
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={tipoFilt} onChange={e => setTipoFilt(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.82rem' }}>
            <option value="">Todos os tipos</option>
            {Object.keys(TIPO_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={() => setExpandAll(e => !e)}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '.75rem' }}
          >
            {expandAll ? '⊟ Colapsar' : '⊞ Expandir'} tudo
          </button>
        </div>

        {/* Legenda de tipos */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
            <span key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.7rem', color: cfg.color }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
              {tipo}
            </span>
          ))}
          <span style={{ fontSize: '.7rem', color: 'var(--muted)', marginLeft: 8 }}>
            IC→IE→IO→IT→IV (raiz→folha)
          </span>
        </div>

        {/* Árvore */}
        <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ flexShrink: 0 }}>
            <h2>Estrutura hierárquica</h2>
            <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{raizes.length} raízes</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {raizes.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                Nenhum indicador encontrado. Use "Auto-detectar" para montar a hierarquia.
              </div>
            ) : (
              raizes.map(ind => (
                <TreeNode
                  key={ind.id}
                  ind={ind}
                  allInds={inds}
                  depth={0}
                  onSelect={setSelected}
                  selectedId={selected?.id}
                  expandedAll={expandAll}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── COLUNA DIREITA: Detalhe do selecionado ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        {!selected ? (
          <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>◎</div>
              <div style={{ fontSize: '.88rem' }}>Selecione um indicador na árvore</div>
            </div>
          </div>
        ) : (
          <>
            {/* Info do indicador */}
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: '.9rem' }}>Indicador selecionado</h2>
                <button onClick={() => setSelected(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem'
                }}>✕</button>
              </div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                  <TipoBadge tipo={selected.tipo} />
                  <span style={{ fontSize: '.85rem', fontWeight: 600, color: '#1a1d23', lineHeight: 1.4 }}>
                    {selected.nome}
                  </span>
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>📁 {selected.area_resultado || '–'}</span>
                  <span>🏢 {selected.sigla_unidade || '–'}</span>
                  <span>📊 Nível {selected.nivel || 0}</span>
                  <span>👶 {filhosDiretos.length} filhos diretos</span>
                </div>
              </div>
            </div>

            {/* Pai atual */}
            <div className="card">
              <div className="card-header"><h2 style={{ fontSize: '.88rem' }}>Pai atual</h2></div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                {paiDoSelecionado ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIPO_CONFIG[paiDoSelecionado.tipo]?.color || '#6b7280', flexShrink: 0 }} />
                      <TipoBadge tipo={paiDoSelecionado.tipo} />
                      <span style={{ fontSize: '.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {paiDoSelecionado.nome}
                      </span>
                    </div>
                    <button
                      onClick={() => removerPai(selected.id)}
                      disabled={saving}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600, flexShrink: 0 }}
                    >
                      ✕ Remover
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Sem pai (raiz)</span>
                )}
              </div>
            </div>

            {/* Vincular novo pai */}
            <div className="card">
              <div className="card-header"><h2 style={{ fontSize: '.88rem' }}>Vincular pai</h2></div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={paiSearch}
                    onChange={e => setPaiSearch(e.target.value)}
                    placeholder="Digite para buscar o pai..."
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.82rem', boxSizing: 'border-box' }}
                  />
                  {paiSugest.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
                      boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto',
                    }}>
                      {paiSugest.map(p => (
                        <div
                          key={p.id}
                          onClick={() => { setPai(selected.id, p.id); setPaiSearch(p.nome) }}
                          style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: TIPO_CONFIG[p.tipo]?.color || '#6b7280', flexShrink: 0 }} />
                          <TipoBadge tipo={p.tipo} />
                          <span style={{ fontSize: '.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 6 }}>
                  Apenas indicadores de nível superior ({
                    Object.entries(NIVEL_ORDER)
                      .filter(([, v]) => v < (NIVEL_ORDER[selected.tipo] || 99))
                      .map(([k]) => k).join(', ') || 'nenhum'
                  }) aparecem como opção.
                </p>
              </div>
            </div>

            {/* Filhos diretos */}
            {filhosDiretos.length > 0 && (
              <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ flexShrink: 0 }}>
                  <h2 style={{ fontSize: '.88rem' }}>Filhos diretos ({filhosDiretos.length})</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
                  {filhosDiretos.map(f => (
                    <div key={f.id}
                      onClick={() => setSelected(f)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: TIPO_CONFIG[f.tipo]?.color || '#6b7280', flexShrink: 0 }} />
                      <TipoBadge tipo={f.tipo} />
                      <span style={{ fontSize: '.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</span>
                      <button
                        onClick={e => { e.stopPropagation(); removerPai(f.id) }}
                        disabled={saving}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '.8rem', flexShrink: 0 }}
                        title="Remover vínculo"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
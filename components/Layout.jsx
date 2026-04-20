import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',  icon: '⊞', label: 'Dashboard'  },
  { to: '/scorecard',  icon: '◎', label: 'Indicadores'  },
  { to: '/custo-fixo', icon: '$', label: 'Manutenção' },
  { to: '/receita',    icon: '↗', label: 'Receita'    },
  { to: '/dre',        icon: '📊', label: 'DRE'        },
]

const ADMIN_ITEMS = [
  { to: '/admin/importar',   icon: '↑', label: 'Importar'   },
  { to: '/admin/hierarquia', icon: '⌥', label: 'Hierarquia' },
  { to: '/admin/users',      icon: '👤', label: 'Usuários'   },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)

  const pageTitle = () => {
    const p = location.pathname
    if (p.includes('dashboard'))                             return 'Dashboard'
    if (p.includes('scorecard') && p.split('/').length > 2) return 'Detalhe do Indicador'
    if (p.includes('scorecard'))                             return 'Indicadores'
    if (p.includes('custo-fixo'))                           return 'Custo Fixo'
    if (p.includes('receita'))                              return 'Receita'
    if (p.includes('dre'))                                 return 'DRE'
    if (p.includes('users'))                                return 'Usuários'
    if (p.includes('importar'))                             return 'Importar Planilhas'
    if (p.includes('hierarquia'))                           return 'Hierarquia de Indicadores'
    return 'StratWS'
  }

  const W_COLLAPSED = 56
  const W_EXPANDED  = 200

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: expanded ? W_EXPANDED : W_COLLAPSED,
          minWidth: expanded ? W_EXPANDED : W_COLLAPSED,
          background: '#1c5ddf',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width .2s ease, min-width .2s ease',
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: expanded ? '4px 0 16px rgba(0,0,0,.25)' : 'none',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,.07)',
          flexShrink: 0, overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
          {expanded ? (
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-.5px' }}>
              Cima<span style={{ color: '#e74c3c' }}>Pra</span>
            </span>
          ) : (
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#e74c3c' }}>C</span>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>

          {expanded && (
            <div style={{ fontSize: '.62rem', fontWeight: 700, color: '#fff',
              textTransform: 'uppercase', letterSpacing: 1, padding: '10px 16px 4px' }}>
              Principal
            </div>
          )}

          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0 10px 16px',
                color: isActive ? '#fff' : '#fff',
                background: isActive ? 'rgba(231,76,60,.25)' : 'transparent',
                borderLeft: isActive ? '3px solid #e74c3c' : '3px solid transparent',
                textDecoration: 'none', fontWeight: isActive ? 600 : 400,
                fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden',
                transition: 'background .15s, color .15s',
              })}
            >
              <span style={{ fontSize: '1rem', minWidth: 20, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {expanded && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Seção admin */}
          {user?.is_admin && (
            <>
              {expanded && (
                <div style={{ fontSize: '.62rem', fontWeight: 700, color: '#fff',
                  textTransform: 'uppercase', letterSpacing: 1, padding: '14px 16px 4px' }}>
                  Administração
                </div>
              )}
              {!expanded && <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '8px 10px' }} />}

              {ADMIN_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0 10px 16px',
                    color: isActive ? '#fff' : '#fff',
                    background: isActive ? 'rgba(231,76,60,.25)' : 'transparent',
                    borderLeft: isActive ? '3px solid #e74c3c' : '3px solid transparent',
                    textDecoration: 'none', fontWeight: isActive ? 600 : 400,
                    fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden',
                    transition: 'background .15s, color .15s',
                  })}
                >
                  <span style={{ fontSize: '1rem', minWidth: 20, textAlign: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {expanded && <span>{item.label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,.07)',
          padding: '10px 0 10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#e74c3c', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '.8rem', flexShrink: 0,
          }}>
            {(user?.username?.[0] || '?').toUpperCase()}
          </div>
          {expanded && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.8rem', color: '#fff', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username}
              </div>
              {user?.is_admin && (
                <div style={{ fontSize: '.65rem', color: '#e74c3c', fontWeight: 600 }}>Admin</div>
              )}
            </div>
          )}
          {expanded && (
            <button onClick={logout} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,.45)',
              cursor: 'pointer', fontSize: '.75rem', padding: '2px 8px',
              marginRight: 6, flexShrink: 0,
            }}>
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          height: 56, background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a1d23' }}>
            {pageTitle()}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '.85rem', color: '#6b7280' }}>{user?.username}</span>
            {user?.is_admin && (
              <span style={{
                background: '#e74c3c', color: '#fff',
                fontSize: '.65rem', fontWeight: 700,
                padding: '2px 7px', borderRadius: 20,
              }}>
                ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Página */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Scorecard from './pages/Scorecard'
import Detalhe from './pages/Detalhe'
import CustoFixo from './pages/CustoFixo'
import Receita from './pages/Receita'
import AdminUsers from './pages/AdminUsers'
import AdminImportar from './pages/AdminImportar'
import Hierarquia from './pages/Hierarquia'

function PrivateRoute({ children, adminOnly = false }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"        element={<Dashboard />} />
            <Route path="scorecard"        element={<Scorecard />} />
            <Route path="scorecard/:id"    element={<Detalhe />} />
            <Route path="custo-fixo"       element={<CustoFixo />} />
            <Route path="receita"          element={<Receita />} />
            <Route path="admin/users"      element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
            <Route path="admin/hierarquia" element={<PrivateRoute adminOnly><Hierarquia /></PrivateRoute>} />
            <Route path="admin/importar"   element={<PrivateRoute adminOnly><AdminImportar /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

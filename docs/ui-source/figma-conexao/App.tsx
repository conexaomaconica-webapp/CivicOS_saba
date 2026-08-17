import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Empresas from './pages/Empresas'
import EmpresaPerfil from './pages/EmpresaPerfil'
import GuiaMaconico from './pages/GuiaMaconico'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/empresa/:id" element={<EmpresaPerfil />} />
          <Route path="/guia" element={<GuiaMaconico />} />
          {/* Redirect old routes */}
          <Route path="/anunciantes" element={<Navigate to="/empresas" replace />} />
          <Route path="/anunciante/:id" element={<Navigate to="/empresa/1" replace />} />
          {/* Placeholder pages */}
          <Route path="/beneficios" element={<PlaceholderPage title="Benefícios" />} />
          <Route path="/eventos" element={<PlaceholderPage title="Eventos" />} />
          <Route path="/lojas" element={<PlaceholderPage title="Lojas Maçônicas" />} />
        </Route>
        {/* Admin has its own full-screen layout */}
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: '#7B1D1D' }}>{title}</h1>
      <p style={{ color: '#6B7280', fontSize: 16 }}>Em breve...</p>
    </div>
  )
}

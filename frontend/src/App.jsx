import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import RoleRoute from './components/RoleRoute'
import HomePage from './pages/Home/HomePage'
import ForbiddenPage from './pages/Forbidden/ForbiddenPage'
import NotFoundPage from './pages/NotFound/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Protected: any authenticated user */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<HomePage />} />
          </Route>

          {/* Protected: PitchOwner or Admin only */}
          <Route element={<RoleRoute allowedRoles={['PitchOwner', 'Admin']} />}>
            <Route path="/pitches/manage" element={<HomePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

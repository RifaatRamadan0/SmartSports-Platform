import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import PrivateRoute from './components/PrivateRoute'
import RoleRoute from './components/RoleRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RootRedirect from './components/RootRedirect'
import HomePage from './pages/Home/HomePage'
import LoginPage from './pages/Login/LoginPage'
import RegisterPage from './pages/Register/RegisterPage'
import ForbiddenPage from './pages/Forbidden/ForbiddenPage'
import NotFoundPage from './pages/NotFound/NotFoundPage'
import OwnerSchedulePage from './pages/Owner/OwnerSchedulePage'
import { ROLES } from './constants/roles'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            {/* Smart entry point */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected: any authenticated user */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<HomePage />} />
            </Route>

            {/* Protected: PitchOwner or Admin only */}
            <Route element={<RoleRoute allowedRoles={[ROLES.PITCH_OWNER, ROLES.ADMIN]} />}>
              <Route path="/pitches/manage" element={<HomePage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[ROLES.PITCH_OWNER, ROLES.ADMIN]} />}>
              <Route path="/dashboard/pitches/:pitchId/schedule" element={<OwnerSchedulePage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

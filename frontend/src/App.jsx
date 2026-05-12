import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import PrivateRoute from './components/routing/PrivateRoute'
import RoleRoute from './components/routing/RoleRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RootRedirect from './components/routing/RootRedirect'
import HomePage from './pages/Home/HomePage'
import LoginPage from './pages/Login/LoginPage'
import RegisterPage from './pages/Register/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPassword/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPassword/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmail/VerifyEmailPage'
import ConfirmEmailPage from './pages/ConfirmEmail/ConfirmEmailPage'
import PendingApprovalPage from './pages/PendingApproval/PendingApprovalPage'
import ForbiddenPage from './pages/Forbidden/ForbiddenPage'
import NotFoundPage from './pages/NotFound/NotFoundPage'
import OwnerSchedulePage from './pages/Owner/OwnerSchedulePage'
import OwnerBookingsPage from './pages/Owner/OwnerBookingsPage'
import PlayerBookingsPage from './pages/Player/PlayerBookingsPage'
import BookingPage from './pages/Player/BookingPage'
import { ROLES } from './constants/roles'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
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

            {/* Protected: PitchOwner only */}
            <Route element={<RoleRoute allowedRoles={[ROLES.PITCH_OWNER]} />}>
              <Route path="/dashboard/pitches/:pitchId/schedule" element={<OwnerSchedulePage />} />
              <Route path="/dashboard/bookings" element={<OwnerBookingsPage />} />
            </Route>

            {/* Protected: Player only */}
            <Route element={<RoleRoute allowedRoles={[ROLES.PLAYER]} />}>
              <Route path="/my-bookings" element={<PlayerBookingsPage />} />
              <Route path="/book/:pitchId" element={<BookingPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
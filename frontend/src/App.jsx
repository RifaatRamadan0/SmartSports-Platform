import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import PrivateRoute from './components/routing/PrivateRoute'
import RoleRoute from './components/routing/RoleRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RootRedirect from './components/routing/RootRedirect'
import HomePage from './pages/Home/HomePage'
import PitchDiscoveryPage from './pages/Pitches/PitchDiscoveryPage'
import PitchDetailPage from './pages/Pitches/PitchDetailPage'
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
import OwnerPitchesPage from './pages/Owner/OwnerPitchesPage'
import OwnerPitchFormPage from './pages/Owner/OwnerPitchFormPage'
import OwnerDashboardPage from './pages/Owner/OwnerDashboardPage'
import PlayerBookingsPage from './pages/Player/PlayerBookingsPage'
import BookingPage from './pages/Player/BookingPage'
import AdminPitchApprovalsPage from './pages/Admin/AdminPitchApprovalsPage'
import SettingsPage from './pages/Settings/SettingsPage'
import BookingDetailPage from './pages/Booking/BookingDetailPage'
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

            {/* Public pitch discovery — no auth required */}
            <Route path="/pitches" element={<PitchDiscoveryPage />} />
            <Route path="/pitches/:id" element={<PitchDetailPage />} />

            {/* Protected: any authenticated user */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<HomePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/bookings/:id" element={<BookingDetailPage />} />
            </Route>

            {/* Protected: PitchOwner only */}
            <Route element={<RoleRoute allowedRoles={[ROLES.PITCH_OWNER]} />}>
              <Route path="/dashboard/owner" element={<OwnerDashboardPage />} />
              <Route path="/dashboard/pitches" element={<OwnerPitchesPage />} />
              <Route path="/dashboard/pitches/new" element={<OwnerPitchFormPage />} />
              <Route path="/dashboard/pitches/:pitchId/edit" element={<OwnerPitchFormPage />} />
              <Route path="/dashboard/pitches/:pitchId/schedule" element={<OwnerSchedulePage />} />
              <Route path="/dashboard/bookings" element={<OwnerBookingsPage />} />
            </Route>

            {/* Protected: Admin only */}
            <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
              <Route path="/admin/pitches" element={<AdminPitchApprovalsPage />} />
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
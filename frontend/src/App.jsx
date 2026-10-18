import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastContext'
import PrivateRoute from './components/routing/PrivateRoute'
import RoleRoute from './components/routing/RoleRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RootRedirect from './components/routing/RootRedirect'
import AppShell from './components/layout/AppShell'
import { ROLES } from './constants/roles'

const HomePage                = lazy(() => import('./pages/Home/HomePage'))
const PitchDiscoveryPage      = lazy(() => import('./pages/Pitches/PitchDiscoveryPage'))
const PitchDetailPage         = lazy(() => import('./pages/Pitches/PitchDetailPage'))
const LoginPage               = lazy(() => import('./pages/Login/LoginPage'))
const RegisterPage            = lazy(() => import('./pages/Register/RegisterPage'))
const ForgotPasswordPage      = lazy(() => import('./pages/ForgotPassword/ForgotPasswordPage'))
const ResetPasswordPage       = lazy(() => import('./pages/ResetPassword/ResetPasswordPage'))
const VerifyEmailPage         = lazy(() => import('./pages/VerifyEmail/VerifyEmailPage'))
const ConfirmEmailPage        = lazy(() => import('./pages/ConfirmEmail/ConfirmEmailPage'))
const PendingApprovalPage     = lazy(() => import('./pages/PendingApproval/PendingApprovalPage'))
const ForbiddenPage           = lazy(() => import('./pages/Forbidden/ForbiddenPage'))
const NotFoundPage            = lazy(() => import('./pages/NotFound/NotFoundPage'))
const OwnerSchedulePage       = lazy(() => import('./pages/Owner/OwnerSchedulePage'))
const OwnerBookingsPage       = lazy(() => import('./pages/Owner/OwnerBookingsPage'))
const OwnerPitchesPage        = lazy(() => import('./pages/Owner/OwnerPitchesPage'))
const OwnerPitchFormPage      = lazy(() => import('./pages/Owner/OwnerPitchFormPage'))
const OwnerDashboardPage      = lazy(() => import('./pages/Owner/OwnerDashboardPage'))
const PlayerBookingsPage      = lazy(() => import('./pages/Player/PlayerBookingsPage'))
const FavoritesPage           = lazy(() => import('./pages/Player/FavoritesPage'))
const BookingPage             = lazy(() => import('./pages/Player/BookingPage'))
const AdminPitchApprovalsPage = lazy(() => import('./pages/Admin/AdminPitchApprovalsPage'))
const AdminUsersPage          = lazy(() => import('./pages/Admin/AdminUsersPage'))
const SettingsPage            = lazy(() => import('./pages/Settings/SettingsPage'))
const BookingDetailPage       = lazy(() => import('./pages/Booking/BookingDetailPage'))
const MatchDetailPage         = lazy(() => import('./pages/Match/MatchDetailPage'))
const FindGamePage            = lazy(() => import('./pages/Matches/FindGamePage'))
const JoinPage                = lazy(() => import('./pages/Matches/JoinPage'))

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <Suspense fallback={null}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          {/* Smart entry point */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public invite-link preview — guests can read the match before deciding to sign in.
              Backend GET /api/join/{token} is [AllowAnonymous]; auth is enforced at click time
              inside JoinPage (handleJoin redirects to /login with from set). */}
          <Route path="/join/:token" element={<JoinPage />} />

          {/* ── All routes with shared navbar (AppShell) ── */}
          <Route element={<AppShell />}>
            {/* Public: no auth required */}
            <Route path="/pitches" element={<PitchDiscoveryPage />} />
            <Route path="/pitches/:id" element={<PitchDetailPage />} />
            <Route path="/matches/open" element={<FindGamePage />} />

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
              <Route path="/admin/users"   element={<AdminUsersPage />} />
            </Route>

            {/* Protected: Player only */}
            <Route element={<RoleRoute allowedRoles={[ROLES.PLAYER]} />}>
              <Route path="/my-bookings" element={<PlayerBookingsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/book/:pitchId" element={<BookingPage />} />
              <Route path="/matches/:matchId" element={<MatchDetailPage />} />
            </Route>

            {/* Error pages with chrome */}
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

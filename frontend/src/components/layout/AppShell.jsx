import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

// Layout route: renders the single shared navbar above every page that consumes
// it via <Outlet />. Page-level transition animation is still owned by the route
// guards (PrivateRoute / RoleRoute) and the public pages' own PageWrapper, so the
// navbar sits above the animated content (it does not fade on navigation).
export default function AppShell() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}

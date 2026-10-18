import { Link } from 'react-router-dom'
import PageWrapper from '@/components/routing/PageWrapper'

function ForbiddenPage() {
  return (
    <PageWrapper className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
      <h1 className="text-9xl font-extrabold text-destructive/30">403</h1>
      <h2 className="text-2xl font-bold text-foreground mt-4">Access Denied</h2>
      <p className="text-muted-foreground mt-2 max-w-sm">
        You don't have permission to view this page. Please contact an administrator if you think this is a mistake.
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Go Back Home
      </Link>
    </PageWrapper>
  )
}

export default ForbiddenPage

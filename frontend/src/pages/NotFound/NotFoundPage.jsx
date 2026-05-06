import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
      <h1 className="text-9xl font-extrabold text-muted-foreground/30">404</h1>
      <h2 className="text-2xl font-bold text-foreground mt-4">Page Not Found</h2>
      <p className="text-muted-foreground mt-2 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Go Back Home
      </Link>
    </div>
  )
}

export default NotFoundPage

import { Link } from 'react-router-dom'

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <h1 className="text-9xl font-extrabold text-red-100">403</h1>
      <h2 className="text-2xl font-bold text-gray-800 mt-4">Access Denied</h2>
      <p className="text-gray-500 mt-2 max-w-sm">
        You don't have permission to view this page. Please contact an administrator if you think this is a mistake.
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Go Back Home
      </Link>
    </div>
  )
}

export default ForbiddenPage

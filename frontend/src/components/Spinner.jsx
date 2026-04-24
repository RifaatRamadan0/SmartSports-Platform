function Spinner() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center min-h-screen">
      <div aria-hidden="true" className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export default Spinner

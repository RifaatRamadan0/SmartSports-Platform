import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/Home/HomePage'
import NotFoundPage from './pages/NotFound/NotFoundPage'

function App() {
  return (
    // BrowserRouter enables client-side routing
    <BrowserRouter>
      <Routes>
        {/* Each Route maps a URL path to a page component */}
        <Route path="/" element={<HomePage />} />
        {/* Catch-all route for any unknown URLs */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
import { Routes, Route, Link } from 'react-router-dom'
import ArtLoftScene from './ArtLoftScene'
import PrintsPage from './PrintsPage'
import PrintPage from './PrintPage'
import CollectionPage from './CollectionPage'
import AdminPrints from './AdminPrints'
import './artloft.css'

// Everything under /art-loft lives here, so the main App only needs one line to know about it.
export default function ArtLoftRoutes() {
  return (
    <Routes>
      <Route index element={<ArtLoftScene />} />
      <Route path="prints" element={<PrintsPage />} />
      <Route path="prints/:id" element={<PrintPage />} />
      <Route path="collections/:slug" element={<CollectionPage />} />
      <Route path="admin" element={<AdminPrints />} />
      <Route
        path="*"
        element={
          <main className="al">
            <h1>Page not found</h1>
            <p><Link to="/art-loft">Back to the Art Loft</Link></p>
          </main>
        }
      />
    </Routes>
  )
}

import { Routes, Route, Link } from 'react-router-dom'
import DraftingDeskHome from './DraftingDeskHome'
import ArchiveEntriesPage from '../entries/ArchiveEntriesPage'
import NotebookPage from './NotebookPage'
import './draftingdesk.css'

// Everything under /drafting-desk lives here, so the main App only needs one line to know about it.
export default function DraftingDeskRoutes() {
  return (
    <Routes>
      <Route index element={<DraftingDeskHome />} />
      <Route path="archive-entries" element={<ArchiveEntriesPage />} />
      <Route path="authors-notebook" element={<NotebookPage />} />
      <Route
        path="*"
        element={
          <main className="dd">
            <h1>Page not found</h1>
            <p><Link to="/drafting-desk">Back to the Drafting Desk</Link></p>
          </main>
        }
      />
    </Routes>
  )
}

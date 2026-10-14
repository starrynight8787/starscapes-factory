import { Routes, Route, Link } from 'react-router-dom'
import FactoryFloorHome from './FactoryFloorHome'
import SectionPage from './SectionPage'
import './factoryfloor.css'

// Everything under /factory-floor lives here, so the main App only needs one line to know about it.
export default function FactoryFloorRoutes() {
  return (
    <Routes>
      <Route index element={<FactoryFloorHome />} />
      <Route path="floor" element={<SectionPage kind="story" />} />
      <Route path="blueprints" element={<SectionPage kind="blueprint" />} />
      <Route
        path="*"
        element={
          <main className="ff">
            <div className="ff-inner">
              <h1>Page not found</h1>
              <p><Link to="/factory-floor">Back to the Factory Floor</Link></p>
            </div>
          </main>
        }
      />
    </Routes>
  )
}

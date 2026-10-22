import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// In a single-page site the browser does not know that a new page has opened, so it keeps you wherever you had scrolled to: click a link in the footer and the next page opens already
// scrolled down (a tester found this, 22 October 2026). This puts you at the top of every page you reach by clicking a link.
// It leaves alone: the first time the site opens, Back and Forward (the browser puts you back where you were), a change that only alters the ?query (a filter or a search on the same page),
// and a link to a #section (that section is brought into view instead of the top).
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navType = useNavigationType()
  const last = useRef(null)
  useEffect(() => {
    const before = last.current
    last.current = { pathname, hash }
    if (!before || (before.pathname === pathname && before.hash === hash)) return // the first page, or only the ?query changed
    if (navType === 'POP') return // Back, Forward, or a plain #anchor link the browser has already scrolled to
    if (hash) {
      let id = hash.slice(1)
      try { id = decodeURIComponent(id) } catch { /* a badly written link: use it as it is */ }
      const el = document.getElementById(id)
      if (el && el.scrollIntoView) { el.scrollIntoView(); return }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash, navType])
  return null
}

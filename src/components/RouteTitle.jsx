import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PAGES, fullTitleFor } from '../data/pageMeta'

// The pages that do not set a title of their own (the home page, the blog list, the cart, the log-in pages and so on) take theirs from
// the table in src/data/pageMeta.js as you move around the site, so the browser tab never keeps the name of the page before.
// Pages that set their own title are left alone (they are not marked client: true).
export default function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    const page = PAGES[key]
    if (page && page.client) document.title = fullTitleFor(page)
  }, [pathname])
  return null
}

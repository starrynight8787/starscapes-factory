import { useEffect } from 'react'

// The browser tab's title, the way every other page here sets it.
export default function useTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} | Starscapes Factory`
    return () => {
      document.title = previous
    }
  }, [title])
}

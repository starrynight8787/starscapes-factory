import { useEffect } from 'react'

export default function useTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} | Starscapes Factory`
    return () => {
      document.title = previous
    }
  }, [title])
}

import { useEffect, useState } from 'react'

// Is the signed-in person the owner? The website cannot know: the owner's email lives on the server, so it asks the server (api/is-owner).
// Not signed in, not the owner, or any trouble with the answer, all come out as "no", and the Admin button simply does not appear.
// While developing on your own computer there is no server to ask, so any signed-in person sees the button. (The tools behind it still lock themselves.)
//
// useOwnerCheck says where the question has got to: { checking, owner }. useIsOwner (the default) is just yes or no, for the menu.
export function useOwnerCheck(session) {
  const [answer, setAnswer] = useState(null) // null while we are asking
  const token = session && session.access_token
  const signedIn = Boolean(session)

  useEffect(() => {
    let alive = true
    if (!signedIn) {
      setAnswer(false)
      return undefined
    }
    if (import.meta.env && import.meta.env.DEV) {
      setAnswer(true)
      return undefined
    }
    setAnswer(null)
    ;(async () => {
      try {
        const res = await fetch('/api/is-owner', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
        const body = await res.json()
        if (alive) setAnswer(Boolean(body) && body.owner === true)
      } catch (e) {
        if (alive) setAnswer(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [signedIn, token])

  return { checking: signedIn && answer === null, owner: answer === true }
}

export default function useIsOwner(session) {
  return useOwnerCheck(session).owner
}

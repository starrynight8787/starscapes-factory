import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useOwnerCheck } from '../admin/useIsOwner'

// For pages that are not given the sign-in: finds the signed-in person, then asks the server whether they are the owner.
// { checking, owner }. checking stays true until we know whether anyone is signed in, so the owner never sees a flash of "not open yet".
export default function useCurrentOwner() {
  const [session, setSession] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    let subscription = null
    try {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (alive) {
            setSession((data && data.session) || null)
            setLoaded(true)
          }
        })
        .catch(() => alive && setLoaded(true))
      const listener = supabase.auth.onAuthStateChange((_event, next) => alive && setSession(next || null))
      subscription = listener && listener.data && listener.data.subscription
    } catch (e) {
      setLoaded(true)
    }
    return () => {
      alive = false
      if (subscription && subscription.unsubscribe) subscription.unsubscribe()
    }
  }, [])

  const check = useOwnerCheck(session)
  return { checking: !loaded || check.checking, owner: check.owner }
}

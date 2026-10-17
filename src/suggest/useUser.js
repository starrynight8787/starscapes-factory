import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Who is signed in, for a box that is not handed the sign-in. { loading, user }. loading stays true until we know, so the box never flashes the
// wrong thing. Any trouble reading it comes out as "nobody signed in".
export default function useUser() {
  const [state, setState] = useState({ loading: true, user: null })
  useEffect(() => {
    let alive = true
    let subscription = null
    try {
      supabase.auth
        .getSession()
        .then(({ data }) => alive && setState({ loading: false, user: (data && data.session && data.session.user) || null }))
        .catch(() => alive && setState({ loading: false, user: null }))
      const listener = supabase.auth.onAuthStateChange((_event, session) => alive && setState({ loading: false, user: (session && session.user) || null }))
      subscription = listener && listener.data && listener.data.subscription
    } catch (e) {
      setState({ loading: false, user: null })
    }
    return () => {
      alive = false
      if (subscription && subscription.unsubscribe) subscription.unsubscribe()
    }
  }, [])
  return state
}

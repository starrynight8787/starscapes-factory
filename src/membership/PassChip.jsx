import { useEffect, useState } from 'react'
import { loadPassIndex } from './passIndex'
import { passName } from './lockedPosts'
import './membership.css'

// A small label on a post card: "Blueprints pass", or "Blueprints pass: free to read" for the first three. Nothing for an ordinary post, and nothing until the lookup has come back.
export default function PassChip({ postId }) {
  const [tag, setTag] = useState(null)
  useEffect(() => {
    let stopped = false
    loadPassIndex().then((index) => !stopped && setTag(index.get(postId) || null))
    return () => {
      stopped = true
    }
  }, [postId])
  if (!tag) return null
  return <span className="pg-chip mb__passchip">{`${passName(tag.pass)} pass${tag.free ? ': free to read' : ''}`}</span>
}

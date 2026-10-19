import { Link, useLocation } from 'react-router-dom'
import { SECTIONS, NOTE_COLOURS, kindOf, noteTilt, formatDate, isPinned } from './factoryData'

// One post, as a post-it note stuck to the blueprint.
export default function PostNote({ post, index = 0, isNew = false }) {
  const kind = SECTIONS[kindOf(post)]
  const here = useLocation() // remembered, so the post's Back link can return to this exact list
  const date = formatDate(post.created_at)
  const pinned = isPinned(post)
  return (
    <Link className={`ff-note ff-note--c${index % NOTE_COLOURS.length}${pinned ? ' ff-note--pinned' : ''}`} style={{ '--tilt': `${noteTilt(index)}deg` }} to={`/post/${post.id}`} state={{ from: here.pathname + here.search }}>
      {isNew && <span className="ff-new">New</span>}
      <span className="ff-note__kind">{pinned ? 'Start here' : kind.label}</span>
      <span className="ff-note__title">
        {pinned && <span className="ff-vh">Pinned post: </span>}
        {post.title}
      </span>
      {date && <span className="ff-note__date">{date}</span>}
    </Link>
  )
}

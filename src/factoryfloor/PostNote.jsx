import { Link, useLocation } from 'react-router-dom'
import { SECTIONS, NOTE_COLOURS, kindOf, noteTilt, formatDate } from './factoryData'

// One post, as a post-it note stuck to the blueprint.
export default function PostNote({ post, index = 0, isNew = false }) {
  const kind = SECTIONS[kindOf(post)]
  const here = useLocation() // remembered, so the post's Back link can return to this exact list
  const date = formatDate(post.created_at)
  return (
    <Link className={`ff-note ff-note--c${index % NOTE_COLOURS.length}`} style={{ '--tilt': `${noteTilt(index)}deg` }} to={`/post/${post.id}`} state={{ from: here.pathname + here.search }}>
      {isNew && <span className="ff-new">New</span>}
      <span className="ff-note__kind">{kind.label}</span>
      <span className="ff-note__title">{post.title}</span>
      {date && <span className="ff-note__date">{date}</span>}
    </Link>
  )
}

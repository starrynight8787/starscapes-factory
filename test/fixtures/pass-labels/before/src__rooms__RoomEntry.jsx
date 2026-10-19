import { Link } from 'react-router-dom'
import { formatDate, safeImage } from './postRules'

// One post on an area page. In a gallery it shows its picture across the top; in a list it is a compact rectangle with no picture.
// "from" is the page the reader came from, remembered so the post's Back link can return to it.
export default function RoomEntry({ post, from, picture }) {
  const image = picture ? safeImage(post.image_url) : ''
  const date = formatDate(post.created_at)
  return (
    <Link className={`rp-entry${image ? ' has-image' : ''}`} to={`/post/${post.id}`} state={{ from }}>
      {image && (
        <img
          className="rp-entry__img"
          src={image}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none' // a picture that will not load leaves the card tidy, not broken
          }}
        />
      )}
      <span className="rp-entry__title">{post.title}</span>
      {date && <span className="rp-entry__date">{date}</span>}
    </Link>
  )
}

import { Link } from 'react-router-dom'
import { formatDate, safeImage } from './draftingData'

// One post on an area page: its picture (if it has one) across the top, then its title and date.
// "from" is the page the reader came from, remembered so the post's Back link can return to it.
export default function EntryCard({ post, from }) {
  const image = safeImage(post.image_url)
  const date = formatDate(post.created_at)
  return (
    <Link className={`dd-entry${image ? ' has-image' : ''}`} to={`/post/${post.id}`} state={{ from }}>
      {image && (
        <img
          className="dd-entry__img"
          src={image}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none' // a picture that will not load leaves the card tidy, not broken
          }}
        />
      )}
      <span className="dd-entry__title">{post.title}</span>
      {date && <span className="dd-entry__date">{date}</span>}
    </Link>
  )
}

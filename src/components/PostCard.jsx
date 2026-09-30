import { Link } from 'react-router-dom'

export default function PostCard({ post, variant = 'feed' }) {
  const excerpt =
    post.content.length > 140 ? post.content.slice(0, 140) + '...' : post.content

  if (variant === 'gallery') {
    return (
      <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
          />
        )}
        <h3 style={{ margin: '10px 0 4px', fontSize: 15 }}>{post.title}</h3>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {excerpt}
        </p>
        {post.tags && post.tags.length > 0 && (
          <span
            style={{
              display: 'inline-block',
              marginTop: 6,
              background: '#eee',
              color: '#333',
              fontSize: 11,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            {post.tags[0]}
          </span>
        )}
      </Link>
    )
  }

  if (variant === 'featured') {
    return (
      <Link
        to={`/post/${post.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          marginBottom: 32,
        }}
      >
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            style={{
              width: '100%',
              maxHeight: 320,
              objectFit: 'cover',
              borderRadius: 12,
              marginBottom: 16,
            }}
          />
        )}
        <h2 style={{ margin: '0 0 8px' }}>{post.title}</h2>
        <p className="muted" style={{ margin: '0 0 8px' }}>
          {new Date(post.created_at).toLocaleDateString()}
        </p>
        <p>{excerpt}</p>
      </Link>
    )
  }

  return (
    <Link
      to={`/post/${post.id}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        gap: 16,
        marginBottom: 20,
        alignItems: 'flex-start',
      }}
    >
      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title}
          style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
        />
      )}
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 17 }}>{post.title}</h3>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
          {new Date(post.created_at).toLocaleDateString()}
        </p>
        <p style={{ margin: 0, fontSize: 14 }}>{excerpt}</p>
      </div>
    </Link>
  )
}
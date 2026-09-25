import { Link, useParams } from 'react-router-dom'
import { channels } from '../data/channels'

export default function ChannelPage() {
  const { slug } = useParams()
  const channel = channels.find((c) => c.slug === slug)

  if (!channel) {
    return (
      <div>
        <p>
          <Link to="/">&larr; Back home</Link>
        </p>
        <p>Channel not found.</p>
      </div>
    )
  }

  return (
    <div>
      <p>
        <Link to="/">&larr; Back to all channels</Link>
      </p>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 48 }}>{channel.emoji}</div>
        <h1 style={{ marginBottom: 4 }}>{channel.name}</h1>
        <p className="muted" style={{ fontStyle: 'italic' }}>{channel.tagline}</p>
        <p style={{ maxWidth: 500, margin: '24px auto', lineHeight: 1.6 }}>{channel.blurb}</p>
        <p className="muted" style={{ marginTop: 40 }}>More coming soon.</p>
      </div>
    </div>
  )
}
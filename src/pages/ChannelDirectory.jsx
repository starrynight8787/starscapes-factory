import { Link } from 'react-router-dom'
import { channels } from '../data/channels'

export default function ChannelDirectory() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>🌌 Starscapes Factory</h1>
        <p className="muted" style={{ fontSize: 16 }}>
          You're only limited by your own imagination.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
        }}
      >
        {channels.map((channel) => (
          <Link
            key={channel.slug}
            to={`/channel/${channel.slug}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              border: '1px solid #e5e5e5',
              borderRadius: 12,
              padding: 20,
              display: 'block',
              background: '#fff',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{channel.emoji}</div>
            <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>{channel.name}</h2>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              {channel.tagline}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
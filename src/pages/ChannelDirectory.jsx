import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { channels } from '../data/channels'
import { roomImages, roomPath } from '../data/roomImages'
import RoomTile from '../components/RoomTile'
import { StarMark } from '../components/Logo'
import '../styles/site.css'

// The floor plan is drawn on a 960 x 640 grid.
//   pts  = the corners of the room's shape
//   box  = where the room's picture and name are centred: [x, y, width, height]
//   tile = picture size, font = name size
const PLAN = {
  'factory-floor': { pts: [[0, 0], [232, 0], [232, 190], [0, 190]], box: [0, 0, 232, 190], tile: 64, font: 26 },
  'leadership-lounge': { pts: [[232, 0], [465, 0], [465, 190], [232, 190]], box: [232, 0, 233, 190], tile: 64, font: 26 },
  'idea-hatchery': { pts: [[465, 0], [660, 0], [660, 120], [465, 120]], box: [465, 0, 195, 120], tile: 44, font: 22 },
  'knowledge-nook': {
    pts: [[660, 0], [960, 0], [960, 270], [465, 270], [465, 120], [660, 120]],
    box: [465, 120, 495, 150],
    tile: 68,
    font: 28,
  },
  'sarah-jrs-den': {
    pts: [[290, 190], [465, 190], [465, 270], [740, 270], [740, 390], [290, 390]],
    box: [290, 270, 450, 120],
    tile: 64,
    font: 28,
  },
  'art-loft': { pts: [[0, 190], [290, 190], [290, 640], [0, 640]], box: [0, 190, 290, 450], tile: 112, font: 32 },
  'drafting-desk': { pts: [[290, 390], [740, 390], [740, 640], [290, 640]], box: [290, 390, 450, 250], tile: 96, font: 32 },
  'explorers-bay': { pts: [[740, 270], [960, 270], [960, 640], [740, 640]], box: [740, 270, 220, 370], tile: 88, font: 28 },
}

const toPoints = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ')

// Works out where a room's picture and name sit inside its box
function place(spec) {
  const [bx, by, bw, bh] = spec.box
  const gap = 8
  const groupHeight = spec.tile + gap + spec.font
  const top = by + (bh - groupHeight) / 2
  return {
    tileX: bx + (bw - spec.tile) / 2,
    tileY: top,
    textX: bx + bw / 2,
    textY: top + spec.tile + gap + spec.font * 0.82,
  }
}

export default function ChannelDirectory() {
  const navigate = useNavigate()
  const [active, setActive] = useState(null)
  const [posts, setPosts] = useState([])

  // The three newest published posts, for the "Latest posts" section
  useEffect(() => {
    let cancelled = false
    async function loadPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, image_url, channel, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3)
      if (!cancelled && !error && data) setPosts(data)
    }
    loadPosts()
    return () => {
      cancelled = true
    }
  }, [])

  const activeRoom = channels.find((c) => c.slug === active)
  const planRooms = channels.filter((c) => PLAN[c.slug])

  function goToRoom(e, slug) {
    // let Cmd/Ctrl/Shift-click open in a new tab as normal
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
    e.preventDefault()
    navigate(roomPath(slug))
  }

  return (
    <div className="sf-home">
      {/* ---------- Hero with the floor plan ---------- */}
      <section className="sf-hero" aria-labelledby="sf-hero-title">
        <p className="sf-eyebrow">Welcome in</p>
        <h1 id="sf-hero-title">Step inside. Pick a room.</h1>
        <p className="sf-sub">Every room is its own world. Click or tap one to walk in.</p>

        <div className="sf-panel">
          <svg
            className="sf-plan"
            viewBox="-4 -4 968 648"
            role="group"
            aria-label="Floor plan of Starscapes Factory. Choose a room."
          >

            {planRooms.map((c) => {
              const spec = PLAN[c.slug]
              const p = place(spec)
              return (
                <a
                  key={c.slug}
                  href={roomPath(c.slug)}
                  className={`sf-room${active === c.slug ? ' is-active' : ''}`}
                  aria-label={`${c.name}. ${c.tagline}`}
                  onClick={(e) => goToRoom(e, c.slug)}
                  onMouseEnter={() => setActive(c.slug)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(c.slug)}
                  onBlur={() => setActive(null)}
                >
                  <polygon className="sf-room__shape" points={toPoints(spec.pts)} />
                  <image
                    href={roomImages[c.slug]}
                    x={p.tileX}
                    y={p.tileY}
                    width={spec.tile}
                    height={spec.tile}
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <text className="sf-room__name" x={p.textX} y={p.textY} fontSize={spec.font}>
                    {c.name}
                  </text>
                </a>
              )
            })}

            {/* The dark outlines are drawn last, on top of every room */}
            <g className="sf-plan__edges" pointerEvents="none">
              {planRooms.map((c) => (
                <polygon key={c.slug} className="sf-room__edge" points={toPoints(PLAN[c.slug].pts)} />
              ))}
            </g>
          </svg>

          <p className="sf-plan__hint" aria-live="polite">
            {activeRoom ? `${activeRoom.name}: ${activeRoom.tagline}` : 'Click a room to walk in.'}
          </p>
        </div>
      </section>

      {/* ---------- Room list (phones and small screens) ---------- */}
      <section className="sf-roomlist-wrap" aria-label="All rooms">
        <div className="sf-roomlist">
          {channels.map((c) => (
            <Link key={c.slug} to={roomPath(c.slug)} className="sf-roomcard">
              <RoomTile slug={c.slug} size={64} />
              <span>
                <span className="sf-roomcard__name">{c.name}</span>
                <span className="sf-roomcard__tag">{c.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Latest posts ---------- */}
      {posts.length > 0 && (
        <section className="sf-latest" aria-labelledby="sf-latest-title">
          <div className="sf-latest__head">
            <div>
              <p className="sf-eyebrow sf-eyebrow--blue">Fresh from the Factory</p>
              <h2 id="sf-latest-title">Latest posts</h2>
            </div>
            <Link to="/blog" className="sf-morelink">
              See all posts →
            </Link>
          </div>
          <div className="sf-latest__grid">
            {posts.map((post) => {
              const room = channels.find((c) => c.slug === post.channel)
              const excerpt = post.content.length > 140 ? post.content.slice(0, 140) + '…' : post.content
              return (
                <Link key={post.id} to={`/post/${post.id}`} className="sf-post">
                  {post.image_url ? (
                    <img className="sf-post__img" src={post.image_url} alt="" loading="lazy" />
                  ) : (
                    <div className="sf-post__img sf-post__img--empty">
                      <StarMark width={72} color="#DCE6FF" />
                    </div>
                  )}
                  <span className="sf-post__chip">{room ? room.name : 'Blog'}</span>
                  <span className="sf-post__title">{post.title}</span>
                  <span className="sf-post__ex">{excerpt}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

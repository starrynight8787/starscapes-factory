import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { channels } from '../data/channels'
import { roomImages, roomPath } from '../data/roomImages'
import RoomIcon from '../components/RoomIcon'
import { ROOM_ICONS } from '../components/roomIcons'
import { StarMark } from '../components/Logo'
import '../styles/site.css'

// The floor plan is drawn on a 960 x 640 grid.
//   pts  = the corners of the room's shape
//   box  = where the room's picture and name are centred: [x, y, width, height]
//   tile = picture size, font = name size
const PLAN = {
  'factory-floor': { pts: [[0, 0], [216, 0], [216, 188], [0, 188]], box: [0, 0, 216, 188], tile: 64, font: 24 },
  'leadership-lounge': { pts: [[216, 0], [450, 0], [450, 188], [216, 188]], box: [216, 0, 234, 188], tile: 64, font: 24 },
  'idea-hatchery': { pts: [[450, 0], [641, 0], [641, 120], [450, 120]], box: [450, 0, 191, 120], tile: 44, font: 21 },
  'knowledge-nook': {
    pts: [[641, 0], [960, 0], [960, 257], [730, 257], [730, 120], [641, 120]],
    box: [730, 0, 230, 257],
    tile: 68,
    font: 28,
  },
  'sarah-jrs-den': {
    pts: [[276, 188], [450, 188], [450, 120], [730, 120], [730, 388], [276, 388]],
    box: [276, 188, 454, 200],
    tile: 64,
    font: 28,
  },
  'art-loft': { pts: [[0, 188], [276, 188], [276, 640], [0, 640]], box: [0, 188, 276, 452], tile: 112, font: 32 },
  'drafting-desk': { pts: [[276, 388], [730, 388], [730, 640], [276, 640]], box: [276, 388, 454, 252], tile: 96, font: 32 },
  'explorers-bay': { pts: [[730, 257], [960, 257], [960, 640], [730, 640]], box: [730, 257, 230, 383], tile: 88, font: 28 },
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
                    href={ROOM_ICONS[c.slug] || roomImages[c.slug]}
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
              <RoomIcon room={c.slug} size={64} />
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

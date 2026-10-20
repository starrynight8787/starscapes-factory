import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { channels } from '../data/channels'
import { roomImages, roomPath } from '../data/roomImages'
import RoomIcon from '../components/RoomIcon'
import { ROOM_ICONS } from '../components/roomIcons'
import HomeSections from '../home/HomeSections'
import { fetchFeaturedSlug, fetchLatestPost, fetchNextEvent } from '../home/homeApi'
import '../styles/site.css'

// The starry backdrop behind the floor plan (the "Home v3" design): a soft nebula, faint orbits, two constellations, a sweep of light and twelve glints.
// It is decoration only, so it is hidden from screen readers.
const GLINTS = [[6, 30], [15, 10], [11, 43], [3, 56], [94, 22], [89, 9], [92, 43], [97, 59], [20, 94], [77, 95], [43, 3], [59, 2]]
function HeroArt() {
  return (
    <div className="sf-hero__art" aria-hidden="true">
      <div className="sf-hero__nebula" />
      <svg className="sf-hero__orbits" viewBox="0 0 1438 1066" preserveAspectRatio="xMidYMid slice" focusable="false">
        <ellipse cx="719" cy="520" rx="760" ry="470" />
        <ellipse cx="719" cy="560" rx="560" ry="360" />
        <ellipse cx="110" cy="900" rx="380" ry="250" />
        <g className="sf-hero__const">
          <polyline points="107,250 131,356 128,466 154,566 70,689" />
          <polyline points="1342,300 1306,400 1372,516 1296,630 1388,740" />
          <polyline points="120,111 196,115 290,190" />
          <polyline points="1305,100 1315,200 1390,145" />
          {[[107, 250], [131, 356], [128, 466], [154, 566], [70, 689], [1342, 300], [1306, 400], [1372, 516], [1296, 630], [1388, 740]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />)}
        </g>
      </svg>
      {GLINTS.map(([x, y], i) => <span key={i} className="sf-glint" style={{ left: `${x}%`, top: `${y}%`, '--g': i }} />)}
    </div>
  )
}

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
  // The three extras under the floor plan. A problem with any of them just means that box has nothing to show.
  const [extras, setExtras] = useState({ event: null, featured: '', post: null })
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchNextEvent().catch(() => null), fetchFeaturedSlug().catch(() => ''), fetchLatestPost().catch(() => null)]).then(([event, featured, post]) => {
      if (!cancelled) setExtras({ event, featured, post })
    })
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
        <HeroArt />
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
                <span className="sf-roomcard__name">{c.name}</span>{' '}
                <span className="sf-roomcard__tag">{c.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Next event, membership, the featured room and the latest post ---------- */}
      <HomeSections event={extras.event} featured={extras.featured} post={extras.post} />
    </div>
  )
}

import { ROOM_ICONS } from '../components/roomIcons'
import { ROOM_COLOURS, iconByKey } from './memberIcons'
import './profile.css'

const GOLD = '#f5c842'
// Points of a star or cog (n points, an outer and an inner radius) around a centre.
const spiky = (cx, cy, outer, inner, n, turn = 0) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / n - Math.PI / 2 + turn
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')

// The eight drawn from the banner backgrounds, in white on a 40 by 40 grid.
const DRAWN = {
  comet: (
    <>
      <path d="M6 34 L26 14" strokeWidth="3" />
      <path d="M4 26 L18 12" strokeWidth="2" />
      <circle cx="30" cy="10" r="5" fill={GOLD} strokeWidth="1.5" />
    </>
  ),
  'crescent-moon': (
    <>
      <path d="M25 6 A15 15 0 1 0 34 29 A12 12 0 0 1 25 6 Z" fill="#fff" stroke="none" />
      <polygon points={spiky(31, 11, 4, 1.6, 5)} fill={GOLD} strokeWidth="1" />
    </>
  ),
  planets: (
    <>
      <circle cx="19" cy="22" r="10" strokeWidth="2" />
      <ellipse cx="19" cy="22" rx="17" ry="5.5" transform="rotate(-20 19 22)" strokeWidth="2" />
      <circle cx="32" cy="8" r="3.5" fill={GOLD} strokeWidth="1.3" />
    </>
  ),
  'starry-sky': (
    <>
      <polygon points={spiky(15, 16, 9, 3.6, 5)} fill={GOLD} strokeWidth="1.3" />
      <polygon points={spiky(29, 27, 5.5, 2.2, 5)} fill={GOLD} strokeWidth="1.2" />
      <circle cx="9" cy="31" r="1.6" fill="#fff" stroke="none" />
      <circle cx="31" cy="8" r="1.4" fill="#fff" stroke="none" />
    </>
  ),
  cogs: (
    <>
      <polygon points={spiky(15, 25, 12, 9.4, 8)} strokeWidth="2" />
      <circle cx="15" cy="25" r="3.8" strokeWidth="2" />
      <polygon points={spiky(30, 11, 8, 6.4, 8)} strokeWidth="1.7" />
      <circle cx="30" cy="11" r="2.6" fill={GOLD} strokeWidth="1.2" />
    </>
  ),
  'hanging-lamp': (
    <>
      <path d="M20 2 L20 10" strokeWidth="2" />
      <polygon points="12,20 28,20 20,10" fill="#fff" strokeWidth="1.5" />
      <polygon points="20,22 5,38 35,38" fill="#ffe58c" fillOpacity=".9" strokeWidth="1.5" />
    </>
  ),
  starburst: (
    <>
      <polygon points={spiky(20, 20, 17, 3.8, 8)} fill="#fff" strokeWidth="1.5" />
    </>
  ),
  'book-stack': (
    <>
      <rect x="6" y="29" width="28" height="7" rx="2" strokeWidth="2" />
      <rect x="7.5" y="21" width="25" height="7" rx="2" strokeWidth="2" />
      <rect x="9" y="13" width="22" height="7" rx="2" strokeWidth="2" />
      <polygon points={spiky(20, 7, 5, 2, 5)} fill={GOLD} strokeWidth="1.1" />
    </>
  ),
}

// A member's chosen icon, as a round badge in its room's banner colours. With no icon chosen yet it is a plain grey circle.
export default function MemberIcon({ icon, size = 52, className = '' }) {
  const def = iconByKey[icon]
  const box = { width: size, height: size }
  if (!def) return <span className={`mi mi--none ${className}`.trim()} style={box} aria-hidden="true" />
  const [a, b] = ROOM_COLOURS[def.room]
  const style = { ...box, background: `linear-gradient(135deg, ${a}, ${b})` }
  if (def.kind === 'room') {
    return (
      <span className={`mi mi--room ${className}`.trim()} style={style} aria-hidden="true">
        <span className="mi__panel">
          <img src={ROOM_ICONS[def.room]} alt="" width="192" height="192" loading="lazy" decoding="async" />
        </span>
      </span>
    )
  }
  return (
    <span className={`mi mi--drawn ${className}`.trim()} style={style} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {DRAWN[def.key]}
      </svg>
    </span>
  )
}

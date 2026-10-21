import { litStars } from './atlasRules'

// One room's planet: a ball in the room's colour with a ring round it. It brightens as the room's stamps are earned, and is a faint outline until the first one.
// Decoration only (the words next to it say how many stamps), so it has no description.
export default function Planet({ colour, count, total, size = 38 }) {
  const lit = litStars(count, total)
  const share = total > 0 ? lit / total : 0
  const ghost = lit === 0
  const id = `pl-${String(colour).replace('#', '')}-${size}`
  return (
    <svg className="at__planet" width={size} height={size * 0.8} viewBox="0 0 48 38" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="45%" stopColor={colour} />
          <stop offset="100%" stopColor="#070b26" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="19" r="12" fill={ghost ? 'none' : `url(#${id})`} stroke={ghost ? '#8791bd' : 'none'} strokeWidth={ghost ? 1.5 : 0} opacity={ghost ? 0.9 : 0.4 + 0.6 * share} />
      <ellipse cx="24" cy="21" rx="21" ry="6" fill="none" stroke={ghost ? '#8791bd' : '#070b26'} strokeWidth="1.6" transform="rotate(-14 24 21)" opacity={ghost ? 0.9 : 0.85} />
    </svg>
  )
}

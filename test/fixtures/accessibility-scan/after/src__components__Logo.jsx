import { Link } from 'react-router-dom'

// The shooting-star mark. `color` is used for the star and its three trails.
export function StarMark({ width = 56, color = '#2E8FD0' }) {
  return (
    <svg width={width} height={(width * 40) / 64} viewBox="0 0 64 40" fill="none" aria-hidden="true">
      <path
        d="M18 8 L21.409 17.308 L31.315 17.674 L23.516 23.792 L26.229 33.326 L18 27.8 L9.771 33.326 L12.484 23.792 L4.685 17.674 L14.591 17.308 Z"
        fill={color}
      />
      <path d="M36 13 Q48 7 60 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M38 20 Q50 18 62 19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M36 27 Q47 28 56 30" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ dark = false, onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`sf-logo${dark ? ' sf-logo--dark' : ''}`}
      aria-label="Starscapes Factory home"
    >
      <StarMark color={dark ? '#DCE6FF' : '#2E8FD0'} />
      <span className="sf-logo__word">Starscapes</span>{' '}
      <span className="sf-logo__script">Factory</span>
    </Link>
  )
}

// The galaxy picture: two spiral arms of dots round a soft glow. It is placeholder art drawn in code (Gill's own artwork will replace it): the same shape every time,
// with the first dots lit in the room colours as stardust is earned. `ghost` is the free-account look: a faint outline with three bright starter stars.
const ARM_DOTS = 44
const COLOURS = ['#2f5fd0', '#8fd3f4', '#f2a93b', '#1fb5a5', '#ff7a90', '#ffd84a', '#9b6bdb', '#4cc27a']

function dots() {
  const list = []
  for (let arm = 0; arm < 2; arm += 1) {
    for (let i = 0; i < ARM_DOTS; i += 1) {
      const t = i / (ARM_DOTS - 1)
      const angle = arm * Math.PI + t * Math.PI * 2.6
      const radius = 14 + t * 118
      list.push({ x: 210 + Math.cos(angle) * radius * 1.25, y: 140 + Math.sin(angle) * radius * 0.78, r: 2 + (1 - t) * 1.6, i: arm * ARM_DOTS + i })
    }
  }
  return list
}
const ALL = dots()

export default function GalaxyArt({ percent = 0, ghost = false }) {
  const lit = ghost ? 0 : Math.round((percent / 100) * ALL.length)
  return (
    <svg className="at__galaxy" viewBox="0 0 420 280" role="img" aria-label={ghost ? 'A faint outline of your galaxy, with three bright stars' : `Your galaxy, ${percent} percent lit`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="atGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3c4" stopOpacity={ghost ? 0.35 : 0.95} />
          <stop offset="45%" stopColor="#3a56b8" stopOpacity={ghost ? 0.2 : 0.55} />
          <stop offset="100%" stopColor="#070b26" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="420" height="280" fill="#070b26" />
      <ellipse cx="210" cy="140" rx="190" ry="120" fill="url(#atGlow)" />
      {ALL.map((d) => {
        const on = d.i < lit
        return <circle key={d.i} cx={d.x} cy={d.y} r={on ? d.r + 0.8 : d.r * 0.7} fill={on ? COLOURS[d.i % COLOURS.length] : '#8d9bd6'} opacity={on ? 1 : 0.3} />
      })}
      {ghost && (
        <>
          <path d="M96 78l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#ef5f86" transform="translate(-6 -6)" />
          <path d="M96 78l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#f2c230" transform="translate(222 -16)" />
          <path d="M96 78l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#3fb872" transform="translate(96 114)" />
        </>
      )}
    </svg>
  )
}

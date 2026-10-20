// The little line-art pictures that sit on the right of a starry banner (the "Banner picture" designs in Figma). Each is drawn in the same navy-and-gold style
// as the room icons: blue shapes with a pale outline, a gold star, and white sparkles. They are decoration, so the banner hides them from screen readers.
const star = (cx, cy, r, key) => {
  const p = []
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return <polygon key={key} points={p.join(' ')} fill="#F5C842" stroke="#FFE49A" strokeWidth="1.2" strokeLinejoin="round" />
}
const sparkle = (cx, cy, r, key) => (
  <path key={key} d={`M${cx} ${cy - r}L${cx + r * 0.28} ${cy - r * 0.28}L${cx + r} ${cy}L${cx + r * 0.28} ${cy + r * 0.28}L${cx} ${cy + r}L${cx - r * 0.28} ${cy + r * 0.28}L${cx - r} ${cy}L${cx - r * 0.28} ${cy - r * 0.28}Z`} fill="#fff" opacity=".9" />
)
const OUT = { stroke: '#C9D8FF', strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' }
const BLUE = '#5A78C6'
const LIGHT = '#8CA6E8'
const rect = (x, y, w, h, r, fill = BLUE, key) => <rect key={key} x={x} y={y} width={w} height={h} rx={r} fill={fill} {...OUT} />
const line = (x1, y1, x2, y2, key, o = 0.8) => <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} {...OUT} opacity={o} />
const ground = <line key="g" x1="16" y1="156" x2="384" y2="156" {...OUT} opacity=".55" />

// A stack of books: the width and left edge of each book, from the top down.
const stack = (x, top, widths, key) => widths.map((w, i) => rect(x + (108 - w) / 2, top + i * 22, w, 20, 4, i % 2 ? LIGHT : BLUE, `${key}${i}`))

const ARTS = {
  // Knowledge Nook: two stacks of books, one of five and one of three, each with a gold star on top.
  nook: [
    ground,
    ...stack(250, 40, [92, 100, 88, 104, 108], 'a'),
    ...stack(56, 84, [96, 104, 108], 'b'),
    star(304, 22, 14, 's1'),
    star(110, 66, 14, 's2'),
    sparkle(30, 40, 7, 'p1'), sparkle(200, 30, 6, 'p2'), sparkle(380, 64, 7, 'p3'), sparkle(196, 110, 5, 'p4'),
  ],
  // Come Write With Me: an unrolling scroll and a quill.
  story: [
    ground,
    rect(86, 48, 200, 96, 10, BLUE, 'sc'),
    <circle key="l1" cx="86" cy="96" r="22" fill={LIGHT} {...OUT} />, <circle key="l2" cx="86" cy="96" r="9" fill="none" {...OUT} />,
    <circle key="r1" cx="286" cy="96" r="22" fill={LIGHT} {...OUT} />, <circle key="r2" cx="286" cy="96" r="9" fill="none" {...OUT} />,
    ...[0, 1, 2, 3, 4].map((i) => line(110, 68 + i * 14, i === 4 ? 190 : 262, 68 + i * 14, `t${i}`)),
    <path key="q1" d="M330 22 C360 40 344 86 296 120 C296 100 300 76 316 56 C320 46 326 34 330 22Z" fill="#fff" {...OUT} />,
    <path key="q2" d="M322 44 L300 116" stroke="#C9D8FF" strokeWidth="1.6" fill="none" />,
    <path key="q3" d="M296 120 L286 138" stroke="#F5C842" strokeWidth="3" strokeLinecap="round" />,
    star(250, 26, 13, 's'), sparkle(40, 50, 7, 'p1'), sparkle(210, 22, 6, 'p2'), sparkle(372, 120, 6, 'p3'), sparkle(40, 140, 5, 'p4'),
  ],
  // Leading from the Middle: a mountain, with a flag at the top and a gold dot marking the middle of the climb.
  mountain: [
    <path key="m1" d="M222 156 L292 84 L322 112 L350 90 L392 156 Z" fill={BLUE} {...OUT} />,
    <path key="m2" d="M8 156 L74 98 L104 124 L136 80 L196 156 Z" fill={BLUE} {...OUT} />,
    <path key="m3" d="M96 156 L200 44 L304 156 Z" fill={LIGHT} {...OUT} />,
    <path key="m4" d="M200 44 L176 70 L190 66 L200 78 L212 64 L226 70 Z" fill="#fff" {...OUT} />,
    <path key="m5" d="M200 156 C170 146 230 132 196 118 C168 108 222 98 198 88" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" opacity=".8" />,
    <line key="m6" x1="200" y1="44" x2="200" y2="24" stroke="#C9D8FF" strokeWidth="1.8" strokeLinecap="round" />,
    <path key="m7" d="M200 24 L220 30 L200 36Z" fill="#F5C842" stroke="#FFE49A" strokeWidth="1.2" strokeLinejoin="round" />,
    <circle key="m8" cx="200" cy="108" r="6" fill="#F5C842" stroke="#FFE49A" strokeWidth="1.2" />,
    ground, star(150, 34, 13, 's1'), star(262, 40, 9, 's2'),
    sparkle(40, 44, 7, 'p1'), sparkle(372, 40, 7, 'p2'), sparkle(100, 60, 5, 'p3'), sparkle(330, 60, 5, 'p4'),
  ],
  // Archive Entries: a filing cabinet and two archive boxes, each topped with a gold star.
  archive: [
    ground,
    rect(50, 30, 130, 124, 8, BLUE, 'c'),
    ...[0, 1, 2].flatMap((i) => [rect(58, 38 + i * 38, 114, 32, 5, LIGHT, `d${i}`), line(100, 54 + i * 38, 130, 54 + i * 38, `h${i}`, 0.9), <rect key={`l${i}`} x="136" y={46 + i * 38} width="26" height="10" rx="3" fill="#F5C842" opacity=".9" />]),
    star(115, 14, 13, 's1'),
    rect(236, 112, 130, 42, 5, BLUE, 'b1'), rect(231, 102, 140, 13, 4, LIGHT, 'b1l'), <rect key="b1t" x="286" y="126" width="30" height="11" rx="3" fill="#F5C842" opacity=".9" />,
    rect(252, 66, 100, 38, 5, BLUE, 'b2'), rect(247, 56, 110, 12, 4, LIGHT, 'b2l'), <rect key="b2t" x="286" y="78" width="30" height="10" rx="3" fill="#F5C842" opacity=".9" />,
    star(302, 36, 13, 's2'), sparkle(210, 40, 8, 'p1'), sparkle(380, 70, 6, 'p2'), sparkle(20, 90, 6, 'p3'), sparkle(205, 120, 5, 'p4'),
  ],
  // The Author's Notebook: an open notebook with a pen and a bookmark.
  notebook: [
    ground,
    <path key="n1" d="M60 52 L198 64 L198 152 L60 140 Z" fill={BLUE} {...OUT} />,
    <path key="n2" d="M202 64 L340 52 L340 140 L202 152 Z" fill={LIGHT} {...OUT} />,
    ...[0, 1, 2, 3].map((i) => line(76, 76 + i * 16, 182, 86 + i * 16, `a${i}`)),
    ...[0, 1, 2].map((i) => line(222, 86 + i * 16, 324, 76 + i * 16, `b${i}`)),
    <path key="n3" d="M300 40 L300 70 L308 63 L316 70 L316 40Z" fill="#F5C842" stroke="#FFE49A" strokeWidth="1.2" />,
    <g key="n4" transform="rotate(-38 258 100)"><rect x="236" y="94" width="68" height="11" rx="4" fill="#fff" {...OUT} /><polygon points="236,94 220,99.5 236,105" fill="#F5C842" stroke="#FFE49A" strokeWidth="1.2" /></g>,
    star(150, 32, 14, 's'), sparkle(60, 24, 7, 'p1'), sparkle(372, 34, 7, 'p2'), sparkle(236, 28, 5, 'p3'), sparkle(26, 110, 5, 'p4'),
  ],
  // Blog posts: a fan of post cards and a pen.
  blog: [
    ground,
    <g key="b1" transform="rotate(-8 150 98)">{rect(90, 46, 120, 104, 8, BLUE, 'c1')}</g>,
    <g key="b2" transform="rotate(6 230 96)">{rect(170, 44, 120, 104, 8, LIGHT, 'c2')}</g>,
    <g key="b3" transform="rotate(-2 200 92)">{rect(140, 40, 120, 104, 8, BLUE, 'c3')}<rect x="152" y="52" width="40" height="34" rx="5" fill={LIGHT} {...OUT} />{line(202, 58, 248, 58, 'x1')}{line(202, 72, 240, 72, 'x2')}{line(152, 100, 248, 100, 'x3')}{line(152, 114, 248, 114, 'x4')}{line(152, 128, 222, 128, 'x5')}</g>,
    star(172, 34, 13, 's'),
    <g key="b4" transform="rotate(-38 322 96)"><rect x="288" y="90" width="68" height="11" rx="4" fill="#fff" {...OUT} /><polygon points="288,90 272,95.5 288,101" fill="#F5C842" stroke="#FFE49A" strokeWidth="1.2" /></g>,
    sparkle(60, 40, 7, 'p1'), sparkle(360, 34, 7, 'p2'), sparkle(30, 120, 5, 'p3'), sparkle(300, 150, 5, 'p4'),
  ],
  // No picture: just the stars (a plain starry banner, for pages with no room of their own).
  plain: [],
}

export default function BannerArt({ name }) {
  const art = ARTS[name]
  if (!art || art.length === 0) return null
  return (
    <svg className="pb__art" viewBox="0 0 400 170" aria-hidden="true" focusable="false">
      {art}
    </svg>
  )
}

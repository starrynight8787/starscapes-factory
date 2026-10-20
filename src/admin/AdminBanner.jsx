import { Link } from 'react-router-dom'
import './adminv2.css'

// The starry navy banner at the top of every admin page (the "Admin v2" designs in Figma): a small gold chip, the page title, a line under it, and a
// little line-art picture on the right. The picture is decoration, so it is hidden from screen readers.
const STAR = (cx, cy, r) => {
  const p = []
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return <polygon points={p.join(' ')} fill="#F5C842" stroke="#FFE49A" strokeWidth="1.2" strokeLinejoin="round" />
}
const SPARK = (cx, cy, r) => (
  <path d={`M${cx} ${cy - r}L${cx + r * 0.28} ${cy - r * 0.28}L${cx + r} ${cy}L${cx + r * 0.28} ${cy + r * 0.28}L${cx} ${cy + r}L${cx - r * 0.28} ${cy + r * 0.28}L${cx - r} ${cy}L${cx - r * 0.28} ${cy - r * 0.28}Z`} fill="#fff" opacity=".9" />
)
const line = { stroke: '#C9D8FF', strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' }
const BLUE = '#5A78C6'
const LIGHT = '#8CA6E8'
const Rect = (x, y, w, h, r, fill = BLUE) => <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} {...line} />
const Ln = (x1, y1, x2, y2) => <line x1={x1} y1={y1} x2={x2} y2={y2} {...line} />

const ART = {
  console: (<g><path d="M60 100 L120 30 L150 58 L180 36 L230 100 Z" fill={BLUE} {...line} /><path d="M120 30 L104 48 L114 46 L120 56 L128 44 L138 48Z" fill="#fff" />{STAR(120, 16, 12)}{STAR(196, 22, 8)}{SPARK(30, 30, 7)}{SPARK(240, 60, 6)}{Ln(16, 100, 244, 100)}</g>),
  door: (<g>{Rect(80, 16, 70, 104, 6)}{Rect(90, 26, 50, 84, 4, LIGHT)}<circle cx="132" cy="70" r="4" fill="#F5C842" />{STAR(115, 6, 9)}{SPARK(30, 40, 7)}{SPARK(190, 50, 6)}{SPARK(180, 110, 5)}</g>),
  home: (<g><path d="M50 70 L115 18 L180 70 V120 H50Z" fill={BLUE} {...line} />{Rect(98, 80, 34, 40, 4, LIGHT)}{STAR(115, 8, 9)}{SPARK(30, 40, 7)}{SPARK(200, 40, 6)}</g>),
  ideas: (<g><path d="M115 14 a38 38 0 0 0 -22 68 c6 6 8 12 8 20 h28 c0-8 2-14 8-20 a38 38 0 0 0 -22 -68z" fill={BLUE} {...line} />{Rect(100, 108, 30, 10, 4, LIGHT)}{STAR(160, 24, 10)}{SPARK(52, 40, 7)}{SPARK(190, 90, 6)}</g>),
  books: (<g>{Rect(60, 86, 120, 28, 4)}{Rect(70, 58, 100, 28, 4, LIGHT)}{Rect(64, 30, 108, 28, 4)}{STAR(150, 14, 10)}{SPARK(40, 50, 7)}{SPARK(196, 70, 6)}</g>),
  post: (<g>{Rect(70, 20, 100, 100, 8)}{Ln(86, 48, 154, 48)}{Ln(86, 66, 154, 66)}{Ln(86, 84, 130, 84)}<g transform="rotate(35 170 90)"><rect x="162" y="48" width="14" height="56" rx="4" fill="#fff" {...line} /><polygon points="162,104 176,104 169,120" fill="#F5C842" stroke="#FFE49A" /></g>{STAR(60, 18, 10)}{SPARK(206, 40, 6)}</g>),
  hub: (<g>{Rect(50, 24, 100, 78, 6)}{Rect(60, 34, 80, 58, 3, LIGHT)}<path d="M64 84 L88 58 L106 76 L118 64 L136 84Z" fill="#fff" opacity=".85" />{Ln(80, 102, 66, 124)}{Ln(120, 102, 134, 124)}<g transform="rotate(30 178 80)"><rect x="170" y="36" width="14" height="60" rx="4" fill="#fff" {...line} /><polygon points="170,96 184,96 177,114" fill="#F5C842" stroke="#FFE49A" /></g>{STAR(160, 16, 10)}{SPARK(24, 44, 7)}{SPARK(210, 112, 6)}</g>),
  originals: (<g>{Rect(60, 20, 110, 90, 4, '#F5C842')}{Rect(70, 30, 90, 70, 2, BLUE)}<circle cx="132" cy="50" r="9" fill="#fff" opacity=".9" /><path d="M70 100 L100 68 L122 90 L138 76 L160 100Z" fill={LIGHT} />{STAR(180, 18, 10)}{SPARK(36, 46, 7)}{SPARK(196, 92, 6)}</g>),
  posts: (<g>{Rect(40, 34, 120, 84, 8)}{Ln(56, 54, 144, 54)}{Ln(56, 70, 144, 70)}{Ln(56, 86, 110, 86)}{Rect(112, 16, 100, 84, 8, LIGHT)}{Ln(128, 36, 196, 36)}{Ln(128, 52, 196, 52)}{Ln(128, 68, 170, 68)}{STAR(200, 12, 10)}{SPARK(20, 50, 7)}{SPARK(220, 116, 6)}</g>),
}

export default function AdminBanner({ chip, title, subtitle, icon = 'console', back = true }) {
  return (
    <>
      {back && (
        <p className="ad-back">
          <Link className="ad-back__link" to="/admin">← Back to Admin</Link>
        </p>
      )}
      <header className="adb">
        <div className="adb__text">
          {chip && <p className="adb__chip">{chip}</p>}
          <h1 className="adb__title">{title}</h1>
          {subtitle && <p className="adb__subtitle">{subtitle}</p>}
        </div>
        <svg className="adb__art" viewBox="0 0 240 136" aria-hidden="true" focusable="false">{ART[icon] || ART.console}</svg>
      </header>
    </>
  )
}

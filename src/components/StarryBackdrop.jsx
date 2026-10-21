import '../styles/site.css'

// The starry backdrop behind the floor plan (the "Home v3" design): a soft nebula, faint orbits, two constellations, a sweep of light and twelve glints.
// It is decoration only, so it is hidden from screen readers.
const GLINTS = [[6, 30], [15, 10], [11, 43], [3, 56], [94, 22], [89, 9], [92, 43], [97, 59], [20, 94], [77, 95], [43, 3], [59, 2], [25, 26], [34, 6], [66, 5], [75, 12], [8, 18], [17, 70], [4, 76], [90, 70], [85, 88], [30, 90], [52, 92], [68, 90], [96, 12], [2, 8], [48, 94], [13, 82]]
export default function StarryBackdrop() {
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
      <svg className="sf-planet" viewBox="0 0 130 90" focusable="false">
        <g transform="rotate(-18 65 45)">
          <path d="M9 45 A56 15 0 0 1 121 45" fill="none" stroke="#c9d8ff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="65" cy="45" r="26" fill="#7c9be8" stroke="#dce6ff" strokeWidth="2" />
          <path d="M42 36 Q65 30 88 36 M40 48 Q65 42 90 48 M44 60 Q65 55 86 60" fill="none" stroke="#dce6ff" strokeWidth="2" opacity=".5" />
          <path d="M9 45 A56 15 0 0 0 121 45" fill="none" stroke="#e8f0ff" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>
      <span className="sf-moon" />
      <span className="sf-goldstar" />
      <span className="sf-shoot sf-shoot--l" />
      <span className="sf-shoot sf-shoot--r" />
      {GLINTS.map(([x, y], i) => <span key={i} className="sf-glint" style={{ left: `${x}%`, top: `${y}%`, '--g': i }} />)}
    </div>
  )
}


import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #e5e5e5',
        marginTop: 60,
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <Link to="/page/about" style={{ margin: '0 10px' }}>About</Link>
        <Link to="/page/contact" style={{ margin: '0 10px' }}>Contact</Link>
        <Link to="/page/terms" style={{ margin: '0 10px' }}>Terms & Conditions</Link>
        <Link to="/page/privacy" style={{ margin: '0 10px' }}>Privacy Policy</Link>
        <Link to="/page/ai-policy" style={{ margin: '0 10px' }}>AI Policy</Link>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        © {new Date().getFullYear()} Starscapes Factory
      </p>
    </footer>
  )
}
import StarryBackdrop from '../components/StarryBackdrop'
import './postit.css'

// A page's picture on the lavender Post-it, on the homepage's night sky (the look of the homepage's floor plan). Used by the room pages and the Art Loft.
export default function PostitFrame({ children }) {
  return (
    <div className="sf-home rs-sky">
      <div className="sf-hero rs-hero">
        <StarryBackdrop />
        <div className="rs-frame">{children}</div>
      </div>
    </div>
  )
}

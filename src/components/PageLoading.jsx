import '../pages/systempages.css'

// The page shown while the site gets ready: a word and a line, announced politely to a screen reader.
export default function PageLoading({ label = 'Loading\u2026' }) {
  return (
    <div className="sp-loading" role="status" aria-live="polite">
      <p className="sp-loading__word">{label}</p>
      <p className="sp-loading__sub">Just a moment.</p>
    </div>
  )
}

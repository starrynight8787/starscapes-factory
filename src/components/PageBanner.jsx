import './pagebanner.css'

// The banner at the top of a page (the navy panel in the Figma designs for the Leadership Blog, YouTube and Book Club). It holds a small chip, the page's
// heading, a line under it, any buttons (as children), and, if given, a picture on the right. The picture is decoration, so it has no description.
export default function PageBanner({ chip, title, subtitle, picture, children }) {
  return (
    <header className="pb">
      <div className="pb__text">
        {chip && <p className="pb__chip">{chip}</p>}
        <h1 className="pb__title">{title}</h1>
        {subtitle && <p className="pb__subtitle">{subtitle}</p>}
        {children && <div className="pb__buttons">{children}</div>}
      </div>
      {picture && (
        <div className="pb__picture">
          <img src={picture} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
        </div>
      )}
    </header>
  )
}

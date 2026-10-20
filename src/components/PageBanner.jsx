import './pagebanner.css'
import BannerArt from './BannerArt'

// The banner at the top of a page (the navy panel in the Figma designs for the Leadership Blog, YouTube and Book Club). It holds a small chip, the page's
// heading, a line under it, any buttons (as children), and, if given, a picture on the right. The picture is decoration, so it has no description.
// The picture on the right of a starry banner: a line drawing for a room, or Sarah Jr.'s patchwork bear. Decoration, so it has no description.
export function BannerPicture({ art }) {
  if (art === 'sarah-jr') return <img className="pb__art pb__art--bear" src="/sarah-jr/bear.png" alt="" width="260" height="273" loading="lazy" />
  return <BannerArt name={art} />
}

export default function PageBanner({ chip, title, subtitle, picture, art, children }) {
  // art: the name of a starry line-art picture (see BannerArt), or 'plain' for stars only. It makes the banner starry and replaces the picture panel.
  return (
    <header className={`pb${art ? ' pb--starry' : ''}`}>
      <div className="pb__text">
        {chip && <p className="pb__chip">{chip}</p>}
        <h1 className="pb__title">{title}</h1>
        {subtitle && <p className="pb__subtitle">{subtitle}</p>}
        {children && <div className="pb__buttons">{children}</div>}
      </div>
      {art && <BannerPicture art={art} />}
      {!art && picture && (
        <div className="pb__picture">
          <img src={picture} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
        </div>
      )}
    </header>
  )
}

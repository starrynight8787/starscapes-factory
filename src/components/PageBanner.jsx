import './pagebanner.css'
import './pagebanner-rooms.css'
import BannerArt from './BannerArt'

// The banner at the top of a page (the navy panel in the Figma designs for the Leadership Blog, YouTube and Book Club). It holds a small chip, the page's
// heading, a line under it, any buttons (as children), and, if given, a picture on the right. The picture is decoration, so it has no description.
// The picture on the right of a starry banner: a line drawing for a room, or Sarah Jr.'s patchwork bear. Decoration, so it has no description.
export function BannerPicture({ art }) {
  if (art === 'sarah-jr') return <img className="pb__art pb__art--bear" src="/sarah-jr/bear.png" alt="" width="260" height="273" loading="lazy" />
  return <BannerArt name={art} />
}

// A row of translucent books standing along the bottom edge of a starry banner (Figma: "Option B: a shelf of books along the bottom"). Decoration only.
export function ShelfBooks() {
  return (
    <span className="pb__shelf" aria-hidden="true">
      {Array.from({ length: 64 }, (_, i) => <span key={i} className="pb__book" />)}
    </span>
  )
}

export default function PageBanner({ chip, title, subtitle, picture, art, room, shelf, children }) {
  // art: the name of a starry line-art picture (see BannerArt), or 'plain' for stars only. It makes the banner starry and replaces the picture panel.
  // room: the room this page belongs to. Its full-width starry background (public/banners/<room>-d.webp and -m.webp) replaces the picture on the right.
  const inRoom = Boolean(room) && !shelf
  return (
    <header className={`pb${art || shelf || inRoom ? ' pb--starry' : ''}${shelf ? ' pb--shelf' : ''}${inRoom ? ` pb--room pb--room-${room}` : ''}`}>
      <div className="pb__text">
        {chip && <p className="pb__chip">{chip}</p>}
        <h1 className="pb__title">{title}</h1>
        {subtitle && <p className="pb__subtitle">{subtitle}</p>}
        {children && <div className="pb__buttons">{children}</div>}
      </div>
            {shelf && <ShelfBooks />}
      {!art && !shelf && !inRoom && picture && (
        <div className="pb__picture">
          <img src={picture} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
        </div>
      )}
    </header>
  )
}

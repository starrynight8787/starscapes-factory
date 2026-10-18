import { Link } from 'react-router-dom'
import RoomIcon from '../components/RoomIcon'
import { StarMark } from '../components/Logo'
import { roomPath } from '../data/roomImages'
import { channels } from '../data/channels'
import { PROJECT_SOCIALS } from '../data/contact'
import { MEMBERSHIP } from '../data/membership'
import { SITE_URL } from '../ebook/ebookConfig'
import { formatDate } from '../rooms/postRules'
import { featuredRoomSlug, formatEventWhen, icsHref, isYouTube, makeIcs } from './homeRules'
import '../styles/pages.css'
import '../styles/forms.css'
import './homeSections.css'

// The boxes under the floor plan on the home page, from the Figma design "Row: Home v2": Next event and Membership side by side, the Featured room,
// and the Latest post. Each takes what it shows as a plain prop, so it can be tested without a database.

export function NextEventBox({ event }) {
  const youtube = (PROJECT_SOCIALS['drafting-desk'] || {}).youtube
  const link = (event && event.link_url) || youtube
  const watch = link && isYouTube(link)
  return (
    <section className="hs__card hs__event" aria-labelledby="hs-event-title">
      <p className="hs__label">Next event</p>
      {event ? (
        <>
          <h2 id="hs-event-title" className="hs__title">{event.title}</h2>
          <p className="hs__when">{formatEventWhen(event.starts_at)}</p>
          {event.description && <p className="hs__text">{event.description}</p>}
          <div className="hs__buttons">
            <a className="pg-btn fm-btn--primary" href={icsHref(makeIcs(event, { siteUrl: SITE_URL }))} download="starscapes-event.ics">Add to calendar</a>
            {link && (
              <a className="pg-btn" href={link} target="_blank" rel="noopener noreferrer" aria-label={`${watch ? 'Watch on YouTube' : 'Find out more'} (opens in a new tab)`}>
                {watch ? 'Watch on YouTube' : 'Find out more'} ↗
              </a>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 id="hs-event-title" className="hs__title">No event planned yet</h2>
          <p className="hs__text">Check back soon.</p>
        </>
      )}
    </section>
  )
}

export function MembershipBox() {
  return (
    <section className="hs__card hs__card--panel hs__membership" aria-labelledby="hs-membership-title">
      <div className="hs__labelrow">
        <p className="hs__label">Membership</p>
        {!MEMBERSHIP.open && <span className="pg-chip hs__soon">{MEMBERSHIP.buttonWhileClosed}</span>}
      </div>
      <h2 id="hs-membership-title" className="hs__title hs__title--small">{MEMBERSHIP.name}</h2>
      <p className="hs__tagline">{MEMBERSHIP.line}</p>
      <p className="hs__text">{MEMBERSHIP.textWhileClosed}</p>
      {!MEMBERSHIP.open && <button type="button" className="pg-btn fm-btn--primary hs__full" disabled>{MEMBERSHIP.buttonWhileClosed}</button>}
    </section>
  )
}

export function FeaturedRoomBox({ slug }) {
  const room = channels.find((c) => c.slug === featuredRoomSlug(slug, channels.map((c) => c.slug)))
  if (!room) return null
  return (
    <section className="hs__card hs__room" aria-labelledby="hs-room-title">
      <div className="hs__roompic">
        <RoomIcon room={room.slug} size={140} />
        <span className="hs__plaque">{room.name}</span>
      </div>
      <div className="hs__roomtext">
        <p className="hs__label">Featured room</p>
        <h2 id="hs-room-title" className="hs__title">{room.name}</h2>
        <p className="hs__tagline">{room.tagline}</p>
        <p className="hs__text hs__text--large">{room.blurb}</p>
        <div className="hs__buttons">
          <Link className="pg-btn fm-btn--primary" to={roomPath(room.slug)}>Step inside {room.name}</Link>
        </div>
      </div>
    </section>
  )
}

export function LatestPostBox({ post }) {
  if (!post) return null
  const room = channels.find((c) => c.slug === post.channel)
  const date = formatDate(post.created_at)
  return (
    <section className="hs__card hs__post" aria-labelledby="hs-post-title">
      {post.image_url ? (
        <img className="hs__postimg" src={post.image_url} alt="" loading="lazy" />
      ) : (
        <div className="hs__postimg hs__postimg--empty"><StarMark width={72} color="#DCE6FF" /></div>
      )}
      <div className="hs__posttext">
        <p className="hs__label">Latest post</p>
        <h2 id="hs-post-title" className="hs__title hs__title--school">{post.title}</h2>
        <p className="hs__meta">{[room ? room.name : 'Blog', date].filter(Boolean).join(' · ')}</p>
        <div className="hs__buttons">
          <Link className="pg-btn fm-btn--primary" to={`/post/${post.id}`}>Read the post</Link>
          <Link className="pg-btn" to="/blog">See all posts</Link>
        </div>
      </div>
    </section>
  )
}

export default function HomeSections({ event, featured, post }) {
  return (
    <div className="hs">
      <div className="hs__top">
        <NextEventBox event={event} />
        <MembershipBox />
      </div>
      <FeaturedRoomBox slug={featured} />
      <LatestPostBox post={post} />
    </div>
  )
}

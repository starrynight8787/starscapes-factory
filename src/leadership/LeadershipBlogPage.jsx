import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import { fetchRoomPosts } from '../rooms/roomsApi'
import { formatDate, safeImage } from '../rooms/postRules'
import { AUDIOBOOK_URL, UDEMY_URL } from '../rooms/roomsData'
import useDoors from '../doors/useDoors'
import { StarMark } from '../components/Logo'
import PageBanner from '../components/PageBanner'
import NebulaBox from '../entries/NebulaBox'
import { BANNER_CHIP, BANNER_PICTURE, BLOCKS_INTRO, ROOM, SUBTITLE, WAYS } from './leadershipData'
import { blocksFrom, latestPosts, morePosts, pickFeatured } from './leadershipRules'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../styles/forms.css'
import './leadership.css'

// The Leadership Blog (at /leadership-lounge/blog), from the Figma design "Leadership Blog, layout B": a featured post, the six Building Blocks, boxes for
// the other ways in, the latest posts, and older posts that are not already on the page. Everything fills itself from the room's posts and their tags
// (see leadershipData.js). On a phone the boxes come in the order Featured, Building Blocks, ways in, Latest posts, More from the blog.
export default function LeadershipBlogPage() {
  useTitle('Leadership Blog')
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const { isOpen } = useDoors()
  const here = useLocation()
  const from = here.pathname

  useEffect(() => {
    let alive = true
    fetchRoomPosts(ROOM).then((data) => alive && (setPosts(data), setStatus('ready'))).catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [])

  const featured = useMemo(() => pickFeatured(posts), [posts])
  const blocks = useMemo(() => blocksFrom(posts), [posts])
  const latest = useMemo(() => latestPosts(posts), [posts])
  const more = useMemo(() => morePosts(posts, { featured, latest, blocks }), [posts, featured, latest, blocks])
  const firstBlock = blocks[0] ? blocks[0].post : null
  const ebookOpen = isOpen(ROOM, 'free-ebook')
  const picture = featured ? safeImage(featured.image_url) : ''

  return (
    <main className="rp lb">
      <p className="rp-back"><Link to={`/${ROOM}`}>← Back to Leadership Lounge</Link></p>
      <PageBanner chip={BANNER_CHIP} title="Leadership Blog" subtitle={SUBTITLE} art="mountain" room="leadership-lounge">
        {firstBlock && <Link className="pg-btn fm-btn--primary" to={`/post/${firstBlock.id}`} state={{ from }}>Start with Building Block 1</Link>}
      </PageBanner>
      {status === 'error' && <p className="rp-note" role="alert">The posts could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'ready' && posts.length === 0 && <p className="rp-note">The first post is on its way.</p>}

      <div className="lb__cols">
        <div className="lb__left">
          {featured && (
            <section className="lb__card lb__featured lb__o1" aria-labelledby="lb-featured-title">
              {picture ? <img className="lb__img" src={picture} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} /> : <div className="lb__img lb__img--empty"><StarMark width={72} color="#8AA2DA" /></div>}
              <p className="lb__meta"><span className="pg-chip">Featured</span> {formatDate(featured.created_at)}</p>
              <h2 id="lb-featured-title" className="lb__title">{featured.title}</h2>
              <div className="lb__buttons"><Link className="pg-btn fm-btn--primary" to={`/post/${featured.id}`} state={{ from }}>Read the post</Link></div>
            </section>
          )}

          <section className="lb__ways lb__o3" aria-labelledby="lb-ways-title">
            <h2 id="lb-ways-title" className="lb__h2">More ways in</h2>
            <div className="lb__boxes">
              {WAYS.map((w) => (
                <div key={w.id} className="lb__box">
                  <h3 className="lb__h3">{w.title}</h3>
                  {w.id === 'ebook' && !ebookOpen && <span className="pg-chip lb__soon">Opening soon</span>}
                  <p className="lb__text">{w.text}</p>
                  {w.id === 'ebook' && (ebookOpen
                    ? <Link className="pg-btn fm-btn--primary" to={`/${ROOM}/free-ebook`}>{w.button}</Link>
                    : <button type="button" className="pg-btn fm-btn--primary" disabled>{w.button}</button>)}
                  {w.id === 'audiobook' && <a className="pg-btn" href={AUDIOBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label={`${w.button} (opens in a new tab)`}>{w.button}</a>}
                  {w.id === 'course' && <a className="pg-btn" href={UDEMY_URL} target="_blank" rel="noopener noreferrer" aria-label={`${w.button} (opens in a new tab)`}>{w.button}</a>}
                </div>
              ))}
            </div>
          </section>

          {more.length > 0 && (
            <section className="lb__more lb__o5" aria-labelledby="lb-more-title">
              <h2 id="lb-more-title" className="lb__h2">More from the blog</h2>
              <ul className="rp-entries">{more.map((p) => <li key={p.id}><Link className="rp-entry" to={`/post/${p.id}`} state={{ from }}><span className="rp-entry__title">{p.title}</span>{formatDate(p.created_at) && <span className="rp-entry__date">{formatDate(p.created_at)}</span>}</Link></li>)}</ul>
            </section>
          )}
        </div>

        <div className="lb__right">
          <section className="lb__card lb__blocks lb__o2" aria-labelledby="lb-blocks-title">
            <h2 id="lb-blocks-title" className="lb__h3">Building Blocks</h2>
            <p className="lb__text">{BLOCKS_INTRO}</p>
            <ol className="lb__list">
              {blocks.map(({ number, post }) => (
                <li key={number}>
                  {post ? (
                    <Link className="lb__block" to={`/post/${post.id}`} state={{ from }}>
                      <span className="lb__num" aria-hidden="true">{number}</span>
                      <span className="lb__blocktext"><span className="lb__blocktitle">{post.title}</span><span className="lb__blockdate">{formatDate(post.created_at)}</span></span>
                    </Link>
                  ) : (
                    <div className="lb__block lb__block--soon">
                      <span className="lb__num" aria-hidden="true">{number}</span>
                      <span className="lb__blocktext"><span className="lb__blocktitle">Building Block {number}</span><span className="pg-chip lb__soon">Coming soon</span></span>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {latest.length > 0 && (
            <section className="lb__card lb__latest lb__o4" aria-labelledby="lb-latest-title">
              <h2 id="lb-latest-title" className="lb__h3">Latest posts</h2>
              <ul className="lb__latestlist">
                {latest.map((p) => (
                  <li key={p.id}>
                    <Link className="lb__latestitem" to={`/post/${p.id}`} state={{ from }}>
                      <span className="lb__latesttitle">{p.title}</span>
                      <span className="lb__blockdate">{formatDate(p.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="pg-btn" to="/blog">See all posts</Link>
            </section>
          )}

          <div className="lb__o6"><NebulaBox /></div>
        </div>
      </div>
    </main>
  )
}

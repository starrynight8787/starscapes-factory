import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import { StarMark } from '../components/Logo'
import { formatDate } from '../rooms/postRules'
import { fetchChapterPosts, fetchChapterRows, fetchStories } from './storiesApi'
import { buildChapters, chapterTag, completedStories, currentStory } from './storiesRules'
import { CHAPTERS, COMPLETED, PAGE, PINNED } from './storiesData'
import StoryVote from './StoryVote'
import PageBanner from '../components/PageBanner'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './stories.css'

const FROM = '/idea-hatchery/lets-write-a-story'
const SHOWN = 4 // finished stories shown before "See all completed stories"

function Picture({ src, className }) {
  return src
    ? <img className={className} src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
    : <div className={`${className} ls__pic--empty`} aria-hidden="true"><StarMark width={56} color="#8AA2DA" /></div>
}

function Tag({ number }) {
  const tag = chapterTag(number)
  return <span className={`ls__chip ls__chip--${tag.tone}`}>{tag.text}</span>
}

// The "Let's write a story" page behind the Idea Hatchery's beaker (Figma: "Stories v2"): the first chapter pinned, the vote box (in its "soon" state until the voting is built), the other
// chapters as cards (chapters 1 to 3 free, the rest for members), and the finished stories. Chapters are ordinary posts; the words of a members-only chapter are kept back by the database.
export default function LetsWriteStoryPage() {
  useTitle('Stories')
  const [state, setState] = useState({ status: 'loading', stories: [], rows: [], posts: [] })
  const [expanded, setExpanded] = useState(false)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [stories, rows] = await Promise.all([fetchStories(), fetchChapterRows()])
        const current = currentStory(stories)
        const doneIds = new Set(completedStories(stories).map((s) => s.id))
        // the posts we need: every chapter of the running story, and chapter 1 of each finished story (so it can be linked to)
        const wanted = rows.filter((r) => (current && r.story_id === current.id) || (doneIds.has(r.story_id) && r.number === 1)).map((r) => r.post_id)
        const posts = await fetchChapterPosts(wanted)
        if (alive) setState({ status: 'ready', stories, rows, posts })
      } catch (e) {
        if (alive) setState({ status: 'error', stories: [], rows: [], posts: [] })
      }
    })()
    return () => { alive = false }
  }, [])

  const story = useMemo(() => currentStory(state.stories), [state.stories])
  const done = useMemo(() => completedStories(state.stories), [state.stories])
  const chapters = useMemo(() => (story ? buildChapters(state.rows.filter((r) => r.story_id === story.id), state.posts) : []), [story, state.rows, state.posts])
  const first = chapters.find((c) => c.number === 1) || chapters[0] || null
  const others = chapters.filter((c) => c !== first)
  const latest = others.length > 0 ? others[others.length - 1] : null
  const firstOf = (s) => buildChapters(state.rows.filter((r) => r.story_id === s.id && r.number === 1), state.posts)[0] || null
  const doneShown = allDone ? done : done.slice(0, SHOWN)
  const empty = state.status === 'ready' && !story && done.length === 0

  return (
    <main className="rp ls">
      <p className="rp-back"><Link to="/idea-hatchery">← Back to {PAGE.back}</Link></p>
      <PageBanner chip="The Idea Hatchery" title={PAGE.title} subtitle={PAGE.subtitle} room="idea-hatchery" />
      {state.status === 'loading' && <p className="rp-note">Loading…</p>}
      {state.status === 'error' && <p className="rp-note" role="alert">The stories could not load just now. Please try again in a moment.</p>}
      {empty && <p className="rp-note">{PAGE.emptyTitle}</p>}
      {state.status === 'ready' && !story && done.length > 0 && <p className="rp-note">{PAGE.between}</p>}

      {state.status === 'ready' && (story || done.length > 0) && (
        <div className="ls__layout">
          <div className="ls__main">
            {story && (
              <section className="ls__box ls__pinned" aria-labelledby="ls-pinned-title">
                <Picture src={story.picture_url || (first && first.image)} className="ls__pic ls__pic--big" />
                <div className="ls__pinnedtext">
                  <p className="ls__chips"><span className="ls__chip ls__chip--navy">Pinned</span>{first && <Tag number={first.number} />}</p>
                  <p className="ls__label">{PINNED.label}</p>
                  <h2 id="ls-pinned-title" className="ls__script">{story.title}</h2>
                  {story.teaser && <p>{story.teaser}</p>}
                  {first
                    ? <Link className="pg-btn sg-btn--primary ls__btn" to={`/post/${first.postId}`} state={{ from: FROM }}>{PINNED.button}</Link>
                    : <p className="rp-note">The first chapter is on its way.</p>}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section aria-labelledby="ls-chapters-title">
                <h2 id="ls-chapters-title" className="ls__vh">{CHAPTERS.title}</h2>
                <ul className={`ls__grid${expanded ? ' is-expanded' : ''}`}>
                  {others.map((c) => (
                    <li key={c.postId} className="ls__card">
                      <Link className="ls__cardlink" to={`/post/${c.postId}`} state={{ from: FROM }}>
                        <Picture src={c.image} className="ls__pic" />
                        <span className="ls__chips"><Tag number={c.number} />{latest && c === latest && <span className="ls__chip ls__chip--navy">Latest</span>}</span>
                        <span className="ls__cardtitle">{c.title}</span>
                        <span className="ls__date">Chapter {c.number}{formatDate(c.createdAt) ? ` · ${formatDate(c.createdAt)}` : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {others.length > SHOWN && !expanded && <button type="button" className="pg-btn ls__more" onClick={() => setExpanded(true)}>{CHAPTERS.more}</button>}
              </section>
            )}
          </div>

          <aside className="ls__side" aria-label="The vote and finished stories">
            {story && <StoryVote story={story} />}
            <section className="ls__box ls__done" aria-labelledby="ls-done-title">
              <h2 id="ls-done-title" className="ls__h3">{COMPLETED.title}</h2>
              {done.length === 0 && <p className="rp-note">{COMPLETED.none}</p>}
              <ul className="ls__donelist">
                {doneShown.map((s) => {
                  const c = firstOf(s)
                  const body = (
                    <>
                      <Picture src={s.picture_url || (c && c.image)} className="ls__thumb" />
                      <span className="ls__donetext"><span className="ls__cardtitle">{s.title}</span><span className="ls__date">Finished {formatDate(`${s.finished_on}T00:00:00Z`)}</span></span>
                    </>
                  )
                  return <li key={s.id}>{c ? <Link className="ls__doneitem" to={`/post/${c.postId}`} state={{ from: FROM }}>{body}</Link> : <div className="ls__doneitem">{body}</div>}</li>
                })}
              </ul>
              {done.length > SHOWN && !allDone && <button type="button" className="pg-btn" onClick={() => setAllDone(true)}>{COMPLETED.button}</button>}
            </section>
          </aside>
        </div>
      )}
    </main>
  )
}

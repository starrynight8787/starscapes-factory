#!/usr/bin/env python3
"""Builds the new YouTube Series page: a banner, a pinned intro video and the latest seven videos, and the pinned-video choice in Admin.

Run it from the project folder, AFTER unzipping starscapes-youtube-18oct.zip into it:   python3 tools/add-youtube-v2.py

What it does: it makes exact edits to three files that already exist: the YouTube Series page and its styles, and the owner's Home page tool.
  src/admin/AdminHome.jsx, src/den/YouTubeSeriesPage.jsx, src/den/youtube.css

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-youtube-v2.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/youtube-intro.sql, src/den/youtubeRules.js, src/den/youtubeApi.js) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/admin/AdminHome.jsx": [
[
"import { cleanEvent, featuredRoomSlug, formatEventWhen, isoToLondonInputs } from '../home/homeRules'\nimport { fetchFeaturedSlug, listEvents, removeEvent, saveEvent, saveFeaturedSlug } from '../home/homeApi'\nimport '../styles/pages.css'\nimport './admin.css'\n",
"import { cleanEvent, featuredRoomSlug, formatEventWhen, isoToLondonInputs } from '../home/homeRules'\nimport { fetchFeaturedSlug, listEvents, removeEvent, saveEvent, saveFeaturedSlug } from '../home/homeApi'\nimport { clearIntroId, fetchIntroId, saveIntroId } from '../den/youtubeApi'\nimport { videoIdFrom } from '../den/youtubeRules'\nimport '../styles/pages.css'\nimport './admin.css'\n"
],
[
"  const [problem, setProblem] = useState('')\n  const [saved, setSaved] = useState('')\n\n  const load = useCallback(async () => {\n    try {\n      const [list, slug] = await Promise.all([listEvents(), fetchFeaturedSlug().catch(() => '')])\n      setEvents(list); setFeatured(featuredRoomSlug(slug, channels.map((c) => c.slug))); setStatus('ready')\n    } catch (e) { setProblem(e.message); setStatus('error') }\n  }, [])\n",
"  const [problem, setProblem] = useState('')\n  const [saved, setSaved] = useState('')\n  const [intro, setIntro] = useState('') // the pinned YouTube video now chosen ('' if none)\n  const [introText, setIntroText] = useState('')\n  const [introError, setIntroError] = useState('')\n\n  const load = useCallback(async () => {\n    try {\n      const [list, slug, chosen] = await Promise.all([listEvents(), fetchFeaturedSlug().catch(() => ''), fetchIntroId().catch(() => '')])\n      setEvents(list); setFeatured(featuredRoomSlug(slug, channels.map((c) => c.slug))); setIntro(chosen); setStatus('ready')\n    } catch (e) { setProblem(e.message); setStatus('error') }\n  }, [])\n"
],
[
"  }\n\n  const now = Date.now()\n  return (\n",
"  }\n\n  async function submitIntro(event) {\n    event.preventDefault(); setProblem(''); setSaved('')\n    const id = videoIdFrom(introText)\n    if (!id) { setIntroError('Paste the address of a YouTube video, or its 11-character code.'); return }\n    setIntroError('')\n    try { await saveIntroId(id); setIntro(id); setIntroText(''); setSaved('That video is now pinned at the top of the YouTube Series page.') } catch (e) { setProblem(e.message) }\n  }\n  async function unpinIntro() {\n    setProblem(''); setSaved('')\n    try { await clearIntroId(); setIntro(''); setSaved('Nothing is pinned now, so the YouTube Series page shows its newest video at the top.') } catch (e) { setProblem(e.message) }\n  }\n\n  const now = Date.now()\n  return (\n"
],
[
"          </Field>\n          <button type=\"submit\" className=\"pg-btn sg-btn--primary\">Save the featured room</button>\n        </form>\n      </section>\n",
"          </Field>\n          <button type=\"submit\" className=\"pg-btn sg-btn--primary\">Save the featured room</button>\n        </form>\n      </section>\n\n      <section aria-labelledby=\"ah-intro-title\">\n        <h2 id=\"ah-intro-title\">YouTube intro video</h2>\n        <p className=\"ad-note\">{intro ? <>Pinned now: <a href={`https://www.youtube.com/watch?v=${intro}`} target=\"_blank\" rel=\"noopener noreferrer\">this video (opens in a new tab)</a>.</> : 'None chosen, so the YouTube Series page pins its newest video.'}</p>\n        <form className=\"ab__form\" onSubmit={submitIntro} noValidate>\n          <ErrorSummary errors={introError ? [{ id: 'ah-intro', message: introError }] : []} />\n          <Field id=\"ah-intro\" label=\"Address of the video to pin\" help=\"Copy the address from your browser when you are watching it on YouTube.\" error={introError}>{(p) => <input {...p} type=\"text\" value={introText} onChange={(e) => setIntroText(e.target.value)} />}</Field>\n          <div className=\"ab__buttons\">\n            <button type=\"submit\" className=\"pg-btn sg-btn--primary\">Pin this video</button>\n            {intro && <button type=\"button\" className=\"pg-btn\" onClick={unpinIntro}>Unpin it</button>}\n          </div>\n        </form>\n      </section>\n"
]
],
"src/den/YouTubeSeriesPage.jsx": [
[
"import { Link } from 'react-router-dom'\nimport useTitle from '../rooms/useTitle'\nimport { SOCIAL_LINKS } from '../data/contact'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\nimport './youtube.css'\n\nconst when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }\nconst ID = /^[A-Za-z0-9_-]{11}$/\n\n// The YouTube Series page behind the Den's door (Figma: \"Gallery page: Sarah Jr.'s Den: YouTube Series\"). It fills itself from the channel's public feed\n// (api/youtube-series). Nothing from YouTube loads in a visitor's browser until they press play on a video: the pictures are passed along by this site.\nexport default function YouTubeSeriesPage() {\n  useTitle('YouTube Series')\n  const [state, setState] = useState({ status: 'loading', videos: [] })\n  const [playing, setPlaying] = useState('')\n\n  useEffect(() => {\n    let alive = true\n    fetch('/api/youtube-series')\n      .then((r) => r.json())\n      .then((body) => alive && setState(body && body.ok && Array.isArray(body.videos) ? { status: 'ready', videos: body.videos.filter((v) => v && ID.test(v.id)) } : { status: 'error', videos: [] }))\n      .catch(() => alive && setState({ status: 'error', videos: [] }))\n    return () => { alive = false }\n  }, [])\n\n  return (\n    <main className=\"rp yt\">\n      <p className=\"rp-back\"><Link to=\"/sarah-jrs-den\">← Back to Sarah Jr.&apos;s Den</Link></p>\n      <header className=\"rp-head\">\n        <h1>YouTube Series</h1>\n        <p className=\"rp-blurb\">Watch the adventures come to life.</p>\n        {SOCIAL_LINKS.youtube && <a className=\"pg-btn sg-btn--primary yt__subscribe\" href={SOCIAL_LINKS.youtube} target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Subscribe on YouTube (opens in a new tab)\">Subscribe on YouTube ↗</a>}\n      </header>\n      {state.status === 'loading' && <p className=\"rp-note\">Loading…</p>}\n      {state.status === 'error' && <p className=\"rp-note\" role=\"alert\">The videos could not load just now. Please try again in a moment.</p>}\n      {state.status === 'ready' && state.videos.length === 0 && <p className=\"rp-note\">The first adventure is on its way.</p>}\n      <ul className=\"yt__grid\">\n        {state.videos.map((v) => (\n          <li key={v.id} className=\"yt__card\">\n            {playing === v.id ? (\n              <iframe className=\"yt__frame\" title={v.title} src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} allow=\"autoplay; encrypted-media; picture-in-picture\" allowFullScreen />\n            ) : (\n              <button type=\"button\" className=\"yt__play\" onClick={() => setPlaying(v.id)} aria-label={`Play: ${v.title}`}>\n                <img src={`/api/youtube-thumb?id=${v.id}`} alt=\"\" loading=\"lazy\" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />\n                <span className=\"yt__icon\" aria-hidden=\"true\">▶</span>\n              </button>\n            )}\n            <h2 className=\"yt__title\">{v.title}</h2>\n            {v.published && <p className=\"yt__date\">{when(v.published)}</p>}\n          </li>\n        ))}\n      </ul>\n    </main>\n  )\n",
"import { Link } from 'react-router-dom'\nimport useTitle from '../rooms/useTitle'\nimport PageBanner from '../components/PageBanner'\nimport { SOCIAL_LINKS } from '../data/contact'\nimport { fetchIntroId, fetchSeries } from './youtubeApi'\nimport { ID, pickGrid, pickIntro } from './youtubeRules'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\nimport './youtube.css'\n\nconst when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }\n\n// One video that only loads from YouTube when it is pressed: until then it is a picture passed along by this site, so a visitor's browser never contacts YouTube.\nfunction Player({ video, big, playing, onPlay }) {\n  if (playing) return <iframe className={`yt__frame${big ? ' yt__frame--big' : ''}`} title={video.title} src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`} allow=\"autoplay; encrypted-media; picture-in-picture\" allowFullScreen />\n  return (\n    <button type=\"button\" className={`yt__play${big ? ' yt__play--big' : ''}`} onClick={onPlay} aria-label={`Play: ${video.title}`}>\n      <img src={`/api/youtube-thumb?id=${video.id}`} alt=\"\" loading=\"lazy\" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />\n      <span className=\"yt__icon\" aria-hidden=\"true\">▶</span>\n    </button>\n  )\n}\n\n// The YouTube Series page behind the Den's door (Figma: \"YouTube Series v2\"): a banner, the pinned intro video, and the latest videos. It fills itself from the\n// channel's public feed (api/youtube-series). The pinned video is the one Gill chooses in Admin, Home page, or the newest if she has not chosen one.\nexport default function YouTubeSeriesPage() {\n  useTitle('YouTube Series')\n  const [state, setState] = useState({ status: 'loading', videos: [] })\n  const [introId, setIntroId] = useState('')\n  const [playing, setPlaying] = useState('')\n  const [expanded, setExpanded] = useState(false)\n\n  useEffect(() => {\n    let alive = true\n    Promise.all([fetchSeries().then((videos) => ({ ok: true, videos: videos.filter((v) => v && ID.test(v.id)) })).catch(() => ({ ok: false, videos: [] })), fetchIntroId().catch(() => '')])\n      .then(([series, chosen]) => { if (alive) { setState({ status: series.ok ? 'ready' : 'error', videos: series.videos }); setIntroId(chosen) } })\n    return () => { alive = false }\n  }, [])\n\n  const intro = pickIntro(state.videos, introId)\n  const grid = pickGrid(state.videos, intro && intro.id)\n  const channel = SOCIAL_LINKS.youtube\n\n  return (\n    <main className=\"rp yt\">\n      <p className=\"rp-back\"><Link to=\"/sarah-jrs-den\">← Back to Sarah Jr.&apos;s Den</Link></p>\n      <PageBanner title=\"YouTube Series\" subtitle=\"Watch the adventures come to life.\" picture=\"/scenes/sarah-jrs-den/base.svg\">\n        {channel && <a className=\"pg-btn fm-btn--primary\" href={channel} target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Subscribe on YouTube (opens in a new tab)\">Subscribe on YouTube ↗</a>}\n      </PageBanner>\n      {state.status === 'loading' && <p className=\"rp-note\">Loading…</p>}\n      {state.status === 'error' && <p className=\"rp-note\" role=\"alert\">The videos could not load just now. Please try again in a moment.</p>}\n      {state.status === 'ready' && state.videos.length === 0 && !intro && <p className=\"rp-note\">The first adventure is on its way.</p>}\n\n      {intro && (\n        <section className=\"yt__card yt__intro\" aria-labelledby=\"yt-intro-title\">\n          <Player video={intro} big playing={playing === intro.id} onPlay={() => setPlaying(intro.id)} />\n          <p className=\"yt__meta\"><span className=\"pg-chip\">Start here</span> {intro.published ? when(intro.published) : 'The channel intro'}</p>\n          <h2 id=\"yt-intro-title\" className=\"yt__title\">{intro.title}</h2>\n          <div className=\"yt__buttons\"><a className=\"pg-btn fm-btn--primary\" href={`https://www.youtube.com/watch?v=${intro.id}`} target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Watch on YouTube (opens in a new tab)\">Watch on YouTube ↗</a></div>\n        </section>\n      )}\n\n      {grid.length > 0 && (\n        <section className=\"yt__latest\" aria-labelledby=\"yt-latest-title\">\n          <h2 id=\"yt-latest-title\" className=\"yt__h2\">Latest videos</h2>\n          <ul className={`yt__grid${expanded ? ' is-expanded' : ''}`}>\n            {grid.map((v) => (\n              <li key={v.id} className=\"yt__card\">\n                <Player video={v} playing={playing === v.id} onPlay={() => setPlaying(v.id)} />\n                <h3 className=\"yt__cardtitle\">{v.title}</h3>\n                {v.published && <p className=\"yt__date\">{when(v.published)}</p>}\n              </li>\n            ))}\n          </ul>\n          <div className=\"yt__after\">\n            {grid.length > 4 && !expanded && <button type=\"button\" className=\"pg-btn yt__more\" onClick={() => setExpanded(true)}>Show more videos</button>}\n            {channel && <a className=\"pg-btn\" href={channel} target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"See all videos on YouTube (opens in a new tab)\">See all videos on YouTube ↗</a>}\n          </div>\n        </section>\n      )}\n    </main>\n  )\n"
]
],
"src/den/youtube.css": [
[
"/* The YouTube Series page. Stands on its own: nothing here depends on the old index.css rules. */\n.yt__subscribe {\n  display: inline-flex;\n  align-items: center;\n  margin-top: 12px;\n  text-decoration: none;\n}\n.yt__grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 22px;\n  margin: 24px 0 0;\n  padding: 0;\n  list-style: none;\n}\n.yt__card {\n  display: grid;\n  gap: 8px;\n  align-content: start;\n  padding: 12px;\n  background: #fff;\n  border: 2px solid var(--sf-navy-700, #14306a);\n  border-radius: 10px;\n",
"/* The YouTube Series page. Stands on its own: nothing here depends on the old index.css rules. */\n.yt__card {\n  display: grid;\n  gap: 10px;\n  align-content: start;\n  padding: 12px;\n  background: #fff;\n  border: 1px solid var(--sf-border, #dde3f0);\n  border-radius: 12px;\n}\n.yt__intro {\n  margin: 24px 0;\n  padding: 24px;\n  gap: 16px;\n  border: 2px solid var(--sf-navy-700, #14306a);\n  border-radius: 10px;\n"
],
[
"  padding: 0;\n  border: 1px solid var(--sf-border, #dde3f0);\n  border-radius: 6px;\n  background: var(--sf-star, #dce6ff);\n  overflow: hidden;\n",
"  padding: 0;\n  border: 1px solid var(--sf-border, #dde3f0);\n  border-radius: 8px;\n  background: var(--sf-star, #dce6ff);\n  overflow: hidden;\n"
],
[
"  text-shadow: 0 2px 6px rgba(7, 11, 38, 0.6);\n}\n.yt__play:hover .yt__icon {\n  background: rgba(7, 11, 38, 0.1);\n",
"  text-shadow: 0 2px 6px rgba(7, 11, 38, 0.6);\n}\n.yt__play--big .yt__icon {\n  font-size: 3.5rem;\n}\n.yt__play:hover .yt__icon {\n  background: rgba(7, 11, 38, 0.1);\n"
],
[
"  outline-offset: 3px;\n}\n.yt__title {\n  margin: 0;\n  font-family: var(--sf-school, 'Schoolbell', 'Caveat', cursive);\n  font-size: 1.25rem;\n  font-weight: 400;\n  line-height: 1.25;\n  color: var(--sf-navy-700, #14306a);\n",
"  outline-offset: 3px;\n}\n.yt__meta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 12px;\n  margin: 0;\n  color: var(--sf-muted, #5b6585);\n  font-size: 0.95rem;\n}\n.yt__title {\n  margin: 0;\n  font-family: var(--sf-school, 'Schoolbell', 'Caveat', cursive);\n  font-weight: 400;\n  font-size: 1.875rem;\n  line-height: 1.25;\n  color: var(--sf-navy-700, #14306a);\n  overflow-wrap: anywhere;\n}\n.yt__buttons,\n.yt__after {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n.yt__buttons .pg-btn,\n.yt__after .pg-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  text-decoration: none;\n}\n.yt__latest {\n  display: grid;\n  gap: 16px;\n  margin: 32px 0 0;\n}\n.yt__h2 {\n  margin: 0;\n  font-family: var(--sf-head, 'Josefin Sans', sans-serif);\n  font-size: 2rem;\n  color: var(--sf-navy-700, #14306a);\n}\n.yt__grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.yt__cardtitle {\n  margin: 0;\n  font-family: var(--sf-school, 'Schoolbell', 'Caveat', cursive);\n  font-weight: 400;\n  font-size: 1.25rem;\n  line-height: 1.25;\n  color: var(--sf-navy-700, #14306a);\n"
],
[
"  font-size: 0.95rem;\n}\n",
"  font-size: 0.95rem;\n}\n.yt__more {\n  display: none !important;\n}\n@media (max-width: 960px) {\n  .yt__grid {\n    grid-template-columns: 1fr;\n  }\n}\n@media (max-width: 700px) {\n  .yt__grid:not(.is-expanded) .yt__card:nth-child(n + 5) {\n    display: none;\n  }\n  .yt__more {\n    display: inline-flex !important;\n  }\n  .yt__intro {\n    padding: 16px;\n  }\n  .yt__title {\n    font-size: 1.625rem;\n  }\n  .yt__buttons .pg-btn,\n  .yt__after .pg-btn {\n    width: 100%;\n  }\n}\n"
]
]
}''')
NEW_FILES = ["sql/youtube-intro.sql", "src/den/youtubeRules.js", "src/den/youtubeApi.js"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/components/PageBanner.jsx", "src/home/HomeSections.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the banner (the Leadership Blog update) and the home page update first. These files from earlier updates are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-youtube-18oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
    sys.exit(1)


def splice(text, pairs):
    spans = []
    for old, new in pairs:
        spans.append((text.find(old), old, new))
    spans.sort()
    out, pos = [], 0
    for index, old, new in spans:
        out.append(text[pos:index])
        out.append(new)
        pos = index + len(old)
    out.append(text[pos:])
    return ''.join(out)


plan, problems, done = {}, [], []
for rel, pairs in PATCH.items():
    p = root / rel
    if not p.exists():
        problems.append('%s is missing' % rel)
        continue
    text = p.read_text(encoding='utf-8')
    # each edit is either already in the file, still to do (its "before" text is there exactly once), or neither (not the file expected)
    def state(old, new):
        # an edit that only ADDS text contains its "before" inside its "after"; one that only REMOVES text has its "after" inside its "before"
        if old in text and not (old in new and new in text):
            return 'todo' if text.count(old) == 1 else 'bad'
        return 'done' if new in text else 'bad'
    states = [state(old, new) for old, new in pairs]
    if all(s == 'done' for s in states):
        done.append(rel)
    elif all(s == 'todo' for s in states):
        spans = sorted((text.find(old), text.find(old) + len(old)) for old, new in pairs)
        if any(a2 > b1 for (a1, a2), (b1, b2) in zip(spans, spans[1:])):
            problems.append('%s: the edits would overlap, so it is not the file I expected' % rel)
        else:
            plan[rel] = (text, splice(text, pairs))
    else:
        problems.append('%s is not the way I expected (it may have been changed since the last update)' % rel)

if problems:
    print('NOTHING WAS CHANGED, because:')
    for line in problems:
        print('  - ' + line)
    print('Paste this to me and I will tell you what to do.')
    sys.exit(1)

for rel, (before, after) in plan.items():
    p = root / rel
    pathlib.Path(str(p) + '.before-youtube-v2').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')

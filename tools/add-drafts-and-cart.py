#!/usr/bin/env python3
"""Adds Save as draft, Publish and Unpublish (on the New post, Edit post, All posts and post pages) and gives the empty cart the new banner.

Run it from the project folder, AFTER unzipping starscapes-drafts-and-cart-21oct.zip into it:   python3 tools/add-drafts-and-cart.py

What it does: it makes exact edits to eight files that already exist (the post pages, the admin posts list, the cart and their styles) and adds three new files from the zip (the shared publish code, its tests and these notes).
  src/pages/PostPage.jsx, src/pages/NewPost.jsx, src/pages/EditPost.jsx, src/admin/AdminPosts.jsx, src/admin/adminposts.css, src/pages/postv2.css, src/cart/CartPage.jsx, src/cart/cart.css

How it keeps you safe:
  - It checks ALL 8 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-drafts-and-cart.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/pages/postPublish.js, test/post-publish.test.jsx, INSTALL-DRAFTS-AND-CART.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/pages/PostPage.jsx": [
[
"import { recordRead } from '../entries/readsApi'\nimport { useParams, Link, useNavigate } from 'react-router-dom'\n",
"import { recordRead } from '../entries/readsApi'\nimport { WORDS as PUBLISH_WORDS, isPublished, setPublished } from './postPublish'\nimport { useParams, Link, useNavigate } from 'react-router-dom'\n"
],
[
"  const [deleting, setDeleting] = useState(false)\n  const [body, setBody] = useState(null) // the words of a locked post, if this person may read them\n  const [gated, setGated] = useState(false) // a locked post this person may not read\n  useTitle(post ? post.title : 'Post') // the tab, and a search result, say which post this is\n\n  useEffect(() => {\n    async function fetchPost() {\n      const columns = 'id, title, content, image_url, created_at, author_id, tags, channel'\n      // the database may not have been given the pass column yet: carry on without it, and every post is free\n",
"  const [deleting, setDeleting] = useState(false)\n  const [publishing, setPublishing] = useState(false)\n  const [publishNote, setPublishNote] = useState(null) // { ok, text }: what happened when the author published or took the post down\n  const [body, setBody] = useState(null) // the words of a locked post, if this person may read them\n  const [gated, setGated] = useState(false) // a locked post this person may not read\n  useTitle(post ? post.title : 'Post') // the tab, and a search result, say which post this is\n\n  useEffect(() => {\n    async function fetchPost() {\n      const columns = 'id, title, content, image_url, created_at, author_id, tags, channel, published'\n      // the database may not have been given the pass column yet: carry on without it, and every post is free\n"
],
[
"    navigate('/')\n  }\n",
"    navigate('/')\n  }\n\n  // The author publishes a draft, or takes a post down (it becomes a draft: nothing is deleted). Taking one down asks first.\n  async function handleTogglePublished() {\n    const next = !isPublished(post)\n    if (!next && !window.confirm(PUBLISH_WORDS.askUnpublish)) return\n    setPublishing(true)\n    setPublishNote(null)\n    try {\n      await setPublished(post.id, next)\n      setPost((p) => ({ ...p, published: next }))\n      setPublishNote({ ok: true, text: next ? PUBLISH_WORDS.nowPublished : PUBLISH_WORDS.nowDraft })\n    } catch (e) {\n      setPublishNote({ ok: false, text: e.message })\n    } finally {\n      setPublishing(false)\n    }\n  }\n"
],
[
"\n      {isAuthor && (\n        <div className=\"pg-actions\">\n          <Link to={`/edit/${post.id}`}>\n            <button className=\"pg-btn\">Edit</button>\n          </Link>\n          <button className=\"pg-btn pg-btn--danger\" onClick={handleDelete} disabled={deleting}>\n            {deleting ? 'Deleting...' : 'Delete'}\n          </button>\n        </div>\n      )}\n    </main>\n",
"\n      {isAuthor && !isPublished(post) && <p className=\"pg-draftnote\">{PUBLISH_WORDS.draftNote}</p>}\n      {isAuthor && (\n        <div className=\"pg-actions\">\n          <Link to={`/edit/${post.id}`}>\n            <button className=\"pg-btn\">Edit</button>\n          </Link>\n          <button className=\"pg-btn\" onClick={handleTogglePublished} disabled={publishing}>\n            {publishing ? 'Saving...' : isPublished(post) ? 'Unpublish' : 'Publish'}\n          </button>\n          <button className=\"pg-btn pg-btn--danger\" onClick={handleDelete} disabled={deleting}>\n            {deleting ? 'Deleting...' : 'Delete'}\n          </button>\n        </div>\n      )}\n      {isAuthor && publishNote && <p className={`pg-draftnote${publishNote.ok ? '' : ' pg-draftnote--bad'}`} role={publishNote.ok ? 'status' : 'alert'}>{publishNote.text}</p>}\n    </main>\n"
]
],
"src/pages/NewPost.jsx": [
[
"  const [saving, setSaving] = useState(false)\n  const [canPass, setCanPass] = useState(false) // has the database been given the pass column yet\n",
"  const [saving, setSaving] = useState(false)\n  const [savingAs, setSavingAs] = useState('publish') // which button was pressed, so its own label says what is happening\n  const [canPass, setCanPass] = useState(false) // has the database been given the pass column yet\n"
],
[
"\n  async function handleSubmit(e) {\n    e.preventDefault()\n    setError(null)\n    const found = postProblems({ title, content, file })\n",
"\n  function handleSubmit(e) {\n    e.preventDefault()\n    return save(true)\n  }\n\n  // publish = true: visitors can read the post. publish = false: it is saved as a draft that only its author can see, to be published later (from All posts, from the post itself, or from Edit).\n  async function save(publish) {\n    setError(null)\n    setSavingAs(publish ? 'publish' : 'draft')\n    const found = postProblems({ title, content, file })\n"
],
[
"          .from('posts')\n          .insert({ title, content: '', image_url: imageUrl, author_id: session.user.id, published: true, tags: tagsArray, channel: channel || null, pass: lockedPass })\n          .select('id')\n",
"          .from('posts')\n          .insert({ title, content: '', image_url: imageUrl, author_id: session.user.id, published: publish, tags: tagsArray, channel: channel || null, pass: lockedPass })\n          .select('id')\n"
],
[
"          author_id: session.user.id,\n          published: true,\n          tags: tagsArray,\n",
"          author_id: session.user.id,\n          published: publish,\n          tags: tagsArray,\n"
],
[
"      resetPassIndex()\n      navigate('/')\n    } catch (err) {\n",
"      resetPassIndex()\n      navigate(publish ? '/' : '/admin/posts')\n    } catch (err) {\n"
],
[
"    <main className=\"fm fm--post ad--wide\">\n      <AdminBanner chip=\"Write\" title=\"New post\" subtitle=\"Write a post and publish it. Choose a room, tags, and who can read it.\" icon=\"post\" />\n      <ErrorSummary errors={summaryOf(errors, IDS)} />\n",
"    <main className=\"fm fm--post ad--wide\">\n      <AdminBanner chip=\"Write\" title=\"New post\" subtitle=\"Write a post and publish it, or save it as a draft to finish later. Choose a room, tags, and who can read it.\" icon=\"post\" />\n      <ErrorSummary errors={summaryOf(errors, IDS)} />\n"
],
[
"          <button type=\"submit\" className=\"pg-btn fm-btn--primary\" disabled={saving}>\n            {saving ? 'Publishing...' : 'Publish'}\n          </button>\n",
"          <button type=\"submit\" className=\"pg-btn fm-btn--primary\" disabled={saving}>\n            {saving && savingAs === 'publish' ? 'Publishing...' : 'Publish'}\n          </button>\n          <button type=\"button\" className=\"pg-btn\" disabled={saving} onClick={() => save(false)}>\n            {saving && savingAs === 'draft' ? 'Saving...' : 'Save as draft'}\n          </button>\n"
]
],
"src/pages/EditPost.jsx": [
[
"import { resetPassIndex } from '../membership/passIndex'\n\n",
"import { resetPassIndex } from '../membership/passIndex'\nimport { WORDS as PUBLISH_WORDS } from './postPublish'\n\n"
],
[
"  const [wasLocked, setWasLocked] = useState(false)\n\n  useEffect(() => {\n    async function fetchPost() {\n      const columns = 'id, title, content, image_url, author_id, tags, channel'\n      // the database may not have been given the pinned_in or the pass column yet: ask with both, then with just pinned_in, then with neither, and carry on with whatever it has\n",
"  const [wasLocked, setWasLocked] = useState(false)\n  // Published: can visitors read this post? (A post with no choice recorded counts as published.) Only a change is saved.\n  const [published, setPublished] = useState(true)\n  const [wasPublished, setWasPublished] = useState(true)\n\n  useEffect(() => {\n    async function fetchPost() {\n      const columns = 'id, title, content, image_url, author_id, tags, channel, published'\n      // the database may not have been given the pinned_in or the pass column yet: ask with both, then with just pinned_in, then with neither, and carry on with whatever it has\n"
],
[
"      setWasLocked(Boolean(lockedPass))\n      setTitle(data.title)\n",
"      setWasLocked(Boolean(lockedPass))\n      setPublished(data.published !== false)\n      setWasPublished(data.published !== false)\n      setTitle(data.title)\n"
],
[
"        channel: channel || null,\n      }\n\n      // A post for a pass: its words go into the protected table FIRST (so they are safe), and the post itself is left with none. A post made free again gets its words back.\n",
"        channel: channel || null,\n      }\n      if (published !== wasPublished) changes.published = published\n\n      // A post for a pass: its words go into the protected table FIRST (so they are safe), and the post itself is left with none. A post made free again gets its words back.\n"
],
[
"        )}\n        {imageUrl && (\n",
"        )}\n        <fieldset className=\"pin-box\">\n          <legend>Who can see it</legend>\n          <label className=\"pin-switch\">\n            <input type=\"checkbox\" role=\"switch\" checked={published} onChange={(e) => setPublished(e.target.checked)} />\n            <span className=\"pin-switch__track\" aria-hidden=\"true\" />\n            <span className=\"pin-switch__text\">\n              <strong>Published</strong>\n              <small>{published ? PUBLISH_WORDS.switchOn : PUBLISH_WORDS.switchOff}</small>\n            </span>\n          </label>\n        </fieldset>\n        {imageUrl && (\n"
]
],
"src/admin/AdminPosts.jsx": [
[
"import { fetchAllPosts } from './postsAdminApi'\nimport { countByRoom, filterPosts, pagesOfRoom, roomName, whereIs } from './postsAdminRules'\n",
"import { fetchAllPosts } from './postsAdminApi'\nimport { WORDS as PUBLISH_WORDS, isPublished, setPublished } from '../pages/postPublish'\nimport { countByRoom, filterPosts, pagesOfRoom, roomName, whereIs } from './postsAdminRules'\n"
],
[
"  const [search, setSearch] = useState('')\n\n",
"  const [search, setSearch] = useState('')\n  const [busy, setBusy] = useState(null) // the post that is being published or taken down\n  const [notice, setNotice] = useState(null) // { ok, text }: what happened the last time\n\n"
],
[
"  const odd = Object.keys(counts.rooms).filter((slug) => !known.has(slug)) // a room name on a post that is not one of the eight rooms\n\n",
"  const odd = Object.keys(counts.rooms).filter((slug) => !known.has(slug)) // a room name on a post that is not one of the eight rooms\n\n  // Publish a draft, or take a post down (it becomes a draft: nothing is deleted). Taking one down asks first, and what happened is always said, including when nothing changed.\n  async function toggle(p) {\n    const next = !isPublished(p)\n    if (!next && !window.confirm(PUBLISH_WORDS.askUnpublish)) return\n    const name = p.title || 'This post'\n    setBusy(p.id)\n    setNotice(null)\n    try {\n      await setPublished(p.id, next)\n      setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, published: next } : x)))\n      setNotice({ ok: true, text: `${name}: ${next ? PUBLISH_WORDS.nowPublished : PUBLISH_WORDS.nowDraft}` })\n    } catch (e) {\n      setNotice({ ok: false, text: `${name}: ${e.message}` })\n    } finally {\n      setBusy(null)\n    }\n  }\n\n"
],
[
"      {status === 'ready' && shown.length === 0 && <p className=\"rp-note\">No posts match.</p>}\n\n",
"      {status === 'ready' && shown.length === 0 && <p className=\"rp-note\">No posts match.</p>}\n      {notice && <p className={`ap__notice${notice.ok ? '' : ' ap__notice--bad'}`} role={notice.ok ? 'status' : 'alert'}>{notice.text}</p>}\n\n"
],
[
"              <Link className=\"pg-btn\" to={`/post/${p.id}`} aria-label={`View ${p.title || 'this post'}`}>View</Link>\n            </div>\n",
"              <Link className=\"pg-btn\" to={`/post/${p.id}`} aria-label={`View ${p.title || 'this post'}`}>View</Link>\n              <button type=\"button\" className=\"pg-btn\" onClick={() => toggle(p)} disabled={busy === p.id} aria-label={`${isPublished(p) ? 'Unpublish' : 'Publish'} ${p.title || 'this post'}`}>\n                {busy === p.id ? 'Saving…' : isPublished(p) ? 'Unpublish' : 'Publish'}\n              </button>\n            </div>\n"
]
],
"src/admin/adminposts.css": [
[
".ap__where { font-size: 0.9375rem; }\n.ap__buttons { display: flex; flex-wrap: wrap; gap: 8px; align-items: start; }\n",
".ap__where { font-size: 0.9375rem; }\n.ap__notice { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #e3f4e6; color: #0e1530; font-weight: 700; }\n.ap__notice--bad { background: #ffd9d9; }\n.ap__buttons { display: flex; flex-wrap: wrap; gap: 8px; align-items: start; }\n"
]
],
"src/pages/postv2.css": [
[
"  margin-right: auto;\n}\n",
"  margin-right: auto;\n}\n/* The note an author sees on a draft, and the answer after publishing or taking a post down */\n.pg-draftnote {\n  max-width: 880px;\n  margin: 16px auto 0;\n  padding: 10px 14px;\n  border-radius: 12px;\n  background: #ffe27a;\n  color: #0e1530;\n  font-weight: 700;\n}\n.pg-draftnote--bad {\n  background: #ffd9d9;\n}\n"
]
],
"src/cart/CartPage.jsx": [
[
"    return (\n      <main className=\"cart legacy\">\n        <h1>Your cart</h1>\n        <p className=\"cart-empty\">Your cart is empty.</p>\n        <p>\n          <Link to=\"/art-loft\">Browse the Art Loft</Link> · <Link to=\"/art-loft/prints\">See all digital prints</Link>\n        </p>\n      </main>\n",
"    return (\n      <main className=\"cart legacy cart--v2\">\n        <PageBanner art=\"plain\" room=\"factory-floor\" chip=\"Your cart\" title=\"Nothing here yet\" subtitle=\"Browse the Art Loft and add a print you love.\" />\n        <section className=\"cart-card cart-card--empty\" aria-label=\"Your cart\">\n          <p className=\"cart-empty\">Your cart is empty.</p>\n          <p>\n            <Link to=\"/art-loft\">Browse the Art Loft</Link> · <Link to=\"/art-loft/prints\">See all digital prints</Link>\n          </p>\n        </section>\n      </main>\n"
]
],
"src/cart/cart.css": [
[
"}\n.cart--v2 .cart-line:last-child {\n",
"}\n.cart-card--empty {\n  max-width: 640px;\n}\n.cart-card--empty p {\n  margin: 0 0 8px;\n}\n.cart--v2 .cart-line:last-child {\n"
]
]
}''')
NEW_FILES = ["src/pages/postPublish.js", "test/post-publish.test.jsx", "INSTALL-DRAFTS-AND-CART.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-drafts-and-cart-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-drafts-and-cart').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')

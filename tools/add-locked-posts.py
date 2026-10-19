#!/usr/bin/env python3
"""Lets a post belong to a pass: its words are kept in a protected table the database only opens for the owner, pass holders and the first three posts of each pass.

Run it from the project folder, AFTER unzipping starscapes-locked-posts-19oct.zip into it:   python3 tools/add-locked-posts.py

What it does: it makes exact edits to five files that already exist (the single-post page, the New post and Edit post forms, the membership styles and the health check) and adds the new files from the zip.
  src/pages/PostPage.jsx, src/pages/NewPost.jsx, src/pages/EditPost.jsx, src/membership/membership.css, tools/health-check.mjs

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-locked-posts.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/locked-posts.sql, src/membership/lockedPosts.js, src/membership/PostGate.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/pages/PostPage.jsx": [
[
"import { safeImage } from '../rooms/postRules'\nimport useTitle from './useTitle'\nimport '../styles/articles.css'\nimport '../rooms/roompages.css'\n",
"import { safeImage } from '../rooms/postRules'\nimport useTitle from './useTitle'\nimport PostGate from '../membership/PostGate'\nimport { cleanPass, hasPassColumn, loadLockedBody } from '../membership/lockedPosts'\nimport '../styles/articles.css'\nimport '../rooms/roompages.css'\n"
],
[
"  const [error, setError] = useState(null)\n  const [deleting, setDeleting] = useState(false)\n  useTitle(post ? post.title : 'Post') // the tab, and a search result, say which post this is\n\n  useEffect(() => {\n    async function fetchPost() {\n      const { data, error } = await supabase\n        .from('posts')\n        .select('id, title, content, image_url, created_at, author_id, tags, channel')\n        .eq('id', id)\n        .single()\n\n      if (error) {\n        setError(error.message)\n      } else {\n        setPost(data)\n      }\n      setLoading(false)\n",
"  const [error, setError] = useState(null)\n  const [deleting, setDeleting] = useState(false)\n  const [body, setBody] = useState(null) // the words of a locked post, if this person may read them\n  const [gated, setGated] = useState(false) // a locked post this person may not read\n  useTitle(post ? post.title : 'Post') // the tab, and a search result, say which post this is\n\n  useEffect(() => {\n    async function fetchPost() {\n      const columns = 'id, title, content, image_url, created_at, author_id, tags, channel'\n      // the database may not have been given the pass column yet: carry on without it, and every post is free\n      let { data, error } = await supabase.from('posts').select(columns + ', pass').eq('id', id).single()\n      if (error && /\\bpass\\b/i.test(String(error.message || ''))) ({ data, error } = await supabase.from('posts').select(columns).eq('id', id).single())\n\n      if (error) {\n        setError(error.message)\n      } else {\n        setPost(data)\n        // A post that belongs to a pass keeps its words in a separate table that the database only opens for the right people\n        if (hasPassColumn(data) && cleanPass(data.pass)) {\n          try {\n            const words = await loadLockedBody(id)\n            if (words === null) setGated(true)\n            else setBody(words)\n          } catch (e) {\n            setError('We could not load this post just now. Please try again in a moment.')\n          }\n        }\n      }\n      setLoading(false)\n"
],
[
"        />\n      )}\n      <div className=\"pg-post__body\">{post.content}</div>\n\n      {post.tags && post.tags.length > 0 && (\n",
"        />\n      )}\n      {gated ? <PostGate pass={cleanPass(post.pass)} signedIn={Boolean(session)} /> : <div className=\"pg-post__body\">{body !== null ? body : post.content}</div>}\n\n      {post.tags && post.tags.length > 0 && (\n"
]
],
"src/pages/NewPost.jsx": [
[
"import { useState } from 'react'\nimport { useNavigate } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { channels } from '../data/channels'\nimport { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n",
"import { useEffect, useState } from 'react'\nimport { useNavigate } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { channels } from '../data/channels'\nimport { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'\nimport { PASS_CHOICES, canUsePasses, cleanPass, saveLockedBody } from '../membership/lockedPosts'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n"
],
[
"  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing\n  const [saving, setSaving] = useState(false)\n  const navigate = useNavigate()\n\n  async function handleSubmit(e) {\n",
"  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing\n  const [saving, setSaving] = useState(false)\n  const [canPass, setCanPass] = useState(false) // has the database been given the pass column yet\n  const [pass, setPass] = useState('') // '' means free for everyone\n  const navigate = useNavigate()\n\n  useEffect(() => {\n    let stopped = false\n    canUsePasses().then((yes) => !stopped && setCanPass(yes))\n    return () => {\n      stopped = true\n    }\n  }, [])\n\n  async function handleSubmit(e) {\n"
],
[
"        .filter((t) => t.length > 0)\n\n      const { error: insertError } = await supabase.from('posts').insert({\n        title,\n        content,\n        image_url: imageUrl,\n        author_id: session.user.id,\n        published: true,\n        tags: tagsArray,\n        channel: channel || null,\n      })\n\n      if (insertError) throw insertError\n\n      navigate('/')\n",
"        .filter((t) => t.length > 0)\n\n      const lockedPass = canPass ? cleanPass(pass) : ''\n      if (lockedPass) {\n        // a post for a pass: the post is made WITHOUT its words, and the words are kept in the protected table. If keeping them fails, the empty post is taken away again.\n        const { data: made, error: insertError } = await supabase\n          .from('posts')\n          .insert({ title, content: '', image_url: imageUrl, author_id: session.user.id, published: true, tags: tagsArray, channel: channel || null, pass: lockedPass })\n          .select('id')\n          .single()\n        if (insertError) throw insertError\n        try {\n          await saveLockedBody(made.id, content)\n        } catch (bodyError) {\n          await supabase.from('posts').delete().eq('id', made.id)\n          throw bodyError\n        }\n      } else {\n        const { error: insertError } = await supabase.from('posts').insert({\n          title,\n          content,\n          image_url: imageUrl,\n          author_id: session.user.id,\n          published: true,\n          tags: tagsArray,\n          channel: channel || null,\n        })\n\n        if (insertError) throw insertError\n      }\n\n      navigate('/')\n"
],
[
"          </Field>\n        </div>\n        <Field id=\"np-file\" label={`Header picture (optional, up to ${MAX_PICTURE_MB} MB)`} error={errors.file}>\n          {(p) => <input {...p} type=\"file\" accept=\"image/*\" onChange={(e) => setFile(e.target.files[0] || null)} />}\n",
"          </Field>\n        </div>\n        {canPass && (\n          <Field id=\"np-pass\" label=\"Pass\" help=\"Leave this as Free for everyone for an ordinary post. Choose a pass to keep the words of this post for people who hold it (the first three posts in each pass stay free to read).\">\n            {(p) => (\n              <select {...p} value={pass} onChange={(e) => setPass(e.target.value)}>\n                <option value=\"\">Free for everyone</option>\n                {PASS_CHOICES.map((c) => (\n                  <option key={c.id} value={c.id}>\n                    {c.name}\n                  </option>\n                ))}\n              </select>\n            )}\n          </Field>\n        )}\n        <Field id=\"np-file\" label={`Header picture (optional, up to ${MAX_PICTURE_MB} MB)`} error={errors.file}>\n          {(p) => <input {...p} type=\"file\" accept=\"image/*\" onChange={(e) => setFile(e.target.files[0] || null)} />}\n"
]
],
"src/pages/EditPost.jsx": [
[
"import { Field, ErrorSummary } from '../components/FormMessages'\nimport { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n",
"import { Field, ErrorSummary } from '../components/FormMessages'\nimport { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'\nimport { PASS_CHOICES, cleanPass, hasPassColumn, loadLockedBody, removeLockedBody, saveLockedBody } from '../membership/lockedPosts'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n"
],
[
"  const [pinned, setPinned] = useState(false)\n  const [otherPinned, setOtherPinned] = useState(null)\n\n  useEffect(() => {\n    async function fetchPost() {\n      const columns = 'id, title, content, image_url, author_id, tags, channel'\n      let { data, error } = await supabase.from('posts').select(columns + ', pinned_in').eq('id', id).single()\n      let hasPinColumn = true\n      // the database may not have been given the pinned_in column yet: carry on without it\n      if (error && /pinned_in/i.test(String(error.message || ''))) {\n        hasPinColumn = false\n        ;({ data, error } = await supabase.from('posts').select(columns).eq('id', id).single())\n      }\n\n      if (error) {\n",
"  const [pinned, setPinned] = useState(false)\n  const [otherPinned, setOtherPinned] = useState(null)\n  // Passes: does the database have the pass column yet, which pass is this post in ('' means free for everyone), and was it locked when it was loaded\n  const [canPass, setCanPass] = useState(false)\n  const [pass, setPass] = useState('')\n  const [wasLocked, setWasLocked] = useState(false)\n\n  useEffect(() => {\n    async function fetchPost() {\n      const columns = 'id, title, content, image_url, author_id, tags, channel'\n      // the database may not have been given the pinned_in or the pass column yet: ask with both, then with just pinned_in, then with neither, and carry on with whatever it has\n      let data, error, used\n      for (const asked of [columns + ', pinned_in, pass', columns + ', pinned_in', columns]) {\n        used = asked\n        ;({ data, error } = await supabase.from('posts').select(asked).eq('id', id).single())\n        if (!error || !/pinned_in|\\bpass\\b/i.test(String(error.message || ''))) break\n      }\n      const hasPinColumn = /pinned_in/.test(used)\n\n      if (error) {\n"
],
[
"      }\n\n      setTitle(data.title)\n      setContent(data.content)\n      setImageUrl(data.image_url)\n      setTags((data.tags || []).join(', '))\n",
"      }\n\n      // A post that belongs to a pass keeps its words in a protected table: fetch them, because the post itself has none\n      const lockedPass = hasPassColumn(data) ? cleanPass(data.pass) : ''\n      let words = data.content\n      if (lockedPass) {\n        try {\n          words = (await loadLockedBody(id)) || ''\n        } catch (e) {\n          setError('We could not load the words of this post just now. Please try again in a moment.')\n          setLoading(false)\n          return\n        }\n      }\n      setCanPass(hasPassColumn(data))\n      setPass(lockedPass)\n      setWasLocked(Boolean(lockedPass))\n      setTitle(data.title)\n      setContent(words)\n      setImageUrl(data.image_url)\n      setTags((data.tags || []).join(', '))\n"
],
[
"      }\n\n      if (canPin) {\n        const pinHere = pinnable && pinned\n",
"      }\n\n      // A post for a pass: its words go into the protected table FIRST (so they are safe), and the post itself is left with none. A post made free again gets its words back.\n      const wantPass = canPass ? cleanPass(pass) : ''\n      if (canPass) {\n        if (wantPass) {\n          await saveLockedBody(id, content)\n          changes.content = ''\n          changes.pass = wantPass\n        } else {\n          changes.pass = null\n        }\n      }\n\n      if (canPin) {\n        const pinHere = pinnable && pinned\n"
],
[
"\n      if (updateError) throw updateError\n\n      navigate(`/post/${id}`)\n",
"\n      if (updateError) throw updateError\n\n      if (canPass && !wantPass && wasLocked) await removeLockedBody(id)\n\n      navigate(`/post/${id}`)\n"
],
[
"          </Field>\n        </div>\n        {pinnable && (\n          <fieldset className=\"pin-box\">\n",
"          </Field>\n        </div>\n        {canPass && (\n          <Field id=\"ep-pass\" label=\"Pass\" help=\"Free for everyone is an ordinary post. Choose a pass to keep the words of this post for people who hold it (the first three posts in each pass stay free to read). Changing it moves the words in or out of the protected store for you.\">\n            {(p) => (\n              <select {...p} value={pass} onChange={(e) => setPass(e.target.value)}>\n                <option value=\"\">Free for everyone</option>\n                {PASS_CHOICES.map((c) => (\n                  <option key={c.id} value={c.id}>\n                    {c.name}\n                  </option>\n                ))}\n              </select>\n            )}\n          </Field>\n        )}\n        {pinnable && (\n          <fieldset className=\"pin-box\">\n"
]
],
"src/membership/membership.css": [
[
"  border-color: var(--sf-blue, #1f6fa8); /* an open pass has its box filled in, as on the other pages (there is no real checkbox here to do it) */\n}\n",
"  border-color: var(--sf-blue, #1f6fa8); /* an open pass has its box filled in, as on the other pages (there is no real checkbox here to do it) */\n}\n\n/* what a visitor sees in place of the words of a locked post */\n.mb__gate {\n  display: grid;\n  gap: 10px;\n  justify-items: start;\n  margin: 8px 0 24px;\n  padding: 20px;\n  border: 1.5px solid #9fb4e8;\n  border-radius: 14px;\n  background: var(--sf-star, #dce6ff);\n  line-height: 1.5;\n}\n.mb__gate p {\n  margin: 0;\n}\n.mb__gatetitle {\n  margin: 0;\n  font-family: var(--sf-head, 'Inter', system-ui, sans-serif);\n  font-size: 1.25rem;\n  line-height: 1.25;\n  color: var(--sf-navy-700, #14306a);\n}\n"
]
],
"tools/health-check.mjs": [
[
"  ['Server tables: sign-ups let the server key in', 'sql/ebook-signups.sql', /to service_role/, 'the clean-up update (the add-cleanup script)'],\n  ['Server tables: memberships let the server key in', 'sql/memberships.sql', /to service_role/, 'the clean-up update (the add-cleanup script)'],\n]\n\n",
"  ['Server tables: sign-ups let the server key in', 'sql/ebook-signups.sql', /to service_role/, 'the clean-up update (the add-cleanup script)'],\n  ['Server tables: memberships let the server key in', 'sql/memberships.sql', /to service_role/, 'the clean-up update (the add-cleanup script)'],\n  ['Locked posts: the database file', 'sql/locked-posts.sql', /can_read_post_body/, 'the locked posts update (the add-locked-posts script)'],\n  ['Locked posts: the helpers', 'src/membership/lockedPosts.js', /loadLockedBody/, 'the locked posts update (the add-locked-posts script)'],\n  ['Locked posts: the gate', 'src/membership/PostGate.jsx', /This is part of the/, 'the locked posts update (the add-locked-posts script)'],\n  ['Locked posts: the post page uses the gate', 'src/pages/PostPage.jsx', /PostGate/, 'the locked posts update (the add-locked-posts script)'],\n  ['Locked posts: the New post form has the Pass choice', 'src/pages/NewPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n  ['Locked posts: the Edit post form has the Pass choice', 'src/pages/EditPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n]\n\n"
]
]
}''')
NEW_FILES = ["sql/locked-posts.sql", "src/membership/lockedPosts.js", "src/membership/PostGate.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/MyPassesPage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the membership account update first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-locked-posts-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-locked-posts').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')

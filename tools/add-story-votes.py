#!/usr/bin/env python3
"""Adds the story vote: the four-state vote box, the database file for it, and the owner's vote tools in Admin, Stories.

Run it from the project folder, AFTER unzipping starscapes-story-votes-20oct.zip into it:   python3 tools/add-story-votes.py

What it does: it makes exact edits to four files that already exist (the story page, its styles, the owner's Stories tool and its styles) and adds six new files from the zip (the unzip itself also replaces two test files).
  src/stories/LetsWriteStoryPage.jsx, src/stories/stories.css, src/admin/AdminStories.jsx, src/admin/admin.css

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-story-votes.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/story-votes.sql, src/stories/votesRules.js, src/stories/votesApi.js, src/stories/VoteBox.jsx, src/stories/StoryVote.jsx, src/admin/AdminStoryVotes.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/stories/LetsWriteStoryPage.jsx": [
[
"import { fetchChapterPosts, fetchChapterRows, fetchStories } from './storiesApi'\nimport { buildChapters, chapterTag, completedStories, currentStory } from './storiesRules'\nimport { CHAPTERS, COMPLETED, PAGE, PINNED, VOTE } from './storiesData'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\n",
"import { fetchChapterPosts, fetchChapterRows, fetchStories } from './storiesApi'\nimport { buildChapters, chapterTag, completedStories, currentStory } from './storiesRules'\nimport { CHAPTERS, COMPLETED, PAGE, PINNED } from './storiesData'\nimport StoryVote from './StoryVote'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\n"
],
[
"\n          <aside className=\"ls__side\" aria-label=\"The vote and finished stories\">\n            {story && (\n              <section className=\"ls__box ls__vote\" aria-labelledby=\"ls-vote-title\">\n                <p className=\"ls__label\">{VOTE.label}<span className=\"ls__chip ls__chip--navy\">{VOTE.chip}</span></p>\n                <h2 id=\"ls-vote-title\" className=\"ls__script\">{VOTE.title}</h2>\n                <p>{VOTE.text}</p>\n              </section>\n            )}\n            <section className=\"ls__box ls__done\" aria-labelledby=\"ls-done-title\">\n              <h2 id=\"ls-done-title\" className=\"ls__h3\">{COMPLETED.title}</h2>\n",
"\n          <aside className=\"ls__side\" aria-label=\"The vote and finished stories\">\n            {story && <StoryVote story={story} />}\n            <section className=\"ls__box ls__done\" aria-labelledby=\"ls-done-title\">\n              <h2 id=\"ls-done-title\" className=\"ls__h3\">{COMPLETED.title}</h2>\n"
]
],
"src/stories/stories.css": [
[
"  .ls__btn { width: 100%; justify-content: center; }\n}\n",
"  .ls__btn { width: 100%; justify-content: center; }\n}\n\n/* ---- the vote box in its four states ---- */\n.ls__options, .ls__results { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }\n.ls__option { display: block; padding: 10px 12px; background: #fff; border: 1px solid var(--sf-border, #dde3f0); border-radius: 10px; line-height: 1.5; }\n.ls__option--pick { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }\n.ls__option--pick.is-picked { border: 2px solid var(--sf-navy-700, #14306a); background: #f6f8fc; }\n.ls__option--pick:focus-within { outline: 3px solid var(--sf-focus, #14306a); outline-offset: 2px; }\n.ls__radio { flex: none; width: 20px; height: 20px; margin: 2px 0 0; accent-color: var(--sf-navy-700, #14306a); }\n.ls__letter { color: var(--sf-navy-700, #14306a); }\n.ls__fieldset { display: grid; gap: 10px; margin: 0; padding: 0; border: 0; }\n.ls__vh { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }\n.ls__form { display: grid; gap: 14px; }\n.ls__form p { margin: 0; }\n.ls__formbuttons { display: flex; flex-wrap: wrap; gap: 8px; }\n.ls__problem { padding: 10px 12px; background: #fff; border: 2px solid var(--sf-navy-700, #14306a); border-radius: 10px; font-weight: 700; color: var(--sf-navy-700, #14306a); }\n.ls__soon { justify-self: start; background: #8fb1d6; border-color: #8fb1d6; color: #0e1530; cursor: not-allowed; opacity: 1; }\n.ls__link { color: var(--sf-navy-700, #14306a); font-weight: 700; }\n.ls__link:focus-visible { outline: 3px solid var(--sf-focus, #14306a); outline-offset: 2px; }\n.ls__result { display: grid; gap: 6px; padding: 10px 12px; background: #fff; border: 1px solid var(--sf-border, #dde3f0); border-radius: 10px; }\n.ls__result.is-mine { border: 2px solid var(--sf-navy-700, #14306a); }\n.ls__result.is-chosen { background: #dff5e1; border: 2px solid #0e5a2a; }\n.ls__resulttext { line-height: 1.5; overflow-wrap: anywhere; }\n.ls__resultmeta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--sf-muted, #5b6585); }\n.ls__result.is-chosen .ls__resultmeta { color: #0e3d1c; }\n.ls__bar { display: block; height: 12px; background: var(--sf-star, #dce6ff); border: 2px solid var(--sf-navy-700, #14306a); border-radius: 999px; overflow: hidden; }\n.ls__bar-fill { display: block; height: 100%; background: var(--sf-blue, #1f6fa8); }\n.ls__bar-fill--p0 { width: 0%; }\n.ls__bar-fill--p5 { width: 5%; }\n.ls__bar-fill--p10 { width: 10%; }\n.ls__bar-fill--p15 { width: 15%; }\n.ls__bar-fill--p20 { width: 20%; }\n.ls__bar-fill--p25 { width: 25%; }\n.ls__bar-fill--p30 { width: 30%; }\n.ls__bar-fill--p35 { width: 35%; }\n.ls__bar-fill--p40 { width: 40%; }\n.ls__bar-fill--p45 { width: 45%; }\n.ls__bar-fill--p50 { width: 50%; }\n.ls__bar-fill--p55 { width: 55%; }\n.ls__bar-fill--p60 { width: 60%; }\n.ls__bar-fill--p65 { width: 65%; }\n.ls__bar-fill--p70 { width: 70%; }\n.ls__bar-fill--p75 { width: 75%; }\n.ls__bar-fill--p80 { width: 80%; }\n.ls__bar-fill--p85 { width: 85%; }\n.ls__bar-fill--p90 { width: 90%; }\n.ls__bar-fill--p95 { width: 95%; }\n.ls__bar-fill--p100 { width: 100%; }\n"
]
],
"src/admin/AdminStories.jsx": [
[
"import { useOwnerCheck } from './useIsOwner'\nimport { cleanChapter, cleanStory, slugFrom } from '../stories/storiesRules'\nimport { fetchChapterPosts, fetchChapterRows, fetchStories, removeChapter, removeStory, saveChapter, saveStory } from '../stories/storiesApi'\nimport '../styles/pages.css'\n",
"import { useOwnerCheck } from './useIsOwner'\nimport { cleanChapter, cleanStory, slugFrom } from '../stories/storiesRules'\nimport AdminStoryVotes from './AdminStoryVotes'\nimport { fetchChapterPosts, fetchChapterRows, fetchStories, removeChapter, removeStory, saveChapter, saveStory } from '../stories/storiesApi'\nimport '../styles/pages.css'\n"
],
[
"        </form>\n      </section>\n        </div>\n        <div className=\"ad-col\">\n",
"        </form>\n      </section>\n      <AdminStoryVotes stories={stories} rows={rows} />\n        </div>\n        <div className=\"ad-col\">\n"
]
],
"src/admin/admin.css": [
[
"  cursor: not-allowed;\n}\n",
"  cursor: not-allowed;\n}\n\n/* the owner's vote form (Admin, Stories) */\n.as__control { font: inherit; padding: 8px 10px; border: 2px solid var(--sf-navy-700, #14306a); border-radius: 8px; background: #fff; color: var(--sf-ink, #0e1530); }\n.as__control:focus-visible { outline: 3px solid var(--sf-focus, #14306a); outline-offset: 2px; }\n.as__fieldset { display: grid; gap: 10px; margin: 0 0 12px; padding: 12px 16px; border: 1px solid var(--sf-border, #dde3f0); border-radius: 10px; }\n.as__optionrow { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }\n.as__optionrow > :first-child { flex: 1 1 260px; }\n.as__error { margin: 0; font-weight: 700; color: var(--sf-navy-700, #14306a); }\n.as__winner { display: grid; gap: 4px; max-width: 420px; margin-top: 8px; font-weight: 700; }\n"
]
]
}''')
NEW_FILES = ["sql/story-votes.sql", "src/stories/votesRules.js", "src/stories/votesApi.js", "src/stories/VoteBox.jsx", "src/stories/StoryVote.jsx", "src/admin/AdminStoryVotes.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/stories/storiesRules.js", "src/suggest/useUser.js", "src/admin/AdminStories.jsx", "src/membership/membershipApi.js", "src/admin/AdminBanner.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print("Install the earlier packages first (Let's write a story step one, and the membership ones). These files are missing: " + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-story-votes-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-story-votes').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')

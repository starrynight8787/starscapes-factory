#!/usr/bin/env python3
"""Removes Founding members (the table, its rules, its tests and a note) and makes Book Club comments stay open while a failed payment is retried, like every other pass. The new test is only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-membership-tidy-21oct.zip into it:   python3 tools/add-membership-tidy.py

What it does: it makes exact edits to 7 files and, only if all succeed, puts one new test in place.
  sql/book-details.sql, sql/memberships.sql, src/data/legalPages.js, test/legal-pages.test.jsx, test/memberships-sql.test.js, test/server-tables-have-service-role.test.js, tools/health-check.mjs

How it keeps you safe:
  - It checks ALL 7 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-membership-tidy.
  - It is safe to run twice: a file already done is left alone.
  - The new files (tools/membership-tidy-files/membership-tidy.test.js.staged, INSTALL-MEMBERSHIP-TIDY.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"sql/book-details.sql": [
[
"\n-- Is the signed-in person a Book Club member (an active Book Club pass) or the owner?\ncreate or replace function public.is_book_club_member() returns boolean\nlanguage sql stable security definer set search_path = public as $$\n  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'\n    or exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.status in ('active', 'trialing') and 'book-club' = any (m.passes));\n$$;\n",
"\n-- Is the signed-in person a Book Club member (a Book Club pass that is active, in a trial, or past due while Stripe retries a failed payment: the same rule as every other pass; it ends when Stripe gives up and cancels) or the owner?\ncreate or replace function public.is_book_club_member() returns boolean\nlanguage sql stable security definer set search_path = public as $$\n  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'\n    or exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.status in ('active', 'trialing', 'past_due') and 'book-club' = any (m.passes));\n$$;\n"
]
],
"sql/memberships.sql": [
[
"--\n-- WHAT IT DOES: makes the two tables memberships need.\n--   memberships       one row per member: which passes they hold, how they pay, when it renews, whether it is cancelled. The PAYMENT SERVER writes it (when Stripe says\n--                     someone paid, changed or cancelled); a member can only READ their own row. Nobody can write it from a browser.\n--   founding_members  the early supporters. A founder can see their own row and choose whether their name is shown on the Founders' wall (and what name). Everyone can read\n--                     the NAMES of founders who ticked \"show my name\", and nothing else about them (not even who they are).\n--\n-- PERMISSIONS: a table made in the SQL editor cannot be read by the website until it is granted permission, however good its rules are. The grant lines below do that.\n-- They are deliberately narrow: members get read-only access to their own row; the names on the wall are readable by anyone, one column only.\n--\n-- TO UNDO (run these lines if you ever need to):\n--   drop table if exists public.founding_members;\n--   drop table if exists public.memberships;\n",
"--\n-- WHAT IT DOES: makes the table memberships need.\n--   memberships       one row per member: which passes they hold, how they pay, when it renews, whether it is cancelled. The PAYMENT SERVER writes it (when Stripe says\n--                     someone paid, changed or cancelled); a member can only READ their own row. Nobody can write it from a browser.\n--\n-- PERMISSIONS: a table made in the SQL editor cannot be read by the website until it is granted permission, however good its rules are. The grant lines below do that.\n-- They are deliberately narrow: members get read-only access to their own row, and only the server's own key may write.\n--\n-- TO UNDO (run these lines if you ever need to):\n--   drop table if exists public.memberships;\n"
],
[
"\ncreate table if not exists public.founding_members (\n  user_id uuid primary key references auth.users (id) on delete cascade,\n  display_name text,\n  show_name boolean not null default false,\n  created_at timestamptz not null default now(),\n  check (not show_name or (display_name is not null and length(btrim(display_name)) > 0))\n);\n\nalter table public.founding_members enable row level security;\n\ndrop policy if exists \"see your own founding status\" on public.founding_members;\ndrop policy if exists \"anyone can see the names on the wall\" on public.founding_members;\ndrop policy if exists \"choose whether your name shows\" on public.founding_members;\ncreate policy \"see your own founding status\" on public.founding_members for select to authenticated using (user_id = auth.uid());\ncreate policy \"anyone can see the names on the wall\" on public.founding_members for select to anon, authenticated using (show_name = true);\ncreate policy \"choose whether your name shows\" on public.founding_members for update to authenticated\n  using (user_id = auth.uid())\n  with check (user_id = auth.uid());\n\ngrant select (display_name, show_name, created_at) on public.founding_members to anon, authenticated;\ngrant update (display_name, show_name) on public.founding_members to authenticated;\ngrant select, insert, update, delete on public.founding_members to service_role; -- the server adds and manages founding members\n\n-- To confirm it worked, run these. The first should list 4 rows, the second should show SELECT for authenticated on memberships:\n--   select tablename, policyname, cmd from pg_policies where tablename in ('memberships', 'founding_members') order by tablename, policyname;\n--   select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'memberships' order by grantee, privilege_type;\n",
"\n-- RETIRED 21 October 2026: there is no Founding members tier, so the founding_members table (made for a Founders' wall) is gone. If your database still has it, this line removes it\n-- (it held no real data). It is safe to run when the table is not there.\ndrop table if exists public.founding_members;\n\n-- To confirm it worked, run these. The first should list 1 row, the second should show SELECT for authenticated on memberships:\n--   select tablename, policyname, cmd from pg_policies where tablename = 'memberships' order by policyname;\n--   select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'memberships' order by grantee, privilege_type;\n"
]
],
"src/data/legalPages.js": [
[
"//    now ONE list, kept in Supabase (21 October 2026); check which region the Resend account sends from\n//    and its plan limits (SFW-188); the Founders' wall (display names, opt-in) needs its own lines when built (the newsletter's lines were added on 21 October 2026, with a daily job that deletes sign-ups nobody confirms after 30 days); and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes\n//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n",
"//    now ONE list, kept in Supabase (21 October 2026); check which region the Resend account sends from\n//    and its plan limits (SFW-188); the newsletter's lines were added on 21 October 2026, with a daily job that deletes sign-ups nobody confirms after 30 days; and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes\n//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n"
]
],
"test/legal-pages.test.jsx": [
[
"    expect(part('Paying for passes')).toMatch(/If a payment fails, Stripe tries again and your passes stay open while it does\\. If it still fails, your passes close\\./)\n    for (const file of ['sql/locked-posts.sql', 'sql/story-votes.sql']) { const sql = read(file); expect(sql, file).toMatch(/'active', 'trialing', 'past_due'/); expect(sql, file).not.toMatch(/'active', 'trialing', 'past_due', 'unpaid'/) }\n  })\n",
"    expect(part('Paying for passes')).toMatch(/If a payment fails, Stripe tries again and your passes stay open while it does\\. If it still fails, your passes close\\./)\n    for (const file of ['sql/locked-posts.sql', 'sql/story-votes.sql', 'sql/book-details.sql']) { const sql = read(file); expect(sql, file).toMatch(/'active', 'trialing', 'past_due'/); expect(sql, file).not.toMatch(/'active', 'trialing', 'past_due', 'unpaid'/) }\n  })\n"
]
],
"test/memberships-sql.test.js": [
[
"\ndescribe('the founding members table', () => {\n  it('has one row per founder, tied to their account, with a name only when they say it may show', () => {\n    expect(code).toMatch(/create table if not exists public\\.founding_members \\(\\s*user_id uuid primary key references auth\\.users \\(id\\) on delete cascade/)\n    expect(code).toMatch(/show_name boolean not null default false/)\n    expect(code).toMatch(/check \\(not show_name or \\(display_name is not null and length\\(btrim\\(display_name\\)\\) > 0\\)\\)/)\n  })\n  it('lets anyone read the NAME of a founder who opted in, one column at a time, and never who they are (no user_id)', () => {\n    expect(code).toMatch(/create policy \"anyone can see the names on the wall\" on public\\.founding_members for select to anon, authenticated using \\(show_name = true\\)/)\n    const grants = [...code.matchAll(/^grant select \\(([^)]*)\\) on public\\.founding_members to ([^;]+);$/gm)]\n    expect(grants.length).toBeGreaterThan(0)\n    for (const g of grants) expect(g[1], 'columns anyone can read').not.toMatch(/user_id/)\n    expect(code).not.toMatch(/^grant select on public\\.founding_members/m) // never the whole table\n  })\n  it('lets a founder choose whether their name shows and what it is, on their own row only', () => {\n    expect(code).toMatch(/create policy \"choose whether your name shows\" on public\\.founding_members for update to authenticated\\s+using \\(user_id = auth\\.uid\\(\\)\\)\\s+with check \\(user_id = auth\\.uid\\(\\)\\)/)\n    expect(code).toMatch(/^grant update \\(display_name, show_name\\) on public\\.founding_members to authenticated;$/m)\n  })\n  it('gives nobody the right to add or delete founders from a browser', () => {\n    expect(code).not.toMatch(/on public\\.founding_members for (insert|delete)/)\n    expect(code).not.toMatch(/grant [a-z, ]*(insert|delete|all)[a-z, ]* on public\\.founding_members to [^;]*\\b(anon|authenticated)\\b/i) // only the server's own key may add or delete founders\n    expect(code).toMatch(/^grant select, insert, update, delete on public\\.founding_members to service_role;/m)\n  })\n})\n\ndescribe('the file as a whole', () => {\n  it('is safe to run twice (every policy is dropped first, every table is \"if not exists\")', () => {\n    for (const name of ['see your own membership', 'see your own founding status', 'anyone can see the names on the wall', 'choose whether your name shows']) expect(code, name).toMatch(new RegExp(`drop policy if exists \"${name}\" on public\\\\.`))\n    expect((code.match(/create table if not exists/g) || []).length).toBe(2)\n  })\n  it('explains why the permission lines are there, and how to undo it', () => {\n    expect(sql).toMatch(/PERMISSIONS: a table made in the SQL editor cannot be read by the website/)\n    expect(sql).toMatch(/drop table if exists public\\.founding_members/); expect(sql).toMatch(/drop table if exists public\\.memberships/)\n  })\n",
"\ndescribe('the file as a whole', () => {\n  it('is safe to run twice (every policy is dropped first, every table is \"if not exists\")', () => {\n    for (const name of ['see your own membership']) expect(code, name).toMatch(new RegExp(`drop policy if exists \"${name}\" on public\\\\.`))\n    expect((code.match(/create table if not exists/g) || []).length).toBe(1)\n  })\n  it('explains why the permission lines are there, and how to undo it', () => {\n    expect(sql).toMatch(/PERMISSIONS: a table made in the SQL editor cannot be read by the website/)\n    expect(sql).toMatch(/drop table if exists public\\.memberships/)\n  })\n"
]
],
"test/server-tables-have-service-role.test.js": [
[
"  })\n  it('gives the founding members table the same, since the server will manage it', () => {\n    const { code } = sqlFiles.find((s) => s.file === 'memberships.sql')\n    expect(code).toMatch(/^grant select, insert, update, delete on public\\.founding_members to service_role;/m)\n  })\n  it('never gives the server-only tables to visitors or signed-in people (the grant is for the server\\u2019s key alone)', () => {\n",
"  })\n  it('never gives the server-only tables to visitors or signed-in people (the grant is for the server\\u2019s key alone)', () => {\n"
]
],
"tools/health-check.mjs": [
[
"  ['Membership: the page is on the site', 'src/App.jsx', /MembershipPage/, 'the membership page update (the add-membership-page script)'],\n  ['Membership: the database file', 'sql/memberships.sql', /founding_members/, 'the membership page update (the add-membership-page script)'],\n  ['Membership: the payment function', 'api/membership-checkout.js', /MEMBERSHIP_OPEN/, 'the membership payment update (the add-membership-payment script)'],\n",
"  ['Membership: the page is on the site', 'src/App.jsx', /MembershipPage/, 'the membership page update (the add-membership-page script)'],\n  ['Membership: the database file', 'sql/memberships.sql', /create table if not exists public\\.memberships/, 'the membership page update (the add-membership-page script)'],\n  ['Membership: the payment function', 'api/membership-checkout.js', /MEMBERSHIP_OPEN/, 'the membership payment update (the add-membership-payment script)'],\n"
]
]
}''')
STAGED = {
    'test/membership-tidy.test.js': 'tools/membership-tidy-files/membership-tidy.test.js.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["tools/membership-tidy-files/membership-tidy.test.js.staged", "INSTALL-MEMBERSHIP-TIDY.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-membership-tidy-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-membership-tidy').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
for target, source in STAGED.items():
    t, src = root / target, root / source
    new_text = src.read_text(encoding='utf-8')
    if t.exists() and t.read_text(encoding='utf-8') == new_text:
        print('already done  ' + target)
        continue
    if t.exists():
        pathlib.Path(str(t) + '.before-membership-tidy').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)

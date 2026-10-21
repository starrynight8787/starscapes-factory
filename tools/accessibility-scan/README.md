# Accessibility scan

Opens every kind of page in a real browser and checks it with [axe](https://github.com/dequelabs/axe-core) against WCAG 2.2 AA (plus its best-practice rules), at desktop and phone size. Added for SFW-190 (21 October 2026): it found 7 kinds of problem, now fixed; every page it can reach comes back clean.

## Run it

Once, in the project folder:

    npm install --no-save axe-core
    pip3 install playwright && python3 -m playwright install chromium

Then, each time (two terminals):

    npm run build && npx vite preview --port 4177        # terminal 1: leave this running
    python3 tools/accessibility-scan/scan.py desktop     # terminal 2: every kind of page, as a first-time visitor sees it
    python3 tools/accessibility-scan/scan.py mobile
    python3 tools/accessibility-scan/scan.py desktop content    # pages that show real content, using sample posts and products
    python3 tools/accessibility-scan/scan.py mobile content

Each page prints `OK` or `FAIL` with the rule, a plain description, and the first element affected. The script exits with 0 if nothing was found.

It stands in for the database and blocks every other outside address, so it never touches real data. Pages it cannot reach, which need checking another way: checkout (it is on Stripe's own pages), the admin pages, My passes while signed in, and the post editor. It also cannot judge things only a person can: keyboard use, zoom to 200 percent, reduced motion, and how a real screen reader reads a page.

## When to run it

After adding a new kind of page or a new look. Add the new address to `EMPTY_PAGES` or `CONTENT_PAGES` in `scan.py`.

// The Road journal's downloads (SFW-261). Gill's decisions, 22 and 23 October 2026:
//   - TWO plain download links, A4 (UK and Europe) first and US Letter second, with the file names she chose, both through the SAME confirm step (no extra form, no extra email);
//   - NO counting of downloads and no analytics or extra data collection;
//   - getting the journal needs no tick; the newsletter is a separate, OPTIONAL, never-ticked box, worded the same on every form (so the box stays).
// Also: both PDFs must really be in public/downloads/ (so a broken link can never go out), and the page stays taped while there are no files.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const h = vi.hoisted(() => ({ result: { ok: true, state: 'confirmed', source: 'road-journal', kind: 'request', newsletter: false } }))
vi.mock('../src/newsletter/newsletterApi', () => ({
  confirmSubscription: vi.fn(async () => h.result),
  unsubscribe: vi.fn(async () => ({ ok: true, state: 'unsubscribed' })),
  fetchOpen: vi.fn(async () => true),
  subscribe: vi.fn(async () => ({ ok: true })),
}))
vi.mock('../src/explorers/TapedDoorPage', () => ({ default: ({ door }) => <p>The {door} door is still taped</p> }))
import { NewsletterConfirmPage } from '../src/newsletter/NewsletterLinkPage'
import RoadJournalPage from '../src/explorers/RoadJournalPage'
import { JOURNAL, journalFiles } from '../src/explorers/explorersConfig'
import { OPTIONAL_NEWSLETTER_TEXT, cleanSubscribe, ebookLinkEmail, requestOf, SITE } from '../src/newsletter/newsletterRules'

const ROOT = process.cwd()
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const code = (p) => read(p).replace(/(^|\s)\/\/.*$/gm, '$1') // the file without its // comments, so a comment that SAYS there is no tracking is not mistaken for tracking
const originalFiles = JOURNAL.files
const A4 = { id: 'a4', label: 'A4 (UK and Europe)', file: '/downloads/starscapes-road-journal-a4.pdf' }
const US = { id: 'us-letter', label: 'US Letter', file: '/downloads/starscapes-road-journal-us-letter.pdf' }
const TOKEN = 'ab'.repeat(24)
const openConfirm = () => render(<MemoryRouter initialEntries={[`/newsletter/confirm?t=${TOKEN}&for=road-journal`]}><NewsletterConfirmPage /></MemoryRouter>)
const press = async () => userEvent.click(screen.getByRole('button', { name: 'Yes, send me the Road journal' }))
beforeEach(() => { h.result = { ok: true, state: 'confirmed', source: 'road-journal', kind: 'request', newsletter: false } })
afterEach(() => { JOURNAL.files = originalFiles; vi.restoreAllMocks() })

function walk(dir) { return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) }

describe('the two downloads', () => {
  it('are exactly A4 (UK and Europe) first and US Letter second, with the file names Gill chose', () => {
    expect(journalFiles()).toEqual([A4, US])
  })
  it('both files are in public/downloads/, are real PDFs, and are under 10 MB (copy them in first if this fails)', () => {
    for (const f of journalFiles()) {
      const path = join(ROOT, 'public', f.file)
      expect(existsSync(path), `Copy ${basename(f.file)} into public/downloads/ before you test or release.`).toBe(true)
      expect(readFileSync(path).subarray(0, 5).toString(), basename(f.file)).toBe('%PDF-')
      expect(statSync(path).size, basename(f.file)).toBeLessThan(10 * 1024 * 1024)
    }
  })
  it('ignores an entry with no file, and an empty list means the journal is not ready', () => {
    expect(journalFiles({ files: [{ id: 'x', label: 'X', file: '' }, null, {}] })).toEqual([])
    expect(journalFiles({})).toEqual([])
  })
})

describe('the page the confirm link opens, for someone who asked for the Road journal', () => {
  it('opening the page changes nothing: no download is shown until the button is pressed', () => {
    openConfirm(); expect(screen.queryByRole('link', { name: /Download/ })).toBeNull()
  })
  it('shows two plain download links after confirming, A4 first, then US Letter, each marked as a download, with names that say what they are', async () => {
    openConfirm(); await press(); await screen.findByRole('status')
    const links = screen.getAllByRole('link', { name: /^Download the free Road journal/ })
    expect(links.map((l) => l.textContent)).toEqual(['A4 (UK and Europe)', 'US Letter']) // what shows on the buttons
    expect(links.map((l) => l.getAttribute('href'))).toEqual([A4.file, US.file])
    for (const l of links) expect(l).toHaveAttribute('download')
    expect(links[0]).toHaveAccessibleName('Download the free Road journal (PDF), A4 (UK and Europe)')
    expect(links[1]).toHaveAccessibleName('Download the free Road journal (PDF), US Letter')
  })
  it('adds nothing for choosing a size: no second button to press, no form, and no mention of the newsletter unless they ticked the box', async () => {
    openConfirm(); await press(); const status = await screen.findByRole('status')
    expect(screen.queryByRole('button', { name: /A4|Letter/ })).toBeNull(); expect(document.querySelector('form')).toBeNull(); expect(status.textContent).not.toMatch(/newsletter/i)
  })
  it('says so, and offers no link that is not there, while there are no files', async () => {
    JOURNAL.files = []; openConfirm(); await press(); const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Your free Road journal is still being finished. I will email you the link as soon as it is ready.'); expect(screen.queryByRole('link', { name: /Download/ })).toBeNull()
  })
  it('still works with one file: a single link, in the old words', async () => {
    JOURNAL.files = [A4]; openConfirm(); await press(); await screen.findByRole('status')
    const link = screen.getByRole('link', { name: 'Download the free Road journal (PDF)' }); expect(link).toHaveAttribute('href', A4.file); expect(screen.getAllByRole('link', { name: /Download/ })).toHaveLength(1)
  })
})

describe('the email for someone who confirmed earlier and asks again', () => {
  const request = () => requestOf({ source: 'road-journal' })
  it('has both links, A4 first, in the text and in the buttons', () => {
    const mail = ebookLinkEmail({ file: request().file, request: request() })
    const t = mail.text; expect(t.indexOf(`A4 (UK and Europe): ${SITE}${A4.file}`)).toBeGreaterThan(-1); expect(t.indexOf(`US Letter: ${SITE}${US.file}`)).toBeGreaterThan(t.indexOf(A4.file))
    expect(mail.html.indexOf(`${SITE}${A4.file}`)).toBeGreaterThan(-1); expect(mail.html.indexOf(`${SITE}${US.file}`)).toBeGreaterThan(mail.html.indexOf(`${SITE}${A4.file}`)); expect(mail.html).toContain('A4 (UK and Europe)')
  })
  it('leaves the free ebook email exactly as it was: one link', () => {
    const mail = ebookLinkEmail({ file: '/downloads/leading-from-the-middle.pdf', request: requestOf({ source: 'ebook' }) })
    expect(mail.text).toContain(`${SITE}/downloads/leading-from-the-middle.pdf`); expect(mail.text).not.toMatch(/A4|US Letter/); expect((mail.html.match(/Download the ebook \(PDF\)/g) || [])).toHaveLength(1)
  })
})

describe('the Road journal page', () => {
  const page = () => render(<MemoryRouter><RoadJournalPage /></MemoryRouter>)
  it('stays taped while there are no files, even if the door is open', () => {
    JOURNAL.files = []; page(); expect(screen.getByText('The road-journal door is still taped')).toBeInTheDocument(); expect(screen.queryByText('Where shall I send it?')).toBeNull()
  })
  it('opens once the files are listed, with one email box and ONE optional newsletter box, never ticked', async () => {
    page(); expect(await screen.findByText('Where shall I send it?')).toBeInTheDocument()
    const boxes = screen.getAllByRole('checkbox'); expect(boxes).toHaveLength(1); expect(boxes[0]).not.toBeChecked(); expect(screen.getByLabelText(OPTIONAL_NEWSLETTER_TEXT)).toBe(boxes[0])
  })
})

describe('Gill’s decisions are written into the code', () => {
  it('getting the journal needs no tick: an email alone is enough, and it does not join the newsletter', () => {
    expect(cleanSubscribe({ email: 'ann@example.com', source: 'road-journal' })).toMatchObject({ ok: true, newsletter: false })
  })
  it('the newsletter box is optional, never ticked to start with, and worded the same on every form (one set of words, used by both)', () => {
    for (const f of ['src/explorers/RequestForm.jsx', 'src/ebook/FreeEbookPage.jsx']) {
      const s = read(f); expect(s, f).toContain('OPTIONAL_NEWSLETTER_TEXT'); expect(s, f).toMatch(/const \[newsletter, setNewsletter\] = useState\(false\)/); expect(s, f).toMatch(/label=\{OPTIONAL_NEWSLETTER_TEXT\}/)
    }
    const copies = walk('src').filter((f) => /\.(jsx?|css)$/.test(f)).filter((f) => read(f).includes(OPTIONAL_NEWSLETTER_TEXT.slice(0, 50)))
    expect(copies, 'the words are written out in one place only').toEqual(['src/newsletter/newsletterRules.js'])
  })
  it('nothing counts the downloads: no analytics, no click tracking, no extra request from the download links', () => {
    for (const f of ['src/newsletter/NewsletterLinkPage.jsx', 'src/explorers/RoadJournalPage.jsx', 'src/explorers/explorersConfig.js', 'src/explorers/RequestForm.jsx']) expect(code(f), f).not.toMatch(/sendBeacon|gtag\(|analytics|plausible|posthog|fathom|umami|dataLayer/i)
    const page = code('src/newsletter/NewsletterLinkPage.jsx')
    expect(page).not.toMatch(/<a[^>]*\bdownload\b[^>]*\bon(Click|MouseDown|AuxClick|PointerDown)\b/); expect(page).not.toMatch(/<a[^>]*\bon(Click|MouseDown|AuxClick|PointerDown)\b[^>]*\bdownload\b/)
    const confirmed = page.slice(page.indexOf('function Confirmed'), page.indexOf('const FOR'))
    expect(confirmed, 'the download part of the page makes no requests').not.toMatch(/fetch\(|XMLHttpRequest|navigator\./)
  })
})

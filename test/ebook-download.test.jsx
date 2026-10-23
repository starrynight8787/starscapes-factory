// The free ebook, "Leading from the Middle" (SFW-259): Gill's final book, its cover on the page, and the words that describe it. Gill approved this wording on 23 October 2026.
// The page used to promise a different book (about 40 pages, "read it in an afternoon", and contents that are not in it); these tests make sure the words, the file and the cover always agree, and that a broken or missing file can never go out.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ result: { ok: true, state: 'confirmed', source: 'ebook', kind: 'request', newsletter: false } }))
vi.mock('../src/newsletter/newsletterApi', () => ({
  confirmSubscription: vi.fn(async () => h.result),
  unsubscribe: vi.fn(async () => ({ ok: true, state: 'unsubscribed' })),
  fetchOpen: vi.fn(async () => true),
  subscribe: vi.fn(async () => ({ ok: true })),
}))
import { NewsletterConfirmPage } from '../src/newsletter/NewsletterLinkPage'
import FreeEbookPage from '../src/ebook/FreeEbookPage'
import { EBOOK } from '../src/ebook/ebookConfig'
import { OPTIONAL_NEWSLETTER_TEXT } from '../src/newsletter/newsletterRules'

const ROOT = process.cwd()
const pdfPath = join(ROOT, 'public', EBOOK.file)
const coverPath = join(ROOT, 'public/ebook/leading-from-the-middle-cover.jpg')
const TOKEN = 'ab'.repeat(24)
const pageCount = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length
function jpegSize(buf) { // width and height from the JPEG's own header
  let i = 2
  while (i < buf.length) { if (buf[i] !== 0xff) { i += 1; continue } const marker = buf[i + 1]; if ([0xc0, 0xc1, 0xc2].includes(marker)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }; i += 2 + buf.readUInt16BE(i + 2) }
  return null
}
beforeEach(() => { h.result = { ok: true, state: 'confirmed', source: 'ebook', kind: 'request', newsletter: false } })
afterEach(() => vi.restoreAllMocks())

describe('the words on the ebook page (approved by Gill, 23 October 2026)', () => {
  it('describe the real book: a short book, six building blocks, 11 pages', () => {
    expect(EBOOK.summary).toBe('A short book about leading without the big title, and the six building blocks behind it. Read it in one sitting.')
    expect(EBOOK.fileNote).toBe('PDF, 11 pages, to read on screen or print.')
    expect(EBOOK.inside).toEqual(['My story, and why I believe you are already a leader', 'The six building blocks of Leading from the Middle', 'How they fit together, with a seesaw and the great circle of life'])
  })
  it('no longer promise what the book does not have', () => {
    const all = JSON.stringify(EBOOK)
    for (const old of ['about 40 pages', 'in an afternoon', 'Why the middle is where most leading happens', 'Small habits for being heard', 'Questions to ask in your next one-to-one']) expect(all).not.toContain(old)
  })
})

describe('the PDF', () => {
  it('is listed, and is really in public/downloads/ (copy it in first if this fails), is a PDF, and is under 10 MB', () => {
    expect(EBOOK.file).toBe('/downloads/leading-from-the-middle.pdf')
    expect(existsSync(pdfPath), 'Copy leading-from-the-middle.pdf into public/downloads/ before you test or release.').toBe(true)
    expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe('%PDF-'); expect(statSync(pdfPath).size).toBeLessThan(10 * 1024 * 1024)
  })
  it('has exactly the number of pages the page says it has', () => {
    const said = Number((EBOOK.fileNote.match(/(\d+) pages/) || [])[1]); expect(said, 'the file note names a page count').toBeGreaterThan(0)
    expect(pageCount(readFileSync(pdfPath)), `the note says ${said} pages: update the note or the PDF so they agree`).toBe(said)
  })
})

describe('the cover on the page', () => {
  it('is a real JPEG in public/ebook/, a sensible size, and matches the width and height the page gives it', () => {
    expect(existsSync(coverPath)).toBe(true); const buf = readFileSync(coverPath); expect(buf.subarray(0, 2).toString('hex')).toBe('ffd8'); expect(buf.length).toBeLessThan(300 * 1024)
    expect(jpegSize(buf)).toEqual({ width: 910, height: 1287 })
  })
  it('shows on the page with a description, not as a hidden placeholder, and the newsletter box is still the one optional, unticked box', async () => {
    render(<MemoryRouter><FreeEbookPage /></MemoryRouter>); expect(await screen.findByText('Where shall I send it?')).toBeInTheDocument()
    const img = screen.getByAltText('Cover of Leading from the Middle by Gill Bennet'); expect(img).toHaveAttribute('src', '/ebook/leading-from-the-middle-cover.jpg'); expect(img).toHaveAttribute('width', '910'); expect(img).toHaveAttribute('height', '1287')
    expect(img.closest('[aria-hidden="true"]')).toBeNull()
    const boxes = screen.getAllByRole('checkbox'); expect(boxes).toHaveLength(1); expect(boxes[0]).not.toBeChecked(); expect(screen.getByLabelText(OPTIONAL_NEWSLETTER_TEXT)).toBe(boxes[0])
  })
})

describe('after confirming', () => {
  it('the download is offered as one plain link to the PDF, marked as a download, with the page-count note', async () => {
    render(<MemoryRouter initialEntries={[`/newsletter/confirm?t=${TOKEN}&for=ebook`]}><NewsletterConfirmPage /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Yes, send me the free ebook' })); const status = await screen.findByRole('status')
    const link = screen.getByRole('link', { name: 'Download the free ebook (PDF)' }); expect(link).toHaveAttribute('href', '/downloads/leading-from-the-middle.pdf'); expect(link).toHaveAttribute('download'); expect(status).toHaveTextContent('PDF, 11 pages, to read on screen or print.')
    expect(screen.queryByText(/still being finished/)).toBeNull()
  })
})

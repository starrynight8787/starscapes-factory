// The page a confirmation link opens (SFW-250): someone who asked for the free ebook gets it here, after pressing the confirm button, because the ebook and the newsletter are one list.
// Opening the page still changes nothing: only the button does.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ confirmed: [], result: { ok: true, state: 'confirmed', source: 'ebook' } }))
vi.mock('../src/newsletter/newsletterApi', () => ({
  confirmSubscription: vi.fn(async (t) => { h.confirmed.push(t); return h.result }),
  unsubscribe: vi.fn(async () => ({ ok: true, state: 'unsubscribed' })),
}))
import { NewsletterConfirmPage } from '../src/newsletter/NewsletterLinkPage'
import { EBOOK } from '../src/ebook/ebookConfig'

const TOKEN = 'ab'.repeat(24)
const originalFile = EBOOK.file
const open = () => render(<MemoryRouter initialEntries={[`/newsletter/confirm?t=${TOKEN}`]}><NewsletterConfirmPage /></MemoryRouter>)
const press = async () => userEvent.click(screen.getByRole('button', { name: 'Yes, send me the newsletter' }))
beforeEach(() => { h.confirmed = []; h.result = { ok: true, state: 'confirmed', source: 'ebook' }; EBOOK.file = '' })
afterEach(() => { EBOOK.file = originalFile; vi.restoreAllMocks() })

describe('after pressing confirm, for someone who asked for the ebook', () => {
  it('opening the page changes nothing: nothing is confirmed, and no ebook is offered, until the button is pressed', () => {
    open(); expect(h.confirmed).toHaveLength(0); expect(screen.queryByRole('link', { name: /Download/ })).toBeNull(); expect(document.body.textContent).not.toMatch(/ebook/i)
  })
  it('thanks them and, when there is a PDF, gives the download (the file, marked as a download, with its note)', async () => {
    EBOOK.file = '/downloads/leading-from-the-middle.pdf'; open(); await press()
    const status = await screen.findByRole('status'); expect(status).toHaveTextContent('You are subscribed. Thank you: the next newsletter will come to you.')
    const link = screen.getByRole('link', { name: 'Download the free ebook (PDF)' }); expect(link).toHaveAttribute('href', '/downloads/leading-from-the-middle.pdf'); expect(link).toHaveAttribute('download'); expect(status).toHaveTextContent(EBOOK.fileNote); expect(h.confirmed).toEqual([TOKEN])
  })
  it('while there is no PDF, says the ebook is still being finished and the link will be emailed, and offers no download that is not there', async () => {
    open(); await press(); const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Your free ebook is still being finished. I will email you the link as soon as it is ready.'); expect(screen.queryByRole('link', { name: /Download/ })).toBeNull()
  })
  it('does the same for someone who confirmed earlier and presses the link again', async () => {
    h.result = { ok: true, state: 'already', source: 'ebook' }; EBOOK.file = '/downloads/x.pdf'; open(); await press()
    const status = await screen.findByRole('status'); expect(status).toHaveTextContent('You are already subscribed. Thank you.'); expect(screen.getByRole('link', { name: 'Download the free ebook (PDF)' })).toHaveAttribute('href', '/downloads/x.pdf')
  })
})

describe('after pressing confirm, for someone who joined from the footer box', () => {
  it('only thanks them: no mention of an ebook and no download, even when there is a PDF (they did not ask for it)', async () => {
    EBOOK.file = '/downloads/x.pdf'; h.result = { ok: true, state: 'confirmed', source: 'site' }; open(); await press()
    const status = await screen.findByRole('status'); expect(status).toHaveTextContent('You are subscribed. Thank you: the next newsletter will come to you.'); expect(status.textContent).not.toMatch(/ebook/i); expect(screen.queryByRole('link', { name: /Download/ })).toBeNull()
  })
  it('does the same for an older answer that carries no source at all', async () => {
    EBOOK.file = '/downloads/x.pdf'; h.result = { ok: true, state: 'confirmed' }; open(); await press()
    const status = await screen.findByRole('status'); expect(status.textContent).not.toMatch(/ebook/i); expect(screen.queryByRole('link', { name: /Download/ })).toBeNull()
  })
})

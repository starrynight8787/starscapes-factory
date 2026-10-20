// The owner's "Promotions" page (/admin/promotions): who may see it, the half-price year, the form for making a code (and how it checks it), the list of codes, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ owner: true, fail: null, asked: 0, hold: false, result: null, created: [], createFails: null, switched: [], switchFails: null, slow: false }))
vi.mock('../src/admin/promotionsAdminApi', () => ({
  fetchPromotions: vi.fn(async () => { h.asked += 1; if (h.hold) await new Promise(() => {}); if (h.fail) throw new Error(h.fail); return h.result }),
  createCode: vi.fn(async (form) => {
    h.created.push(form)
    if (h.slow) await new Promise((r) => setTimeout(r, 30))
    if (h.createFails) { const e = new Error(h.createFails.message); if (h.createFails.field) e.field = h.createFails.field; throw e }
    return { id: 'promo_new', code: String(form.code).trim().toUpperCase(), active: true, summary: '20% off your first payment', percentOff: 20, amountOff: null, duration: 'once', months: null, used: 0, maxUses: null, expiresAt: null, created: null, couponValid: true }
  }),
  switchCode: vi.fn(async (id, active) => {
    h.switched.push([id, active]); if (h.switchFails) throw new Error(h.switchFails)
    const c = h.result.codes.find((x) => x.id === id); return { ...c, active }
  }),
}))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import AdminPromotions from '../src/admin/AdminPromotions'
import { ADMIN_TOOLS } from '../src/admin/adminTools'
import { PAGES } from '../src/data/pageMeta'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const code = (id, over = {}) => ({ id, code: id.toUpperCase(), active: true, summary: '20% off for 3 months', percentOff: 20, amountOff: null, duration: 'repeating', months: 3, used: 3, maxUses: 10, expiresAt: '2099-12-31T23:59:59.000Z', created: '2026-10-01T10:00:00.000Z', couponValid: true, ...over })
const THREE = [
  code('spring', { code: 'SPRING20' }),
  code('fiver', { code: 'FIVER', active: false, summary: '\u00a35 off your first payment', amountOff: 500, percentOff: null, duration: 'once', months: null, maxUses: null, expiresAt: null, used: 0 }),
  code('old', { code: 'OLDONE', summary: '10% off for as long as you keep your passes', maxUses: 5, used: 5, couponValid: false, expiresAt: '2020-01-31T23:59:59.000Z' }),
]
const page = () => render(<MemoryRouter><AdminPromotions session={{ user: { id: 'gill' } }} /></MemoryRouter>)
const rowOf = (text) => screen.getByText(text).closest('li')
beforeEach(() => { Object.assign(h, { owner: true, fail: null, asked: 0, hold: false, created: [], createFails: null, switched: [], switchFails: null, slow: false, result: { codes: THREE, mode: 'test', more: false } }) })

describe('who may see it', () => {
  it('is for the owner only, and asks for nothing otherwise', () => {
    h.owner = false; page()
    expect(screen.getByRole('heading', { level: 1, name: 'Promotions' })).toBeInTheDocument(); expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(h.asked).toBe(0); expect(screen.queryByRole('form')).toBeNull(); expect(screen.queryByLabelText('The code members type')).toBeNull()
  })
  it('says Loading while it waits, and plainly when the codes cannot load, with no list', async () => {
    h.hold = true; page(); expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
  it('says plainly when the codes cannot load, and leaves no empty list behind', async () => {
    h.fail = 'Stripe could not list the codes just now. Please try again in a moment.'; page()
    expect(await screen.findByText(/could not list the codes just now/)).toBeInTheDocument(); expect(screen.queryByRole('list')).toBeNull(); expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the half-price first year', () => {
  it('is explained and looked at, not changed: no box here edits it, and it says a code replaces it', () => {
    h.hold = true; page()
    const card = screen.getByRole('heading', { name: 'The half-price first year' }).closest('section')
    expect(card).toHaveTextContent('Launch offer: half price for your first year'); expect(card).toHaveTextContent('replaces'); expect(card.querySelector('input, select, button, textarea')).toBeNull()
    expect(card).toHaveTextContent('depend on it')
  })
})

describe('Stripe\u2019s mode', () => {
  it('says test mode, and that test codes must be made again for the live shop', async () => {
    page(); expect(await screen.findByRole('note')).toHaveTextContent(/Stripe is in test mode\..*make them again when the shop is live/)
  })
  it('says live mode, and that codes are real', async () => {
    h.result = { codes: [], mode: 'live', more: false }; page(); expect(await screen.findByRole('note')).toHaveTextContent(/Stripe is in live mode\..*real/)
  })
  it('says nothing when the mode is not known', async () => {
    h.result = { codes: [], mode: 'unknown', more: false }; page(); await screen.findByText('No codes yet. Make one above.'); expect(screen.queryByRole('note')).toBeNull()
  })
})

describe('the list of codes', () => {
  it('shows each code: its text, whether it works, what it gives, how often it was used, and until when', async () => {
    page(); await screen.findByText('SPRING20')
    const a = rowOf('SPRING20'); for (const t of ['Working', '20% off for 3 months', '3 of 10 used. Works until 31 December 2099.']) expect(within(a).getByText(t), t).toBeInTheDocument()
    const b = rowOf('FIVER'); for (const t of ['Switched off', '\u00a35 off your first payment', '0 used, no limit. No end date.']) expect(within(b).getByText(t), t).toBeInTheDocument()
    const c = rowOf('OLDONE'); for (const t of ['Finished', '5 of 5 used. Ended 31 January 2020.']) expect(within(c).getByText(t), t).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('3 codes')
  })
  it('offers to switch off a working code, to switch on a switched-off one, and nothing for a finished one (it says it cannot be used again)', async () => {
    page(); await screen.findByText('SPRING20')
    expect(within(rowOf('SPRING20')).getByRole('button', { name: 'Switch off the code SPRING20' })).toBeInTheDocument(); expect(within(rowOf('FIVER')).getByRole('button', { name: 'Switch on the code FIVER' })).toBeInTheDocument()
    expect(within(rowOf('OLDONE')).queryByRole('button')).toBeNull(); expect(within(rowOf('OLDONE')).getByText('Finished: it cannot be used again.')).toBeInTheDocument()
  })
  it('says there are no codes, and counts none, when there are none', async () => {
    h.result = { codes: [], mode: 'test', more: false }; page(); expect(await screen.findByText('No codes yet. Make one above.')).toBeInTheDocument(); expect(screen.queryByRole('status')).toBeNull()
  })
  it('says so when there are more than the newest hundred', async () => {
    h.result = { codes: THREE, mode: 'test', more: true }; page(); expect(await screen.findByText('Showing the newest 100 codes. Older ones are in Stripe.')).toBeInTheDocument()
  })
  it('switches a code off, shows it as switched off, and says so', async () => {
    page(); await screen.findByText('SPRING20'); await userEvent.click(screen.getByRole('button', { name: 'Switch off the code SPRING20' }))
    expect(h.switched).toEqual([['spring', false]]); await waitFor(() => expect(within(rowOf('SPRING20')).getByText('Switched off')).toBeInTheDocument())
    expect(screen.getByText('SPRING20 is switched off.')).toBeInTheDocument(); expect(within(rowOf('SPRING20')).getByRole('button', { name: 'Switch on the code SPRING20' })).toBeInTheDocument()
  })
  it('switches a code back on', async () => {
    page(); await screen.findByText('FIVER'); await userEvent.click(screen.getByRole('button', { name: 'Switch on the code FIVER' }))
    expect(h.switched).toEqual([['fiver', true]]); await waitFor(() => expect(within(rowOf('FIVER')).getByText('Working')).toBeInTheDocument()); expect(screen.getByText('FIVER is switched on.')).toBeInTheDocument()
  })
  it('says plainly, in an alert, if it could not switch it, and leaves the code as it was', async () => {
    h.switchFails = 'Stripe could not switch that code off just now. Please try again in a moment.'; page(); await screen.findByText('SPRING20')
    await userEvent.click(screen.getByRole('button', { name: 'Switch off the code SPRING20' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not switch that code off'); expect(within(rowOf('SPRING20')).getByText('Working')).toBeInTheDocument()
  })
})

describe('the form', () => {
  const fill = async (over = {}) => {
    const v = { code: 'spring20', value: '20', ...over }
    if (v.code !== undefined) await userEvent.type(screen.getByLabelText('The code members type'), v.code)
    if (v.value !== undefined) await userEvent.type(screen.getByLabelText(/^Percentage off|^Pounds off/), v.value)
  }
  it('has a labelled box for everything, a percentage chosen to begin with, and months only when months are chosen', async () => {
    page(); await screen.findByText('SPRING20')
    for (const l of ['The code members type', 'Percentage off, from 1 to 100', 'How long the discount lasts', 'How many people can use it (leave empty for no limit)', 'The last day it works (leave empty for no end date)']) expect(screen.getByLabelText(l), l).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'A percentage' })).toBeChecked(); expect(screen.queryByLabelText(/How many months/)).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('How long the discount lasts'), 'repeating'); expect(screen.getByLabelText('How many months, from 1 to 36')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('How long the discount lasts'), 'forever'); expect(screen.queryByLabelText(/How many months/)).toBeNull()
  })
  it('changes the question when you choose an amount of money', async () => {
    page(); await screen.findByText('SPRING20'); await userEvent.click(screen.getByRole('radio', { name: 'An amount of money' }))
    expect(screen.getByLabelText('Pounds off, for example 5 or 2.50')).toBeInTheDocument(); expect(screen.queryByLabelText('Percentage off, from 1 to 100')).toBeNull()
  })
  it('says, as you fill it in, exactly what the code will do, and asks you to fill it in until it can', async () => {
    page(); await screen.findByText('SPRING20')
    expect(screen.getByText('Fill in the boxes and a sentence here will say exactly what the code does.')).toBeInTheDocument()
    await fill(); expect(screen.getByText('SPRING20 gives 20% off your first payment. Anyone can use it, as many times as they like. It has no end date. It replaces the launch offer for anyone who uses it.')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('How long the discount lasts'), 'repeating'); await userEvent.type(screen.getByLabelText('How many months, from 1 to 36'), '3')
    expect(screen.getByText(/SPRING20 gives 20% off for 3 months\./)).toBeInTheDocument()
  })
  it('warns when the code would make the passes free', async () => {
    page(); await screen.findByText('SPRING20'); await fill({ value: '100' }); expect(screen.getByText(/the passes would be free/)).toBeInTheDocument()
  })
  it('refuses a form that is not right, in words, next to the box, with the box marked and given the cursor, and sends nothing', async () => {
    page(); await screen.findByText('SPRING20')
    await userEvent.type(screen.getByLabelText('The code members type'), 'x'); await userEvent.click(screen.getByRole('button', { name: 'Make the code' }))
    const box = screen.getByLabelText('The code members type'); expect(box).toHaveFocus(); expect(box).toHaveAttribute('aria-invalid', 'true'); expect(box.getAttribute('aria-describedby')).toBe('pm-code-error')
    expect(document.getElementById('pm-code-error')).toHaveTextContent(/2 to 40 letters, numbers or dashes/); expect(screen.getByRole('alert')).toHaveTextContent(/2 to 40 letters/); expect(h.created).toEqual([])
  })
  it('names the first box that is wrong, whichever it is', async () => {
    page(); await screen.findByText('SPRING20'); await userEvent.type(screen.getByLabelText('The code members type'), 'GOOD'); await userEvent.type(screen.getByLabelText(/^Percentage off/), '150')
    await userEvent.click(screen.getByRole('button', { name: 'Make the code' })); expect(screen.getByLabelText(/^Percentage off/)).toHaveFocus(); expect(document.getElementById('pm-value-error')).toHaveTextContent('whole number from 1 to 100')
    await userEvent.clear(screen.getByLabelText(/^Percentage off/)); await userEvent.type(screen.getByLabelText(/^Percentage off/), '20'); await userEvent.type(screen.getByLabelText(/^How many people/), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Make the code' })); expect(screen.getByLabelText(/^How many people/)).toHaveFocus()
    await userEvent.clear(screen.getByLabelText(/^How many people/)); await userEvent.type(screen.getByLabelText(/^The last day/), '2020-01-01'); await userEvent.click(screen.getByRole('button', { name: 'Make the code' }))
    expect(screen.getByLabelText(/^The last day/)).toHaveFocus(); expect(h.created).toEqual([])
  })
  it('takes the message away as soon as you change something', async () => {
    page(); await screen.findByText('SPRING20'); await userEvent.click(screen.getByRole('button', { name: 'Make the code' })); expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('The code members type'), 'a'); expect(screen.queryByRole('alert')).toBeNull(); expect(document.getElementById('pm-code-error')).toBeNull()
  })
  it('makes the code, shows it at the top of the list as working, says so, and empties the form', async () => {
    page(); await screen.findByText('SPRING20'); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Make the code' }))
    await waitFor(() => expect(screen.getByText('Made the code SPRING20. It is working now: members can type it on the passes page.')).toBeInTheDocument())
    expect(h.created).toEqual([{ code: 'spring20', kind: 'percent', value: '20', duration: 'once', months: '', maxUses: '', expiresOn: '' }])
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('SPRING20'); expect(screen.getByRole('status')).toHaveTextContent('4 codes'); expect(screen.getByLabelText('The code members type')).toHaveValue('')
  })
  it('shows it is working on it, and cannot be pressed twice', async () => {
    h.slow = true; page(); await screen.findByText('SPRING20'); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Make the code' }))
    const busy = screen.getByRole('button', { name: 'Making the code…' }); expect(busy).toBeDisabled(); expect(busy).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Make the code' })).toBeEnabled()); expect(h.created).toHaveLength(1)
  })
  it('puts the server\u2019s answer next to the right box, keeps what you typed, and does not add a code, if the name is taken', async () => {
    h.createFails = { message: 'That code already exists and is working. Choose another name, or switch the old one off first.', field: 'code' }; page(); await screen.findByText('SPRING20'); await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Make the code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists and is working'); expect(document.getElementById('pm-code-error')).toBeInTheDocument(); expect(screen.getByLabelText('The code members type')).toHaveValue('spring20'); expect(screen.getByRole('status')).toHaveTextContent('3 codes')
  })
  it('says plainly if it failed for another reason, and keeps the form', async () => {
    h.createFails = { message: 'Stripe could not make the code just now. Nothing was made. Please try again in a moment.' }; page(); await screen.findByText('SPRING20'); await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Make the code' })); expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was made'); expect(screen.getByLabelText('The code members type')).toHaveValue('spring20')
  })
})

describe('how it is wired in', () => {
  it('has a route in the app for the owner only, a tile in the Admin tools that links to it (and no tool is left "coming soon"), and a page title kept out of search', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/promotions" element=\{ <ProtectedRoute session=\{session\}> <AdminPromotions session=\{session\} \/> <\/ProtectedRoute> \}/)
    expect(ADMIN_TOOLS.find((t) => t.name === 'Promotions')).toMatchObject({ to: '/admin/promotions', group: 'Members', icon: 'promo' }); expect(ADMIN_TOOLS.filter((t) => !t.to)).toEqual([])
    expect(PAGES['/admin/promotions']).toMatchObject({ title: 'Promotions', index: false })
  })
})

describe('the look: accessible and standing on its own', () => {
  const css = read('src/admin/adminpromotions.css'); const jsx = read('src/admin/AdminPromotions.jsx')
  const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  it('uses no inline styles and sets no text under 14px', () => {
    expect(jsx).not.toMatch(/style=\{/)
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('shows a ring when a field is tabbed to, and lets the fields shrink on a phone', () => {
    expect(css).toMatch(/\.pm__control:focus-visible, \.pm__radio-input:focus-visible \{ outline: 3px/); expect(css).toMatch(/\.pm__control \{[^}]*min-width: 0/); expect(css).toMatch(/\.pm__field \{[^}]*min-width: 0/)
  })
  it('does not rely on colour alone to show a mistake: the text says it, with a mark in front', () => {
    expect(css).toMatch(/\.pm__error::before \{ content: "! "/); expect(css).toMatch(/\.pm__control\[aria-invalid="true"\]/)
  })
  it('gives every box a label tied to it, and the two choices a group heading', () => {
    expect((jsx.match(/<label htmlFor="pm-/g) || []).length).toBe(6); expect(jsx).toMatch(/<fieldset[^>]*>\s*<legend>What it takes off<\/legend>/)
    expect((jsx.match(/<input /g) || []).length - 2 /* the two radios */).toBe((jsx.match(/\{\.\.\.field\('/g) || []).length - 1 /* the select */)
    expect((jsx.match(/<input className="pm__radio-input" type="radio"/g) || []).length).toBe(2) // no bare field anywhere: the project's legacy styles rule asks for a class on each
  })
  it('keeps each state tag readable (4.5 to 1)', () => {
    for (const [bg, fg] of [['#14306a', '#ffffff'], ['#ffe27a', '#0e1530'], ['#4a5170', '#ffffff'], ['#8f1d1d', '#ffffff']]) expect(ratio(bg, fg)).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(/\.pm__chip \{[^}]*background: var\(--sf-navy-700, #14306a\); color: #fff/); expect(css).toMatch(/\.pm__chip--off \{ background: #ffe27a; color: #0e1530/); expect(css).toMatch(/\.pm__chip--finished \{ background: #4a5170; color: #fff/)
  })
  it('announces a finished action politely, and a failure as an alert', () => {
    expect(jsx).toMatch(/role=\{note\.kind === 'error' \? 'alert' : undefined\}/); expect(jsx).toMatch(/aria-live=\{note\.kind === 'error' \? undefined : 'polite'\}/); expect(jsx).toMatch(/<p className="pm__preview" aria-live="polite">/)
  })
})

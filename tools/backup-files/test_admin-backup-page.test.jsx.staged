// The owner's backup page (/admin/backup), 22 October 2026: who may see it, what it says, what the button does, and that a failed backup never saves a file.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { backupPlan } from '../lib/backupData.js'
import { BACKUP_TABLE_NAMES } from '../lib/backupTables.js'

const h = vi.hoisted(() => ({ owner: true, checking: false, failOn: null, breakAccounts: false, hold: null, saved: [], asked: [] }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: h.checking, owner: h.owner }) }))
vi.mock('../src/admin/saveFile', () => ({ saveFile: vi.fn((name, text) => { h.saved.push({ name, text }) }) }))
vi.mock('../src/artloft/orderActionsApi', async () => {
  const { backupPlan: plan } = await import('../lib/backupData.js')
  return {
    orderAction: vi.fn(async (action, extra = {}) => {
      h.asked.push(action)
      if (h.hold) await h.hold
      if (action === 'backup_plan') return { ok: true, ...plan() }
      if (action === 'backup_page') { if (h.failOn === extra.table) throw new Error('the database would not give it up'); return { ok: true, rows: [{ id: 1, note: 'SECRET-ROW-CONTENT' }], total: 1, next: null } }
      if (action === 'backup_users') { if (h.breakAccounts) throw new Error('no'); return { ok: true, rows: [{ id: 'u1' }, { id: 'u2' }], next: null } }
      throw new Error('unexpected ' + action)
    }),
  }
})
import AdminBackup from '../src/admin/AdminBackup'
import { ADMIN_TOOLS } from '../src/admin/adminTools'
import { PAGES } from '../src/data/pageMeta'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const open = () => render(<MemoryRouter><AdminBackup session={{ user: { id: 'gill' } }} /></MemoryRouter>)
const button = () => screen.getByRole('button', { name: /Download a backup|Taking the backup/ })
const N = BACKUP_TABLE_NAMES.length
beforeEach(() => { Object.assign(h, { owner: true, checking: false, failOn: null, breakAccounts: false, hold: null, saved: [], asked: [] }); window.localStorage.clear() })

describe('who may see it', () => {
  it('shows nothing but a loading note while it checks who you are', () => {
    h.checking = true; open()
    expect(screen.queryByRole('button')).toBeNull(); expect(screen.getByText(/Checking who you are/)).toBeInTheDocument()
  })
  it('is for the owner only: anyone else is told so, has no button, and nothing is asked of the server', () => {
    h.owner = false; open()
    expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(screen.queryByRole('button')).toBeNull(); expect(h.asked).toEqual([])
  })
})

describe('what it says', () => {
  it('warns plainly that the file holds personal details, and to keep it private', () => {
    open()
    const note = screen.getByRole('note'); expect(note).toHaveTextContent('This file holds personal details'); expect(note).toHaveTextContent(/names, email addresses and delivery addresses/); expect(note).toHaveTextContent(/don.t email it/i)
  })
  it('says why it is needed (the free plan keeps no backups), what is in the file, and what is not (passwords, pictures, secret keys, the code, card details)', () => {
    open()
    expect(screen.getByText(/free plan, which does not keep backups of its own/)).toBeInTheDocument()
    const not = screen.getByRole('heading', { name: 'What is not in it' }).nextElementSibling
    for (const word of [/Passwords/, /Pictures and other files/, /Secret keys/, /website.s code/, /Card details/]) expect(not.textContent).toMatch(word)
    expect(screen.getByRole('heading', { name: 'What is in it' }).nextElementSibling).toHaveTextContent(/orders.*members.*paid posts.*list of accounts/s)
  })
  it('says a restore is done on her own computer, so the file is never shared with anyone and the promise about AI tools is kept', () => {
    open()
    expect(screen.getByRole('heading', { name: 'If you ever need to put it back' }).nextElementSibling).toHaveTextContent(/your own computer.*never has to be shared.*AI tools/s)
  })
})

describe('taking a backup', () => {
  it('reads every table, saves ONE file with the date in its name, and says what it saved and where to look', async () => {
    const user = userEvent.setup(); open()
    await user.click(button())
    const done = await screen.findByRole('status')
    expect(done).toHaveTextContent(new RegExp(`Saved ${N} tables and ${N + 2} rows to starscapes-factory-backup-\\d{4}-\\d{2}-\\d{2}-\\d{4}\\.json`)); expect(done).toHaveTextContent('Downloads folder'); expect(done).toHaveTextContent('The list of accounts is included.')
    expect(h.saved).toHaveLength(1); expect(h.saved[0].name).toMatch(/^starscapes-factory-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
    const file = JSON.parse(h.saved[0].text); expect(file.kind).toBe('starscapes-factory-backup'); expect(Object.keys(file.tables)).toEqual(BACKUP_TABLE_NAMES); expect(file.accounts.rows).toHaveLength(2)
  })
  it('shows what it is doing, table by table, with how many rows each had', async () => {
    const user = userEvent.setup(); open()
    await user.click(button()); await screen.findByRole('status')
    expect(screen.getByText('Saved: Orders (1 row)')).toBeInTheDocument(); expect(screen.getByText('Saved: Posts (1 row)')).toBeInTheDocument(); expect(screen.getByText('Saved: The list of accounts (2 rows)')).toBeInTheDocument()
  })
  it('keeps the data itself off the screen: the page shows counts, never what is in the rows', async () => {
    const user = userEvent.setup(); open()
    await user.click(button()); await screen.findByRole('status')
    expect(document.body.textContent).not.toContain('SECRET-ROW-CONTENT'); expect(h.saved[0].text).toContain('SECRET-ROW-CONTENT') // it is in the file and nowhere else
  })
  it('cannot be pressed a second time while it is working, and says so', async () => {
    let release; h.hold = new Promise((r) => { release = r })
    const user = userEvent.setup(); open()
    await user.click(button())
    const busy = await screen.findByRole('button', { name: 'Taking the backup…' }); expect(busy).toBeDisabled()
    release(); await screen.findByRole('status'); expect(button()).toBeEnabled()
  })
})

describe('a backup that did not work', () => {
  it('saves NO file, says which table stopped it and that nothing was saved, and lets her try again', async () => {
    h.failOn = 'posts'
    const user = userEvent.setup(); open()
    await user.click(button())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('"Posts"'); expect(alert).toHaveTextContent('Nothing was saved'); expect(h.saved).toEqual([]); expect(screen.queryByRole('status')).toBeNull()
    expect(button()).toBeEnabled()
    h.failOn = null; await user.click(button()); await screen.findByRole('status'); expect(h.saved).toHaveLength(1)
  })
  it('if only the list of accounts is missing, the rest is saved and she is told clearly', async () => {
    h.breakAccounts = true
    const user = userEvent.setup(); open()
    await user.click(button())
    const done = await screen.findByRole('status')
    expect(done).toHaveTextContent('The list of accounts could not be included this time.'); expect(done).toHaveTextContent(/does not say whose email address goes with each member/); expect(h.saved).toHaveLength(1)
    expect(JSON.parse(h.saved[0].text).accounts.included).toBe(false)
  })
})

describe('it keeps nothing on the device (the Cookies page promises exactly two places, and this is not one)', () => {
  it('says how old the latest backup is by the date in the file name, and asks for a weekly habit', () => {
    open()
    expect(screen.getByText(/A backup once a week is a good habit, and always before a big change\. Each file has the date and time in its name/)).toBeInTheDocument()
  })
  it('uses no browser storage and sets no cookie: before, during and after a backup, storage is empty', async () => {
    const user = userEvent.setup(); open()
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
    await user.click(button()); await screen.findByRole('status')
    expect(window.localStorage.length).toBe(0); expect(window.sessionStorage.length).toBe(0); expect(document.cookie).toBe('')
  })
  it('its code never mentions localStorage, sessionStorage or cookies', () => {
    for (const f of ['src/admin/AdminBackup.jsx', 'src/admin/makeBackup.js', 'src/admin/saveFile.js']) expect(read(f), f).not.toMatch(/localStorage|sessionStorage|document\.cookie|indexedDB/)
  })
})

describe('how it is wired into the site', () => {
  it('is a tile in the admin console (Shop), a protected route, a registered page that search engines are told to ignore, and has its own icon', () => {
    expect(ADMIN_TOOLS.find((t) => t.name === 'Download a backup')).toMatchObject({ to: '/admin/backup', group: 'Shop', icon: 'backup' })
    expect(read('src/App.jsx')).toMatch(/<Route path="\/admin\/backup" element=\{ <ProtectedRoute session=\{session\}> <AdminBackup session=\{session\} \/> <\/ProtectedRoute> \} \/>/)
    expect(PAGES['/admin/backup']).toMatchObject({ index: false }); expect(read('src/admin/AdminConsole.jsx')).toMatch(/^\s*backup: <>/m)
  })
})

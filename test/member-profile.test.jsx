// "Your profile" on My passes (src/membership/ProfilePanel.jsx): name, username, email, icon, and which emails they want. Figma: 25 My passes and profile.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'

const api = vi.hoisted(() => ({ fetchProfile: vi.fn(), saveProfile: vi.fn() }))
vi.mock('../src/membership/profileApi', () => ({ fetchProfile: api.fetchProfile, saveProfile: api.saveProfile }))

import ProfilePanel from '../src/membership/ProfilePanel'
import { MEMBER_ICONS, ICON_KEYS, USERNAME_RE, SAY } from '../src/membership/memberIcons'

const profile = (over = {}) => ({ name: 'Gillian Bennet', username: 'gill_reads', icon: 'planets', newsletter: 'free', email: 'gillian@gillianbennet.com', ...over })
beforeEach(() => { api.fetchProfile.mockReset(); api.saveProfile.mockReset(); api.fetchProfile.mockResolvedValue(profile()) })

describe('the profile card', () => {
  it('shows their name, username and login email, with the email read only', async () => {
    render(<ProfilePanel />)
    expect(await screen.findByLabelText('Name')).toHaveValue('Gillian Bennet')
    expect(screen.getByLabelText('Username')).toHaveValue('gill_reads')
    const email = screen.getByLabelText('Email')
    expect(email).toHaveValue('gillian@gillianbennet.com'); expect(email).toHaveAttribute('readonly')
  })
  it('offers sixteen icons, the eight room pictures then the eight drawn ones, with the chosen one marked', async () => {
    render(<ProfilePanel />)
    const group = await screen.findByRole('radiogroup', { name: 'Your icon for the message board' })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(16); expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(MEMBER_ICONS.map((i) => i.label))
    expect(MEMBER_ICONS.slice(0, 8).every((i) => i.kind === 'room')).toBe(true); expect(MEMBER_ICONS.slice(8).every((i) => i.kind === 'drawn')).toBe(true)
    expect(within(group).getByRole('radio', { name: 'Planets' })).toHaveAttribute('aria-checked', 'true')
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
  })
  it('changes the icon and shows how they will look on a comment', async () => {
    render(<ProfilePanel />)
    await userEvent.click(await screen.findByRole('radio', { name: 'Comet' }))
    expect(screen.getByRole('radio', { name: 'Comet' })).toHaveAttribute('aria-checked', 'true'); expect(screen.getByRole('radio', { name: 'Planets' })).toHaveAttribute('aria-checked', 'false')
    expect(within(screen.getByLabelText('How you will look on a comment')).getByText('@gill_reads')).toBeInTheDocument()
  })
  it('offers the three email choices, with their current one selected', async () => {
    api.fetchProfile.mockResolvedValue(profile({ newsletter: 'passes' })); render(<ProfilePanel />)
    expect(await screen.findByRole('radio', { name: /News about my passes only/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Free updates/ })).not.toBeChecked(); expect(screen.getByRole('radio', { name: /No emails/ })).not.toBeChecked()
  })
})

describe('saving', () => {
  it('sends what they chose, and says it is saved', async () => {
    api.saveProfile.mockResolvedValue(true); render(<ProfilePanel />)
    await userEvent.click(await screen.findByRole('radio', { name: /No emails/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Cogs' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save my details' }))
    expect(api.saveProfile).toHaveBeenCalledWith({ name: 'Gillian Bennet', username: 'gill_reads', icon: 'cogs', newsletter: 'none' })
    expect(await screen.findByText('Saved. Thank you.')).toBeInTheDocument()
  })
  it('refuses a bad username before asking the server, in plain words', async () => {
    render(<ProfilePanel />)
    const box = await screen.findByLabelText('Username'); await userEvent.clear(box); await userEvent.type(box, 'a b')
    await userEvent.click(screen.getByRole('button', { name: 'Save my details' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(SAY.username_invalid); expect(api.saveProfile).not.toHaveBeenCalled()
  })
  it('says so under the username when someone already has it', async () => {
    const err = new Error(SAY.username_taken); err.field = 'username'; api.saveProfile.mockRejectedValue(err); render(<ProfilePanel />)
    await userEvent.click(await screen.findByRole('button', { name: 'Save my details' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That username is taken. Please try another.'); expect(screen.queryByText('Saved. Thank you.')).toBeNull()
  })
  it('says kindly, without the technical words, when saving fails', async () => {
    api.saveProfile.mockRejectedValue(new Error(SAY.generic)); render(<ProfilePanel />)
    await userEvent.click(await screen.findByRole('button', { name: 'Save my details' }))
    expect(await screen.findByText(SAY.generic)).toBeInTheDocument()
  })
  it('lets a username be left empty', async () => {
    api.fetchProfile.mockResolvedValue(profile({ username: '' })); api.saveProfile.mockResolvedValue(true); render(<ProfilePanel />)
    await userEvent.click(await screen.findByRole('button', { name: 'Save my details' }))
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalled())
  })
})

describe('when it cannot load', () => {
  it('says so kindly, with a way to try again', async () => {
    api.fetchProfile.mockRejectedValueOnce(new Error('rls')).mockResolvedValue(profile()); render(<ProfilePanel />)
    expect(await screen.findByText(SAY.generic)).toBeInTheDocument(); expect(screen.queryByText(/rls/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Name')).toBeInTheDocument()
  })
})

describe('the rules match the database', () => {
  it('lists the same sixteen icon keys in sql/member-profiles.sql, and the same username rule', () => {
    const sql = readFileSync('sql/member-profiles.sql', 'utf8')
    for (const key of ICON_KEYS) expect(sql).toContain(`'${key}'`)
    expect(sql).toContain("'^[A-Za-z0-9_]{3,20}$'"); expect(USERNAME_RE.source).toBe('^[A-Za-z0-9_]{3,20}$')
    expect(ICON_KEYS).toHaveLength(16)
  })
})

import { describe, it, expect } from 'vitest'
import { CONTACT_EMAIL, ACCESSIBILITY_REPLY_DAYS, SOCIAL_LINKS, PROJECT_SOCIALS } from '../src/data/contact'
import { statementIsReady } from '../src/pages/AccessibilityStatement'

describe('the site\u2019s contact details', () => {
  it('has the contact address, in the shape of a real email address', () => {
    expect(CONTACT_EMAIL).toBe('imagine@starscapesfactory.com')
    expect(CONTACT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  })
  it('promises a reply to accessibility problems within 5 working days, written as a plain number', () => {
    expect(ACCESSIBILITY_REPLY_DAYS).toBe('5')
    expect(Number(ACCESSIBILITY_REPLY_DAYS)).toBeGreaterThan(0)
  })
  it('uses Sarah Jr.\u2019s accounts for the footer: YouTube, Instagram and TikTok', () => {
    expect(SOCIAL_LINKS.youtube).toBe('https://www.youtube.com/@sarahjradventures')
    expect(SOCIAL_LINKS.instagram).toBe('https://www.instagram.com/sarahjradventures/')
    expect(SOCIAL_LINKS.tiktok).toBe('https://www.tiktok.com/@sarahjradventures')
  })
  it('leaves Threads blank until it is found, never a placeholder', () => {
    expect(SOCIAL_LINKS.threads).toBe('')
  })
  it('keeps each project\u2019s own accounts for its own pages', () => {
    expect(PROJECT_SOCIALS['drafting-desk']).toMatchObject({ name: 'The Drafting Desk', youtube: 'https://www.youtube.com/@thedraftingdesk', tiktok: 'https://www.tiktok.com/@thedraftingdesk' })
    expect(PROJECT_SOCIALS['story-ledger']).toMatchObject({ name: 'Story Ledger Audit', youtube: 'https://www.youtube.com/@story.ledger', tiktok: 'https://www.tiktok.com/@story.ledger' })
    expect(PROJECT_SOCIALS['sarah-jrs-den']).toMatchObject({ name: 'Sarah Jr Adventures', youtube: SOCIAL_LINKS.youtube, instagram: SOCIAL_LINKS.instagram, tiktok: SOCIAL_LINKS.tiktok })
  })
  it('only has real addresses on the right sites: no placeholders, and each one a proper account address', () => {
    const hosts = { youtube: /^https:\/\/www\.youtube\.com\/@[\w.]+$/, tiktok: /^https:\/\/www\.tiktok\.com\/@[\w.]+$/, instagram: /^https:\/\/www\.instagram\.com\/[\w.]+\/?$/ }
    const all = [SOCIAL_LINKS, ...Object.values(PROJECT_SOCIALS)]
    for (const group of all) {
      for (const [key, value] of Object.entries(group)) {
        if (key === 'name' || value === '') continue
        expect(hosts[key], key).toBeTruthy()
        expect(value, `${key} ${value}`).toMatch(hosts[key])
      }
    }
    expect(JSON.stringify([SOCIAL_LINKS, PROJECT_SOCIALS])).not.toMatch(/example|todo|tbc|xxx|placeholder/i)
  })
  it('does not publish the accessibility statement yet: the contact details are in, but the testing results are not', () => {
    expect(statementIsReady()).toBe(false)
  })
})

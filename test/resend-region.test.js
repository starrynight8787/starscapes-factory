// @vitest-environment node
// Where the emails are sent from. Gill confirmed on 23 October 2026 that the Resend account sends from IRELAND (eu-west-1), the same place as the database. The Privacy policy must say so, and must stay modest about it:
// Resend is itself a US company, so the policy says where emails are SENT FROM, not that nothing ever leaves Europe. Works in both states (drafts or published) and with the Star Atlas wording on or off.
import { describe, it, expect } from 'vitest'
import { ALL_LEGAL_PAGES, LEGAL_PAGES } from '../src/data/legalPages'

const privacy = (pages) => pages.find((p) => p.slug === 'privacy')
const section = (pages, start) => privacy(pages).sections.find((s) => s.title.startsWith(start)).paragraphs.join('\n')
const whole = (pages) => [privacy(pages).intro.join('\n'), ...privacy(pages).sections.flatMap((s) => s.paragraphs)].join('\n')

describe.each([['the full policy', ALL_LEGAL_PAGES], ['the page the site shows', LEGAL_PAGES]])('%s', (_name, pages) => {
  it('says Resend sends our emails from its Ireland region', () => {
    expect(section(pages, 'Who we share')).toContain('* **Resend** sends our emails.')
    expect(section(pages, 'Who we share')).toContain('It receives your email address, and sends from its Ireland region.')
  })
  it('says the database is stored in Ireland and the emails are sent from Ireland, in the section about sending information abroad', () => {
    expect(section(pages, 'Sending information abroad')).toContain('in Ireland, where our database is stored and where our emails are sent from')
  })
  it('stays modest: it never claims that nothing leaves the UK or Europe (Resend is a US company, and the other companies named are in the United States)', () => {
    expect(whole(pages)).not.toMatch(/nothing (ever )?leaves|never leaves|stays (entirely )?(in|within) (the UK|Europe|the EU)|all (of )?(your|our) (data|information) (is|stays) (in|within)/i)
    expect(section(pages, 'Sending information abroad')).toMatch(/United States \(such as Google, which runs YouTube, and Cloudflare, which runs our security check\)/)
  })
  it('still names the print studios and the courier, whose countries are different', () => {
    expect(section(pages, 'Sending information abroad')).toMatch(/Brooklyn in the United States.*Düsseldorf in Germany.*courier/)
  })
})

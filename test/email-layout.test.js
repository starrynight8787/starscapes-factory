// @vitest-environment node
// The shared look of every email the site sends: a banner picture, a title, the words, a footer.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { emailFrame, BANNERS, bannerUrl } from '../src/email/emailLayout.js'
import { buildConfirmation } from '../lib/orderEmailText.js'
import { buildDispatch } from '../lib/dispatchEmailText.js'
import { renderNewsletter, confirmationEmail, ebookLinkEmail } from '../src/newsletter/newsletterRules.js'

describe('the shared email look', () => {
  it('puts the title, subtitle, words and footer in one whole page, and escapes the title', () => {
    const html = emailFrame({ subject: 'S', banner: 'general', title: 'A <b>title</b>', subtitle: 'Sub', bodyHtml: '<p>Body</p>', footerHtml: '<p>Foot</p>' })
    expect(html).toContain('<!doctype html>'); expect(html).toContain('A &lt;b&gt;title&lt;/b&gt;'); expect(html).toContain('Sub'); expect(html).toContain('<p>Body</p>'); expect(html).toContain('<p>Foot</p>')
    expect(html).toContain('bgcolor="#14306a"') // the navy shows if pictures are blocked
  })
  it('has a real picture file for every banner, loaded from the live site', () => {
    for (const [key, file] of Object.entries(BANNERS)) { expect(fs.existsSync(`public/email/${file}`), key).toBe(true); expect(bannerUrl(key)).toBe(`https://starscapesfactory.com/email/${file}`) }
    expect(bannerUrl('nonsense')).toContain('banner-general.jpg')
  })
  it('uses the banner each email is meant to have', () => {
    const order = { stripe_session_id: 'cs_1', customer_name: 'Jane Doe', customer_email: 'j@example.com', amount_total: 8900, currency: 'gbp', livemode: false, items: [{ title: 'Afternoon Sun', qty: 1, unit_amount: 8900 }], shipping: { address: { country: 'GB' } } }
    expect(buildConfirmation(order).html).toContain('banner-art-loft.jpg')
    expect(buildDispatch(order, {}).html).toContain('banner-art-loft.jpg')
    expect(renderNewsletter({ subject: 'Hi', body: 'x', unsubscribeUrl: 'https://starscapesfactory.com/u' }).html).toContain('banner-general.jpg')
    expect(confirmationEmail({ confirmUrl: 'https://starscapesfactory.com/c' }).html).toContain('banner-general.jpg')
    expect(ebookLinkEmail({ file: '/downloads/a.pdf' }).html).toContain('banner-leadership-lounge.jpg')
  })
})

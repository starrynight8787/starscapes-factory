// @vitest-environment node
// The rules behind the newsletter: what a sign-up and a draft must look like, and how plain text becomes a safe email.
import { describe, it, expect } from 'vitest'
import { BATCH_SIZE, BODY_MAX, CONSENT_TEXT, SUBJECT_MAX, blocksOf, cleanDraft, cleanSubscribe, confirmUrl, confirmationEmail, esc, isToken, isUuid, oneClickUrl, renderBody, renderNewsletter, unsubscribePageUrl } from '../src/newsletter/newsletterRules'
import { COMPANY, companyLine } from '../src/data/company'

const TOKEN = 'a'.repeat(48)

describe('a sign-up', () => {
  it('needs an email address and a ticked box, and gives the address in lower case', () => {
    expect(cleanSubscribe({ email: '  Gill@Example.COM ', consent: true })).toEqual({ ok: true, email: 'gill@example.com' })
  })
  it('refuses a missing or odd address, naming the box', () => {
    for (const email of ['', '   ', 'nope', 'a@b', 'a b@c.com', '<x>@c.com', 'a@b.com,c@d.com', 'a"b@c.com', `${'x'.repeat(250)}@c.com`, null, undefined]) {
      const r = cleanSubscribe({ email, consent: true }); expect(r.ok, String(email)).toBe(false); expect(r.field).toBe('email'); expect(r.message.length).toBeGreaterThan(10)
    }
  })
  it('refuses unless the box is properly ticked: only a real "yes" counts', () => {
    for (const consent of [false, undefined, null, 'true', 'on', 1, 0, '']) { const r = cleanSubscribe({ email: 'a@b.com', consent }); expect(r.ok, String(consent)).toBe(false); expect(r.field).toBe('consent') }
  })
  it('copes with nothing at all', () => { for (const x of [null, undefined, 'text', 5, []]) expect(cleanSubscribe(x).ok, String(x)).toBe(false) })
  it('says what the person agrees to, in plain words, including that they can leave', () => {
    expect(CONSENT_TEXT).toContain('newsletter'); expect(CONSENT_TEXT).toContain('unsubscribe at any time')
  })
})

describe('a draft', () => {
  it('needs a subject and the words, tidied: the subject on one line, line endings made plain', () => {
    expect(cleanDraft({ subject: '  Hello   there  ', body: ' First.\r\n\r\nSecond. ' })).toEqual({ ok: true, value: { subject: 'Hello there', body: 'First.\n\nSecond.' } })
  })
  it('turns a subject with a line break into one line, so it can never add a second header line to an email', () => {
    expect(cleanDraft({ subject: 'Hi\r\nBcc: someone@example.com', body: 'x' }).value.subject).toBe('Hi Bcc: someone@example.com')
    expect(/[\r\n]/.test(cleanDraft({ subject: 'a\nb', body: 'x' }).value.subject)).toBe(false)
  })
  it('refuses an empty subject or body, or one that is too long, naming the box', () => {
    for (const [d, field] of [[{ subject: '', body: 'x' }, 'subject'], [{ subject: '   ', body: 'x' }, 'subject'], [{ subject: 'a'.repeat(SUBJECT_MAX + 1), body: 'x' }, 'subject'], [{ subject: 'ok', body: '' }, 'body'], [{ subject: 'ok', body: ' \n ' }, 'body'], [{ subject: 'ok', body: 'a'.repeat(BODY_MAX + 1) }, 'body']]) {
      const r = cleanDraft(d); expect(r.ok).toBe(false); expect(r.field).toBe(field); expect(r.message.length).toBeGreaterThan(10)
    }
    expect(cleanDraft({ subject: 'a'.repeat(SUBJECT_MAX), body: 'a'.repeat(BODY_MAX) }).ok).toBe(true)
  })
  it('removes hidden control characters from the words, and copes with nothing at all', () => {
    expect(cleanDraft({ subject: 's', body: 'a\u0000b\u0007c' }).value.body).toBe('abc')
    for (const x of [null, undefined, 'text', 5]) expect(cleanDraft(x).ok).toBe(false)
  })
})

describe('turning plain text into a safe email', () => {
  it('makes paragraphs from blank lines, keeps single line breaks, and understands headings and lists', () => {
    const r = renderBody('## Big news\n\nFirst line\nsecond line\n\n- one\n- two')
    expect(r.html).toContain('<h2'); expect(r.html).toContain('Big news</h2>'); expect(r.html).toContain('First line<br>second line'); expect(r.html).toMatch(/<ul[^>]*><li[^>]*>one<\/li><li[^>]*>two<\/li><\/ul>/)
    expect(r.text).toBe('BIG NEWS\n\nFirst line\nsecond line\n\n- one\n- two')
  })
  it('only treats ## as a heading when it stands alone, and a list only when every line is a list item', () => {
    expect(blocksOf('## A\nmore')[0].type).toBe('paragraph'); expect(blocksOf('- a\nnot a list item')[0].type).toBe('paragraph'); expect(blocksOf('* a\n* b')[0]).toEqual({ type: 'list', items: ['a', 'b'] })
    expect(blocksOf('   \n\n  ')).toEqual([])
  })
  it('understands bold and links', () => {
    const r = renderBody('Read **this** at [my site](https://example.com/a?b=1&c=2) now')
    expect(r.html).toContain('<strong>this</strong>'); expect(r.html).toContain('<a href="https://example.com/a?b=1&amp;c=2"'); expect(r.html).toContain('>my site</a>')
    expect(r.text).toBe('Read this at my site (https://example.com/a?b=1&c=2) now')
  })
  it('SECURITY: never lets anything in the words become web code', () => {
    const nasty = '<script>alert(1)</script> <img src=x onerror=alert(1)> "quote" \'single\' <b>bold</b>'
    const { html } = renderBody(nasty)
    expect(html).not.toMatch(/<script|<img|<b>/); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('&quot;quote&quot;')
  })
  it('SECURITY: makes a link only for https:// and mailto: addresses; any other is plain words (javascript:, data:, http:, a relative link)', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html;base64,AAAA', 'http://example.com', '/relative', 'ftp://x.com', 'JAVASCRIPT:alert(1)', 'https://', 'vbscript:x']) {
      const { html, text } = renderBody(`[click](${url})`); expect(html, url).not.toContain('<a '); expect(html, url).not.toMatch(/href=/); expect(html).toContain('click'); expect(text.startsWith('click'), url).toBe(true); expect(text, url).not.toMatch(/\(https?:\/\//)
    }
    expect(renderBody('[mail me](mailto:imagine@example.com)').html).toContain('href="mailto:imagine@example.com"')
  })
  it('SECURITY: cannot break out of a link\u2019s address with quotes, spaces or angle brackets', () => {
    for (const url of ['https://x.com/"onmouseover="alert(1)', 'https://x.com/ onclick=alert(1)', 'https://x.com/<script>', "https://x.com/'x'"]) { const { html } = renderBody(`[a](${url})`); expect(html, url).not.toContain('<a '); expect(html, url).not.toMatch(/<[^>]*(onmouseover|onclick)=/); expect(html, url).not.toContain('<script') }
    expect(renderBody('[a](https://x.com/ok)').html).toContain('<a href="https://x.com/ok"') // while a good link still works
  })
  it('copes with unfinished marks: a lone ** or [ is just words', () => {
    expect(renderBody('2 ** 3 and [not a link] and ](x)').html).toContain('2 ** 3 and [not a link] and ](x)')
  })
})

describe('the finished newsletter', () => {
  const url = unsubscribePageUrl(TOKEN)
  const mail = renderNewsletter({ subject: 'Autumn news', body: 'Hello **you**.', unsubscribeUrl: url })
  it('is a whole web page in English, with the subject as its title', () => {
    expect(mail.html.startsWith('<!doctype html>')).toBe(true); expect(mail.html).toContain('<html lang="en">'); expect(mail.html).toContain('<title>Autumn news</title>'); expect(mail.subject).toBe('Autumn news')
  })
  it('always has the way to leave and who is sending it, in the email and in the plain-text version', () => {
    expect(mail.html).toContain(`href="${url}"`); expect(mail.html).toContain('Unsubscribe</a>'); expect(mail.html).toContain(esc(companyLine(COMPANY))); expect(mail.html).toContain('You are getting this because you signed up')
    expect(mail.text).toContain(`Unsubscribe at any time: ${url}`); expect(mail.text).toContain(companyLine(COMPANY)); expect(mail.text.startsWith('Starscapes Factory\n')).toBe(true)
  })
  it('SECURITY: cannot be used to inject web code through the subject or the unsubscribe address', () => {
    const m = renderNewsletter({ subject: '<script>x</script>"', body: 'hi', unsubscribeUrl: 'https://x.com/"><script>y</script>' })
    expect(m.html).not.toMatch(/<script>/); expect(m.html).toContain('&lt;script&gt;')
  })
  it('keeps its text readable: nothing under 14px, and each colour 4.5 to 1 against its background', () => {
    for (const m of mail.html.matchAll(/font-size:(\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(14)
    const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    for (const [fg, bg] of [['#0e1530', '#ffffff'], ['#4a5170', '#ffffff'], ['#14306a', '#ffffff']]) expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    for (const c of ['#0e1530', '#4a5170', '#14306a']) expect(mail.html).toContain(c)
  })
})

describe('the confirmation email', () => {
  const c = confirmationEmail({ confirmUrl: confirmUrl(TOKEN) })
  it('asks them to say yes with the link, says what to do if it was not them, and says who sent it', () => {
    for (const part of [`https://starscapesfactory.com/newsletter/confirm?t=${TOKEN}`, 'hopefully you', 'do nothing', companyLine(COMPANY)]) expect(c.text, part).toContain(part)
    expect(c.html).toContain(`href="https://starscapesfactory.com/newsletter/confirm?t=${TOKEN}"`); expect(c.html).toContain('Yes, send me the newsletter'); expect(c.html).toContain('<html lang="en">'); expect(c.subject).toMatch(/confirm/i)
  })
  it('has a subject with no line break', () => { expect(/[\r\n]/.test(c.subject)).toBe(false) })
})

describe('the addresses and tokens', () => {
  it('make the three links: confirm, unsubscribe page, and the one-click unsubscribe a mail program posts to', () => {
    expect(confirmUrl(TOKEN)).toBe(`https://starscapesfactory.com/newsletter/confirm?t=${TOKEN}`); expect(unsubscribePageUrl(TOKEN)).toBe(`https://starscapesfactory.com/newsletter/unsubscribe?t=${TOKEN}`)
    expect(oneClickUrl(TOKEN)).toBe(`https://starscapesfactory.com/api/ebook-signup?newsletter=unsubscribe&t=${TOKEN}`)
  })
  it('accept only a 48-letter hex token, and only a real id', () => {
    expect(isToken(TOKEN)).toBe(true); for (const bad of ['', 'a'.repeat(47), 'a'.repeat(49), 'A'.repeat(48), 'g'.repeat(48), `${'a'.repeat(47)}/`, `${TOKEN}\n`, null, undefined, 5]) expect(isToken(bad), String(bad)).toBe(false)
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true); for (const bad of ['', 'x', '123e4567-e89b-12d3-a456-42661417400', '123e4567e89b12d3a456426614174000', "123e4567-e89b-12d3-a456-426614174000'", null]) expect(isUuid(bad), String(bad)).toBe(false)
  })
  it('send fifty at a time, within Resend\u2019s hundred per request', () => { expect(BATCH_SIZE).toBe(50); expect(BATCH_SIZE).toBeLessThanOrEqual(100) })
})

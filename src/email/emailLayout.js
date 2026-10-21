// The one look for every email the site sends: a banner at the top (the same starry banners as the pages), a white card for the words,
// and a footer. Used by the order, dispatch, pass-reminder and newsletter emails, so they all match each other and the website.
//
// THE BANNER EACH EMAIL USES (change one in the table below, or pass a different `banner` where the email is built):
//   art-loft          order confirmation, dispatch ("has been posted")
//   leadership-lounge the free ebook email with the download link
//   general           pass reminders, the newsletter, the newsletter sign-up confirmation
//
// The pictures are plain JPGs in public/email/ (email programs cannot show the pages' WebP banners). They are loaded from the live site, so they
// only appear once the site has been pushed. If a mail program blocks pictures, the navy colour behind the words is shown instead.
// Fonts: email programs ignore web fonts, so the words use Arial; the banner picture carries the look.
import { SITE_URL } from '../ebook/ebookConfig.js'

const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const BANNERS = {
  general: 'banner-general.jpg',
  'art-loft': 'banner-art-loft.jpg',
  'leadership-lounge': 'banner-leadership-lounge.jpg',
}
export const bannerUrl = (banner, site = SITE_URL) => `${site}/email/${BANNERS[banner] || BANNERS.general}`

const FONT = 'Arial,Helvetica,sans-serif'

// Returns the whole HTML page for one email. `bodyHtml` and `footerHtml` are already safe HTML (each caller escapes what it was given).
export function emailFrame({ subject, banner = 'general', title, subtitle = '', bodyHtml, footerHtml = '', site = SITE_URL, background = '#f6f8fc', lang = 'en-GB' }) {
  const img = bannerUrl(banner, site)
  const head = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td background="${esc(img)}" bgcolor="#14306a" style="background:linear-gradient(90deg,rgba(7,11,38,0.55) 0%,rgba(7,11,38,0) 75%),url('${esc(img)}') center/cover no-repeat,#14306a;padding:28px 32px;border-radius:16px 16px 0 0"><div style="font-family:${FONT};font-size:14px;letter-spacing:3px;font-weight:bold;color:#ffd86b">STARSCAPES FACTORY</div><div style="font-family:${FONT};font-size:28px;line-height:1.2;font-weight:bold;color:#ffffff;margin-top:10px">${esc(title)}</div>${subtitle ? `<div style="font-family:${FONT};font-size:15px;line-height:1.4;color:#dce6ff;margin-top:6px">${esc(subtitle)}</div>` : ''}</td></tr></table>`
  const foot = footerHtml ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #dce6ff">${footerHtml}</div>` : ''
  return `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;padding:0;background:${background}"><div style="max-width:640px;margin:0 auto;padding:20px"><div style="background:#ffffff;border:1px solid #dde3f0;border-radius:16px"><div style="font-family:${FONT};font-size:16px;line-height:1.5;color:#0e1530">${head}<div style="padding:24px 32px 28px">${bodyHtml}${foot}</div></div></div></div></body></html>`
}

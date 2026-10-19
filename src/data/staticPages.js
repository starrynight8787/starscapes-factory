import { LEGAL_PAGES } from './legalPages'
import { ACCESSIBILITY_STATEMENT } from './accessibilityStatement'
import { CONTACT_EMAIL, ACCESSIBILITY_REPLY_DAYS } from './contact'

export const staticPages = [
  {
    slug: 'about',
    ready: false,
    title: 'About Me',
    content: `Hi, I'm Gill — the person behind Starscapes Factory.

[Replace this with your own bio: who you are, what you make, why you're building this. A few paragraphs is plenty.]`,
  },
  {
    slug: 'contact',
    ready: true,
    showEmail: true,
    title: 'Contact',
    content: `Want to get in touch? I read every message myself, and I will reply as soon as I can.

Email is the best way to reach me. If it is about an order, please put your order number in the message, so I can find it quickly.`,
  },
  {
    slug: 'delivery',
    ready: false,
    title: 'Delivery and returns',
    content: `Last updated: [date].

## Delivery

Each print is made to order by our printing partner, Printspace Studios Limited, and posted straight to you in plain packaging. Delivery is free to the United Kingdom, Ireland, Germany, France, the United States and Canada. [Delivery to other countries: to be confirmed.]

## How long it takes

The estimate for your print and your country is shown on the print page, and again in your order confirmation email. They are estimates, not promises: making your print takes a few working days, and then the post takes the rest.

## Tracking

We email you when your order has been posted. If your parcel has a tracking number, it is in that email. Not every order is tracked: some go by standard post.

## If something goes wrong

If your print arrives damaged, is not what you ordered, or has not arrived when you expected it, please write to us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) and we will look into it. Your rights to cancel an order and to return a print are explained on the [Returns and refunds](/page/returns) page.`,
  },
]

// ---- Where each page lives, and whether it is ready ----
// A page is only shown, and only linked from the footer and the menu, once "ready" is true. Set it to true when the page has its real words.
// A text page is in the list above. A legal page (Terms, Privacy, Returns and refunds, AI policy) is in legalPages.js. The accessibility statement has its own words in
// accessibilityStatement.js and is ready only when every gap in it is filled in. A page is only shown to visitors, and only linked from the footer and the menu, once it
// is ready; until then the address shows a plain "not ready yet" message, never placeholder text, and only the owner sees it, as a draft.
export const accessibilityGaps = (statement = ACCESSIBILITY_STATEMENT) => ['lastReviewed', 'notYetRight', 'complaint'].filter((key) => !statement[key])
const accessibilityReady = () => accessibilityGaps().length === 0 && Boolean(CONTACT_EMAIL && ACCESSIBILITY_REPLY_DAYS)

export function resolvePage(slug) {
  const legal = LEGAL_PAGES.find((p) => p.slug === slug)
  if (legal) return { kind: 'legal', slug, title: legal.title, ready: legal.ready === true, legal }
  if (slug === 'accessibility') return { kind: 'accessibility', slug, title: 'Accessibility statement', ready: accessibilityReady() }
  const text = staticPages.find((p) => p.slug === slug)
  return text ? { kind: 'text', slug, title: text.title, ready: text.ready === true, text } : null
}
export const pageIsReady = (slug) => Boolean((resolvePage(slug) || {}).ready)
export const pageExists = (slug) => resolvePage(slug) !== null

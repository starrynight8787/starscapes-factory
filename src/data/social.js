// The footer's "Follow" links. The addresses live in ONE place, src/data/contact.js (SOCIAL_LINKS): change them there.
// A blank address keeps that link hidden, so nothing broken ever goes live.
import { SOCIAL_LINKS } from './contact'

export const social = [
  { name: 'YouTube', url: SOCIAL_LINKS.youtube },
  { name: 'Instagram', url: SOCIAL_LINKS.instagram },
  { name: 'TikTok', url: SOCIAL_LINKS.tiktok },
  { name: 'Threads', url: SOCIAL_LINKS.threads },
]

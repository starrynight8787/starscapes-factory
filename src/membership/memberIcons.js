// The icons a member can pick for the message board, and the colours each takes from its room's banner. The first eight are the room pictures (navy line art on a pale panel,
// inside a coloured ring); the next eight are drawn from the banner backgrounds (white on the room's full colour). Figma: 25 My passes and profile.
// The keys are saved in the database (sql/member-profiles.sql lists the same sixteen), so do not rename one without changing both.
export const ROOM_COLOURS = {
  'art-loft': ['#2a1d7a', '#b3489e'],
  'drafting-desk': ['#14307a', '#2a62b0'],
  'explorers-bay': ['#0b2f7a', '#0a9ac8'],
  'factory-floor': ['#0a1a45', '#2f4a92'],
  'idea-hatchery': ['#1a2a7a', '#1f8fb5'],
  'knowledge-nook': ['#0f1f5a', '#3a5fb0'],
  'leadership-lounge': ['#231a66', '#8a55b8'],
  'sarah-jrs-den': ['#2b1b73', '#7040b8'],
}

export const MEMBER_ICONS = [
  { key: 'art-loft', label: 'Art Loft', room: 'art-loft', kind: 'room' },
  { key: 'drafting-desk', label: 'Drafting Desk', room: 'drafting-desk', kind: 'room' },
  { key: 'explorers-bay', label: "Explorer's Bay", room: 'explorers-bay', kind: 'room' },
  { key: 'factory-floor', label: 'Factory Floor', room: 'factory-floor', kind: 'room' },
  { key: 'idea-hatchery', label: 'Idea Hatchery', room: 'idea-hatchery', kind: 'room' },
  { key: 'knowledge-nook', label: 'Knowledge Nook', room: 'knowledge-nook', kind: 'room' },
  { key: 'leadership-lounge', label: 'Leadership Lounge', room: 'leadership-lounge', kind: 'room' },
  { key: 'sarah-jrs-den', label: "Sarah Jr.'s Den", room: 'sarah-jrs-den', kind: 'room' },
  { key: 'comet', label: 'Comet', room: 'drafting-desk', kind: 'drawn' },
  { key: 'crescent-moon', label: 'Crescent moon', room: 'sarah-jrs-den', kind: 'drawn' },
  { key: 'planets', label: 'Planets', room: 'art-loft', kind: 'drawn' },
  { key: 'starry-sky', label: 'Starry sky', room: 'explorers-bay', kind: 'drawn' },
  { key: 'cogs', label: 'Cogs', room: 'factory-floor', kind: 'drawn' },
  { key: 'hanging-lamp', label: 'Hanging lamp', room: 'leadership-lounge', kind: 'drawn' },
  { key: 'starburst', label: 'Starburst', room: 'idea-hatchery', kind: 'drawn' },
  { key: 'book-stack', label: 'Book stack', room: 'knowledge-nook', kind: 'drawn' },
]
export const ICON_KEYS = MEMBER_ICONS.map((i) => i.key)
export const iconByKey = Object.fromEntries(MEMBER_ICONS.map((i) => [i.key, i]))

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/
export const MAX_NAME = 80
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// What the member can choose for email. Saved as free / passes / none (the database checks these three words).
export const NEWSLETTER_CHOICES = [
  { value: 'free', label: 'Free updates', blurb: 'The general newsletter that anyone can have.' },
  { value: 'passes', label: 'News about my passes only', blurb: 'Only updates about the passes I hold.' },
  { value: 'none', label: 'No emails', blurb: 'Nothing, except account messages.' },
]

// Why a save was refused, in plain words.
export const SAY = {
  username_taken: 'That username is taken. Please try another.',
  username_invalid: 'A username needs 3 to 20 letters, numbers or underscores.',
  name_long: `Your name can be up to ${MAX_NAME} characters.`,
  signed_out: 'Please log in again to save your details.',
  generic: 'That did not save just now. Please try again in a moment.',
  email_invalid: 'That does not look like an email address. Please check it.',
  email_failed: 'We could not change to that address. Please check it, or try a different one.',
  email_wait: 'Please wait a minute before asking for another link.',
}

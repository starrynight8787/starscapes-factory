// How people can reach Starscapes Factory.
// Anything on a page that needs one of these stays hidden until it is filled in, so no page ever shows a blank or a placeholder.
export const CONTACT_EMAIL = 'imagine@starscapesfactory.com'
export const ACCESSIBILITY_REPLY_DAYS = '5' // working days: the accessibility statement promises a reply within this

// The social accounts for the footer: Sarah Jr.'s. A blank one is simply not shown.
export const SOCIAL_LINKS = {
  youtube: 'https://www.youtube.com/@sarahjradventures',
  instagram: 'https://www.instagram.com/sarahjradventures/',
  tiktok: 'https://www.tiktok.com/@sarahjradventures',
  threads: '',
}

// Gill's own Instagram, for the Photography page (Explorer's Bay)
export const INSTAGRAM_GILL = 'https://www.instagram.com/gill_bennet/'

// Each project's own accounts, for its own pages (for example the Story Ledger page and the Drafting Desk's live sessions).
// The Drafting Desk's YouTube channel is the "write, study and read with me" live channel.
export const PROJECT_SOCIALS = {
  'sarah-jrs-den': { name: 'Sarah Jr Adventures', ...SOCIAL_LINKS },
  'drafting-desk': { name: 'The Drafting Desk', youtube: 'https://www.youtube.com/@thedraftingdesk', tiktok: 'https://www.tiktok.com/@thedraftingdesk' },
  'story-ledger': { name: 'Story Ledger Audit', youtube: 'https://www.youtube.com/@story.ledger', tiktok: 'https://www.tiktok.com/@story.ledger' },
}

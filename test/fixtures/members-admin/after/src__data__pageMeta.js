// What each page is called, how it is described in a search result, and which picture shows when it is shared.
//
// ONE table, used in two places:
//   - the build (scripts/make-share-pages.mjs) writes a copy of the page for each address below with these words in its HTML, so WhatsApp,
//     Facebook, X, iMessage and Slack (which do not run the site's code) can read them, and so search engines see them at once;
//   - the pages that have no title of their own (the ones marked client: true) set their tab title from here as you move around the site.
// The names and taglines are read from the rooms' own data, so a room's title can never drift from the room.
//
// The descriptions are a first draft for Gill to rewrite. Keep each one a sentence or two (70 to 155 characters): search results cut them off.
//
// "index: false" means the page is told not to appear in search results and is left out of the sitemap: private pages, shop plumbing, and
// the old starter pages that still hold placeholder text.
//
// The share pictures are in public/share/ (1200 by 630). They show the rooms as they are today, with the tape on any closed door, so they
// need making again when a door opens.

import { ROOMS } from '../rooms/roomsData'
import { ART_LOFT } from '../artloft/artLoftData'
import { FACTORY, SECTIONS } from '../factoryfloor/factoryData'
import { DESK, AREAS } from '../draftingdesk/draftingData'

export const SITE_NAME = 'Starscapes Factory'
export const SITE_URL = 'https://starscapesfactory.com'
export const HOME_TITLE = 'Starscapes Factory: where imagination takes shape'
export const HOME_DESCRIPTION = 'A cosy, creative hub for stories, art, ideas and curiosity. Step inside and pick a room: writing, prints, travel, leadership and more.'

// The words that describe each share picture, for people who cannot see it
export const IMAGES = {
  site: { file: 'site.png', alt: 'Starscapes Factory: where imagination takes shape. The names of the eight rooms sit below the title on a starry blue background.' },
  'idea-hatchery': { file: 'idea-hatchery.png', alt: 'A lab bench of flasks, beakers and test tubes under a hanging lamp.' },
  'leadership-lounge': { file: 'leadership-lounge.png', alt: 'A sofa with a star on its cushion, a lamp, a plant and a framed certificate.' },
  'explorers-bay': { file: 'explorers-bay.png', alt: 'A night harbour with a sailboat, a wooden pier, a suitcase and a line of pegged photographs.' },
  'knowledge-nook': { file: 'knowledge-nook.png', alt: 'A bookcase of coloured books with genre names on the spines, and a little television.' },
  'sarah-jrs-den': { file: 'sarah-jrs-den.png', alt: 'A sitting room with a blue sofa, a bookcase, a wardrobe and a striped rug.' },
  'story-ledger': { file: 'story-ledger.png', alt: 'Story Ledger: a glowing neon television logo on a dark purple background.' },
  'drafting-desk': { file: 'drafting-desk.png', alt: 'A desk seen from above, covered in papers, a mug, a pencil and a paperclip.' },
  'art-loft': { file: 'art-loft.png', alt: 'A string of stars above an easel, a stack of rolled prints and a little market stall.' },
  'factory-floor': { file: 'factory-floor.png', alt: 'A pale blueprint with a protractor and a rolled blueprint tied with a ribbon and a padlock.' },
}

const room = (key, description) => ({ title: ROOMS[key].name, description, image: key })

// Every fixed address. (Pages whose address has a changing part, such as one post or one print, are not here: they use the default
// until a later update gives each its own.)
export const PAGES = {
  '/': { fullTitle: HOME_TITLE, description: HOME_DESCRIPTION, image: 'site', client: true },
  '/blog': { title: 'All posts', description: 'Every post from every room of Starscapes Factory, newest first, with tags to filter by so you can find what you want.', image: 'site', client: true },

  '/drafting-desk': { title: DESK.name, description: 'Where the writing happens. Follow my books, drafts and notebook as they take shape, entry by entry.', image: 'drafting-desk' },
  '/drafting-desk/archive-entries': { title: AREAS['archive-entries'].name, description: 'The ongoing story, entry by entry: the public entries from the Drafting Desk, newest first.', image: 'drafting-desk' },
  '/drafting-desk/authors-notebook': { title: AREAS['authors-notebook'].name, description: 'Behind the scenes, straight from my notebook. A members-only page.', image: 'drafting-desk', index: false },
  '/drafting-desk/come-write-with-me': { title: 'Come Write With Me', description: 'Join me on YouTube while I write. Watch the sessions, newest first, and write along with me at your own desk.', image: 'drafting-desk' },

  '/idea-hatchery': room('idea-hatchery', 'Where ideas get tested. Stop motion, a story we write together and writing prompts: pick a beaker to see what I am working on.'),
  '/idea-hatchery/lets-write-a-story': { title: 'Stories: let\u2019s write a story', description: 'A story we write together: I write each chapter, and members vote on where it goes next. The first three chapters are free to read.', image: 'idea-hatchery' },
  '/leadership-lounge': room('leadership-lounge', 'Leading from the middle. A blog, an audio course and an online course for people who lead without authority.'),
  '/explorers-bay': room('explorers-bay', 'Stories and pictures from the road: writing in transit and travel photography, from the pier.'),
  '/knowledge-nook': room('knowledge-nook', 'Reading, learning and personal growth. A bookcase of what I am reading and learning.'),
  '/sarah-jrs-den': room('sarah-jrs-den', "Kids' travel adventures, told through a curious little bear and her pet dinosaur, Daryl."),
  '/knowledge-nook/story-ledger': { title: 'Story Ledger', description: 'A ledger of the stories I watch and read, with a focus on 90s TV shows.', image: 'story-ledger' },

  '/art-loft': { title: ART_LOFT.name, description: 'Where colour meets imagination. Art prints in five collections: calm colour, space, the sea, dance and one-offs.', image: 'art-loft' },
  '/art-loft/prints': { title: 'Digital Prints', description: 'Every art print in the Art Loft, with its sizes and frames. Each one is made to order.', image: 'art-loft' },
  '/art-loft/originals': { title: 'Original paintings', description: 'One-of-a-kind original paintings from the Art Loft, available by enquiry.', image: 'art-loft' },

  '/factory-floor': { title: FACTORY.name, description: 'Building Starscapes Factory, one line of code at a time. What was made, what broke and how it got fixed.', image: 'factory-floor' },
  '/factory-floor/floor': { title: SECTIONS.story.name, description: 'The story of building Starscapes Factory, day by day: what I built, what broke, and how I fixed it.', image: 'factory-floor' },
  '/factory-floor/blueprints': { title: SECTIONS.blueprint.name, description: 'The reasoning behind each day of the build: why I made each decision, and what it cost.', image: 'factory-floor' },

  // Private pages, shop plumbing, and the old starter pages that still hold placeholder text: told not to appear in search results
  '/cart': { title: 'Your cart', description: 'The prints in your cart.', image: 'site', index: false, client: true },
  '/login': { title: 'Log in', description: 'Log in to Starscapes Factory.', image: 'site', index: false, client: true },
  '/signup': { title: 'Sign up', description: 'Create a Starscapes Factory account.', image: 'site', index: false, client: true },
  '/forgot-password': { title: 'Forgot your password?', description: 'Get a link to choose a new password.', image: 'site', index: false, client: true },
  '/reset-password': { title: 'Choose a new password', description: 'Choose a new password for your account.', image: 'site', index: false, client: true },
  '/checkout/success': { title: 'Thank you', description: 'Your order has been received.', image: 'site', index: false, client: true },
  '/invoice': { title: 'Your invoice', description: 'Your invoice for your order from Starscapes Factory.', image: 'site', index: false, client: true },
  '/products': { title: 'Shop', description: 'The original shop page.', image: 'site', index: false, client: true },
  '/new': { title: 'New post', description: 'Write a new post.', image: 'site', index: false, client: true },
  '/new-product': { title: 'New product', description: 'Add a product.', image: 'site', index: false, client: true },
  '/admin': { title: 'Admin', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/admin/doors': { title: 'Open a door', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/admin/home': { title: 'Home page tool', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/admin/posts': { title: 'All posts', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/admin/stories': { title: 'Stories', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/admin/books': { title: 'Books', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/admin/members': { title: 'Passes and members', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\u2019s page.', image: 'site', index: false },
  '/membership/passes': { title: 'My passes', description: 'The passes you hold, and how to change or cancel them.', image: 'site', index: false, client: true },
  '/membership/change': { title: 'Change my passes', description: 'Add or remove a pass whenever you like.', image: 'site', index: false, client: true },
  '/membership/welcome': { title: 'Welcome', description: 'Your passes are open.', image: 'site', index: false, client: true },
  '/membership': { title: 'Choose your passes', description: 'Open the parts of the story you want with one pass or several.', image: 'site', index: false, client: true },
  '/testers': { title: 'For testers', description: 'A private page for the people testing Starscapes Factory.', image: 'site', index: false, client: true },
  '/page/about': { title: 'About Me', description: 'About the person behind Starscapes Factory.', image: 'site', index: false, client: true },
  '/page/contact': { title: 'Contact', description: 'How to get in touch with Starscapes Factory.', image: 'site', index: false, client: true },
  '/page/terms': { title: 'Terms & Conditions', description: 'The terms that apply to everything bought on Starscapes Factory.', image: 'site', index: false, client: true },
  '/page/privacy': { title: 'Privacy Policy', description: 'How Starscapes Factory uses your information.', image: 'site', index: false, client: true },
  '/page/cookies': { title: 'Cookie policy', description: 'What this website keeps on your device, and what other companies see.', image: 'site', index: false, client: true },
  '/page/ai-policy': { title: 'AI Policy', description: 'How Starscapes Factory uses AI tools.', image: 'site', index: false, client: true },
  '/page/returns': { title: 'Returns and refunds', description: 'Your rights to cancel an order, return a print and be refunded.', image: 'site', index: false, client: true },
  '/page/delivery': { title: 'Delivery and returns', description: 'How delivery works, and what to do if something goes wrong.', image: 'site', index: false, client: true },
  '/page/accessibility': { title: 'Accessibility statement', description: 'How Starscapes Factory aims to be easy for everyone to use.', image: 'site', index: false, client: true },
}

// The address a page is found at, written out in full
export const urlFor = (path) => `${SITE_URL}${path === '/' ? '/' : path}`

// What goes in the browser tab for a page: its name, then the site's name (the home page has its own full title)
export const fullTitleFor = (meta) => meta.fullTitle || `${meta.title} | ${SITE_NAME}`

export const imageUrlFor = (meta) => `${SITE_URL}/share/${IMAGES[meta.image].file}`

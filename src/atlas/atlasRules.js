// The Star Atlas, the plain rules (Foundations only). Nothing here talks to the database.
// Figma: "Starscapes Star Atlas", Style 1 (A1 Atlas home, A2 phone, A4 free account). The numbers come from the Star Atlas Build Agent Brief.

// The eight rooms that earn stamps, in the order the Figma shows them. `room` is the key the database uses (atlas_stamps.room, and the `rooms` object from get_my_atlas()).
// `total` is how many stamps light the room's planet. The Factory Floor earns nothing, so it is not here.
export const ATLAS_ROOMS = [
  { room: 'knowledge-nook', name: 'Knowledge Nook', total: 12, colour: '#2f5fd0' },
  { room: 'explorers-bay', name: "Explorer's Bay", total: 12, colour: '#8fd3f4' },
  { room: 'story-ledger', name: 'Story Ledger', total: 12, colour: '#f2a93b' },
  { room: 'drafting-desk', name: 'Drafting Desk', total: 12, colour: '#1fb5a5' },
  { room: 'art-loft', name: 'Art Loft', total: 6, colour: '#ff7a90' },
  { room: 'idea-hatchery', name: 'Idea Hatchery', total: 12, colour: '#ffd84a' },
  { room: 'sarah-jrs-den', name: 'Sarah Jr. Adventures', total: 2, colour: '#9b6bdb' },
  { room: 'leadership-lounge', name: 'Leadership Lounge', total: 3, colour: '#4cc27a' },
]

// The site's door and the atlas room are not always named alike. The Story Ledger is a door inside the Knowledge Nook on the site (/knowledge-nook/story-ledger),
// but in the atlas it is a room of its own, with its own colour and planet. This turns a site room and door into the atlas room a stamp belongs to.
export function atlasRoomFor(siteRoom, door) {
  if (siteRoom === 'knowledge-nook' && door === 'story-ledger') return 'story-ledger'
  return ATLAS_ROOMS.some((r) => r.room === siteRoom) ? siteRoom : null
}

// The three starter stamps every account has. `key` is what claim_starter_stamp() is given, and what get_my_atlas() lists back in `starter`.
export const STARTER_STAMPS = [
  { key: 'joined', label: 'Joined', colour: '#f2c230' },
  { key: 'first-country', label: 'First country', colour: '#3fb872' },
  { key: 'first-chapters', label: 'First three chapters', colour: '#ef5f86' },
]

// Opening chapter 3 of any story earns the first-chapters stamp (chapters 1 to 3 are the free ones, so this is the end of the free chapters)
export const FIRST_CHAPTERS_AT = 3
export const earnsFirstChapters = (chapterNumber) => Number(chapterNumber) === FIRST_CHAPTERS_AT

// What get_my_atlas() gives back, made safe to draw: numbers are numbers, a missing piece becomes a plain default. Nothing about the member's name or email is in it.
export function cleanAtlas(raw) {
  if (!raw || typeof raw !== 'object') return null
  const needed = Number(raw.stardust_needed)
  const earned = Number(raw.stardust_earned)
  const rooms = raw.rooms && typeof raw.rooms === 'object' ? raw.rooms : {}
  return {
    year: Number(raw.year) || new Date().getFullYear(),
    galaxy: typeof raw.galaxy === 'string' && raw.galaxy.trim() ? raw.galaxy.trim() : 'Your galaxy',
    needed: Number.isFinite(needed) && needed > 0 ? needed : 100,
    earned: Number.isFinite(earned) && earned > 0 ? Math.floor(earned) : 0,
    isPaid: raw.is_paid === true,
    hasCountry: raw.has_country === true,
    starter: Array.isArray(raw.starter) ? raw.starter.filter((s) => typeof s === 'string') : [],
    rooms: Object.fromEntries(ATLAS_ROOMS.map((r) => [r.room, Math.max(0, Math.floor(Number(rooms[r.room]) || 0))])),
  }
}

// How full the galaxy bar is, 0 to 100. The galaxy counts stardust EARNED this year, never the balance after spending.
export const galaxyPercent = (earned, needed) => (needed > 0 ? Math.min(100, Math.round((Math.max(0, earned) / needed) * 100)) : 0)

// How many stars of a room are lit, never more than its total (a stamp past the total does not make a seventh star in a six-star room)
export const litStars = (count, total) => Math.max(0, Math.min(total, Math.floor(Number(count) || 0)))

// The words under a room's stars
export const stampsLine = (count, total) => `${litStars(count, total)} of ${total} stamps`

// Which starter stamps this member still has to earn, so the page knows what to claim. 'joined' is claimed on the first visit; the other two need the country and a chapter.
export const missingStarter = (starter) => STARTER_STAMPS.filter((s) => !starter.includes(s.key)).map((s) => s.key)
export const allStarterEarned = (starter) => missingStarter(starter).length === 0

// The Figma wording for the parts that unlock with a pass
export const WORDS = {
  badgesFree: 'Badges unlock with a pass.',
  badgesPaid: 'Your badges will live here.',
  galaxiesNote: (year) => `${year} filling. ${year + 1} opens 1 January.`,
  freeIntro: 'Your free account comes with three starter stamps. Here is what a pass holder builds.',
  paidIntro: 'Your passes, and your Star Atlas: every stamp you have earned across the rooms.',
  freeBox: 'This is what a pass holder builds. Hold a pass to earn stamps in every room, spend stardust and vote.',
  freeGalaxyLine: 'Your galaxy is waiting for its stars. Every stamp you earn lights one.',
}

// Two-letter country codes (ISO 3166-1) for the "Where are you from?" picker. Only the code is ever stored, never an address.
export const COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NZ OM PA PE PF PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS XK YE ZA ZM ZW'.split(' ')

export const isCountryCode = (c) => typeof c === 'string' && /^[A-Z]{2}$/.test(c) && COUNTRY_CODES.includes(c)

// A country's name in English, for the picker. Falls back to the code if the browser cannot name it.
export function countryName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code
  } catch (e) {
    return code
  }
}

export const countryOptions = () => COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name))

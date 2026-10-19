// The words on the Story Ledger page, from the Figma design ("Story Ledger page"). To change what it says, change it here.
// The numbers in the Mosaic are the ones to keep up to date as episodes are watched: change "done" and the page redraws the grid.
export const NOW_WATCHING = 'Now watching: Baywatch, Season 1'
export const TAGLINE = 'A deadpan audit of old TV'

export const WHAT_IT_IS = [
  'A first-time viewer watches Baywatch from Season 1, Episode 1, logs everything that happens in a spreadsheet, and turns each episode and season into short videos. The humour comes from applying the language of a compliance audit, such as "forensic entertainment auditing" and the "Mission Drift Index", to a very sincere 90s show.',
  'It is also a way to learn how stories work: how themes repeat, what a series is really about, and how things change from one telling to the next.',
]

export const TRACKED = [
  ['Rescues', 'Who made the save, and how.'],
  ['Relationships', 'Weddings, breakups, births.'],
  ['Danger and crime', 'The plots, and the deaths.'],
  ['Cast changes', 'Who joins, leaves or is promoted.'],
  ['Celebrity cameos', 'Every famous face.'],
  ['Slow-motion shots', 'Counted by episode and by type.'],
  ['Moments that have not aged well', 'Tagged by type and seriousness.'],
  ['Running scores', 'The Mission Drift Index and the Ridiculousness line.'],
]

export const VIDEOS = [
  ['Episode Audit', 'Every episode: the plot in 3 to 6 hand-drawn beats, the key stats and a verdict.'],
  ['Extras', 'One absurd moment, one surprising statistic, or a montage of a storyline.'],
  ['Season videos', 'A character guide, a recap with the big numbers, and a countdown ranking.'],
  ['Call-outs', 'A short video when something is too wild to wait.'],
]

// The "Currently watching" half of the first box (Figma: "Story Ledger v2"). When the show changes (after Baywatch), change this and NOW_WATCHING above.
// PLEASE CHECK the numbers and the years before launch: 242, 44 and 2 come from the Mosaic line below; the 11 seasons and 1989 to 2001 need confirming.
export const CURRENTLY = {
  show: 'Baywatch',
  season: 'Season 1',
  blurb: 'Baywatch follows a team of Los Angeles lifeguards through rescues, romances and a great deal of slow-motion running. It was cancelled after one season, then came back and became one of the most widely watched shows on television.',
  facts: [['11', 'seasons'], ['242', 'episodes'], ['44', 'spin-off episodes'], ['2', 'films']],
  years: 'On air from 1989 to 2001.',
}

export const SUBSCRIBE = {
  title: 'Never miss an audit',
  text: 'New episode audits, extras and call-outs, as soon as they go up.',
}

export const PREVIOUS_COUNT = 3 // audits listed under Previous audits (the newest one is shown as the Latest video)

export const MOSAIC = {
  show: 'BAYWATCH',
  total: 288,
  done: 5,
  breakdown: '242 Baywatch, 44 Baywatch Nights and 2 films',
}

export const HEAVY = {
  title: 'How the heavy storylines are handled',
  text: 'Season 1 is darker than its reputation. Serious events are named plainly, once in each video, and the jokes are about how the show handles things, never about the harm itself. Everything is hand-drawn, so the heaviest moments can be left out of the pictures.',
}

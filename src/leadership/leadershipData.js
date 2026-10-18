// The words on the Leadership Blog page that are not from the posts, and the tags that tell the page what each post is for.
// HOW YOU CHOOSE THINGS (no database change, just the Tags box on a post):
//   * the FEATURED post: give a Leadership Lounge post the tag  featured  (the newest one with it is shown; with none, the newest post is).
//   * a BUILDING BLOCK: give a Leadership Lounge post the tag  building-block-1  (or -2, -3, -4, -5, -6). A block with no post shows "Coming soon".
export const ROOM = 'leadership-lounge'
export const FEATURED_TAG = 'featured'
export const BLOCK_COUNT = 6
export const blockTag = (n) => `building-block-${n}`
export const LATEST_COUNT = 5 // posts in the Latest posts box
export const MORE_COUNT = 3 // posts in More from the blog (older ones, not already shown above)

export const SUBTITLE = 'Notes on leading from where you are.'
export const BANNER_CHIP = 'Leading from the Middle'
export const BANNER_PICTURE = '/scenes/leadership-lounge/base.svg' // the Lounge's own picture: the room with the sofa and the lamp
export const BLOCKS_INTRO = 'Leading from the middle, one step at a time. Start at the first and work down.'

// The boxes under the featured post. The ebook's box follows its door: "Opening soon" while the door is closed, a real button once you open it.
export const WAYS = [
  { id: 'ebook', title: 'The free ebook', text: 'A short guide for people who lead without the big title.', button: 'Get the free ebook' },
  { id: 'audiobook', title: 'The audiobook', text: 'Listen to Leading from the Middle on Everand. Opens in a new tab.', button: 'Listen on Everand' },
  { id: 'course', title: 'The Udemy course', text: 'Walk through the ideas step by step. Opens in a new tab.', button: 'See the course' },
]

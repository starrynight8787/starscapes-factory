// The admin console: every tool, grouped. A tool with a "to" is a page that exists. A tool without one is planned, and is shown as coming soon,
// so the console always shows what is there and what is on its way. When a planned tool is built, give it a "to" and it becomes a link.
export const ADMIN_GROUPS = ['Write', 'Shop', 'Members', 'Rooms']

export const ADMIN_TOOLS = [
  { group: 'Write', name: 'New post', to: '/new', blurb: 'Write a post and publish it.', icon: 'post' },
  { group: 'Shop', name: 'New product', to: '/new-product', blurb: 'Add a product by hand. Prints come from Creative Hub, so this is for anything else.', icon: 'product' },
  { group: 'Shop', name: 'Prints, orders and Creative Hub', to: '/art-loft/admin', blurb: 'Switch prints on, sort them into collections, write descriptions, sync with Creative Hub, and see your orders.', icon: 'hub' },
  { group: 'Shop', name: 'Originals', to: '/art-loft/admin/originals', blurb: 'Add your original paintings, mark them sold, and switch them on.', icon: 'originals' },
  { group: 'Members', name: 'Passes and members', to: '/admin/members', blurb: 'The five passes, who has them, when each member pays next, and what the passes cost.', icon: 'passes' },
  { group: 'Members', name: 'Promotions', to: '/admin/promotions', blurb: 'The half-price first year, and discount codes for passes: make one, see how often it is used, and switch it off.', icon: 'promo' },
  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.', icon: 'door' },
  { group: 'Rooms', name: 'Home page', to: '/admin/home', blurb: 'Choose the featured room, and add the next event, for the boxes under the floor plan on the home page.', icon: 'home' },
  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\'s reading goal and theme.', icon: 'books' },
  { group: 'Rooms', name: 'All posts', to: '/admin/posts', blurb: 'See every post from every room, filter by room, and see where each one appears.', icon: 'posts' },
  { group: 'Rooms', name: 'Stories', to: '/admin/stories', blurb: 'Add a story, say which posts are its chapters, and mark a story finished.', icon: 'stories' },
  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.', icon: 'ideas' },
  { group: 'Rooms', name: 'Manage comments', to: '/admin/comments', blurb: 'Read every comment on the Book Club books, filter by book, and delete one that should not be there.', icon: 'comments' },
]

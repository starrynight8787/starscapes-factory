// The admin console: every tool, grouped. A tool with a "to" is a page that exists. A tool without one is planned, and is shown as coming soon,
// so the console always shows what is there and what is on its way. When a planned tool is built, give it a "to" and it becomes a link.
export const ADMIN_GROUPS = ['Write', 'Shop', 'Members', 'Rooms']

export const ADMIN_TOOLS = [
  { group: 'Write', name: 'New post', to: '/new', blurb: 'Write a post and publish it, or save it as a draft.' },
  { group: 'Shop', name: 'New product', to: '/new-product', blurb: 'Add a product by hand. Prints come from Creative Hub, so this is for anything else.' },
  { group: 'Shop', name: 'Prints, orders and Creative Hub', to: '/art-loft/admin', blurb: 'Switch prints on, sort them into collections, write descriptions, sync with Creative Hub, and see your orders.' },
  { group: 'Shop', name: 'Originals', to: '/art-loft/admin/originals', blurb: 'Add your original paintings, mark them sold, and switch them on.' },
  { group: 'Members', name: 'Passes and members', blurb: 'The four passes, who has them, and what they cost.' },
  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.' },
  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.' },
]

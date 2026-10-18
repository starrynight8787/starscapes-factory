// The words on the private page for testers (/testers). It is not linked from anywhere: Gill sends the address to the people she wants to try the site.
// The test card numbers are Stripe's own public test numbers. They only work while the shop's payments are in test mode, and they never take real money.
export const TESTERS = {
  title: 'Thank you for testing Starscapes Factory',
  intro: 'The site is not open to the public yet. You are one of the first to try it, and what you find will make it better before anyone else sees it.',
  pretend: [
    'Payments are in test mode. No real money is taken, and nothing is made or posted to anyone.',
    'Please do not type a real card number anywhere. Use only the test card below.',
    'Things may change, move or look unfinished while you are here.',
    'If you make an account, a real email is sent to the address you sign up with, so use your own.',
  ],
  card: [
    ['Card number', '4242 4242 4242 4242'],
    ['Expiry date', 'Any date in the future, for example 12/34'],
    ['Security code', 'Any three numbers, for example 123'],
    ['Name and address', 'Anything you like'],
  ],
  declineNote: 'To see what happens when a payment fails, use this card number instead:',
  declineCard: '4000 0000 0000 0002',
  tryThese: [
    'Wander through the rooms from the home page, on a phone and on a computer.',
    'Open a print, change the size and the frame, and watch the price change.',
    'Add a print to your cart and go through checkout with the test card.',
    'Make an account, log out, log in again, and try "Forgot your password?".',
    'Move around using only the keyboard (Tab and Enter), or your screen reader if you use one.',
    'Zoom in, or use a bigger text size, and see whether anything breaks.',
  ],
  tell: [
    'The page you were on (copy its address from the top of your browser).',
    'What you were using: a phone or a computer, and which browser.',
    'What you expected to happen, and what happened instead.',
    'A screenshot, if you can. It helps a great deal.',
  ],
  tellIntro: 'Please email me what you find. A small thing or a big thing, I want to hear it, and I would love to hear what you liked too. Tell me:',
  thanks: 'Thank you. It really does help.',
  subject: 'Starscapes Factory test feedback',
}

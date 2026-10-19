// The legal pages (terms, privacy, returns and refunds, the AI policy). A page shows to visitors only when ready is true; until then only the OWNER can see it,
// under a "draft" banner, so the whole site can be walked through. Each is a list of numbered sections; a paragraph can have **bold**, [links](/page/...), and
// lists (a paragraph whose lines all start with "- " is one list). The drafts are Gill's, from Linear ("Legal pages: ... (draft for review)"); they are NOT legal advice.
//
// updated: '[date]' is a gap that the owner's banner counts. Put the real date in when the page is published, and set ready: true.
//
//   { slug, title, updated, ready, sections: [ { title, paragraphs: [ ... ] } ] }
export const LEGAL_PAGES = [
  {
    slug: 'terms',
    title: 'Terms and conditions',
    updated: '[date]',
    ready: false,
    // CHECK BEFORE PUBLISHING (SFW-17): section 5 says "Every order is sent with tracked delivery" and gives 6 to 10 working days AFTER posting. The print service's own
    // help article says postal orders do not include detailed tracking, and their reply says 6 to 10 working days covers production AND delivery together. Wait for their
    // answer to the follow-up questions, then correct section 5 (and the delivery estimate in the shop) to match.
    sections: [
          {
                "title": "About us",
                "paragraphs": [
                      "This website is run by Starscapes Factory Ltd (\"we\", \"us\"), a company registered in England and Wales with company number 14173440. Our registered office is 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ. Our VAT number is GB445903680. You can contact us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com)."
                ]
          },
          {
                "title": "What we sell and how your order is made",
                "paragraphs": [
                      "We sell art prints in a choice of sizes, unframed or framed. Each print is made to order by our printing partner, Creative Hub (run by The Print Space), and posted straight to you. Because every print is made after you order it, we don't keep stock. The pictures on this website are a guide: colours can look a little different on different screens and on paper."
                ]
          },
          {
                "title": "Placing an order",
                "paragraphs": [
                      "To order, add prints to your cart, press Checkout, and pay on Stripe's secure payment page. Pressing the pay button is your offer to buy. We accept your offer, and a contract between you and us begins, when we email you to confirm your order. If we can't accept it, for example because we can't deliver to your address, we will tell you and refund anything you have paid."
                ]
          },
          {
                "title": "Prices and VAT",
                "paragraphs": [
                      "All prices are in pounds sterling (£) and include VAT where it applies. Delivery to the countries listed in section 5 is included in the price. We take care to show correct prices, but if we find a mistake in the price of something you have ordered, we will tell you and let you choose between confirming the order at the correct price or cancelling it for a full refund."
                ]
          },
          {
                "title": "Delivery",
                "paragraphs": [
                      "We deliver free to the United Kingdom, Ireland, Germany, France, the United States and Canada. We can't deliver anywhere else at the moment.",
                      "Unframed prints are normally made and posted within 1 to 5 working days, and framed prints within 5 to 10 working days. Every order is sent with tracked delivery, which then usually takes 6 to 10 working days (up to 15 outside Europe and North America). These are estimates, not promises. If we haven't agreed a delivery date with you, we will deliver within 30 days of your order. If we are late, contact us and we will put it right, and you may be able to cancel for a refund.",
                      "Once your print has been posted, it usually arrives in:",
                      "- United Kingdom: 6 to 10 working days\n- Ireland, Germany and France: 6 to 10 working days\n- United States and Canada: 6 to 10 working days",
                      "We will email you when your order has been posted, with your tracking details.",
                      "The print is your responsibility once it has been delivered to you, or to someone you have asked us to deliver it to. Please check the parcel when it arrives and tell us straight away about any damage: see our Returns and refunds page."
                ]
          },
          {
                "title": "Orders from outside the UK",
                "paragraphs": [
                      "If you live outside the UK, your country may charge import taxes, customs duties or handling fees when your parcel arrives. They are not included in our prices, we don't control them, and you are responsible for paying them. If you refuse a parcel or don't collect it, we may take the cost of returning it out of any refund. We are not responsible for delays caused by customs. Please check your country's rules before you order."
                ]
          },
          {
                "title": "Payment",
                "paragraphs": [
                      "Payment is taken by Stripe when you place your order. We never see or store your card details. Stripe handles your payment under its own terms and privacy policy."
                ]
          },
          {
                "title": "Cancelling and returns",
                "paragraphs": [
                      "You have legal rights to cancel an order and to return a faulty item. Our Returns and refunds page explains how, and forms part of these terms."
                ]
          },
          {
                "title": "Your account",
                "paragraphs": [
                      "You can browse and order without an account. If you create one, you must be 18 or over, keep your password safe, and tell us if you think someone else has used it. You are responsible for what happens in your account. We may close an account that is being misused. You can ask us to delete your account at any time: see our Privacy policy."
                ]
          },
          {
                "title": "Copyright and what you can do with a print",
                "paragraphs": [
                      "The artwork, writing and images on this website belong to us or to the artist, Gillian Bennet, and are protected by copyright. When you buy a print, you own that print, but not the copyright in the picture. You can display it, give it as a gift, or sell the physical print on. You may not copy it, publish copies or photographs of the artwork, sell reproductions, or use it commercially, without our written permission."
                ]
          },
          {
                "title": "Using this website",
                "paragraphs": [
                      "Please use the website lawfully. Don't try to break it, overload it or get into parts of it that aren't meant for you. We try to keep it running, but we can't promise it will always be available, and we may change or pause it. Links to other websites are for your convenience, and we aren't responsible for what is on them."
                ]
          },
          {
                "title": "Our responsibility to you",
                "paragraphs": [
                      "Nothing in these terms takes away your legal rights as a consumer. Goods must be as described, of satisfactory quality and fit for purpose. We don't limit our responsibility for death or personal injury caused by our negligence, for fraud, or for anything else the law doesn't allow us to limit.",
                      "Otherwise, we are responsible for losses you suffer that were a foreseeable result of us breaking these terms. We are not responsible for losses that were not foreseeable, or for any loss to a business, because you are buying as a consumer."
                ]
          },
          {
                "title": "Events outside our control",
                "paragraphs": [
                      "If something outside our reasonable control delays or prevents an order, such as a postal strike, severe weather or a fault at the print studio, we are not responsible for the delay. We will tell you as soon as we can, and if it goes on for a long time you may cancel and be refunded."
                ]
          },
          {
                "title": "Changes to these terms",
                "paragraphs": [
                      "We may update these terms from time to time. The terms in force when you place your order are the ones that apply to that order."
                ]
          },
          {
                "title": "Complaints and the law",
                "paragraphs": [
                      "If you are unhappy with anything, email us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) and we will do our best to put it right. These terms, and any dispute about them, are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you live in Scotland or Northern Ireland, you may also bring proceedings in your local courts. If you live outside the UK, the consumer laws of your own country continue to protect you as well."
                ]
          }
    ],
  },
]

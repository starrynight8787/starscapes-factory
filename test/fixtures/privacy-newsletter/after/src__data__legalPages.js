// The legal pages (terms, privacy, returns and refunds, the AI policy). A page shows to visitors only when ready is true; until then only the OWNER can see it,
// under a "draft" banner, so the whole site can be walked through. Each is an introduction and a list of numbered sections; a paragraph can have **bold**,
// [links](/page/...), "- " or "* " lists (a paragraph whose lines all start that way is one list), quotes ("> text") and tables (| a | b |).
// The drafts are Gill's, from Linear ("Legal pages: ... (draft for review)"); they are NOT legal advice.
//
// updated: '[date]' is a gap that the owner's banner counts. Put the real date in when the page is published, and set ready: true.
//
//   { slug, title, updated, intro: [ ...paragraphs ], ready, sections: [ { title, paragraphs: [ ... ] } ] }
//
// CHECK BEFORE PUBLISHING ANY OF THEM:
//  * TRACKING AND DELIVERY TIMES (SFW-17): ANSWERED by Creative Hub in writing on 20 October 2026. The 6 to 10 working days covers production AND delivery together, framed or unframed; every order has tracking;
//    an order can be cancelled while printing has not started, and a delivery address changed before dispatch, both by emailing their customer service (there is no way to do it through the API). Terms section 5, the print pages
//    and the order emails now say so, and Returns section 4 ("every order is sent with tracked delivery") is confirmed. STILL NOT ANSWERED: separate figures for Europe, the US and Canada; who receives the tracking email from
//    Creative Hub (so we do not know if customers would get two emails); whether a test order can be cancelled before it is charged; what the tracking field is called in their API.

//  * THE PRIVACY POLICY was brought up to date on 20 October 2026 (SFW-233): passes, the suggest and vote boxes, story votes, the free ebook (its tick box also says yes to free blog posts by email, so Marketing now says so),
//    the YouTube player and the browser storage. Decided 20 October: Resend is the mailing tool, and emails and messages to us are kept 2 years. THE ONLY GAP LEFT is the [date]. STILL TO DO BEFORE IT GOES LIVE: the ebook sign-up list
//    is only stored in Supabase; before the ebook door opens it must reach a Resend audience and each email must be sent as a Resend Broadcast with its unsubscribe footer (not built yet); check which region the Resend account sends from
//    and its plan limits (SFW-188); the Founders' wall (display names, opt-in) needs its own lines when built (the newsletter's lines were added on 21 October 2026, with a daily job that deletes sign-ups nobody confirms after 30 days); and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes
//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:
//    the ICO says its guidance is under review after the Data (Use and Access) Act.
//    A sentence about links to other websites such as the Substack was added on 20 October (SFW-236). If the Substack link in src/draftingdesk/draftingData.js is ever removed, take the sentence out too.
//  * THE TERMS GAINED FOUR SECTIONS FOR PASSES on 20 October 2026 (SFW-182), placed before "Changes to these terms" so no existing section number moves: Passes; Paying for passes; Changing your passes;
//    Cancelling passes and your right to change your mind. They are written from the site as it works and from Gill's decisions (VAT included in the price and shown separately at checkout; UK customers only for now; no refund
//    for a part-used period; changes only in the 7 days before the next payment, a WORKING RULE in src/membership/changeWindow.js that Gill has not yet confirmed). Two promises need building before passes open:
//    we email before the price changes (SFW-237), and Stripe's retry settings must match "your passes stay open while it tries again" (not checked). The accountant (SFW-183) and the free-advice questions (SFW-234)
//    may change the wording on VAT, overseas customers and the 14-day right: change the words here and the tests will say what else has to follow.
//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are
//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written
//    in (round brackets) so they are not counted as gaps.
//  * COOKIES (added 20 October 2026): a separate Cookie policy, written from what the code really stores and loads. A test (test/cookie-policy.test.js) fails if the site starts storing something new, loading something from
//    another company, or adding analytics without this page (and the Privacy policy's short cookies section) being brought up to date. THE ONLY GAP LEFT is the [date]. Google Fonts is named because the fonts
//    are fetched from Google (src/styles/site.css): if the fonts are ever hosted on this site instead, take that line out (the test will say so). Gill asked for a separate page; the free-advice review (SFW-234) should
//    confirm that no cookie banner is needed for sign-in, cart and the passes choice (they are needed for something the visitor asked for).
export const LEGAL_PAGES = [
  {
    "slug": "terms",
    "title": "Terms and conditions",
    "updated": "[date]",
    "intro": [
      "These terms apply to everything you buy on this website and to using the website itself. Please read them before you order."
    ],
    "ready": false,
    "sections": [
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
          "Every print is made to order and sent with tracked delivery. Framed or unframed, it usually reaches you within 6 to 10 working days of your order, which covers making it and delivering it. These are estimates, not promises. If we haven't agreed a delivery date with you, we will deliver within 30 days of your order. If we are late, contact us and we will put it right, and you may be able to cancel for a refund.",
          "We will email you when your order has been posted, with your tracking details.",
          "If you need to change the delivery address, or want to stop an order before it is made, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) straight away. We send your order to the print studio very soon after you pay, so we can only cancel it if printing has not started, and we can only change the delivery address before it has been posted. This is separate from your legal right to cancel, which our Returns and refunds page explains.",
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
        "title": "Passes",
        "paragraphs": [
          "A pass gives you access to members-only posts and other material in one part of the site. The passes are The Author's Notebook, Early drafts and book background, Come Write With Me, Blueprints and Book Club. The first three posts in every pass are free to read, and the first three Come Write With Me sessions are free to join.",
          "In Come Write With Me, members vote on where the story goes: one vote each, which you can change until the vote closes.",
          "Passes are digital: nothing is posted to you. They are for your own use, so please don't share your login or copy the material."
        ]
      },
      {
        "title": "Paying for passes",
        "paragraphs": [
          "You choose which passes you want and whether to pay monthly or yearly. One pass costs £5 a month, two cost £7, three cost £10, and four or more cost £12. A year costs ten months. Prices are in pounds and include VAT, which is shown separately at checkout. Passes are for customers in the UK for now.",
          "While the launch offer lasts, your first year costs half the normal price. After that we charge the normal price shown when you chose, unless you cancel first, and we will email you before the price changes.",
          "Your passes renew automatically at the end of each month or year, at the price shown, until you cancel. Payment is taken by Stripe, by card. If a payment fails, Stripe tries again and your passes stay open while it does. If it still fails, your passes close."
        ]
      },
      {
        "title": "Changing your passes",
        "paragraphs": [
          "You can add or remove passes in My passes, in the 7 days before your next payment. The change starts at once, and the new price starts with that payment. Nothing is charged or refunded when you change. This stops passes being added just after a payment and taken away just before the next one.",
          "If you add a pass, we ask you to tick the same box as when you first bought, because the new pass opens straight away."
        ]
      },
      {
        "title": "Cancelling passes and your right to change your mind",
        "paragraphs": [
          "You can cancel at any time in My passes, under \"Manage payment or cancel\". Your passes stay open until the end of the period you have paid for, and you will not be charged again. We do not refund the rest of a period you have paid for, apart from where the law says we must.",
          "By law you have 14 days from buying to cancel and get your money back. Your passes open as soon as you pay, so before you pay we ask you to tick a box that says: \"Open my passes now. I understand that once they open, I lose my 14-day right to cancel and get a refund.\" You cannot buy passes without ticking it, because they open at once."
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
    ]
  },
  {
    "slug": "privacy",
    "title": "Privacy policy",
    "updated": "[date]",
    "intro": [
      "This policy explains what personal information Starscapes Factory Ltd collects when you visit this website or buy from it, why we collect it, who sees it, and what rights you have."
    ],
    "ready": false,
    "sections": [
      {
        "title": "Who we are",
        "paragraphs": [
          "Starscapes Factory Ltd is the \"controller\" of your information, which means we decide how and why it is used. We are registered in England and Wales with company number 14173440, and our registered office is 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ. You can contact us about anything in this policy at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com)."
        ]
      },
      {
        "title": "What we collect and why",
        "paragraphs": [
          "| What | When | Why | Our legal reason |\n| -- | -- | -- | -- |\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\n| Your email address, and the date and wording you agreed to | When you sign up for the free ebook | To send you the ebook and our free blog posts by email | Your consent, which you can take back at any time |\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter, confirm it, or unsubscribe | To send you the newsletter, to keep proof that you asked for it and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in respecting your choice if you leave |",
          "We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation."
        ]
      },
      {
        "title": "Suggestions and votes",
        "paragraphs": [
          "We read every suggestion before it appears. What appears is the suggestion and the reason you gave, never your name or email address. Votes are shown only as totals: nobody can see who voted for what, and nobody else can see your vote. In a story vote, you see the totals once you have voted, and everyone sees them when the vote has closed.",
          "We could see who voted for what by looking directly in our database, but we don't look. We only ever use the totals. If you ask us to delete your account, your suggestions, your votes and your passes record are deleted with it. Payment records are kept: see How long we keep it."
        ]
      },
      {
        "title": "Cookies and similar technologies",
        "paragraphs": [
          "We only use what the site needs to work: your sign-in, your cart, and the choice you make on the passes page. All three are kept on your own device. We don't use advertising or analytics cookies, so we don't show a cookie banner. Nothing loads from YouTube until you press play. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may store its own cookies on your device and see your IP address, under its own policy. Stripe's payment page sets its own cookies under its own policy. Your browser also fetches our fonts from Google whenever a page loads, so Google receives your IP address and browser details; Google says its fonts service sets no cookies. If we ever add analytics, we will ask your permission first and update this page. The full list is on our [Cookie policy](/page/cookies)."
        ]
      },
      {
        "title": "Who we share your information with",
        "paragraphs": [
          "We share only what each of these needs to do its job:",
          "* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\n* **Vercel** hosts the website, so it sees technical details of visits.\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the free ebook, the ebook and our free blog posts, and, if you sign up for the newsletter, the email asking you to confirm and then the newsletter. It receives your email address.\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\n* **Our accountants and accounting software** receive sales and invoice records.\n* **Authorities**, but only where the law requires it.",
          "We don't sell your information, and we don't share it for other people's marketing.",
          "Our site links to other websites, such as our Substack. Once you follow a link you have left this site, and that website's own privacy policy applies."
        ]
      },
      {
        "title": "Sending information abroad",
        "paragraphs": [
          "Some of the companies above handle information outside the UK, for example in the United States (such as Google, which runs YouTube) and in Ireland, where our database is stored. When they do, we rely on safeguards the law accepts, such as the UK's approved list of countries (which includes Ireland and the rest of the EU) or UK-approved standard contract terms. If you order for delivery outside the UK, your delivery details also go to the print studio that makes your order (in Brooklyn in the United States for the United States and Canada, and in Düsseldorf in Germany for the EU and the rest of the world) and to the courier in that country."
        ]
      },
      {
        "title": "How long we keep it",
        "paragraphs": [
          "* **Order and invoice records:** six years, because tax law requires it.\n* **Your account:** until you ask us to delete it.\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\n* **Suggestions and votes:** until you ask us to delete your account.\n* **Free ebook sign-ups:** until you unsubscribe or ask us to delete your email address.\n* **Newsletter sign-ups:** until you unsubscribe or ask us to delete your email address. If you sign up but never press the link to confirm, we delete your address after 30 days.\n* **If you unsubscribe from the newsletter:** we keep your email address, marked as unsubscribed, so that we never email you again by mistake. If you would rather we deleted it completely, ask us and we will.\n* **Emails and messages to us:** 2 years, then deleted.\n* **Website logs:** for a short time only, as set by our hosting provider.",
          "Stripe, Creative Hub and our other providers keep information under their own policies."
        ]
      },
      {
        "title": "Your rights",
        "paragraphs": [
          "The law gives you rights over your information. You can ask us to:",
          "* tell you what we hold about you, and give you a copy\n* correct anything that is wrong\n* delete your information, where we have no good reason to keep it\n* limit how we use it\n* stop using it where we rely on our legitimate interest\n* give you your information in a form you can move elsewhere\n* take back your consent whenever you like, such as with the unsubscribe link in one of our emails",
          "To use any of these, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). We will reply within one month, and it is normally free. We will need to check who you are first. We may have to keep some records, such as invoices, even if you ask us to delete your information."
        ]
      },
      {
        "title": "Marketing",
        "paragraphs": [
          "We only send emails you have asked for. If you sign up for the free ebook, you are saying yes to receiving the free ebook and our free blog posts by email. Every one of those emails has an unsubscribe link, and you can also email us to stop them. We never sell your email address or share it for other people's marketing.",
          "If you sign up for the newsletter, you are saying yes to the newsletter: new posts and news from Starscapes Factory, by email. We first email you a link, and you are only added once you press it. Every newsletter has a link to unsubscribe, and the unsubscribe button that many email programs show works too. If you unsubscribe, we keep your address, marked as unsubscribed, so that we never email you again by mistake.",
          "Emails about your orders, account and passes, such as receipts and password resets, are not marketing. They are sent whether or not you have signed up for the ebook."
        ]
      },
      {
        "title": "Children",
        "paragraphs": [
          "This shop is for adults. We don't knowingly collect information about children. If you think we have, please tell us and we will delete it."
        ]
      },
      {
        "title": "Keeping it safe",
        "paragraphs": [
          "We use well-known providers and encrypted connections, and we keep access to your information limited to what is needed. No system is perfectly secure, so if you think something has gone wrong, tell us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). If there is a breach that puts your rights at risk, we will tell you and the regulator as the law requires. We don't put customers' personal details into AI tools: see our AI policy."
        ]
      },
      {
        "title": "Complaints",
        "paragraphs": [
          "Please contact us first, and we will try to put things right. You also have the right to complain to the Information Commissioner's Office at [ico.org.uk](https://ico.org.uk), or on 0303 123 1113."
        ]
      },
      {
        "title": "Changes to this policy",
        "paragraphs": [
          "If we change this policy, we will update it here and change the date at the top."
        ]
      }
    ]
  },
  {
    "slug": "returns",
    "title": "Returns and refunds",
    "updated": "[date]",
    "intro": [
      "This page explains your rights to cancel an order, send a print back, and be refunded. It is part of our Terms and conditions."
    ],
    "ready": false,
    "sections": [
      {
        "title": "If you change your mind",
        "paragraphs": [
          "You have the legal right to cancel your order, without giving a reason, within 14 days of the day your print is delivered to you (or to someone you have asked us to deliver it to).",
          "**To cancel:** email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) within those 14 days, with your name and order details. You can use the form at the end of this page, or simply write \"I am cancelling my order\" with the order details.",
          "**To send it back:** post the print to [RETURN ADDRESS] within 14 days of telling us you are cancelling. Please use its original packaging where you can, and pack it carefully, especially if it is framed. You pay the cost of sending it back, and you are responsible for it until it reaches us, so we recommend a tracked and insured service.",
          "**Your refund:** we will refund the price you paid within 14 days of getting the print back (or of you showing proof that you posted it, if that is earlier). Delivery was free, so there is no delivery charge to refund. If the print comes back damaged or marked because it wasn't looked after, we may reduce the refund by the amount it has lost in value.",
          "**Items you can't cancel:** the right to cancel doesn't apply to anything made to your own specification or clearly personalised for you. We don't sell anything like that at the moment, and if that changes we will say so clearly before you order."
        ]
      },
      {
        "title": "If your print is faulty or damaged",
        "paragraphs": [
          "Your print must be as described, of satisfactory quality and fit for purpose. If it arrives damaged, or has a printing fault:",
          "1. Email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) within 30 days of delivery, with your order details and photos or a short video of the problem and the packaging.\n2. Keep the print and packaging until we have looked at it. We may ask you for more photos.\n3. We will arrange a replacement straight away, or refund you in full if you prefer. You don't pay for returning a faulty print or for the replacement.",
          "Your legal rights don't stop after 30 days. If a fault shows up later, contact us and we will work out a repair, replacement or partial refund with you."
        ]
      },
      {
        "title": "If your print isn't what you ordered",
        "paragraphs": [
          "If you receive a different print, size or frame from the one you ordered, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) with clear photos, ideally within 14 days of delivery so we can check while it is fresh. We will compare your photos with the photos taken at the print studio before your order was packed. If the mistake was ours or the print studio's, we will refund you in full and arrange collection of the print at no cost to you. This doesn't limit your legal rights, described above."
        ]
      },
      {
        "title": "If your print doesn't arrive",
        "paragraphs": [
          "If your parcel hasn't arrived by the date we gave you, or within 30 days of your order if we gave none, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). Every order is sent with tracked delivery, so you can follow your parcel. If the tracking stops moving for several days, email us. If it shows your parcel as delivered but you can't find it, please check with neighbours, reception or building management first, and give it 24 hours, because many turn up that way. If it still hasn't appeared, email us with your order number, and we will investigate with the courier and the print studio, without waiting for the courier's claim to be settled. If the print can't be found, we will send a replacement or refund you in full."
        ]
      },
      {
        "title": "If you ordered from outside the UK",
        "paragraphs": [
          "The same rights apply wherever you live. Import taxes and duties are paid to your country's customs, not to us, so we can't refund them. If you send a print back from abroad, you may be able to claim them back from customs: ask your local customs office. If you refuse a parcel or don't collect it, we may take the cost of returning it out of your refund. The consumer laws of your own country may give you extra rights."
        ]
      },
      {
        "title": "How refunds are paid",
        "paragraphs": [
          "Refunds go back to the card or payment method you used, within the times above. Your bank may take a few days to show the money."
        ]
      },
      {
        "title": "Cancellation form",
        "paragraphs": [
          "You don't have to use this, but you can copy it into an email:",
          "> To Starscapes Factory Ltd, [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com): I am cancelling my contract for the sale of the following goods: (print name, size and frame). Ordered on (date). Received on (date). Name: (your name). Address: (your address). Date: (date)."
        ]
      }
    ]
  },
  {
    "slug": "ai-policy",
    "title": "AI policy",
    "updated": "[date]",
    "intro": [
      "**The short version.** The artwork, prints, photographs, stories and books I make and sell are made entirely by me. I don't use AI to make any of them. I do use AI as a helper to build and run this website, and this page tells you exactly where."
    ],
    "ready": false,
    "sections": [
      {
        "title": "What is always made by me",
        "paragraphs": [
          "The following are my own work, from start to finish. I don't use AI image generators or AI writing tools to create them, or to change them:",
          "* every original artwork, and every print sold in the Art Loft, which is printed from my own artwork files\n* my photographs\n* my stories, books and other creative writing, including my courses and leadership material"
        ]
      },
      {
        "title": "Where I do use AI",
        "paragraphs": [
          "I use an AI assistant called Claude, made by Anthropic, as a working partner for the website itself. I decide what the site should do and look like, and I check and approve what it produces. This is what it helps with:",
          "| Area | What the AI does | What I do |\n| -- | -- | -- |\n| Building the website | Writes, explains and tests the code, and helps find and fix problems | Decide what to build, check the results, and put it live |\n| Design and layout | Helps draft page layouts and mock-ups, alongside Figma's design tools | Sketch the ideas, choose between options, and approve the final look |\n| Illustrations around the site | Draws the line-drawn scenes that frame the shop, such as the Art Loft, from my directions | Direct them, and draw the room icons myself by hand |\n| Wording on the site | Drafts some of the plain site text, such as shop instructions, short collection summaries and the first drafts of these policy pages | Edit and approve every word |\n| My build diary | Keeps a log of what we did each day, what went wrong and how it was fixed | Rewrite the posts myself, in my own words, from that log, and decide what is published |\n| Research and planning | Helps me work out costs, delivery and how the pieces fit together | Make every decision |"
        ]
      },
      {
        "title": "What I never use AI for",
        "paragraphs": [
          "* **Making or changing the work I sell or publish as mine.** The artwork, photographs, stories and books in section 1 are never made, finished or altered by AI.\n* **Making decisions about you.** Nothing about your order, your account or your payment is decided by an AI system.\n* **Handling your information.** I never put customers' names, addresses, emails or order details into an AI tool. You can read more in our Privacy policy.\n* **Talking to customers.** I don't use a chatbot. When you write to me, a person replies.\n* **Reviews or testimonials.** I don't use AI to write reviews or testimonials, and I don't invent them.\n* **Training AI.** I don't give permission for my artwork or writing to be used to train AI models."
        ]
      },
      {
        "title": "How I check what AI produces",
        "paragraphs": [
          "I treat anything AI produces as a first draft. The code is tested before it goes live, and I look at the result myself. I read and edit the words. If something it produces is wrong, putting it right is my job, and the responsibility is mine."
        ]
      },
      {
        "title": "Why I'm telling you",
        "paragraphs": [
          "I think you should know how the things you buy and read were made. I'd rather say plainly where AI helps than leave you to guess."
        ]
      },
      {
        "title": "Questions, and changes to this page",
        "paragraphs": [
          "If the way I use AI changes, I will update this page and its date. If you have a question about it, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com)."
        ]
      }
    ]
  },
  {
    "slug": "cookies",
    "title": "Cookie policy",
    "updated": "[date]",
    "ready": false,
    "intro": [
      "This page lists everything this website keeps on your device, and everything it loads from other companies, and why. It goes with our [Privacy policy](/page/privacy), which explains what we do with your information."
    ],
    "sections": [
      {
        "title": "The short version",
        "paragraphs": [
          "We only use what the site needs to work. The site itself sets no cookies. It keeps three small things in your browser's storage, listed below, so that signing in, your cart and the passes page work as you would expect.",
          "We don't use advertising cookies, analytics or visitor tracking of any kind. Because the three things below are needed for something you have asked the site to do, we don't show a cookie banner. If we ever add anything that needs your permission, we will ask first and update this page."
        ]
      },
      {
        "title": "What the site keeps on your device",
        "paragraphs": [
          "| Name | What it is for | How long it stays |\n| --- | --- | --- |\n| A name that starts **sb-** and ends **-auth-token** | Keeps you signed in, so you can use My passes, vote in a story and read what your passes open. It is only there once you have signed in. | Until you log out or clear your browser's data |\n| **sf-cart-v1** | Remembers what is in your cart, so it is still there if you leave and come back. It holds the prints in your cart, not your name or address. | Until you empty your cart or clear your browser's data |\n| **sf-membership-choice** | Remembers which passes you ticked, and whether you chose monthly or yearly, so your choice is still there if you go back a page. | Until you close the tab |",
          "The first two are kept in your browser's local storage, and the third in its session storage. They are not cookies. They stay on your device and are used only to make the site work for you."
        ]
      },
      {
        "title": "What other companies set or see",
        "paragraphs": [
          "* **Google Fonts.** To draw our lettering, your browser fetches the fonts (Caveat, Inter, Josefin Sans, Sacramento and Schoolbell) from Google whenever a page loads. Google receives your IP address, the address of the font file and details of your browser, so that it can send them. Google says its fonts service does not set or log cookies ([Google's explanation](https://developers.google.com/fonts/faq/privacy)).\n* **YouTube.** Nothing loads from YouTube until you press play on a video. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may then store its own cookies on your device and see your IP address, under its own policy ([how Google uses cookies](https://policies.google.com/technologies/cookies)).\n* **Stripe.** When you pay, or manage your passes or your card, you leave our site for Stripe's own page. Stripe sets its own cookies there, to take payments and prevent fraud, under its own policy ([Stripe's privacy policy](https://stripe.com/gb/privacy)). We never see or store your card number."
        ]
      },
      {
        "title": "What we don't use",
        "paragraphs": [
          "We don't use advertising cookies, analytics, visitor tracking, social media buttons or tracking pixels, or anything that follows you from one website to another. The links to our social media pages are ordinary links: nothing is sent to those sites unless you follow one."
        ]
      },
      {
        "title": "Your choices",
        "paragraphs": [
          "You can see and delete what the site keeps from your browser's settings (look for \"cookies and site data\", or \"site data\"). If you delete the sign-in item you will be signed out, and if you delete the cart item your cart will be empty. You can also block fonts or videos from other companies using your browser or an extension: the site will still work, though some of the lettering may look different."
        ]
      },
      {
        "title": "If this changes",
        "paragraphs": [
          "If we add anything that needs your permission, we will ask first, and we will update this page and the date at the top. If you have a question about any of this, use the contact details on our [Contact page](/page/contact)."
        ]
      }
    ]
  }
]

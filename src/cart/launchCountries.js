// The countries a customer can have a print delivered to, free. This one list is used by the checkout (to limit the
// delivery address) and by the cart page (to say where delivery is free).
//
// To add a country: first check what Creative Hub charges to send a print there (Connections and delivery costs on the
// publish page). Only add it if you still keep a healthy margin with free delivery. The far countries (Australia, New
// Zealand, Japan, Singapore, the UAE, South Africa, Brazil and so on) leave only about 9 to 10 percent, so they are not here.
//
// Checked so far: the UK, Ireland, Germany, France, the US and Canada. The rest of Europe is waiting for its check.
export const LAUNCH_COUNTRIES = ['GB', 'IE', 'DE', 'FR', 'US', 'CA']

// IMPORT TAXES (decided by Gill, 21 October 2026: "a for launch"). Creative Hub makes each print in the region it is delivered to (the UK, Germany for the EU, the US),
// and a print made and delivered inside the same region carries no import taxes or customs charges. Canada is the one launch country that is not like that: its prints are
// made in the US and cross the border, so the buyer may be charged Canadian import tax and a courier handling fee on delivery. Duty-paid delivery (DDP) is left OFF for Canada
// for launch, so the buyer is told plainly, before paying, in every place that matters (the print page, the cart, and Stripe's address step). Switching DDP on later is
// SFW-16; add a country here that is NOT in MADE_IN_REGION and test/import-tax-note.test.js fails until its import tax wording has been decided.
export const MADE_IN_REGION = ['GB', 'IE', 'DE', 'FR', 'US'] // delivered from a studio in the same region: no import taxes
export const IMPORT_TAX_COUNTRIES = LAUNCH_COUNTRIES.filter((code) => !MADE_IN_REGION.includes(code))
export const IMPORT_TAX_NOTE = "Delivering to Canada: your country's import tax and a courier handling fee may be charged when the parcel arrives. They are not included in our prices. Orders to the UK, Ireland, Germany, France and the US have none."

// HOW COUNTRIES READ IN A SENTENCE: "the UK, Ireland, Germany, France, the United States and Canada". ONE helper, used by the cart and by the print pages, so the two can never say different things.
const SAID_AS = { GB: 'the UK', US: 'the United States' }
const WITH_THE = ['NL', 'AE', 'PH'] // countries that take "the" before their name (the Netherlands, the United Arab Emirates, the Philippines)
export function countryList(codes) {
  const names = new Intl.DisplayNames(['en'], { type: 'region' })
  const list = codes.map((c) => SAID_AS[c] || (WITH_THE.includes(c) ? `the ${names.of(c)}` : names.of(c)))
  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.join('')
}

// THE DELIVERY LINE under Add to cart on every print page (SFW-9, decided by Gill on 22 October 2026: "tracked, plus the limit"). Built from the same list as the checkout, so it changes
// itself when a country is added (SFW-187). It deliberately says NOTHING about how long delivery takes: Creative Hub has confirmed tracking on every order and one figure for everywhere
// (6 to 10 working days, making and delivering together), but has not yet answered for Europe, the US and Canada separately (SFW-17). Add a timing only when they have.
export const DELIVERY_LINE = `Free tracked delivery to ${countryList(LAUNCH_COUNTRIES)}. We can't deliver anywhere else yet.`

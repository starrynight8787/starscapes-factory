// WHAT IT COSTS A CUSTOMER TO SEND BACK A LARGE FRAMED PRINT: NOTHING (Gill, 22 October 2026, legal review decision D5). For framed prints in the large sizes Gill arranges the return and pays for it, and
// the customer emails first so it can be organised. "Large" means the acrylic-glazed sizes (A1, 60 x 80 cm and 70 x 100 cm), taken from the SAME list the print pages use, so this wording cannot drift from
// the real sizes. The Returns page and the order confirmation email both use this one sentence, and test/legal-update.test.jsx checks it. The customer must be told BEFORE ordering, so the checkout's
// returns summary (SFW-14) must say it too. Imported with its .js ending because the order email code runs on the server.
import { ACRYLIC_SIZES_CM } from '../artloft/printDetails.js'

const said = ([w, h]) => (w === 59.4 && h === 84.1 ? 'A1' : `${w} x ${h} cm`)
const list = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items.join(''))

export const LARGE_FRAMED_SIZES = list(ACRYLIC_SIZES_CM.map(said))
export const LARGE_FRAMED_RETURN = `For framed prints in the large sizes (${LARGE_FRAMED_SIZES}), we will arrange the return for you and pay for it, so please don't send one back yourself. For every other print you pay the cost of sending it back`

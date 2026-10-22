// The delivery line under Add to cart on every print page (SFW-9, decided 22 October 2026: "tracked, plus the limit"), and the one helper that writes the country list for it and for the cart.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { PRINT_FACTS } from '../src/artloft/artLoftData.js'
import { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE, DELIVERY_LINE, countryList } from '../src/cart/launchCountries.js'

const read = (p) => fs.readFileSync(p, 'utf8')
const SAID = 'Free tracked delivery to the UK, Ireland, Germany, France, the United States and Canada. We can\'t deliver anywhere else yet.'

describe('the line itself', () => {
  it('says exactly what Gill chose: free, tracked, the six countries, and that nowhere else is delivered to yet', () => {
    expect(LAUNCH_COUNTRIES).toEqual(['GB', 'IE', 'DE', 'FR', 'US', 'CA']) // if this changes, the sentence changes with it, and this line should be re-read
    expect(DELIVERY_LINE).toBe(SAID)
  })
  it('is one of the facts under Add to cart on every print, in the old line\'s place (before the Canada import-tax note)', () => {
    expect(PRINT_FACTS).toContain(DELIVERY_LINE)
    expect(PRINT_FACTS.indexOf(DELIVERY_LINE)).toBeLessThan(PRINT_FACTS.indexOf(IMPORT_TAX_NOTE))
  })
  it('the old out-of-date line is gone: nothing says delivery is worked out at a checkout that "opens soon"', () => {
    expect(PRINT_FACTS.join(' ')).not.toMatch(/opens soon|shown at checkout/i)
    expect(read('src/artloft/artLoftData.js')).not.toMatch(/which opens soon/)
  })
  it('makes no promise about HOW LONG delivery takes, because Creative Hub has not yet given figures for Europe, the US and Canada separately (SFW-17)', () => {
    expect(DELIVERY_LINE).not.toMatch(/\d|days|weeks|working|within|usually|arrive/i)
  })
  it('promises tracking (Creative Hub confirmed in writing on 20 October that every order has it) and free delivery', () => {
    expect(DELIVERY_LINE).toMatch(/^Free tracked delivery to /)
  })
})

describe('it cannot drift from the real list of countries', () => {
  it('is built from LAUNCH_COUNTRIES: it names every launch country, and only those', () => {
    for (const name of ['the UK', 'Ireland', 'Germany', 'France', 'the United States', 'Canada']) expect(DELIVERY_LINE).toContain(name)
    for (const other of ['Australia', 'Japan', 'Spain', 'Italy', 'Netherlands']) expect(DELIVERY_LINE).not.toContain(other)
  })
  it('the cart and the print pages use the same helper, so they always say the same thing (the cart no longer has its own)', () => {
    const cart = read('src/cart/CartPage.jsx')
    expect(cart).toMatch(/import \{[^}]*\bcountryList\b[^}]*\} from '\.\/launchCountries'/)
    expect(cart).not.toMatch(/function countryList/); expect(cart).not.toMatch(/Intl\.DisplayNames/)
    expect(cart).toContain('Delivery is free to {countryList(LAUNCH_COUNTRIES)}')
    expect(`Delivery is free to ${countryList(LAUNCH_COUNTRIES)}.`).toBe('Delivery is free to the UK, Ireland, Germany, France, the United States and Canada.')
  })
  it('print pages take their facts from the data file, and that file takes the line from the shared one (no second copy of the sentence)', () => {
    expect(read('src/artloft/PrintPage.jsx')).toMatch(/PRINT_FACTS\.map/)
    const data = read('src/artloft/artLoftData.js')
    expect(data).toMatch(/import \{ IMPORT_TAX_NOTE, DELIVERY_LINE \} from '\.\.\/cart\/launchCountries'/); expect(data).not.toMatch(/Free tracked delivery/)
  })
})

describe('the helper reads naturally for any list, so adding a country later (SFW-187) still gives a good sentence', () => {
  it('one country, two countries, and many', () => {
    expect(countryList(['IE'])).toBe('Ireland'); expect(countryList(['IE', 'CA'])).toBe('Ireland and Canada'); expect(countryList(['GB', 'IE', 'CA'])).toBe('the UK, Ireland and Canada')
  })
  it('puts "the" before the countries that take it, and keeps the order it is given', () => {
    expect(countryList(['NL', 'AE', 'PH'])).toBe('the Netherlands, the United Arab Emirates and the Philippines')
    expect(countryList(['AU', 'JP'])).toBe('Australia and Japan'); expect(countryList(['CA', 'IE'])).toBe('Canada and Ireland')
  })
  it('an empty list gives nothing rather than breaking', () => { expect(countryList([])).toBe('') })
})

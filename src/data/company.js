// The company details the law asks a website to show. They live in ONE place: change them here. The footer, the legal pages and the accessibility statement all read them.
// PLEASE CHECK the name and the registered office against the Companies House record, and the VAT number on HMRC's VAT number checker, before launch (SFW-185).
// (The registered office is the forwarding address that returns are sent to, decided 17 October 2026.)
export const COMPANY = {
  name: 'Starscapes Factory Ltd',
  number: '14173440',
  registeredOffice: '71-75 Shelton Street, Covent Garden, London WC2H 9JQ',
  registeredIn: 'England and Wales',
  vat: 'GB445903680',
  printer: 'Printspace Studios Limited',
}

export const companyLine = (c = COMPANY) => `${c.name}. Company number ${c.number}. Registered office: ${c.registeredOffice}. Registered in ${c.registeredIn}. VAT number ${c.vat}.`
export const printerLine = (c = COMPANY) => `Prints are made to order by ${c.printer}.`

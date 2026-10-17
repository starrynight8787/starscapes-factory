// The rules for original paintings: what the form accepts, and how a piece is described.
// An original is one of a kind. It lives in the same products table as the prints, marked fulfilment = 'hand' (you send it yourself).

import { CONTACT_EMAIL } from '../data/contact'

// The originals page uses the site's one contact address, so it can never drift from the others.
export const ENQUIRY_EMAIL = CONTACT_EMAIL
export const MAX_PHOTOS = 8
export const MAX_PHOTO_MB = 6
export const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024
export const MAX_PRICE = 100000

export const isSold = (original) => Boolean(original) && original.status === 'sold'

// "1,200", "£1200" and " 42.5 " are all fine. Anything else is not a number. Returns null if empty, NaN if not a number.
function toNumber(value) {
  const text = String(value ?? '').replace(/[£,\s]/g, '')
  if (text === '') return null
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN
}

const trimNumber = (n) => String(Math.round(Number(n) * 100) / 100)

// Read the add/edit form. Returns { values, errors }: values is what to save, errors says what to fix (in plain words) and is empty if all is well.
export function readOriginalForm(form, { collections = [], now = new Date() } = {}) {
  const errors = {}
  const text = (v) => String(v ?? '').trim()

  const title = text(form.title)
  if (!title) errors.title = 'Please give it a title.'
  else if (title.length > 120) errors.title = 'Please keep the title under 120 characters.'

  const collection = text(form.collection)
  if (collection && !collections.includes(collection)) errors.collection = 'Please choose one of the collections, or none.'

  const price = toNumber(form.price)
  if (price === null) errors.price = 'Please say what it costs.'
  else if (!Number.isFinite(price) || price <= 0) errors.price = 'The price must be a number above zero, like 1200.'
  else if (price > MAX_PRICE) errors.price = `Please check the price. The most this page accepts is £${MAX_PRICE.toLocaleString('en-GB')}.`

  const medium = text(form.medium)
  if (medium.length > 120) errors.medium = 'Please keep this under 120 characters.'

  const size = (key, label, max) => {
    const n = toNumber(form[key])
    if (n === null) return null
    if (!Number.isFinite(n) || n <= 0 || n > max) {
      errors[key] = `${label} must be a number above zero, in centimetres.`
      return null
    }
    return Math.round(n * 100) / 100
  }
  const width = size('width_cm', 'The width', 1000)
  const height = size('height_cm', 'The height', 1000)
  const depth = size('depth_cm', 'The depth', 200)
  if (!errors.width_cm && !errors.height_cm && (width === null) !== (height === null)) {
    errors[width === null ? 'width_cm' : 'height_cm'] = 'Please give both the width and the height, or leave both empty.'
  }

  let year = null
  const yearText = text(form.year)
  if (yearText !== '') {
    const y = Number(yearText)
    if (!/^\d{4}$/.test(yearText) || y < 1900 || y > now.getFullYear()) errors.year = `Please give a four-digit year, between 1900 and ${now.getFullYear()}.`
    else year = y
  }

  const framedText = text(form.framed)
  const framed = framedText === 'yes' ? true : framedText === 'no' ? false : null

  const description = text(form.description)
  if (description.length > 3000) errors.description = 'Please keep the description under 3,000 characters.'

  const images = Array.isArray(form.images) ? form.images.filter((u) => typeof u === 'string' && u) : []
  if (images.length > MAX_PHOTOS) errors.images = `An original can have up to ${MAX_PHOTOS} photos.`

  return {
    errors,
    values: {
      title,
      collection: collection || null,
      price: Number.isFinite(price) ? Math.round(price * 100) / 100 : null,
      medium: medium || null,
      width_cm: width,
      height_cm: height,
      depth_cm: depth,
      year,
      framed,
      description,
      images,
    },
  }
}

// Check photos before anything is uploaded. "existing" is how many the piece already has. Returns an error in plain words, or '' if all is well.
export function checkPhotos(files, existing = 0) {
  const list = Array.from(files || [])
  if (existing + list.length > MAX_PHOTOS) return `An original can have up to ${MAX_PHOTOS} photos, and it has ${existing} already.`
  for (const f of list) {
    if (!f || !/^image\//.test(f.type || '')) return `"${(f && f.name) || 'That file'}" is not a picture. Please choose photos only.`
    if (f.size > MAX_PHOTO_BYTES) return `"${f.name}" is ${(f.size / 1024 / 1024).toFixed(1)} MB. Please make each photo smaller than ${MAX_PHOTO_MB} MB.`
  }
  return ''
}

// "42 × 59 cm", or "42 × 59 × 3 cm" if it has a depth, or '' if the size is not known
export function sizeText(o) {
  if (!o || !o.width_cm || !o.height_cm) return ''
  const parts = [o.width_cm, o.height_cm]
  if (o.depth_cm) parts.push(o.depth_cm)
  return `${parts.map(trimNumber).join(' × ')} cm`
}

// The facts shown on an original's page, in order, leaving out whatever is not known
export function detailLines(o) {
  const lines = []
  if (o.medium) lines.push(o.medium)
  const size = sizeText(o)
  if (size) lines.push(size)
  if (o.year) lines.push(`Painted in ${o.year}`)
  if (o.framed === true) lines.push('Framed')
  if (o.framed === false) lines.push('Unframed')
  return lines
}

// The email a buyer sends while originals cannot be bought online yet
export function enquiryHref(o) {
  return `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(`Enquiry about ${o.title}`)}`
}

// Available pieces first, then sold ones, each in title order
export function sortOriginals(list) {
  return list.slice().sort((a, b) => {
    const s = Number(isSold(a)) - Number(isSold(b))
    return s !== 0 ? s : String(a.title).localeCompare(String(b.title))
  })
}

export const originalsIn = (collectionName, originals) => originals.filter((o) => o.collection === collectionName)

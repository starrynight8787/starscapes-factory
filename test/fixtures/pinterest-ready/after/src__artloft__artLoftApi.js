// All the talking to the database for the Art Loft lives here.
import { supabase } from '../supabaseClient'

const COLUMNS = 'id, title, description, price, collection, images, published, author_id'
// A print's readable address ("behind-the-curtain"), set once by sql/print-slugs.sql. Every call below also works when that column is not in the database yet.
const WITH_SLUG = `${COLUMNS}, slug`
const NEW_COLUMN_MISSING = /slug|image_url/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value) => UUID.test(String(value === null || value === undefined ? '' : value))

// Every print the signed-in person is allowed to see.
// Visitors get only published prints. You, signed in, also get your own drafts.
// Pass { withPictures: true } to also get the little bit of each size and frame that a grid needs to show the framed picture.
export async function fetchPrints({ withPictures = false } = {}) {
  const run = (columns) =>
    supabase.from('products').select(columns).eq('fulfilment', 'creativehub').order('title', { ascending: true })
  const pictures = withPictures ? ', product_variants(framed, image_url, position)' : ''
  // If the address column or the picture column has not been added to the database yet, still show the grid, with what is there
  const attempts = [`${WITH_SLUG}${pictures}`, `${COLUMNS}${pictures}`, ...(withPictures ? [WITH_SLUG, COLUMNS] : [])]
  let last = null
  for (const columns of attempts) {
    const { data, error } = await run(columns)
    if (!error) return data || []
    last = error
    if (!NEW_COLUMN_MISSING.test(error.message || '')) break
  }
  throw last
}

const VARIANT_COLUMNS = 'id, label, size_label, width_mm, height_mm, framed, frame_colour, price, position'

function selectPrint(key, withPictures, withSlug) {
  const variantColumns = withPictures ? `${VARIANT_COLUMNS}, image_url` : VARIANT_COLUMNS
  return supabase
    .from('products')
    .select(`${withSlug ? WITH_SLUG : COLUMNS}, product_variants(${variantColumns})`)
    .eq(isUuid(key) ? 'id' : 'slug', key)
    .eq('fulfilment', 'creativehub')
    .maybeSingle()
}

// One print with all of its sizes and frames, and Creative Hub's picture of each one. The key is the print's readable address (its slug) or its long id.
export async function fetchPrint(key) {
  let data = null
  let error = null
  // If the picture column or the address column has not been added to the database yet, show the print without them rather than failing
  for (const [withPictures, withSlug] of [[true, true], [true, false], [false, true], [false, false]]) {
    if (!isUuid(key) && !withSlug) return null // a readable address cannot be looked up without its column: there is nothing to find yet
    ;({ data, error } = await selectPrint(key, withPictures, withSlug))
    if (!error) break
    if (!NEW_COLUMN_MISSING.test(error.message || '')) break
  }
  if (error) throw error
  if (!data) return null
  const variants = (data.product_variants || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return { ...data, product_variants: variants }
}

// Publish or hide one or more prints. Only your own prints can be changed.
export async function setPublished(ids, published) {
  const { error } = await supabase.from('products').update({ published }).in('id', ids)
  if (error) throw error
}

// Save your own description of one print ('' clears it). Only your own prints can be changed.
export async function setDescription(id, description) {
  const { error } = await supabase.from('products').update({ description }).eq('id', id)
  if (error) throw error
}

// Move one print into a collection ('' means no collection). Only your own prints can be changed.
export async function setCollection(id, collection) {
  const { error } = await supabase.from('products').update({ collection }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------------------------
// Original paintings. They live in the same products table as the prints, marked fulfilment = 'hand' (you send them yourself).
// ---------------------------------------------------------------------------------------------
const ORIGINAL_COLUMNS = `${COLUMNS}, status, sold_at, medium, width_cm, height_cm, depth_cm, year, framed`
const PHOTO_BUCKET = 'post-images' // the same public bucket the blog photos use; your files go in a folder named after your sign-in

export const MISSING_ORIGINAL_COLUMNS =
  'Originals need a few new columns in the database first. Open the Supabase SQL editor, run the file sql/originals.sql, then reload this page.'

// If the new columns are not in the database yet, say what to do rather than showing a database error
function originalsError(error) {
  const text = (error && error.message) || ''
  if (/(status|sold_at|medium|width_cm|height_cm|depth_cm|year|framed)/i.test(text) && /(column|does not exist|schema cache)/i.test(text)) {
    return new Error(MISSING_ORIGINAL_COLUMNS)
  }
  return error
}

// Every original the signed-in person may see. Visitors get only published ones; you, signed in, also get your own drafts.
export async function fetchOriginals() {
  const { data, error } = await supabase.from('products').select(ORIGINAL_COLUMNS).eq('fulfilment', 'hand').order('title', { ascending: true })
  if (error) throw originalsError(error)
  return data || []
}

export async function fetchOriginal(id) {
  const { data, error } = await supabase.from('products').select(ORIGINAL_COLUMNS).eq('id', id).eq('fulfilment', 'hand').maybeSingle()
  if (error) throw originalsError(error)
  return data || null
}

// Save an original: a new one (no id) is saved as a draft, an existing one is updated. Returns its id.
export async function saveOriginal(values, { id = null, userId = null } = {}) {
  if (id) {
    const { error } = await supabase.from('products').update(values).eq('id', id)
    if (error) throw originalsError(error)
    return id
  }
  const { data, error } = await supabase
    .from('products')
    .insert({ ...values, fulfilment: 'hand', published: false, status: 'available', author_id: userId })
    .select('id')
    .single()
  if (error) throw originalsError(error)
  return data.id
}

// Mark an original sold, or available again. Only your own can be changed.
export async function setSold(id, sold) {
  const { error } = await supabase.from('products').update({ status: sold ? 'sold' : 'available', sold_at: sold ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw originalsError(error)
}

// Delete an original. Only a draft can be deleted, so a piece that has been shown or sold can never be lost by a slip.
export async function deleteOriginal(id) {
  const { error } = await supabase.from('products').delete().eq('id', id).eq('published', false)
  if (error) throw error
}

// Upload photos into your own folder. Returns each one's place and public address: [{ path, url }].
// If one fails, the ones already uploaded are removed again, so nothing is left behind.
export async function uploadOriginalPhotos(files, userId, onProgress = () => {}) {
  const list = Array.from(files)
  const done = []
  try {
    for (let i = 0; i < list.length; i += 1) {
      const file = list[i]
      const ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg').slice(0, 5)
      const path = `${userId}/originals/${Date.now()}-${i}.${ext}`
      onProgress(i + 1, list.length)
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw new Error(`Photo ${i + 1} did not upload (${error.message}).`)
      done.push(path)
    }
  } catch (e) {
    if (done.length) await supabase.storage.from(PHOTO_BUCKET).remove(done).catch(() => {})
    throw e
  }
  return done.map((path) => ({ path, url: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl }))
}

// Remove photos that were uploaded but not saved with a piece (for example, because the save failed). Best effort: never throws.
export async function discardOriginalPhotos(paths) {
  if (!paths || !paths.length) return
  try {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  } catch (e) {
    /* a leftover file is harmless; the save already failed and the person has been told */
  }
}

// The owner-only pages (Creative Hub, Stripe, delivery costs) only answer to your sign-in, so every request carries it.
// They only exist on the live site, because that is where the keys live.
async function ownerGet(path) {
  const { data } = await supabase.auth.getSession()
  const token = data && data.session && data.session.access_token
  if (!token) throw new Error('Please sign in again, then try this once more.')
  let res
  try {
    res = await fetch(path, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
  } catch (e) {
    throw new Error('Could not reach the site to ask. Check your connection and try again.')
  }
  let body = null
  try {
    body = await res.json()
  } catch (e) {
    throw new Error("This only works on the live site, because the keys live there. Open starscapesfactory.com/art-loft/admin and try it there.")
  }
  if (!body || typeof body !== 'object') throw new Error('That did not give a sensible answer. Try again in a minute.')
  if (body.ok === false) throw new Error(body.message || 'That did not work. Try again in a minute.')
  return body
}

// The list of pictures from Creative Hub, as { variant_id, url }. This only exists on the live site,
// because that is where the Creative Hub key lives.
export async function fetchPictureList() {
  const body = await ownerGet('/api/creativehub-check?view=variant-pictures-json')
  if (body.ok !== true || !Array.isArray(body.pictures)) throw new Error(body.message || 'Creative Hub did not send the pictures. Try again in a minute.')
  return body
}

// Save one size and frame's picture. Returns true if a size in your shop matched it.
export async function savePicture(variantId, url) {
  const { data, error } = await supabase.from('product_variants').update({ image_url: url }).eq('creativehub_variant_id', variantId).select('id')
  if (error) throw error
  return Array.isArray(data) && data.length > 0
}

export async function currentUser() {
  const { data } = await supabase.auth.getSession()
  return data && data.session ? data.session.user : null
}

// ---------------------------------------------------------------------------------------------
// Sync with Creative Hub. The comparing lives in sync.js; this is the part that talks to the live site and the database.
// ---------------------------------------------------------------------------------------------
const MISSING_COLUMN =
  'The picture column is not in the database yet. Run this one line in the Supabase SQL editor, then try again: alter table product_variants add column if not exists image_url text;'

// Creative Hub's whole catalogue, from the live site (that is where the Creative Hub key lives)
export async function fetchCatalogue() {
  const body = await ownerGet('/api/creativehub-check?view=catalogue-json')
  if (body.ok !== true || !Array.isArray(body.prints)) throw new Error(body.message || 'Creative Hub did not send its prints. Try again in a minute.')
  return body
}

// Your Creative Hub prints as they are in the shop, with their sizes and frames
export async function fetchShopCatalogue(userId) {
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, title, description, price, images, published, collection, creativehub_product_id, product_variants(id, label, size_label, width_mm, height_mm, framed, frame_colour, price, creativehub_variant_id, creativehub_sku, position, image_url)`
    )
    .eq('fulfilment', 'creativehub')
    .eq('author_id', userId)
  if (error) throw new Error(/image_url/i.test(error.message || '') ? MISSING_COLUMN : error.message || 'Could not read your prints.')
  return data || []
}

// The database calls that applySync uses
export const syncRepo = {
  async insertProduct(row) {
    const { data, error } = await supabase.from('products').insert(row).select('id').single()
    if (error) throw error
    return data.id
  },
  async updateProduct(id, patch) {
    const { error } = await supabase.from('products').update(patch).eq('id', id)
    if (error) throw error
  },
  async deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },
  // Rows with a picture and rows without are saved separately, so a size with no picture never wipes one it already has
  async upsertVariants(rows) {
    for (const group of [rows.filter((r) => r.image_url), rows.filter((r) => !r.image_url)]) {
      if (!group.length) continue
      const { error } = await supabase.from('product_variants').upsert(group, { onConflict: 'creativehub_variant_id' })
      if (error) throw new Error(/image_url/i.test(error.message || '') ? MISSING_COLUMN : error.message)
    }
  },
  async deleteVariants(ids) {
    if (!ids.length) return
    const { error } = await supabase.from('product_variants').delete().in('id', ids)
    if (error) throw error
  },
}

// ---------------------------------------------------------------------------------------------
// The checks and delivery costs on the publish page. All owner-only.
// ---------------------------------------------------------------------------------------------
export const checkCreativeHub = () => ownerGet('/api/creativehub-check')
export const fetchOrders = () => ownerGet('/api/orders')
export const checkStripe = () => ownerGet('/api/stripe-check')
export const fetchDeliveryCheck = (set = 'base') =>
  ownerGet(set === 'base' ? '/api/creativehub-check?view=delivery-check' : `/api/creativehub-check?view=delivery-check&set=${encodeURIComponent(set)}`)

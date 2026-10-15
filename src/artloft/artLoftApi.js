// All the talking to the database for the Art Loft lives here.
import { supabase } from '../supabaseClient'

const COLUMNS = 'id, title, description, price, collection, images, published, author_id'

// Every print the signed-in person is allowed to see.
// Visitors get only published prints. You, signed in, also get your own drafts.
// Pass { withPictures: true } to also get the little bit of each size and frame that a grid needs to show the framed picture.
export async function fetchPrints({ withPictures = false } = {}) {
  const run = (columns) =>
    supabase.from('products').select(columns).eq('fulfilment', 'creativehub').order('title', { ascending: true })
  let { data, error } = await run(withPictures ? `${COLUMNS}, product_variants(framed, image_url, position)` : COLUMNS)
  // If the picture column has not been added to the database yet, still show the grid, with the plain artwork
  if (error && withPictures && /image_url/i.test(error.message || '')) ({ data, error } = await run(COLUMNS))
  if (error) throw error
  return data || []
}

const VARIANT_COLUMNS = 'id, label, size_label, width_mm, height_mm, framed, frame_colour, price, position'

function selectPrint(id, withPictures) {
  const variantColumns = withPictures ? `${VARIANT_COLUMNS}, image_url` : VARIANT_COLUMNS
  return supabase
    .from('products')
    .select(`${COLUMNS}, product_variants(${variantColumns})`)
    .eq('id', id)
    .eq('fulfilment', 'creativehub')
    .maybeSingle()
}

// One print with all of its sizes and frames, and Creative Hub's picture of each one
export async function fetchPrint(id) {
  let { data, error } = await selectPrint(id, true)
  // If the picture column has not been added to the database yet, show the print without those pictures rather than failing
  if (error && /image_url/i.test(error.message || '')) ({ data, error } = await selectPrint(id, false))
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
export const checkStripe = () => ownerGet('/api/stripe-check')
export const fetchDeliveryCheck = (set = 'base') =>
  ownerGet(set === 'base' ? '/api/creativehub-check?view=delivery-check' : `/api/creativehub-check?view=delivery-check&set=${encodeURIComponent(set)}`)

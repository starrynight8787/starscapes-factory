// All the talking to the database for the Art Loft lives here.
import { supabase } from '../supabaseClient'

const COLUMNS = 'id, title, description, price, collection, images, published, author_id'

// Every print the signed-in person is allowed to see.
// Visitors get only published prints. You, signed in, also get your own drafts.
export async function fetchPrints() {
  const { data, error } = await supabase
    .from('products')
    .select(COLUMNS)
    .eq('fulfilment', 'creativehub')
    .order('title', { ascending: true })
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

// Move one print into a collection ('' means no collection). Only your own prints can be changed.
export async function setCollection(id, collection) {
  const { error } = await supabase.from('products').update({ collection }).eq('id', id)
  if (error) throw error
}

export async function currentUser() {
  const { data } = await supabase.auth.getSession()
  return data && data.session ? data.session.user : null
}

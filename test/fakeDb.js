// A small pretend Supabase for the tests that need one (the Art Loft, the originals tool, and the room pages). It behaves like the real one for what those pages ask of it:
//  - visitors (signed out) only see published products and posts
//  - a signed-in author also sees their own drafts of products
//  - only an author can change their own products, sizes and frames
//  - photos can be uploaded to, and removed from, a pretend storage bucket
// The tests flip switches on db.state to make something go wrong (failUpdate, failInsert, failUpload, failPosts, noOriginalColumns, ...).
//
// REBUILT 20 OCTOBER 2026. The first version of this file was never committed, so three test files could not load. It was written again from what those tests ask of it.
export function makeDb() {
  const state = {
    user: null, products: [], variants: [], posts: [], calls: [], selects: [], postSelects: [],
    failUpdate: false, failInsert: false, failPosts: false, noImageColumn: false, noPictureColumn: false, noOriginalColumns: false,
    failVariantIds: [], failProductIds: [], failInsertChIds: [],
    uploads: [], removed: [], storageCalls: [], failUpload: false, failUploadAfter: 0,
  }
  const ORIGINAL_COLUMNS = ['status', 'sold_at', 'medium', 'width_cm', 'height_cm', 'depth_cm', 'year', 'framed']
  const missingOriginalColumn = () => ({ data: null, error: { message: 'column products.status does not exist' } })
  const visible = (p) => p.published || (state.user && p.author_id === state.user.id)

  function builder(table) {
    const q = { table, filters: [], order: null, single: false, patch: null, limit: null }
    const api = {
      select(cols) { q.cols = String(cols || ''); return api },
      eq(col, val) { q.filters.push((r) => r[col] === val); return api },
      neq(col, val) { q.filters.push((r) => r[col] !== val); return api },
      in(col, vals) { q.filters.push((r) => vals.includes(r[col])); return api },
      is(col, val) { q.filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val)); return api },
      order(col, opts = {}) { q.order = [col, opts.ascending !== false]; return api },
      limit(n) { q.limit = n; return api },
      maybeSingle() { q.single = true; return api },
      single() { q.single = true; return api },
      insert(row) { q.insert = row; return api },
      delete() { q.del = true; return api },
      upsert(rows, opts = {}) { q.upsert = { rows: Array.isArray(rows) ? rows : [rows], onConflict: opts.onConflict }; return api },
      update(patch) { q.patch = patch; return api },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
    }
    function run() {
      state.calls.push({ table, patch: q.patch })
      const owns = (productId) => { const pr = state.products.find((x) => x.id === productId); return Boolean(state.user && pr && pr.author_id === state.user.id) }

      // ---- posts: a visitor asks for the posts of a room ----
      if (table === 'posts') {
        state.postSelects.push(q.cols || '')
        if (state.failPosts) return { data: null, error: { message: 'could not load the posts' } }
        let rows = state.posts.filter((r) => q.filters.every((f) => f(r)))
        if (q.order) rows = rows.slice().sort((a, b) => String(a[q.order[0]]).localeCompare(String(b[q.order[0]])) * (q.order[1] ? 1 : -1))
        if (q.limit) rows = rows.slice(0, q.limit)
        return q.single ? { data: rows[0] || null, error: null } : { data: rows, error: null }
      }

      if (q.insert && table === 'products') {
        const row = q.insert
        if (state.failInsert) return { data: null, error: { message: 'network blip' } }
        if (state.noOriginalColumns && Object.keys(row).some((k) => ORIGINAL_COLUMNS.includes(k))) return missingOriginalColumn()
        if (state.failInsertChIds.includes(row.creativehub_product_id)) return { data: null, error: { message: 'network blip' } }
        if (!state.user || row.author_id !== state.user.id) return { data: null, error: { message: 'new row violates row-level security policy for table "products"' } }
        const created = { fulfilment: 'creativehub', ...row, id: `new-${state.products.length + 1}` }
        state.products.push(created)
        return { data: q.cols ? { id: created.id } : null, error: null }
      }
      if (q.upsert && table === 'product_variants') {
        if (q.upsert.rows.some((r) => state.failProductIds.includes(r.product_id))) return { data: null, error: { message: 'network blip' } }
        if (state.noPictureColumn && q.upsert.rows.some((r) => 'image_url' in r)) return { data: null, error: { message: 'column "image_url" of relation "product_variants" does not exist' } }
        for (const r of q.upsert.rows) {
          if (!owns(r.product_id)) return { data: null, error: { message: 'new row violates row-level security policy for table "product_variants"' } }
          const existing = state.variants.find((v) => v.creativehub_variant_id === r.creativehub_variant_id)
          if (existing) Object.assign(existing, r) // only the columns that were sent
          else state.variants.push({ id: `v-new-${state.variants.length + 1}`, image_url: null, ...r })
        }
        return { data: null, error: null }
      }
      if (q.del) {
        if (table === 'products') {
          const hit = state.products.filter((x) => q.filters.every((f) => f(x)) && owns(x.id))
          if (hit.some((x) => state.failProductIds.includes(x.id))) return { data: null, error: { message: 'network blip' } }
          const ids = hit.map((x) => x.id)
          state.products = state.products.filter((x) => !ids.includes(x.id))
          state.variants = state.variants.filter((v) => !ids.includes(v.product_id)) // sizes go with their print
        } else if (table === 'product_variants') {
          const gone = state.variants.filter((v) => q.filters.every((f) => f(v)) && owns(v.product_id))
          state.variants = state.variants.filter((v) => !gone.includes(v))
        }
        return { data: null, error: null }
      }
      if (q.patch && table === 'products' && q.filters.length && state.products.filter((x) => q.filters.every((f) => f(x))).some((x) => state.failProductIds.includes(x.id))) return { data: null, error: { message: 'network blip' } }
      if (q.patch && table === 'product_variants') {
        if (state.noPictureColumn && 'image_url' in q.patch) return { data: null, error: { message: 'column "image_url" of relation "product_variants" does not exist' } }
        const hit = state.variants.filter((v) => q.filters.every((f) => f(v)))
        if (hit.some((v) => state.failVariantIds.includes(v.creativehub_variant_id))) return { data: null, error: { message: 'network blip' } }
        // like your database: you can only change the sizes and frames of prints you own
        const mine = hit.filter((v) => { const pr = state.products.find((x) => x.id === v.product_id); return state.user && pr && pr.author_id === state.user.id })
        mine.forEach((v) => Object.assign(v, q.patch))
        return { data: q.cols ? mine.map((v) => ({ id: v.id })) : null, error: null }
      }
      if (q.patch) {
        if (state.failUpdate) return { data: null, error: { message: 'boom' } }
        if (state.noOriginalColumns && Object.keys(q.patch).some((k) => ORIGINAL_COLUMNS.includes(k))) return missingOriginalColumn()
        state.products.forEach((p) => {
          if (q.filters.every((f) => f(p)) && state.user && p.author_id === state.user.id) Object.assign(p, q.patch)
        })
        return { data: null, error: null }
      }
      if (table !== 'products') return { data: [], error: null }
      state.selects.push(q.cols || '')
      if (state.noImageColumn && (q.cols || '').includes('image_url')) return { data: null, error: { message: 'column product_variants_1.image_url does not exist' } }
      // (only the product's own columns count: the sizes and frames nested inside it have a "framed" of their own)
      const ownCols = (q.cols || '').replace(/product_variants\s*\([^)]*\)/g, '')
      if (state.noOriginalColumns && ORIGINAL_COLUMNS.some((c) => new RegExp(`\\b${c}\\b`).test(ownCols))) return missingOriginalColumn()
      let rows = state.products.filter(visible).filter((r) => q.filters.every((f) => f(r)))
      if (q.order) rows = rows.slice().sort((a, b) => String(a[q.order[0]]).localeCompare(String(b[q.order[0]])) * (q.order[1] ? 1 : -1))
      const withPic = !(q.cols || '').includes('image_url')
      rows = rows.map((r) => ({ ...r, product_variants: state.variants.filter((v) => v.product_id === r.id).map((v) => { if (withPic) { const { image_url, ...rest } = v; return rest } return v }) }))
      return q.single ? { data: rows[0] || null, error: null } : { data: rows, error: null }
    }
    return api
  }

  // a pretend storage bucket: uploads are listed in state.uploads, removals in state.removed
  const storage = {
    from: (bucket) => ({
      async upload(path, file, opts) {
        state.storageCalls.push({ op: 'upload', bucket, path })
        if (state.failUpload && state.uploads.length >= state.failUploadAfter) return { data: null, error: { message: 'storage is full' } }
        state.uploads.push({ bucket, path, type: opts && opts.contentType })
        return { data: { path }, error: null }
      },
      async remove(paths) {
        state.storageCalls.push({ op: 'remove', bucket, paths })
        const list = Array.isArray(paths) ? paths : [paths]
        list.forEach((p) => state.removed.push(p))
        state.uploads = state.uploads.filter((u) => !list.includes(u.path))
        return { data: list.map((name) => ({ name })), error: null }
      },
      getPublicUrl(path) { return { data: { publicUrl: `https://files.example/${bucket}/${path}` } } },
    }),
  }

  const supabase = {
    from: builder,
    storage,
    auth: { getSession: async () => ({ data: { session: state.user ? { user: state.user, access_token: 'test-token' } : null } }) },
  }
  return { state, supabase }
}

const OWNER = { id: 'owner-1', email: 'gillian@gillianbennet.com' }
export const owner = OWNER

// 8 variants like the real catalogue: four sizes, each unframed and oak-framed
const SIZES = [['21x30cm', 89, 164], ['30x40cm', 149, 224], ['42x59cm', 249, 324], ['60x80cm', 399, 474]]

// The prints: two in Calm Series, two (and a draft) in Out of this World, none in Unique One of a Kind (which holds only an original), and one in no collection yet
export function seed(db) {
  const mk = (id, title, collection, published, image = `https://img.example/${id}.jpg`) => ({ id, title, collection, published, price: 89, description: '', images: image ? [image] : [], author_id: OWNER.id, fulfilment: 'creativehub', creativehub_product_id: `chp-${id}` })
  db.state.products = [
    mk('p1', 'Neon Lights', 'Calm Series', true),
    mk('p2', 'Forests', 'Calm Series', true),
    mk('p3', 'Behind the Curtain', 'Out of this World', true),
    mk('p4', 'Tops of Jupiter', 'Out of this World', true),
    mk('p5', 'Unfinished Sketch', 'Out of this World', false),
    mk('p6', 'Not Placed Yet', null, true),
  ]
  db.state.variants = db.state.products.flatMap((p) => SIZES.flatMap(([size, plain, framed]) => [
    { id: `${p.id}-${size}-plain`, product_id: p.id, size, framed: false, price: plain, creativehub_variant_id: `chv-${p.id}-${size}-plain`, image_url: null },
    { id: `${p.id}-${size}-oak`, product_id: p.id, size, framed: true, price: framed, creativehub_variant_id: `chv-${p.id}-${size}-oak`, image_url: null },
  ]))
}

// Original paintings (fulfilment 'hand'): Rainforest for sale (Calm Series), Quilt sold (Unique One of a Kind, which holds only originals), and Storm, a draft with no photo yet that only the owner sees.
// Add them after seed().
export function seedOriginals(db) {
  const original = (id, title, extra) => ({ id, title, collection: 'Originals', published: true, price: 0, description: '', images: [`https://img.example/${id}.jpg`], author_id: OWNER.id, fulfilment: 'hand', status: 'available', sold_at: null, medium: 'Acrylic on canvas', width_cm: 60, height_cm: 80, depth_cm: 3, year: 2024, framed: false, ...extra })
  db.state.products.push(
    original('o1', 'Rainforest', { collection: 'Calm Series', price: 1200, description: 'A big, bright one.', images: ['https://img.example/o1.jpg', 'https://img.example/o1b.jpg'] }),
    original('o2', 'Quilt', { collection: 'Unique One of a Kind', price: 850, status: 'sold', sold_at: '2026-10-14T10:00:00Z', width_cm: 40, height_cm: 50, depth_cm: 2 }),
    original('o3', 'Storm', { collection: 'Calm Series', price: 600, published: false, images: [], width_cm: 30, height_cm: 30, depth_cm: 2 }),
  )
}

// Posts for the room pages: published ones in several rooms, a draft, one in another room with a matching tag, and one with no tags
export function seedRoomPosts(db) {
  const post = (id, channel, title, created_at, tags, extra = {}) => ({ id, channel, title, created_at, tags, published: true, image_url: null, ...extra })
  db.state.posts = [
    post('h-1', 'idea-hatchery', 'Ten prompts for a wet Tuesday', '2026-10-12T10:00:00Z', ['writing-prompts', 'stop-motion']),
    post('h-2', 'idea-hatchery', 'A tiny world in clay', '2026-10-05T10:00:00Z', ['Stop Motion']),
    post('h-3', 'idea-hatchery', 'The lighthouse keeper', '2026-10-08T10:00:00Z', ['short-stories']),
    post('h-4', 'idea-hatchery', 'The unfinished one', '2026-10-09T10:00:00Z', ['short-stories'], { published: false }),
    post('h-5', 'idea-hatchery', 'A post with no tags', '2026-10-07T10:00:00Z', []),
    post('d-1', 'drafting-desk', 'A desk post', '2026-10-10T10:00:00Z', ['short-stories']),
    post('l-1', 'leadership-lounge', 'What the middle is for', '2026-10-09T10:00:00Z', ['leading-from-the-middle'], { image_url: 'https://files.example/post-images/l-1.jpg' }),
    post('l-2', 'leadership-lounge', 'A note on meetings', '2026-10-14T10:00:00Z', []),
    post('e-1', 'explorers-bay', 'Notes from a night train', '2026-10-03T10:00:00Z', ['Writing in Transit']),
    post('e-2', 'explorers-bay', 'The harbour at night', '2026-10-10T10:00:00Z', ['photography'], { image_url: 'https://files.example/post-images/e-2.jpg' }),
    post('e-3', 'explorers-bay', 'A photo with a broken address', '2026-10-02T10:00:00Z', ['photography'], { image_url: 'not-a-web-address' }),
  ]
}

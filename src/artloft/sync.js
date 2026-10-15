// Comparing your shop with Creative Hub, and bringing the two into line.
//
//   planSync   only LOOKS. It works out what would change and changes nothing.
//   applySync  is the only part that writes. It is handed a "repo" (the functions that talk to the database),
//              so it can be tested without a database.
//
// The rules (the same ones as the old import, now with a preview first):
//   - Names, prices, artwork and the sizes and frames follow Creative Hub: change them there, then sync.
//   - Your collections and what is live are never changed on a print that is still at Creative Hub.
//   - A print that is new at Creative Hub is added as a DRAFT.
//   - A print that was re-created at Creative Hub keeps its collection and live status, if its name matches exactly.
//   - A print that is no longer at Creative Hub is hidden if it was live, and removed if it was only a draft.
//     Nothing that is live is ever deleted.

export const normaliseTitle = (title) => String(title || '').toLowerCase().replace(/\s+/g, ' ').trim()

const num = (value) => (value === null || value === undefined || value === '' ? null : Number(value))
const orNull = (value) => (value === undefined || value === '' ? null : value)

export function fromPrice(print) {
  const prices = (print.variants || []).map((v) => v.price).filter((p) => Number.isFinite(p))
  return prices.length ? Math.min(...prices) : 0
}

// One size and frame, as a row for the shop's database. A picture is only included if there is one, so a sync never wipes a picture it already has.
export function variantRow(v, productId, position) {
  return {
    product_id: productId,
    label: v.label,
    size_label: v.size || '',
    width_mm: v.width_mm,
    height_mm: v.height_mm,
    framed: Boolean(v.framed),
    frame_colour: v.framed && v.frame_colour ? v.frame_colour : null,
    price: v.price,
    creativehub_variant_id: v.id,
    creativehub_sku: v.sku || '',
    position,
    ...(v.picture ? { image_url: v.picture } : {}),
  }
}

function variantChanged(shopV, chV, position) {
  return (
    shopV.label !== chV.label ||
    (shopV.size_label || '') !== (chV.size || '') ||
    num(shopV.width_mm) !== num(chV.width_mm) ||
    num(shopV.height_mm) !== num(chV.height_mm) ||
    Boolean(shopV.framed) !== Boolean(chV.framed) ||
    orNull(shopV.frame_colour) !== orNull(chV.frame_colour) ||
    num(shopV.price) !== num(chV.price) ||
    (shopV.creativehub_sku || '') !== (chV.sku || '') ||
    (shopV.position ?? 0) !== position ||
    Boolean(chV.picture && shopV.image_url !== chV.picture)
  )
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// How one print in the shop differs from Creative Hub's version of it
function compare(ch, shop) {
  const shopVariants = Array.isArray(shop.product_variants) ? shop.product_variants : []
  const byId = new Map(shopVariants.map((v) => [v.creativehub_variant_id, v]))
  const chIds = new Set(ch.variants.map((v) => v.id))
  const added = ch.variants.filter((v) => !byId.has(v.id))
  const stale = shopVariants.filter((v) => !chIds.has(v.creativehub_variant_id))
  const kept = ch.variants.map((v, i) => ({ v, i })).filter(({ v }) => byId.has(v.id))
  const changed = kept.filter(({ v, i }) => variantChanged(byId.get(v.id), v, i))
  const onlyPictures = changed.filter(({ v, i }) => !variantChanged({ ...byId.get(v.id), image_url: v.picture || byId.get(v.id).image_url }, v, i))

  const reasons = []
  if (shop.title !== ch.name) reasons.push('name')
  if ((shop.description || '') !== (ch.description || '')) reasons.push('description')
  if (num(shop.price) !== fromPrice(ch)) reasons.push('price')
  if (ch.image && !(Array.isArray(shop.images) && shop.images[0] === ch.image)) reasons.push('artwork')
  if (added.length) reasons.push(`${plural(added.length, 'new size', 'new sizes')}`)
  if (stale.length) reasons.push(`${plural(stale.length, 'old size', 'old sizes')} to remove`)
  if (onlyPictures.length) reasons.push(`${plural(onlyPictures.length, 'picture', 'pictures')}`)
  if (changed.length > onlyPictures.length) reasons.push(`${plural(changed.length - onlyPictures.length, 'size changed', 'sizes changed')}`)
  return { reasons, stale: stale.map((v) => v.id) }
}

const groupBy = (items, keyOf) => {
  const groups = new Map()
  for (const item of items) {
    const key = keyOf(item)
    groups.set(key, [...(groups.get(key) || []), item])
  }
  return groups
}

// What would change? catalogue = Creative Hub's prints (from the live site), shop = your prints and their sizes.
export function planSync(catalogue, shop) {
  const chIds = new Set(catalogue.map((p) => p.id))
  const shopByChId = new Map(shop.filter((s) => s.creativehub_product_id).map((s) => [s.creativehub_product_id, s]))

  const matched = []
  const unmatched = []
  for (const ch of catalogue) {
    const s = shopByChId.get(ch.id)
    if (s) matched.push({ ch, shop: s })
    else unmatched.push(ch)
  }
  const orphans = shop.filter((s) => !chIds.has(s.creativehub_product_id))

  // A print that was re-created at Creative Hub has a new id but the same name. Only match when it is unambiguous both ways.
  const orphansByTitle = groupBy(orphans, (s) => normaliseTitle(s.title))
  const newByTitle = groupBy(unmatched, (p) => normaliseTitle(p.name))
  const replaced = []
  for (const [title, newOnes] of newByTitle) {
    const olds = orphansByTitle.get(title)
    if (title && newOnes.length === 1 && olds && olds.length === 1) replaced.push({ ch: newOnes[0], shop: olds[0] })
  }
  const replacedCh = new Set(replaced.map((r) => r.ch.id))
  const replacedShop = new Set(replaced.map((r) => r.shop.id))

  const refresh = []
  const upToDate = []
  for (const m of matched) {
    const { reasons, stale } = compare(m.ch, m.shop)
    if (reasons.length) refresh.push({ ...m, reasons, stale })
    else upToDate.push(m.shop.title)
  }
  const replace = replaced.map((m) => ({ ...m, reasons: ['re-created at Creative Hub'], stale: compare(m.ch, m.shop).stale }))
  const add = unmatched.filter((p) => !replacedCh.has(p.id)).map((ch) => ({ ch }))
  const gone = orphans.filter((s) => !replacedShop.has(s.id)).map((s) => ({ shop: s, hide: Boolean(s.published) }))

  return {
    prints: catalogue.length,
    upToDate,
    refresh,
    replace,
    add,
    gone,
    hasChanges: refresh.length + replace.length + add.length + gone.length > 0,
  }
}

// Make the changes. repo = { insertProduct, updateProduct, deleteProduct, upsertVariants, deleteVariants }.
// One print going wrong never stops the others; each failure is listed so pressing Sync again can finish the job.
export async function applySync(plan, repo, userId, onProgress = () => {}) {
  const steps = [
    ...plan.refresh.map((s) => ({ kind: 'refresh', ...s })),
    ...plan.replace.map((s) => ({ kind: 'replace', ...s })),
    ...plan.add.map((s) => ({ kind: 'add', ...s })),
    ...plan.gone.map((s) => ({ kind: 'gone', ...s })),
  ]
  const result = { added: 0, refreshed: 0, replaced: 0, hidden: 0, removed: 0, failures: [] }
  const queue = steps.slice()
  let finished = 0

  async function run(step) {
    if (step.kind === 'gone') {
      if (step.hide) {
        await repo.updateProduct(step.shop.id, { published: false })
        result.hidden++
      } else {
        await repo.deleteProduct(step.shop.id)
        result.removed++
      }
      return
    }
    const { ch } = step
    const productFields = {
      title: ch.name,
      description: ch.description || '',
      price: fromPrice(ch),
      ...(ch.image ? { images: [ch.image] } : {}),
    }
    let productId
    if (step.kind === 'add') {
      productId = await repo.insertProduct({
        ...productFields,
        images: ch.image ? [ch.image] : [],
        product_type: 'print',
        collection: '',
        author_id: userId,
        published: false,
        creativehub_product_id: ch.id,
        fulfilment: 'creativehub',
      })
    } else {
      productId = step.shop.id
      await repo.updateProduct(productId, { ...productFields, ...(step.kind === 'replace' ? { creativehub_product_id: ch.id } : {}) })
    }
    await repo.upsertVariants(ch.variants.map((v, i) => variantRow(v, productId, i)))
    // old sizes go last, so a print is never left with none
    if (step.kind !== 'add' && step.stale && step.stale.length) await repo.deleteVariants(step.stale)
    if (step.kind === 'add') result.added++
    else if (step.kind === 'replace') result.replaced++
    else result.refreshed++
  }

  async function worker() {
    while (queue.length) {
      const step = queue.shift()
      try {
        await run(step)
      } catch (e) {
        result.failures.push({ name: step.ch ? step.ch.name : step.shop.title, message: (e && e.message) || 'unknown problem' })
      }
      finished++
      onProgress(finished, steps.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, steps.length) }, worker))
  return result
}

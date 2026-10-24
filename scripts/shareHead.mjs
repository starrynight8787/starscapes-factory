// Turning the page shell into one page's own HTML: its title, description, address and share picture in the head. Plain functions with no
// dependencies, so the build script and the tests use exactly the same code.

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
export const esc = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Everything a page's head may carry that this code writes. Taken out first, so putting a page through twice gives the same result.
const OURS = [
  /\s*<title>[\s\S]*?<\/title>/gi,
  /\s*<meta\s+name="description"[^>]*>/gi,
  /\s*<meta\s+name="robots"[^>]*>/gi,
  /\s*<meta\s+name="theme-color"[^>]*>/gi,
  /\s*<link\s+rel="canonical"[^>]*>/gi,
  /\s*<link\s+rel="icon"[^>]*>/gi,
  /\s*<link\s+rel="apple-touch-icon"[^>]*>/gi,
  /\s*<meta\s+property="og:[^"]*"[^>]*>/gi,
  /\s*<meta\s+name="twitter:[^"]*"[^>]*>/gi,
  /\s*<meta\s+property="product:[^"]*"[^>]*>/gi,
  /\s*<meta\s+name="p:domain_verify"[^>]*>/gi,
  /\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi,
]

export const THEME_COLOUR = '#14306A'
// The tab icon is the shooting star from the banner (src/components/Logo.jsx), drawn once as star.svg and sized for browsers that need a picture file.
export const ICONS = { svg: '/icons/star.svg', png: '/icons/star-32.png', apple: '/icons/apple-touch-icon.png' }

// The size of the pictures in public/share (every one is checked against its real file by test/share-head.test.js). Pictures from anywhere else (a print's own photo)
// are NOT assumed to be this size: their size is read when the site is built (scripts/dynamicPages.mjs), and when it cannot be read no size is stated at all.
export const SHARE_PICTURE_SIZE = { width: 1200, height: 630 }

// Pinterest's code for claiming the website: letters and numbers only. Anything else is ignored (and the build says so) rather than put in a page.
export const PINTEREST_CODE = /^[A-Za-z0-9]{8,64}$/
export const pinterestTag = (code) => (PINTEREST_CODE.test(clean(code)) ? `<meta name="p:domain_verify" content="${esc(clean(code))}" />` : '')

// What a product page may say about the thing it sells. Anything that does not look right means NO product markup at all (the page is then an ordinary page),
// because a wrong price in a pin is worse than no price.
const AVAILABILITY = { InStock: 'instock', OutOfStock: 'out of stock', PreOrder: 'preorder', BackOrder: 'backorder', Discontinued: 'discontinued' }
export function validProduct(p) {
  if (!p || typeof p !== 'object') return false
  return /^\d{1,6}(\.\d{1,2})?$/.test(clean(p.amount)) && Number(p.amount) > 0 && /^[A-Z]{3}$/.test(clean(p.currency)) && Object.hasOwn(AVAILABILITY, clean(p.availability)) &&
    Boolean(clean(p.name)) && Boolean(clean(p.url)) && /^https:\/\//.test(clean(p.image)) && Boolean(clean(p.description))
}

// Schema.org Product markup as one line of JSON for a <script type="application/ld+json">. The words come from the database, so every character that could end the
// script early or confuse a browser is written out as a \u escape: nothing a title says can ever become part of the page's own code.
export function productJsonLd(p) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: clean(p.name),
    url: clean(p.url),
    image: [clean(p.image)],
    description: clean(p.description),
    ...(clean(p.sku) ? { sku: clean(p.sku) } : {}),
    ...(clean(p.brand) ? { brand: { '@type': 'Brand', name: clean(p.brand) } } : {}),
    offers: {
      '@type': 'Offer',
      url: clean(p.url),
      price: clean(p.amount),
      priceCurrency: clean(p.currency),
      availability: `https://schema.org/${clean(p.availability)}`,
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

// meta: { title, description, siteName, url (omit for a page with no address of its own), imageUrl, imageAlt, imageWidth + imageHeight (leave out when not known), index,
//         product (optional: { name, url, image, description, sku, brand, amount, currency, availability }) }
// options.closed: the whole site is closed to search engines (src/data/siteSettings.js), so EVERY page says noindex, nofollow, not only the private ones
// options.pinterestVerify: Pinterest's code for claiming the site (src/data/siteSettings.js); '' (or anything that is not a code) adds nothing
export function renderHead(template, meta, { closed = false, pinterestVerify = '' } = {}) {
  let html = String(template)
  for (const pattern of OURS) html = html.replace(pattern, '')
  const product = validProduct(meta.product) ? meta.product : null
  const sized = Number.isInteger(meta.imageWidth) && Number.isInteger(meta.imageHeight) && meta.imageWidth > 0 && meta.imageHeight > 0
  const lines = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    ...(pinterestTag(pinterestVerify) ? [pinterestTag(pinterestVerify)] : []),
    `<meta name="theme-color" content="${THEME_COLOUR}" />`,
    `<link rel="icon" type="image/svg+xml" href="${ICONS.svg}" />`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${ICONS.png}" />`,
    `<link rel="apple-touch-icon" href="${ICONS.apple}" />`,
    ...(closed ? ['<meta name="robots" content="noindex, nofollow" />'] : meta.index === false ? ['<meta name="robots" content="noindex" />'] : []),
    ...(meta.url ? [`<link rel="canonical" href="${esc(meta.url)}" />`] : []),
    `<meta property="og:type" content="${product ? 'product' : 'website'}" />`,
    `<meta property="og:site_name" content="${esc(meta.siteName)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    ...(meta.url ? [`<meta property="og:url" content="${esc(meta.url)}" />`] : []),
    `<meta property="og:image" content="${esc(meta.imageUrl)}" />`,
    ...(sized ? [`<meta property="og:image:width" content="${meta.imageWidth}" />`, `<meta property="og:image:height" content="${meta.imageHeight}" />`] : []),
    `<meta property="og:image:alt" content="${esc(meta.imageAlt)}" />`,
    ...(product ? [
      `<meta property="product:price:amount" content="${esc(product.amount)}" />`,
      `<meta property="product:price:currency" content="${esc(product.currency)}" />`,
      `<meta property="og:availability" content="${AVAILABILITY[clean(product.availability)]}" />`,
    ] : []),
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.imageUrl)}" />`,
    `<meta name="twitter:image:alt" content="${esc(meta.imageAlt)}" />`,
    ...(product ? [`<script type="application/ld+json">${productJsonLd(product)}</script>`] : []),
  ]
  const block = lines.map((l) => `    ${l}`).join('\n')
  if (!/<\/head>/i.test(html)) throw new Error('The page shell has no </head>, so nothing can be added to it.')
  return html.replace(/\s*<\/head>/i, `\n${block}\n  </head>`)
}

// Where a page's own copy is written inside the build folder: "/" is index.html, "/art-loft" is art-loft/index.html
export const fileFor = (urlPath) => (urlPath === '/' ? 'index.html' : `${urlPath.replace(/^\/+|\/+$/g, '')}/index.html`)

export function sitemapXml(urls) {
  const items = urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`
}

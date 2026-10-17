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
]

export const THEME_COLOUR = '#14306A'
export const ICON = '/icons/rooms/factory-floor.png'

// meta: { title, description, siteName, url (omit for a page with no address of its own), imageUrl, imageAlt, index }
export function renderHead(template, meta) {
  let html = String(template)
  for (const pattern of OURS) html = html.replace(pattern, '')
  const lines = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="theme-color" content="${THEME_COLOUR}" />`,
    `<link rel="icon" type="image/png" href="${ICON}" />`,
    `<link rel="apple-touch-icon" href="${ICON}" />`,
    ...(meta.index === false ? ['<meta name="robots" content="noindex" />'] : []),
    ...(meta.url ? [`<link rel="canonical" href="${esc(meta.url)}" />`] : []),
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${esc(meta.siteName)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    ...(meta.url ? [`<meta property="og:url" content="${esc(meta.url)}" />`] : []),
    `<meta property="og:image" content="${esc(meta.imageUrl)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(meta.imageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.imageUrl)}" />`,
    `<meta name="twitter:image:alt" content="${esc(meta.imageAlt)}" />`,
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

// Runs after "vite build" (see package.json). For every address in src/data/pageMeta.js it writes a copy of the page with that page's own
// title, description and share picture in the HTML, because WhatsApp, Facebook, X, iMessage and Slack do not run the site's code and so can
// only see what is in the HTML itself. It also writes sitemap.xml.
//
//   dist/index.html             the home page. It is ALSO what Vercel serves for every address that is not in the table (one post, one print),
//                               so it deliberately has no address of its own (no canonical, no og:url): a post is never taken for the home page
//   dist/<address>/index.html   each other page in the table, with its own words and its own address
//   dist/post/<id>/index.html, dist/art-loft/prints/<id>/index.html, dist/art-loft/collections/<slug>/index.html
//                               one for each published post, each published print and each collection, read from the database at build time
//                               (see dynamicPages.mjs). If the database cannot be reached these are skipped and the build carries on.
//                               A post or print added after the last build gets the home page's general words until the site is next built.
//   dist/sitemap.xml            the addresses in the table, and those pages, that are allowed in search results
//
// If this script is ever skipped, nothing breaks: the site still works, and index.html still carries the general words from the project's own
// index.html. vercel.json is unchanged.
//
// Usage: node scripts/make-share-pages.mjs [build folder]      (the folder defaults to dist)
import fs from 'node:fs'
import path from 'node:path'
import { createServer, loadEnv } from 'vite'
import { renderHead, fileFor, sitemapXml } from './shareHead.mjs'
import { collectionPage, databasePages } from './dynamicPages.mjs'

const dist = path.resolve(process.argv[2] || 'dist')
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

// The table imports the rooms' own data the way the site does, so it is loaded the way the site loads it
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', root: process.cwd() })
let meta, collections, rooms
try {
  meta = await server.ssrLoadModule('/src/data/pageMeta.js')
  collections = (await server.ssrLoadModule('/src/artloft/artLoftData.js')).COLLECTIONS
  rooms = Object.fromEntries((await server.ssrLoadModule('/src/data/channels.js')).channels.map((c) => [c.slug, c.name]))
} finally {
  await server.close()
}
const { PAGES, IMAGES, SITE_NAME, urlFor, fullTitleFor, imageUrlFor } = meta

const forPage = (page, urlPath) => ({
  title: fullTitleFor(page),
  description: page.description,
  siteName: SITE_NAME,
  url: urlFor(urlPath),
  imageUrl: imageUrlFor(page),
  imageAlt: IMAGES[page.image].alt,
  index: page.index !== false,
})

// One copy of the page for each address in the table
const indexable = []
for (const [urlPath, page] of Object.entries(PAGES)) {
  const target = path.join(dist, fileFor(urlPath))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const info = forPage(page, urlPath)
  if (urlPath === '/') delete info.url // the home page file is also the fallback for unlisted addresses, so it carries no address of its own
  fs.writeFileSync(target, renderHead(template, info))
  if (page.index !== false) indexable.push(urlFor(urlPath))
}

// The collections (fixed), then each post and print from the database
const ctx = { siteUrl: meta.SITE_URL, siteName: SITE_NAME, rooms, images: IMAGES, siteImage: 'site', imageUrl: (key) => `${meta.SITE_URL}/share/${IMAGES[key].file}` }
const database = await databasePages({ ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }, ctx)
const extra = [...collections.map((c) => collectionPage(c, ctx)), ...database.pages].filter(Boolean)
for (const { urlPath, meta: info } of extra) {
  const target = path.join(dist, fileFor(urlPath))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, renderHead(template, info))
  indexable.push(info.url)
}

// The sitemap
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml(indexable))
console.log(`Share pages: ${Object.keys(PAGES).length} written, plus ${collections.length} collections, ${database.counts.posts} post${database.counts.posts === 1 ? '' : 's'} and ${database.counts.prints} print${database.counts.prints === 1 ? '' : 's'} (${indexable.length} in the sitemap).`)
for (const note of database.notes) console.log(`  note: ${note}`)

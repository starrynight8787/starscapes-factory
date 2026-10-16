import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { formatPrice } from '../src/artloft/artLoftData'
import { formatMoney } from '../src/cart/money'

const sql = (name) => fs.readFileSync(`sql/${name}`, 'utf8')
const withoutComments = (text) => text.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
const css = fs.readFileSync('src/artloft/artloft.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')   // read the rules, not the comments above them
const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))

describe('prices read clearly, with thousands separated', () => {
  ;[formatPrice, formatMoney].forEach((format) => {
    it(`${format.name} shows whole pounds plainly, pence only when there are some, and separates thousands`, () => {
      expect(format(89)).toBe('£89')
      expect(format(999)).toBe('£999')
      expect(format(1200)).toBe('£1,200')
      expect(format(1250.5)).toBe('£1,250.50')
      expect(format('149.50')).toBe('£149.50')
      expect(format(100000)).toBe('£100,000')
      expect(format(0)).toBe('£0')
    })
  })
  it('shows nothing, not "£NaN", for something that is not a price', () => {
    ;['', null, undefined, 'abc'].forEach((x) => { expect(formatPrice(x)).toBe(''); expect(formatMoney(x === '' || x == null ? NaN : x)).toBe('') })
  })
})

describe('sql/originals.sql, which you run once in Supabase', () => {
  const text = withoutComments(sql('originals.sql'))
  it('adds each new column, only if it is not there already, so it is safe to run twice', () => {
    ;['status', 'sold_at', 'medium', 'width_cm', 'height_cm', 'depth_cm', 'year', 'framed'].forEach((col) => expect(text).toMatch(new RegExp(`add column if not exists ${col}\\b`)))
  })
  it('only ever adds: nothing is dropped, deleted or emptied', () => {
    expect(text).not.toMatch(/drop table|drop column|delete from|truncate|update public\.products/i)
  })
  it('allows a piece to be available or sold, nothing else, and gives every existing row "available"', () => {
    expect(text).toMatch(/check \(status in \('available', 'sold'\)\)/)
    expect(text).toMatch(/status\s+text not null default 'available'/)
  })
  it('only drops a rule it is about to put back, or one that might block hand-sent pieces', () => {
    const drops = [...text.matchAll(/drop constraint if exists (\w+)/g)].map((m) => m[1])
    expect(drops.sort()).toEqual(['products_fulfilment_check', 'products_status_check'])
  })
  it('works on the products table, not another', () => {
    expect(text.match(/alter table [\w.]+/g).every((t) => t === 'alter table public.products')).toBe(true)
  })
})

describe('sql/lock-editing-to-owner.sql, which stops strangers adding things to your shop', () => {
  const full = sql('lock-editing-to-owner.sql')
  const live = withoutComments(full)
  it('adds only RESTRICTIVE rules, which can narrow what is allowed and never widen it', () => {
    expect(live).toMatch(/as restrictive/)
    expect(live).not.toMatch(/as permissive/i)
    const creates = [...live.matchAll(/create policy[^;]*?;/gs)].map((m) => m[0])
    expect(creates.length).toBeGreaterThan(0)
    creates.forEach((c) => expect(c, c).toMatch(/restrictive/))
  })
  it('covers adding, changing and deleting, and NEVER reading, so visitors and customers can still see the shop', () => {
    expect(live).not.toMatch(/for all/i)
    expect(live).not.toMatch(/for select/i)
    ;['insert', 'update', 'delete'].forEach((cmd) => expect(live).toMatch(new RegExp(`as restrictive for ${cmd}`)))
  })
  it('covers products, their sizes and frames, the blog posts, and the photo bucket', () => {
    expect(live).toMatch(/array\['products', 'product_variants', 'posts'\]/)
    expect(live).toMatch(/on storage\.objects as restrictive for insert/)
    expect(live).toMatch(/bucket_id <> 'post-images' or/)             // other buckets are left alone
  })
  it('compares your email in lower case, against the same address the owner tools use', () => {
    expect(live).toMatch(/lower\(auth\.jwt\(\) ->> 'email'\) = 'gillian@gillianbennet\.com'/g)
    expect(live).not.toMatch(/[A-Z]+@/)                                // no capitals in the address it compares against
  })
  it('applies only to signed-in accounts, and leaves your server\'s own access alone', () => {
    expect(live).toMatch(/to authenticated/)
    expect(live).not.toMatch(/service_role/)
  })
  it('can be run twice, and tells you how to undo it and how to check it', () => {
    expect(live).toMatch(/drop policy if exists "only the owner adds rows"/)
    expect(full).toMatch(/TO UNDO/)
    expect(full).toMatch(/select tablename, policyname, permissive, cmd from pg_policies/)
    expect(full).toMatch(/BEFORE YOU RUN IT/)
  })
  it('only touches tables that exist, so a missing one does not stop the rest', () => {
    expect(live).toMatch(/to_regclass\('public\.' \|\| t\) is not null/)
  })
})

describe('the new buttons and labels are readable in every state', () => {
  const hasColour = (body) => /(^|[;\s])color:/.test(body)
  const mine = rules.filter((r) => /\.al-(btn|badge--|chip)/.test(r.selector))
  it('finds the new button, badge and chip styles', () => {
    expect(mine.length).toBeGreaterThan(8)
  })
  it('gives every one that sets a background its own text colour, so it can never be white on white', () => {
    mine.filter((r) => /(^|[;\s])background:/.test(r.body)).forEach((r) => expect(hasColour(r.body), r.selector).toBe(true))
  })
  it('never sets white text on a white or see-through background', () => {
    mine.forEach((r) => {
      const bg = (r.body.match(/(^|[;\s])background:\s*([^;]+)/) || [])[2]
      const fg = (r.body.match(/(^|[;\s])color:\s*([^;]+)/) || [])[2]
      if (bg && fg) expect(!(/^#fff\b/.test(bg.trim()) && /^#fff\b/.test(fg.trim())), `${r.selector}: ${fg} on ${bg}`).toBe(true)
    })
  })
  it('shows a ring when you tab to a button', () => {
    expect(rules.find((r) => r.selector === '.al-btn:focus-visible').body).toMatch(/outline:\s*3px solid/)
  })
  it('makes the buttons big enough to tap: 40px with a mouse, and 44px on a touch screen', () => {
    expect(rules.find((r) => r.selector === '.al-btn').body).toMatch(/min-height:\s*var\(--sf-btn-h, 40px\)/)
    const touch = css.slice(css.lastIndexOf('@media (pointer: coarse)'))
    expect(touch).toMatch(/\.al-btn,[\s\S]*min-height:\s*44px/)
  })
})

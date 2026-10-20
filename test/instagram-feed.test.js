import { describe, it, expect } from 'vitest'
import { parseMedia, isPictureHost, fetchPicture, fetchPhotos } from '../lib/instagramFeed.js'

const row = (over = {}) => ({ id: '17900000000000001', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/v/a.jpg', permalink: 'https://www.instagram.com/p/abc/', caption: 'A harbour\nat dusk', timestamp: '2026-10-01T10:00:00+0000', ...over })

describe('Instagram feed', () => {
  it('only trusts Instagram’s own picture servers', () => {
    expect(isPictureHost('https://scontent-lhr8-1.cdninstagram.com/v/x.jpg')).toBe(true)
    expect(isPictureHost('https://scontent.xx.fbcdn.net/v/x.jpg')).toBe(true)
    for (const bad of ['http://scontent.cdninstagram.com/x.jpg', 'https://evil.example/cdninstagram.com/x.jpg', 'https://cdninstagram.com.evil.example/x.jpg', '', null]) expect(isPictureHost(bad), String(bad)).toBe(false)
  })
  it('keeps pictures, uses a video’s cover, and drops anything odd', () => {
    const body = { data: [row(), row({ id: '17900000000000002', media_type: 'VIDEO', media_url: 'https://x.example/v.mp4', thumbnail_url: 'https://scontent.cdninstagram.com/v/t.jpg' }), row({ id: 'bad' }), row({ id: '17900000000000003', media_url: 'https://evil.example/a.jpg' }), row({ id: '17900000000000004', permalink: 'https://evil.example/p/1' })] }
    const photos = parseMedia(body)
    expect(photos.map((p) => p.id)).toEqual(['17900000000000001', '17900000000000002'])
    expect(photos[0].caption).toBe('A harbour at dusk')
    expect(photos[1].src).toBe('https://scontent.cdninstagram.com/v/t.jpg')
  })
  it('stops at the most it was asked for, and copes with rubbish', () => {
    expect(parseMedia({ data: Array.from({ length: 5 }, (_, i) => row({ id: `1790000000000000${i}` })) }, 3)).toHaveLength(3)
    expect(parseMedia(null)).toEqual([]); expect(parseMedia({ data: 'no' })).toEqual([])
  })
  it('never fetches a picture from anywhere else', async () => {
    let called = false
    const r = await fetchPicture('https://evil.example/a.jpg', { fetchImpl: () => { called = true } })
    expect(r.ok).toBe(false); expect(called).toBe(false)
  })
  it('says it is not set up, rather than failing, when there is no token', async () => {
    const saved = { ...process.env }; delete process.env.INSTAGRAM_ACCESS_TOKEN; delete process.env.SUPABASE_URL; delete process.env.VITE_SUPABASE_URL
    const r = await fetchPhotos({ fetchImpl: () => { throw new Error('should not be called') } })
    Object.assign(process.env, saved)
    expect(r.ok).toBe(false)
  })
})

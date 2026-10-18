import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { channels } from '../data/channels'
import { FACTORY, SECTIONS, kindOf } from '../factoryfloor/factoryData'
import './pinswitch.css'

export default function EditPost({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [channel, setChannel] = useState('')
  const [imageUrl, setImageUrl] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Pinning: does the database have the pinned_in column yet, is this post pinned, and which other post holds the pin
  const [canPin, setCanPin] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [otherPinned, setOtherPinned] = useState(null)

  useEffect(() => {
    async function fetchPost() {
      const columns = 'id, title, content, image_url, author_id, tags, channel'
      let { data, error } = await supabase.from('posts').select(columns + ', pinned_in').eq('id', id).single()
      let hasPinColumn = true
      // the database may not have been given the pinned_in column yet: carry on without it
      if (error && /pinned_in/i.test(String(error.message || ''))) {
        hasPinColumn = false
        ;({ data, error } = await supabase.from('posts').select(columns).eq('id', id).single())
      }

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.author_id !== session.user.id) {
        setError('You can only edit your own posts.')
        setLoading(false)
        return
      }

      setTitle(data.title)
      setContent(data.content)
      setImageUrl(data.image_url)
      setTags((data.tags || []).join(', '))
      setChannel(data.channel || '')
      setCanPin(hasPinColumn)
      setPinned(hasPinColumn && Boolean(data.pinned_in) && data.pinned_in === kindOf(data))
      setLoading(false)
    }

    fetchPost()
  }, [id, session.user.id])

  // Which section of the Factory Floor this post belongs to (it follows the tags and the title as they are edited)
  const tagList = tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  const kind = kindOf({ title, tags: tagList })
  const pinnable = canPin && channel === FACTORY.channel

  // Is another post already pinned in this section? Then say so, because pinning this one will replace it.
  useEffect(() => {
    if (!pinnable) {
      setOtherPinned(null)
      return undefined
    }
    let alive = true
    Promise.resolve(supabase.from('posts').select('id, title').eq('pinned_in', kind).neq('id', id).limit(1)).then(({ data }) => {
      if (alive) setOtherPinned(data && data.length > 0 ? data[0] : null)
    })
    return () => {
      alive = false
    }
  }, [pinnable, kind, id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    let newImageUrl = imageUrl

    try {
      if (file) {
        const fileExt = file.name.split('.').pop()
        const filePath = `${session.user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath)

        newImageUrl = publicUrlData.publicUrl
      }

      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const changes = {
        title,
        content,
        image_url: newImageUrl,
        tags: tagsArray,
        channel: channel || null,
      }

      if (canPin) {
        const pinHere = pinnable && pinned
        if (pinHere) {
          // only one post can be pinned in a section, so the one that holds the pin lets go first
          const { error: unpinError } = await supabase.from('posts').update({ pinned_in: null }).eq('pinned_in', kind).neq('id', id)
          if (unpinError) throw unpinError
        }
        changes.pinned_in = pinHere ? kind : null
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update(changes)
        .eq('id', id)

      if (updateError) throw updateError

      navigate(`/post/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <h1>Edit Post</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Write your post..."
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Tags (comma separated, e.g. art, travel)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">No channel</option>
          {channels.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
        {pinnable && (
          <fieldset className="pin-box">
            <legend>Pin to the top</legend>
            <p className="pin-box__section">
              Section: <strong>{SECTIONS[kind].name}</strong>
            </p>
            <label className="pin-switch">
              <input type="checkbox" role="switch" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              <span className="pin-switch__track" aria-hidden="true" />
              <span className="pin-switch__text">
                <strong>Pin this post to the top of its section</strong>
                <small>Pinned posts show first, with the words Start here. Each section has one pinned post.</small>
              </span>
            </label>
            {pinned && otherPinned && (
              <p className="pin-box__warning" role="status">
                <span className="pin-box__icon" aria-hidden="true">
                  !
                </span>
                <span>
                  {SECTIONS[kind].name} already has a pinned post: &ldquo;{otherPinned.title}&rdquo;. Pinning this post will unpin that one.
                </span>
              </p>
            )}
          </fieldset>
        )}
        {imageUrl && (
          <div style={{ marginBottom: 12 }}>
            <p className="muted">Current image:</p>
            <img src={imageUrl} alt="Current" style={{ maxWidth: 200 }} />
          </div>
        )}
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

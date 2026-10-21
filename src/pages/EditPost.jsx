import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { channels } from '../data/channels'
import AdminBanner from '../admin/AdminBanner'
import { FACTORY, SECTIONS, kindOf } from '../factoryfloor/factoryData'
import './pinswitch.css'
import { Field, ErrorSummary } from '../components/FormMessages'
import { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'
import { PASS_CHOICES, cleanPass, hasPassColumn, loadLockedBody, removeLockedBody, saveLockedBody } from '../membership/lockedPosts'
import '../styles/pages.css'
import '../styles/forms.css'
import { resetPassIndex } from '../membership/passIndex'
import { WORDS as PUBLISH_WORDS } from './postPublish'

const IDS = { title: 'ep-title', content: 'ep-content', file: 'ep-file' }

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
  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing
  // Pinning: does the database have the pinned_in column yet, is this post pinned, and which other post holds the pin
  const [canPin, setCanPin] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [otherPinned, setOtherPinned] = useState(null)
  // Passes: does the database have the pass column yet, which pass is this post in ('' means free for everyone), and was it locked when it was loaded
  const [canPass, setCanPass] = useState(false)
  const [pass, setPass] = useState('')
  const [wasLocked, setWasLocked] = useState(false)
  // Published: can visitors read this post? (A post with no choice recorded counts as published.) Only a change is saved.
  const [published, setPublished] = useState(true)
  const [wasPublished, setWasPublished] = useState(true)

  useEffect(() => {
    async function fetchPost() {
      const columns = 'id, title, content, image_url, author_id, tags, channel, published'
      // the database may not have been given the pinned_in or the pass column yet: ask with both, then with just pinned_in, then with neither, and carry on with whatever it has
      let data, error, used
      for (const asked of [columns + ', pinned_in, pass', columns + ', pinned_in', columns]) {
        used = asked
        ;({ data, error } = await supabase.from('posts').select(asked).eq('id', id).single())
        if (!error || !/pinned_in|\bpass\b/i.test(String(error.message || ''))) break
      }
      const hasPinColumn = /pinned_in/.test(used)

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

      // A post that belongs to a pass keeps its words in a protected table: fetch them, because the post itself has none
      const lockedPass = hasPassColumn(data) ? cleanPass(data.pass) : ''
      let words = data.content
      if (lockedPass) {
        try {
          words = (await loadLockedBody(id)) || ''
        } catch (e) {
          setError('We could not load the words of this post just now. Please try again in a moment.')
          setLoading(false)
          return
        }
      }
      setCanPass(hasPassColumn(data))
      setPass(lockedPass)
      setWasLocked(Boolean(lockedPass))
      setPublished(data.published !== false)
      setWasPublished(data.published !== false)
      setTitle(data.title)
      setContent(words)
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
    const found = postProblems({ title, content, file })
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setErrors({})
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
      if (published !== wasPublished) changes.published = published

      // A post for a pass: its words go into the protected table FIRST (so they are safe), and the post itself is left with none. A post made free again gets its words back.
      const wantPass = canPass ? cleanPass(pass) : ''
      if (canPass) {
        if (wantPass) {
          await saveLockedBody(id, content)
          changes.content = ''
          changes.pass = wantPass
        } else {
          changes.pass = null
        }
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

      if (canPass && !wantPass && wasLocked) await removeLockedBody(id)

      resetPassIndex()
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
    <main className="fm ad--wide">
      <AdminBanner chip="Write" title="Edit post" subtitle="Change the post, switch it on or off, or pin it. Nothing changes for readers until you save." icon="post" />
      <ErrorSummary errors={summaryOf(errors, IDS)} />
      <form className="fm__form" onSubmit={handleSubmit} noValidate>
        <Field id="ep-title" label="Title" error={errors.title}>
          {(p) => <input {...p} type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field id="ep-content" label="Post text" error={errors.content}>
          {(p) => <textarea {...p} placeholder="Write your post..." rows={10} value={content} onChange={(e) => setContent(e.target.value)} />}
        </Field>
        <div className="fm__row">
          <Field id="ep-tags" label="Tags" help="Separate them with commas, for example art, travel.">
            {(p) => <input {...p} type="text" placeholder="Tags (comma separated, e.g. art, travel)" value={tags} onChange={(e) => setTags(e.target.value)} />}
          </Field>
          <Field id="ep-room" label="Room">
            {(p) => (
              <select {...p} value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="">No channel</option>
                {channels.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        {canPass && (
          <Field id="ep-pass" label="Pass" help="Free for everyone is an ordinary post. Choose a pass to keep the words of this post for people who hold it (the first three posts in each pass stay free to read). Changing it moves the words in or out of the protected store for you.">
            {(p) => (
              <select {...p} value={pass} onChange={(e) => setPass(e.target.value)}>
                <option value="">Free for everyone</option>
                {PASS_CHOICES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
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
        <fieldset className="pin-box">
          <legend>Who can see it</legend>
          <label className="pin-switch">
            <input type="checkbox" role="switch" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span className="pin-switch__track" aria-hidden="true" />
            <span className="pin-switch__text">
              <strong>Published</strong>
              <small>{published ? PUBLISH_WORDS.switchOn : PUBLISH_WORDS.switchOff}</small>
            </span>
          </label>
        </fieldset>
        {imageUrl && (
          <div>
            <p className="fm__small">Current picture:</p>
            <img className="fm__preview" src={imageUrl} alt="The post's current header picture" />
          </div>
        )}
        <Field id="ep-file" label={`New header picture (optional, up to ${MAX_PICTURE_MB} MB)`} error={errors.file}>
          {(p) => <input {...p} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />}
        </Field>
        <div className="fm__actions">
          <button type="submit" className="pg-btn fm-btn--primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className="pg-btn" onClick={() => navigate(`/post/${id}`)}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}

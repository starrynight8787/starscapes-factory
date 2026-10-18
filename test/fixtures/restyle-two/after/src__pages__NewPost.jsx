import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { channels } from '../data/channels'
import { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'
import { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'
import '../styles/pages.css'
import '../styles/forms.css'

const IDS = { title: 'np-title', content: 'np-content', file: 'np-file' }

export default function NewPost({ session }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [channel, setChannel] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

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

    let imageUrl = null

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

        imageUrl = publicUrlData.publicUrl
      }

      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const { error: insertError } = await supabase.from('posts').insert({
        title,
        content,
        image_url: imageUrl,
        author_id: session.user.id,
        published: true,
        tags: tagsArray,
        channel: channel || null,
      })

      if (insertError) throw insertError

      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="fm">
      <h1 className="fm__title">New post</h1>
      <ErrorSummary errors={summaryOf(errors, IDS)} />
      {error && <FailureMessage title="The post was not saved">{error}</FailureMessage>}
      <form className="fm__form" onSubmit={handleSubmit} noValidate>
        <Field id="np-title" label="Title" error={errors.title}>
          {(p) => <input {...p} type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field id="np-content" label="Post text" error={errors.content}>
          {(p) => <textarea {...p} placeholder="Write your post..." rows={10} value={content} onChange={(e) => setContent(e.target.value)} />}
        </Field>
        <div className="fm__row">
          <Field id="np-tags" label="Tags" help="Separate them with commas, for example art, travel.">
            {(p) => <input {...p} type="text" placeholder="Tags (comma separated, e.g. art, travel)" value={tags} onChange={(e) => setTags(e.target.value)} />}
          </Field>
          <Field id="np-room" label="Room">
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
        <Field id="np-file" label={`Header picture (optional, up to ${MAX_PICTURE_MB} MB)`} error={errors.file}>
          {(p) => <input {...p} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />}
        </Field>
        <div className="fm__actions">
          <button type="submit" className="pg-btn fm-btn--primary" disabled={saving}>
            {saving ? 'Publishing...' : 'Publish'}
          </button>
          <button type="button" className="pg-btn" onClick={() => navigate('/admin')}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}

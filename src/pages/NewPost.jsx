import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function NewPost({ session }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
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

      const { error: insertError } = await supabase.from('posts').insert({
        title,
        content,
        image_url: imageUrl,
        author_id: session.user.id,
        published: true,
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
    <div>
      <h1>New Post</h1>
      {error && <p className="error">{error}</p>}
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
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit" disabled={saving}>
          {saving ? 'Publishing...' : 'Publish'}
        </button>
      </form>
    </div>
  )
}

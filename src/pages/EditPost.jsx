import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function EditPost({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, image_url, author_id')
        .eq('id', id)
        .single()

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
      setLoading(false)
    }

    fetchPost()
  }, [id, session.user.id])

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

      const { error: updateError } = await supabase
        .from('posts')
        .update({ title, content, image_url: newImageUrl })
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
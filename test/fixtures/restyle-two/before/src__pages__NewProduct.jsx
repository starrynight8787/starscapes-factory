import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const COLLECTIONS = [
  'Calm Series',
  'Out of this World',
  "Ocean's View",
  "Dance Like You Just Don't Care",
  'Unique One of a Kind',
]

export default function NewProduct({ session }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [productType, setProductType] = useState('original')
  const [collection, setCollection] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const imageUrls = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const filePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        imageUrls.push(publicUrlData.publicUrl)
      }

      const { error: insertError } = await supabase.from('products').insert({
        title,
        description,
        price: parseFloat(price),
        product_type: productType,
        collection: collection || null,
        images: imageUrls,
        author_id: session.user.id,
        published: true,
      })

      if (insertError) throw insertError

      navigate('/products')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1>New Product</h1>
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
          placeholder="Description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Price (£)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <select value={productType} onChange={(e) => setProductType(e.target.value)}>
          <option value="original">Original</option>
          <option value="print">Print</option>
          <option value="digital">Digital Download</option>
        </select>
        <select value={collection} onChange={(e) => setCollection(e.target.value)}>
          <option value="">No collection</option>
          {COLLECTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="muted" style={{ display: 'block', marginBottom: 6 }}>
          Images (3–6 recommended, first one becomes the thumbnail)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Publishing...' : 'Publish Product'}
        </button>
      </form>
    </div>
  )
}
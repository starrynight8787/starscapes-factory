import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import PageBanner from '../components/PageBanner'

export default function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, images, product_type, collection')
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setProduct(data)
      }
      setLoading(false)
    }

    fetchProduct()
  }, [id])

  if (loading) return <main className="legacy"><p>Loading...</p></main>
  if (error) return <main className="legacy"><p className="error">{error}</p></main>
  if (!product) return <main className="legacy"><p>Product not found.</p></main>

  const images = product.images && product.images.length > 0 ? product.images : []

  return (
    <main className="legacy">
      <p>
        <Link to="/products">&larr; Back to The Art Loft</Link>
      </p>
      <PageBanner art="plain" room="art-loft" chip="The Art Loft" title={product.title} />

      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        {images.length > 0 && (
          <>
            <img
              src={images[activeImage]}
              alt={product.title}
              style={{ width: '100%', borderRadius: 12, marginBottom: 10 }}
            />
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${product.title} ${i + 1}`}
                    onClick={() => setActiveImage(i)}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 6,
                      cursor: 'pointer',
                      opacity: activeImage === i ? 1 : 0.5,
                      border: activeImage === i ? '2px solid #1a1a1a' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {product.collection && <p className="muted">{product.collection}</p>}
        <p style={{ fontSize: 20, fontWeight: 600, margin: '12px 0' }}>
          £{Number(product.price).toFixed(2)}
        </p>
        <p style={{ lineHeight: 1.6 }}>{product.description}</p>

        <button disabled style={{ marginTop: 20, opacity: 0.5, cursor: 'not-allowed' }}>
          Buy — coming soon
        </button>
      </div>
    </main>
  )
}
import { bodyBlocks } from './travelRules'

// The words of an Explorer's Bay article, with its photos placed where the author put them. Every photo has its description as alt text and as a caption.
export default function ArticleBody({ text }) {
  return (
    <div className="pg-post__body xb-body">
      {bodyBlocks(text).map((b, i) =>
        b.type === 'photo' ? (
          <figure className="xb-photo" key={i}>
            <img src={b.url} alt={b.alt} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <figcaption>{b.alt}</figcaption>
          </figure>
        ) : (
          <p className="xb-para" key={i}>{b.text}</p>
        )
      )}
    </div>
  )
}

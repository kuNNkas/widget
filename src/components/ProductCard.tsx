import React from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../data/products'

type Props = {
  p: Product
  onTryOn?: (imageUrl: string) => void   // ⬅ добавили проп
}

export default function ProductCard({ p, onTryOn }: Props){
  const firstImg = p.variants[0]?.images[0] || ''

  return (
    <article className="card">
      <div className="card__thumb">
        <Link to={`/p/${p.slug}`}>
          <img src={firstImg} alt={p.title} loading="lazy"/>
        </Link>
      </div>

      <div className="card__meta">
        <div className="muted" style={{fontSize:12, marginBottom:4}}>{p.brand}</div>

        <Link to={`/p/${p.slug}`} style={{textDecoration:'none', color:'inherit'}}>
          <strong>{p.title}</strong>
        </Link>

        <div className="card__row">
          <div>
            <span className="price">{p.price.toLocaleString('ru-RU')} ₽</span>
            {p.oldPrice && <span className="old">{p.oldPrice.toLocaleString('ru-RU')} ₽</span>}
          </div>
          <div className="rating">★ {p.rating.toFixed(1)}</div>
        </div>

        {/* Кнопка «Примерить» */}
        <div className="card__row" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()            // важно, если карточка завернута во внешний onClick
              onTryOn?.(firstImg)            // передаем картинку товара в виджет
            }}
          >
            Примерить
          </button>
        </div>
      </div>
    </article>
  )
}

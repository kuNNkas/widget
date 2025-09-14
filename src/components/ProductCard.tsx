import React from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../data/products'

type Props = {
  p: Product;
  onTryOn?: (imageUrl: string) => void;
  disableLinks?: boolean;          // ⬅ новее
}

export default function ProductCard({ p, onTryOn, disableLinks }: Props){
  const firstImg = p.variants[0]?.images[0] || ''

  const Img = (
    <img src={firstImg} alt={p.title} loading="lazy"/>
  )
  const Title = <strong>{p.title}</strong>

  return (
    <article className="card">
      <div className="card__thumb">
        {disableLinks ? Img : <Link to={`/p/${p.slug}`}>{Img}</Link>}
      </div>

      <div className="card__meta">
        <div className="muted" style={{fontSize:12, marginBottom:4}}>{p.brand}</div>
        {disableLinks
          ? <span style={{color:'inherit'}}>{Title}</span>
          : <Link to={`/p/${p.slug}`} style={{textDecoration:'none', color:'inherit'}}>{Title}</Link>
        }

        <div className="card__row">
          <div>
            <span className="price">{p.price.toLocaleString('ru-RU')} ₽</span>
            {p.oldPrice && <span className="old">{p.oldPrice.toLocaleString('ru-RU')} ₽</span>}
          </div>
          <div className="rating">★ {p.rating.toFixed(1)}</div>
        </div>

        <div className="card__row" style={{marginTop:10}}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTryOn?.(firstImg);
            }}
          >
            Примерить
          </button>
        </div>
      </div>
    </article>
  )
}

import React from 'react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Header(){
  const { count, setOpen } = useCart()
  return (
    <header className="header">
      <div className="container header__inner">
        <div className="logo">Close<span>It</span></div>
        <nav className="nav">
          <NavLink to="/" className={({isActive}) => isActive ? 'active': undefined}>Женщины</NavLink>
          <a href="#" onClick={(e)=>e.preventDefault()}>Мужчины</a>
          <a href="#" onClick={(e)=>e.preventDefault()}>Аксессуары</a>
        </nav>
        <div className="header__actions">
          <input className="search" placeholder="Поиск по каталогу…" />
          <button className="btn btn--ghost" onClick={()=>setOpen(true)}>Корзина <span className="badge">{count}</span></button>
        </div>
      </div>
    </header>
  )
}

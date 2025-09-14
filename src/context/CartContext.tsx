import React, { createContext, useContext, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

export type CartItem = {
  id: string
  title: string
  slug: string
  price: number
  image: string
  size: string
  color: string
  qty: number
}

type CartState = {
  items: CartItem[]
  add: (item: CartItem) => void
  remove: (slug: string, size: string, color: string) => void
  setQty: (slug: string, size: string, color: string, qty: number) => void
  clear: () => void
  total: number
  count: number
  open: boolean
  setOpen: (v: boolean) => void
}

const Ctx = createContext<CartState | null>(null)

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [items, setItems] = useLocalStorage<CartItem[]>('cart.v1', [])
  const [open, setOpen] = useLocalStorage<boolean>('cart.open', false)

  const api: CartState = useMemo(() => {
    const add = (item: CartItem) => {
      setItems(prev => {
        const i = prev.findIndex(p => p.slug===item.slug && p.size===item.size && p.color===item.color)
        if (i>=0){
          const next = [...prev]; next[i] = { ...prev[i], qty: prev[i].qty + item.qty }
          return next
        }
        return [...prev, item]
      })
      setOpen(true)
    }
    const remove = (slug: string, size: string, color: string) => {
      setItems(prev => prev.filter(p => !(p.slug===slug && p.size===size && p.color===color)))
    }
    const setQty = (slug: string, size: string, color: string, qty: number) => {
      setItems(prev => prev.map(p => p.slug===slug && p.size===size && p.color===color ? { ...p, qty } : p))
    }
    const clear = () => setItems([])
    const total = items.reduce((s, i) => s + i.qty * i.price, 0)
    const count = items.reduce((s, i) => s + i.qty, 0)
    return { items, add, remove, setQty, clear, total, count, open, setOpen }
  }, [items, setItems, open, setOpen])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useCart = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

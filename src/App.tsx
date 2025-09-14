import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Landing from './pages/Landing'
import Demo from './pages/Demo'

export default function App(){
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Landing/>} />
        <Route path="/demo" element={<Demo/>} />
      </Routes>
    </CartProvider>
  )
}

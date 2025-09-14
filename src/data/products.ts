export type Variant = {
  color: { name: string; code: string };
  sizes: string[];
  images: string[];
  inStock: boolean;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  description: string;
  category: string;
  variants: Variant[];
};

export const PRODUCTS: Product[] = [
  {
    id: 'dress-001',
    slug: 'women-summer-midi-dress',
    title: 'Платье миди из хлопка',
    brand: 'CloseIt',
    price: 5990,
    oldPrice: 7990,
    rating: 4.7,
    reviews: 128,
    description: 'Лёгкое летнее платье миди из 100% хлопка. Полуприталенный силуэт, съёмный пояс, карманы в боковых швах.',
    category: 'Платья',
    variants: [
      {
        color: { name: 'Белый', code: '#ffffff' },
        sizes: ['XS','S','M','L','XL'],
        images: ['/garments/women-dress.png'],
        inStock: true
      },
      {
        color: { name: 'Чёрный', code: '#111111' },
        sizes: ['S','M','L'],
        images: ['/garments/women-dress.png'],
        inStock: true
      }
    ]
  }
]

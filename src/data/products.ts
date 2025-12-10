import { loadProductsFromCSV } from '../utils/csvLoader';

export interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number; // Optional sale price
  category: string;
  subcategory?: string; // e.g., t-shirt, sweat shirt, dress, etc.
  images: string[];
  colors: string[];
  sizes: string[];
  description: string;
  featured: boolean;
  rating: number;
  reviews: number;
  stock?: number; // Inventory quantity from backend
  // Clean display fields (from backend)
  short_name?: string;
  short_description?: string;
  normalized_sub_category?: string;
}


// Fallback products (used if CSV loading fails)
export const fallbackProducts: Product[] = [
  {
    id: '1',
    name: 'Cashmere Blend Coat',
    price: 495,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1653875842174-429c1b467548?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1638717366457-dbcaf6b1afbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Beige', 'Cream', 'Black'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'A timeless cashmere blend coat with a minimalist silhouette. Features a relaxed fit, notched lapels, and front pockets. Perfect for layering over any outfit.',
    featured: true,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: '2',
    name: 'Oversized Linen Shirt',
    price: 125,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1737438696465-516c17c5e0f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['White', 'Cream', 'Light Gray'],
    sizes: ['XS', 'S', 'M', 'L'],
    description: 'Made from premium European linen, this oversized shirt offers effortless style and all-day comfort. The relaxed fit and breathable fabric make it perfect for any season.',
    featured: true,
    rating: 4.6,
    reviews: 89,
  },
  {
    id: '3',
    name: 'Leather Tote Bag',
    price: 350,
    category: 'accessories',
    images: [
      'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1569388330292-79cc1ec67270?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Tan', 'Black', 'Cream'],
    sizes: ['One Size'],
    description: 'Handcrafted from full-grain leather, this spacious tote is both elegant and practical. Features interior pockets and a secure zip closure.',
    featured: true,
    rating: 4.9,
    reviews: 203,
  },
  {
    id: '4',
    name: 'Tailored Wool Trousers',
    price: 195,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1744551154437-133615e57adb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Navy', 'Charcoal', 'Beige'],
    sizes: ['28', '30', '32', '34', '36', '38'],
    description: 'Classic tailored trousers in premium Italian wool. Features a mid-rise waist, tapered leg, and pressed crease for a polished look.',
    featured: false,
    rating: 4.7,
    reviews: 67,
  },
  {
    id: '5',
    name: 'Cotton Poplin Dress',
    price: 245,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1638717366457-dbcaf6b1afbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['White', 'Black', 'Cream'],
    sizes: ['XS', 'S', 'M', 'L'],
    description: 'A versatile midi dress in crisp cotton poplin. Features a relaxed fit, three-quarter sleeves, and a subtle A-line silhouette.',
    featured: true,
    rating: 4.5,
    reviews: 92,
  },
  {
    id: '6',
    name: 'Minimalist Sneakers',
    price: 165,
    category: 'accessories',
    images: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['White', 'Off-White', 'Black'],
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43'],
    description: 'Clean-lined sneakers crafted from premium leather. Features a cushioned insole and durable rubber sole for all-day comfort.',
    featured: false,
    rating: 4.6,
    reviews: 145,
  },
  {
    id: '7',
    name: 'Organic Cotton T-Shirt',
    price: 65,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1744551154437-133615e57adb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['White', 'Black', 'Gray', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'A wardrobe essential made from 100% organic cotton. Features a regular fit and ribbed crew neck.',
    featured: false,
    rating: 4.8,
    reviews: 312,
  },
  {
    id: '8',
    name: 'Kids Denim Jacket',
    price: 85,
    category: 'kids',
    images: [
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Light Blue', 'Dark Blue'],
    sizes: ['4Y', '6Y', '8Y', '10Y', '12Y'],
    description: 'Classic denim jacket for kids. Features a button-up front, chest pockets, and durable construction.',
    featured: false,
    rating: 4.7,
    reviews: 78,
  },
  {
    id: '9',
    name: 'Silk Scarf',
    price: 95,
    category: 'accessories',
    images: [
      'https://images.unsplash.com/photo-1569388330292-79cc1ec67270?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Beige', 'Cream', 'Black', 'Navy'],
    sizes: ['One Size'],
    description: '100% mulberry silk scarf with hand-rolled edges. Versatile accessory that can be worn multiple ways.',
    featured: true,
    rating: 4.9,
    reviews: 156,
  },
  {
    id: '10',
    name: 'Wool Knit Sweater',
    price: 185,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1653875842174-429c1b467548?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Cream', 'Camel', 'Gray'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'Luxurious merino wool sweater with a relaxed fit. Features a crew neck and ribbed cuffs.',
    featured: false,
    rating: 4.7,
    reviews: 98,
  },
  {
    id: '11',
    name: 'Tailored Blazer',
    price: 395,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1744551154437-133615e57adb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Navy', 'Charcoal', 'Camel'],
    sizes: ['36', '38', '40', '42', '44', '46'],
    description: 'Impeccably tailored blazer in premium wool. Features notch lapels, two-button closure, and functional sleeve buttons.',
    featured: true,
    rating: 4.8,
    reviews: 134,
  },
  {
    id: '12',
    name: 'Pleated Midi Skirt',
    price: 165,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1638717366457-dbcaf6b1afbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    colors: ['Beige', 'Black', 'Navy'],
    sizes: ['XS', 'S', 'M', 'L'],
    description: 'Elegant pleated midi skirt with an elastic waistband. Falls gracefully to mid-calf length.',
    featured: false,
    rating: 4.6,
    reviews: 87,
  },
];

// Load products from CSV, fallback to default products if loading fails
export async function loadProducts(): Promise<Product[]> {
  try {
    const csvProducts = await loadProductsFromCSV();
    if (csvProducts.length > 0) {
      return csvProducts;
    }
    return fallbackProducts;
  } catch (error) {
    console.error('Failed to load products from CSV, using fallback:', error);
    return fallbackProducts;
  }
}

// Export fallback products for backward compatibility
export const products = fallbackProducts;
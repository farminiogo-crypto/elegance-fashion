import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, ShoppingBag, Truck, RotateCcw, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import RecommendationPanel from '../components/RecommendationPanel';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { recommendationService } from '../services/recommendationService';
import { truncateProductName } from '../utils/textUtils';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { getProductById, getSimilarProducts } = useProducts();
  const product = getProductById(id || '');

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  // Track viewed product and get recommendations
  useEffect(() => {
    if (product && id) {
      // Track product view with backend
      recommendationService.trackView(id);

      // Track viewed product in localStorage
      const viewedProducts = JSON.parse(localStorage.getItem('elegance_viewed_products') || '[]');
      if (!viewedProducts.includes(id)) {
        viewedProducts.unshift(id);
        // Keep only last 20 viewed products
        const limited = viewedProducts.slice(0, 20);
        localStorage.setItem('elegance_viewed_products', JSON.stringify(limited));
      }

      // Get similar products using recommendation engine
      const similar = getSimilarProducts(id, 4);
      setRecommendedProducts(similar);
    }
  }, [product, id, getSimilarProducts]);

  if (!product) {
    return (
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="mb-4">Product Not Found</h2>
          <Link to="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (!selectedColor) {
      toast.error('Please select a color');
      return;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.salePrice || product.price, // Use sale price if available
        image: product.images[0],
        size: selectedSize,
        color: selectedColor,
      });
    }
    toast.success(`Added ${quantity} item(s) to cart`);
  };

  const handleWishlist = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
      });
      toast.success('Added to wishlist');
    }
  };

  return (
    <div>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-neutral-600">
          <Link to="/" className="hover:text-neutral-900">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/shop" className="hover:text-neutral-900">Shop</Link>
          <span className="mx-2">/</span>
          <Link to={`/shop/${product.category}`} className="hover:text-neutral-900 capitalize">
            {product.category}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-900" title={product.name}>{truncateProductName(product.name)}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Images */}
          <div>
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden mb-4"
            >
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square bg-neutral-100 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-neutral-900' : 'border-transparent'
                    }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <h1 className="mb-2">{product.name}</h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < Math.floor(product.rating) ? 'text-neutral-900' : 'text-neutral-300'}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-neutral-600">({product.reviews} reviews)</span>
            </div>
            <div className="mb-8">
              {product.salePrice ? (
                <div className="flex items-center gap-3">
                  <p className="text-red-600">${product.salePrice}</p>
                  <p className="text-neutral-400 line-through">${product.price}</p>
                  <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded">
                    Save {Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                  </span>
                </div>
              ) : (
                <p>${product.price}</p>
              )}
            </div>

            <p className="text-neutral-600 mb-8">{product.description}</p>

            {/* Color Selection */}
            <div className="mb-6">
              <Label className="mb-3 block">Color: {selectedColor && <span className="text-neutral-900">{selectedColor}</span>}</Label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 border rounded-md transition-colors ${selectedColor === color
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-300 hover:border-neutral-900'
                      }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <Label>Size: {selectedSize && <span className="text-neutral-900">{selectedSize}</span>}</Label>
                <a href="#" className="text-sm text-neutral-600 hover:text-neutral-900 underline">
                  Size Guide
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 border rounded-md transition-colors ${selectedSize === size
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-300 hover:border-neutral-900'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-8">
              <Label className="mb-3 block">Quantity</Label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border border-neutral-300 rounded-md hover:border-neutral-900 transition-colors"
                >
                  −
                </button>
                <span className="w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 border border-neutral-300 rounded-md hover:border-neutral-900 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-8">
              <Button onClick={handleAddToCart} size="lg" className="flex-1 bg-neutral-900 hover:bg-neutral-800">
                <ShoppingBag size={18} className="mr-2" />
                Add to Cart
              </Button>
              <Button
                onClick={handleWishlist}
                size="lg"
                variant="outline"
                className={inWishlist ? 'border-red-500' : ''}
              >
                <Heart
                  size={18}
                  className={inWishlist ? 'fill-red-500 text-red-500' : ''}
                />
              </Button>
            </div>

            {/* Features */}
            <div className="space-y-4 py-8 border-t border-neutral-200">
              <div className="flex items-start gap-3">
                <Truck className="text-neutral-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-sm">Free Shipping</p>
                  <p className="text-xs text-neutral-600">On orders over $200</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="text-neutral-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-sm">Easy Returns</p>
                  <p className="text-xs text-neutral-600">30-day return policy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="text-neutral-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-sm">Secure Payment</p>
                  <p className="text-xs text-neutral-600">100% secure transactions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="description" className="mb-20">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900">
              Description
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900">
              Reviews ({product.reviews})
            </TabsTrigger>
            <TabsTrigger value="shipping" className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900">
              Shipping & Returns
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-8">
            <div className="max-w-3xl">
              <p className="text-neutral-600 mb-4">{product.description}</p>
              <h4 className="mb-2">Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-neutral-600">
                <li>Premium quality materials</li>
                <li>Carefully crafted construction</li>
                <li>Timeless design</li>
                <li>Easy care instructions</li>
              </ul>
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="mt-8">
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b border-neutral-200 pb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, j) => (
                        <span key={j} className="text-neutral-900">★</span>
                      ))}
                    </div>
                    <span className="text-sm text-neutral-600">5.0</span>
                  </div>
                  <p className="mb-2">Excellent quality and fit!</p>
                  <p className="text-sm text-neutral-600 mb-1">
                    The quality is outstanding and the fit is perfect. Highly recommend!
                  </p>
                  <p className="text-xs text-neutral-500">Customer {i} • November 2025</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="shipping" className="mt-8">
            <div className="max-w-3xl space-y-4">
              <div>
                <h4 className="mb-2">Shipping</h4>
                <p className="text-neutral-600">
                  We offer free standard shipping on all orders over $200. Orders are processed within 1-2 business days and typically arrive within 5-7 business days.
                </p>
              </div>
              <div>
                <h4 className="mb-2">Returns</h4>
                <p className="text-neutral-600">
                  We accept returns within 30 days of delivery. Items must be unworn, unwashed, and in original condition with tags attached. Return shipping is free for all eligible returns.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <div>
            <h2 className="mb-8">Recommended for You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendation Panel */}
      <RecommendationPanel currentProductId={id} mode="product" limit={6} />

      <Footer />
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}>{children}</label>;
}
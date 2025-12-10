import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import type { Product } from '../data/products';
import { recommendationService } from '../services/recommendationService';

interface ProductCardProps {
  product: Product;
}

/**
 * Get display name for product - uses short_name if available, otherwise truncates name
 */
function getDisplayName(product: Product): string {
  // If backend provides short_name, use it
  if (product.short_name) {
    return product.short_name;
  }
  // Otherwise, create a short version from name
  const name = product.name;
  if (name.length <= 40) return name;
  // Take first 40 chars and try to break at word boundary
  const truncated = name.substring(0, 40);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const inWishlist = isInWishlist(product.id);

  const displayName = getDisplayName(product);
  const displayCategory = product.normalized_sub_category || product.subcategory || product.category;

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
      // Track wishlist interaction
      recommendationService.trackWishlist(product.id);
      toast.success('Added to wishlist');
    }
  };

  const handleQuickAdd = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images[0],
      size: product.sizes[0],
      color: product.colors[0],
    });
    // Track add to cart interaction
    recommendationService.trackAddToCart(product.id);
    toast.success('Added to cart');
  };

  const handleProductClick = () => {
    // Track product click
    recommendationService.trackClick(product.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      {/* Image Container */}
      <Link
        to={`/product/${product.id}`}
        className="block relative overflow-hidden aspect-[3/4]"
        onClick={handleProductClick}
      >
        <img
          src={isHovered && product.images[1] ? product.images[1] : product.images[0]}
          alt={displayName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Sale Badge */}
        {product.salePrice && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
            {Math.round(((product.price - product.salePrice) / product.price) * 100)}% OFF
          </span>
        )}

        {/* Hover Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
        />
      </Link>

      {/* Wishlist Button */}
      <button
        onClick={handleWishlist}
        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 hover:bg-white transition-all z-10"
      >
        <Heart
          size={18}
          className={inWishlist ? 'fill-red-500 text-red-500' : 'text-neutral-600'}
        />
      </button>

      {/* Quick Add Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
        transition={{ duration: 0.2 }}
        onClick={handleQuickAdd}
        className="absolute bottom-20 left-3 right-3 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-md shadow-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
      >
        <ShoppingBag size={16} />
        Quick Add
      </motion.button>

      {/* Product Info */}
      <div className="p-4">
        {/* Category Tag */}
        <span className="text-xs text-neutral-400 uppercase tracking-wide">
          {displayCategory}
        </span>

        {/* Product Name */}
        <Link to={`/product/${product.id}`} onClick={handleProductClick}>
          <h3
            className="mt-1 text-sm font-medium text-neutral-900 hover:text-neutral-600 transition-colors line-clamp-2 min-h-[2.5rem]"
            title={product.name}
          >
            {displayName}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mt-2">
          {product.salePrice ? (
            <>
              <p className="text-base font-semibold text-red-600">${product.salePrice.toFixed(2)}</p>
              <p className="text-sm text-neutral-400 line-through">${product.price.toFixed(2)}</p>
            </>
          ) : (
            <p className="text-base font-semibold text-neutral-900">${product.price.toFixed(2)}</p>
          )}
        </div>

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-neutral-700">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-neutral-400">({product.reviews})</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
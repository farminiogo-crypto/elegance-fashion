import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, ChevronRight } from 'lucide-react';
import { recommendationService } from '../services/recommendationService';
import { Product } from '../data/products';

interface RecentlyViewedProduct {
    id: string;
    name: string;
    price: number;
    salePrice?: number;
    category: string;
    subcategory?: string;
    images: string[];
    colors: string[];
    sizes: string[];
    description?: string;
    featured: boolean;
    rating: number;
    reviews: number;
}

interface RecentlyViewedProps {
    maxItems?: number;
    className?: string;
}

const RecentlyViewed = ({ maxItems = 4, className = '' }: RecentlyViewedProps) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentlyViewed = async () => {
            try {
                const viewed = await recommendationService.getRecentlyViewed(maxItems);
                // Map API response to Product type
                const mapped: Product[] = viewed.map((p: RecentlyViewedProduct) => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    salePrice: p.salePrice,
                    category: p.category,
                    subcategory: p.subcategory,
                    images: p.images || [],
                    colors: p.colors || [],
                    sizes: p.sizes || [],
                    description: p.description || '',
                    featured: p.featured || false,
                    rating: p.rating || 0,
                    reviews: p.reviews || 0,
                }));
                setProducts(mapped);
            } catch (error) {
                console.error('Error fetching recently viewed:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentlyViewed();
    }, [maxItems]);

    // Don't render if no products or still loading
    if (loading || products.length === 0) {
        return null;
    }

    return (
        <section className={`py-8 bg-gray-50 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <h3 className="text-xl font-semibold text-gray-900">Recently Viewed</h3>
                    </div>
                    <Link
                        to="/shop?sort=recent"
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors"
                    >
                        View All
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </motion.div>

                {/* Products Grid - Smaller Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {products.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="group"
                        >
                            <Link to={`/product/${product.id}`} className="block">
                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-2">
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                </div>
                                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                <p className="text-sm text-gray-600">${product.price.toFixed(2)}</p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RecentlyViewed;


import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { recommendationService } from '@/services/recommendationService';
import ProductCard from './ProductCard';
import { Product } from '@/data/products';

interface CompleteLookProduct {
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

interface CompleteLookProps {
    productId: string;
    maxItems?: number;
    className?: string;
}

const CompleteLook = ({ productId, maxItems = 4, className = '' }: CompleteLookProps) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompleteLook = async () => {
            if (!productId) return;

            try {
                const complementary = await recommendationService.getCompleteLook(productId, maxItems);
                // Map API response to Product type
                const mapped: Product[] = complementary.map((p: CompleteLookProduct) => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    salePrice: p.salePrice,
                    category: p.category,
                    subcategory: p.subcategory,
                    images: p.images || [],
                    colors: p.colors || [],
                    sizes: p.sizes || [],
                    description: p.description,
                    featured: p.featured || false,
                    rating: p.rating || 0,
                    reviews: p.reviews || 0,
                }));
                setProducts(mapped);
            } catch (error) {
                console.error('Error fetching complete look:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCompleteLook();
    }, [productId, maxItems]);

    // Don't render if no products or still loading
    if (loading || products.length === 0) {
        return null;
    }

    return (
        <section className={`py-10 ${className}`}>
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    <h2 className="text-xl font-bold text-gray-900">Complete the Look</h2>
                </motion.div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                            <ProductCard product={product} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CompleteLook;

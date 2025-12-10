import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { recommendationService, type Product } from '../services/recommendationService';

interface RecommendationPanelProps {
    currentProductId?: string;
    mode?: 'product' | 'personalized' | 'trending';
    limit?: number;
}

export default function RecommendationPanel({
    currentProductId,
    mode = 'personalized',
    limit = 6,
}: RecommendationPanelProps) {
    const [recommendations, setRecommendations] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecommendations = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let products: Product[] = [];

                if (mode === 'product' && currentProductId) {
                    products = await recommendationService.getRecommendationsForProduct(
                        currentProductId,
                        limit
                    );
                } else if (mode === 'personalized') {
                    products = await recommendationService.getPersonalizedRecommendations(limit);
                } else if (mode === 'trending') {
                    products = await recommendationService.getTrendingProducts(limit);
                }

                setRecommendations(products);
            } catch (err) {
                setError('Failed to load recommendations');
                console.error('Error fetching recommendations:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendations();
    }, [currentProductId, mode, limit]);

    // Don't render on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="fixed right-8 top-32 w-80 bg-white rounded-lg shadow-lg p-6 border border-neutral-200">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-neutral-900" size={20} />
                    <h3 className="font-medium">Recommended for You</h3>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="aspect-[3/4] bg-neutral-200 rounded-lg mb-2" />
                            <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-neutral-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || recommendations.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed right-8 top-32 w-80 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden max-h-[calc(100vh-10rem)] flex flex-col"
        >
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white">
                <div className="flex items-center gap-2 mb-1">
                    {mode === 'trending' ? (
                        <TrendingUp className="text-neutral-900" size={20} />
                    ) : (
                        <Sparkles className="text-neutral-900" size={20} />
                    )}
                    <h3 className="font-medium text-neutral-900">
                        {mode === 'trending' ? 'Trending Now' : 'Recommended for You'}
                    </h3>
                </div>
                <p className="text-xs text-neutral-600">
                    {mode === 'product'
                        ? 'Similar products you might like'
                        : mode === 'trending'
                            ? 'Popular items right now'
                            : 'Based on your browsing'}
                </p>
            </div>

            {/* Recommendations List */}
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
                <AnimatePresence mode="popLayout">
                    {recommendations.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                            <Link
                                to={`/product/${product.id}`}
                                className="block group"
                                onClick={() => recommendationService.trackClick(product.id)}
                            >
                                <div className="flex gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors">
                                    {/* Product Image */}
                                    <div className="relative w-20 h-24 bg-neutral-100 rounded-md overflow-hidden flex-shrink-0">
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        {product.salePrice && (
                                            <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                                                {Math.round(
                                                    ((product.price - product.salePrice) / product.price) * 100
                                                )}
                                                %
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-neutral-900 line-clamp-2 group-hover:text-neutral-600 transition-colors">
                                            {product.name}
                                        </h4>
                                        <div className="flex items-center gap-1 mt-1">
                                            {product.salePrice ? (
                                                <>
                                                    <span className="text-sm font-medium text-red-600">
                                                        ${product.salePrice}
                                                    </span>
                                                    <span className="text-xs text-neutral-400 line-through">
                                                        ${product.price}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm font-medium text-neutral-900">
                                                    ${product.price}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <div className="flex text-xs">
                                                {[...Array(5)].map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={
                                                            i < Math.floor(product.rating)
                                                                ? 'text-neutral-900'
                                                                : 'text-neutral-300'
                                                        }
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-xs text-neutral-500">
                                                ({product.reviews})
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                <p className="text-xs text-center text-neutral-600">
                    Powered by AI recommendations
                </p>
            </div>
        </motion.div>
    );
}

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Generate or retrieve session ID for anonymous users
const getSessionId = (): string => {
    let sessionId = localStorage.getItem('elegance_session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('elegance_session_id', sessionId);
    }
    return sessionId;
};

// Get auth token if user is logged in
const getAuthToken = (): string | null => {
    return localStorage.getItem('elegance_token');
};

// Create axios instance with auth headers
const createApiClient = () => {
    const token = getAuthToken();
    return axios.create({
        baseURL: API_BASE_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
};

export interface TrackInteractionRequest {
    product_id: string;
    interaction_type: 'view' | 'click' | 'add_to_cart' | 'wishlist' | 'purchase';
    session_id?: string;
}

export interface Product {
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

class RecommendationService {
    /**
     * Track user interaction with a product
     */
    async trackInteraction(
        productId: string,
        interactionType: 'view' | 'click' | 'add_to_cart' | 'wishlist' | 'purchase'
    ): Promise<void> {
        try {
            const api = createApiClient();
            const sessionId = getSessionId();

            await api.post('/recommendations/track', {
                product_id: productId,
                interaction_type: interactionType,
                session_id: sessionId,
            });
        } catch (error) {
            // Silently fail - tracking shouldn't break the user experience
            console.warn('Failed to track interaction:', error);
        }
    }

    /**
     * Get KNN-based recommendations for a specific product
     */
    async getRecommendationsForProduct(
        productId: string,
        limit: number = 6
    ): Promise<Product[]> {
        try {
            const api = createApiClient();
            const response = await api.get(`/recommendations/for-product/${productId}`, {
                params: { limit },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get product recommendations:', error);
            return [];
        }
    }

    /**
     * Get personalized recommendations based on user history
     */
    async getPersonalizedRecommendations(limit: number = 6): Promise<Product[]> {
        try {
            const api = createApiClient();
            const sessionId = getSessionId();

            const response = await api.get('/recommendations/personalized', {
                params: {
                    session_id: sessionId,
                    limit,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get personalized recommendations:', error);
            return [];
        }
    }

    /**
     * Get trending products
     */
    async getTrendingProducts(limit: number = 6): Promise<Product[]> {
        try {
            const api = createApiClient();
            const response = await api.get('/recommendations/trending', {
                params: { limit },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get trending products:', error);
            return [];
        }
    }

    /**
     * Track product view (convenience method)
     */
    trackView(productId: string): Promise<void> {
        return this.trackInteraction(productId, 'view');
    }

    /**
     * Track product click (convenience method)
     */
    trackClick(productId: string): Promise<void> {
        return this.trackInteraction(productId, 'click');
    }

    /**
     * Track add to cart (convenience method)
     */
    trackAddToCart(productId: string): Promise<void> {
        return this.trackInteraction(productId, 'add_to_cart');
    }

    /**
     * Track add to wishlist (convenience method)
     */
    trackWishlist(productId: string): Promise<void> {
        return this.trackInteraction(productId, 'wishlist');
    }

    /**
     * Track purchase (convenience method)
     */
    trackPurchase(productId: string): Promise<void> {
        return this.trackInteraction(productId, 'purchase');
    }

    /**
     * Get recently viewed products
     */
    async getRecentlyViewed(limit: number = 8): Promise<Product[]> {
        try {
            const api = createApiClient();
            const sessionId = getSessionId();

            const response = await api.get('/recommendations/recently-viewed', {
                params: {
                    session_id: sessionId,
                    limit,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get recently viewed:', error);
            return [];
        }
    }

    /**
     * Get complementary products to complete a look
     */
    async getCompleteLook(productId: string, limit: number = 4): Promise<Product[]> {
        try {
            const api = createApiClient();
            const response = await api.get(`/recommendations/complete-look/${productId}`, {
                params: { limit },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get complete look:', error);
            return [];
        }
    }

    /**
     * Get enhanced personalized recommendations
     */
    async getEnhancedPersonalized(limit: number = 6): Promise<Product[]> {
        try {
            const api = createApiClient();
            const sessionId = getSessionId();

            const response = await api.get('/recommendations/personalized-enhanced', {
                params: {
                    session_id: sessionId,
                    limit,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get enhanced recommendations:', error);
            return [];
        }
    }
}

// Export singleton instance
export const recommendationService = new RecommendationService();


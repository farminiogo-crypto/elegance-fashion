import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;
  isInWishlist: (id: string) => boolean;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Load wishlist from API
  useEffect(() => {
    // Wait for auth to finish loading before trying to load wishlist
    if (authLoading) {
      return;
    }
    
    if (isAuthenticated) {
      // Small delay to ensure token is available
      const timer = setTimeout(() => {
        loadWishlist();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setItems([]);
    }
  }, [isAuthenticated, authLoading]);

  const loadWishlist = async () => {
    // Ensure token is loaded before making request
    apiService.reloadToken();
    
    // Try to get token from localStorage directly if not in instance
    if (!apiService.hasToken() && typeof window !== 'undefined') {
      const tokenFromStorage = localStorage.getItem('auth_token');
      if (tokenFromStorage) {
        apiService.setToken(tokenFromStorage);
        apiService.reloadToken();
      }
    }
    
    if (!apiService.hasToken()) {
      // No token available - user might not be logged in or token expired
      setItems([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const apiItems = await apiService.getWishlist();
      // Transform API response to WishlistItem format
      const transformedItems: WishlistItem[] = apiItems.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.sale_price || item.product.price,
        image: item.product.images?.[0] || '',
      }));
      setItems(transformedItems);
    } catch (error: any) {
      // Don't log errors for 401 during initial load (token might not be ready yet)
      if (error.message && !error.message.includes('credentials') && !error.message.includes('Unauthorized')) {
        console.error('Error loading wishlist:', error);
      }
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addToWishlist = async (item: WishlistItem) => {
    if (!isAuthenticated) {
      throw new Error('Please login to add items to wishlist');
    }

    try {
      await apiService.addToWishlist(item.id);
      await loadWishlist();
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  };

  const removeFromWishlist = async (id: string) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      await apiService.removeFromWishlist(id);
      await loadWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  };

  const isInWishlist = (id: string) => {
    return items.some((i) => i.id === id);
  };

  return (
    <WishlistContext.Provider
      value={{ items, addToWishlist, removeFromWishlist, isInWishlist, isLoading }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}

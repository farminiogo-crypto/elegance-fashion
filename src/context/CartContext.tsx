import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  itemId?: number; // API cart item ID
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
  removeFromCart: (id: string, size: string, color: string) => Promise<void>;
  updateQuantity: (id: string, size: string, color: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Load cart items from API
  useEffect(() => {
    // Wait for auth to finish loading before trying to load cart
    if (authLoading) {
      return;
    }
    
    if (isAuthenticated) {
      // Small delay to ensure token is available
      const timer = setTimeout(() => {
        loadCartItems();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setItems([]);
    }
  }, [isAuthenticated, authLoading]);

  const loadCartItems = async () => {
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
      const apiItems = await apiService.getCartItems();
      // Transform API response to CartItem format
      const transformedItems: CartItem[] = apiItems.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.sale_price || item.product.price,
        image: item.product.images?.[0] || '',
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        itemId: item.id,
      }));
      setItems(transformedItems);
    } catch (error: any) {
      // Don't log errors for 401 during initial load (token might not be ready yet)
      if (error.message && !error.message.includes('credentials') && !error.message.includes('Unauthorized')) {
        console.error('Error loading cart items:', error);
      }
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (item: Omit<CartItem, 'quantity'>) => {
    if (!isAuthenticated) {
      throw new Error('Please login to add items to cart');
    }

    // Ensure token is loaded - try multiple methods
    apiService.reloadToken();
    
    // If still no token, try loading directly from localStorage
    if (!apiService.hasToken()) {
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (tokenFromStorage) {
        apiService.setToken(tokenFromStorage);
        apiService.reloadToken();
      }
    }
    
    // Final check - if still no token and user is authenticated, something is wrong
    if (!apiService.hasToken()) {
      console.error('Token not found but user is authenticated. This might be a session issue.');
      // Don't throw error immediately - let the API call fail and handle it there
      // This allows the backend to return proper error messages
    }

    try {
      await apiService.addToCart({
        product_id: item.id,
        size: item.size,
        color: item.color,
        quantity: 1,
      });
      await loadCartItems();
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      
      // If it's an authentication error, provide helpful message
      if (error.message && (error.message.includes('credentials') || error.message.includes('Authentication') || error.message.includes('Unauthorized') || error.message.includes('token'))) {
        throw new Error('Your session has expired. Please login again.');
      }
      
      throw error;
    }
  };

  const removeFromCart = async (id: string, size: string, color: string) => {
    if (!isAuthenticated) {
      return;
    }

    const item = items.find(
      (i) => i.id === id && i.size === size && i.color === color
    );

    if (item?.itemId) {
      try {
        await apiService.removeFromCart(item.itemId);
        await loadCartItems();
      } catch (error) {
        console.error('Error removing from cart:', error);
        throw error;
      }
    }
  };

  const updateQuantity = async (id: string, size: string, color: string, quantity: number) => {
    if (!isAuthenticated) {
      return;
    }

    if (quantity <= 0) {
      await removeFromCart(id, size, color);
      return;
    }

    const item = items.find(
      (i) => i.id === id && i.size === size && i.color === color
    );

    if (item?.itemId) {
      try {
        await apiService.updateCartItem(item.itemId, quantity);
        await loadCartItems();
      } catch (error) {
        console.error('Error updating cart item:', error);
        throw error;
      }
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      await apiService.clearCart();
    setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

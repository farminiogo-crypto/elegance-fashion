import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

export interface Order {
  id: string;
  customer: string;
  email: string;
  date: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }[];
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id'>) => Promise<void>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Load orders from API
  useEffect(() => {
    // Wait for auth to finish loading before trying to load orders
    if (authLoading) {
      return;
    }
    
    if (isAuthenticated) {
      // Small delay to ensure token is available
      const timer = setTimeout(() => {
        loadOrders();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setOrders([]);
    }
  }, [isAuthenticated, authLoading]);

  const loadOrders = async () => {
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
      setOrders([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const apiOrders = await apiService.getOrders();
      // Transform API response to Order format
      const transformedOrders: Order[] = apiOrders.map((order: any) => ({
        id: order.id,
        customer: order.customer_name,
        email: order.email,
        date: new Date(order.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: order.status,
        total: order.total,
        items: order.items.map((item: any) => ({
          id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image || '',
        })),
      }));
      setOrders(transformedOrders);
    } catch (error: any) {
      // Don't log errors for 401 during initial load (token might not be ready yet)
      if (error.message && !error.message.includes('credentials') && !error.message.includes('Unauthorized')) {
        console.error('Error loading orders:', error);
      }
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addOrder = async (order: Omit<Order, 'id'>) => {
    if (!isAuthenticated) {
      throw new Error('Please login to place an order');
    }

    try {
      const orderData = {
        customer_name: order.customer,
        email: order.email,
        items: order.items.map((item) => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
    };

      await apiService.createOrder(orderData);
      await loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await apiService.updateOrderStatus(id, status);
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const getOrderById = (id: string) => {
    return orders.find((order) => order.id === id);
  };

  const refreshOrders = loadOrders;

  return (
    <OrderContext.Provider
      value={{
        orders,
        addOrder,
        updateOrderStatus,
        getOrderById,
        isLoading,
        refreshOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
}

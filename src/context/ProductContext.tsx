import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../data/products';
import { apiService } from '../services/api';
import {
  getSimilarProducts,
  getRecommendationsByPreferences,
  getRecommendationsByProducts,
  getTrendingProducts,
  getPersonalizedRecommendations,
  UserPreferences,
} from '../utils/recommendationEngine';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  getSimilarProducts: (productId: string, limit?: number) => Product[];
  getRecommendationsByPreferences: (preferences: UserPreferences, limit?: number) => Product[];
  getTrendingProducts: (limit?: number) => Product[];
  getPersonalizedRecommendations: (
    productId: string | null,
    preferences?: UserPreferences,
    limit?: number
  ) => Product[];
  refreshProducts: () => Promise<void>;
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Map API response to Product interface (snake_case to camelCase)
  const mapApiProduct = (apiProduct: any): Product => {
    return {
      id: apiProduct.id,
      name: apiProduct.name,
      price: apiProduct.price,
      salePrice: apiProduct.sale_price, // Map snake_case to camelCase
      category: apiProduct.category,
      subcategory: apiProduct.subcategory || apiProduct.sub_category, // Handle both formats
      images: apiProduct.images || [],
      colors: apiProduct.colors || [],
      sizes: apiProduct.sizes || [],
      description: apiProduct.description || '',
      featured: apiProduct.featured || false,
      rating: apiProduct.rating || 0,
      reviews: apiProduct.reviews || 0,
      stock: apiProduct.stock ?? 0, // Include stock from backend
      // New clean display fields
      short_name: apiProduct.short_name,
      short_description: apiProduct.short_description,
      normalized_sub_category: apiProduct.normalized_sub_category,
    };
  };


  // Load products from API
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      // Request all products (limit: 10000 to get everything)
      const apiProducts = await apiService.getProducts({ limit: 10000 });
      // Map API response to Product interface
      const mappedProducts = apiProducts.map(mapApiProduct);
      setProducts(mappedProducts);
      console.log(`Loaded ${mappedProducts.length} products from API`);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Expose refreshProducts so other components can trigger a reload
  const refreshProducts = async () => {
    await loadProducts();
  };


  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const newProduct = await apiService.createProduct(product);
      setProducts((prev) => [...prev, newProduct]);
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updatedProduct: Partial<Product>) => {
    try {
      const updated = await apiService.updateProduct(id, updatedProduct);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await apiService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  // Recommendation functions
  const getSimilarProductsForProduct = (productId: string, limit: number = 4) => {
    const product = getProductById(productId);
    if (!product) return [];
    return getSimilarProducts(product, products, limit);
  };

  const getRecommendationsForPreferences = (preferences: UserPreferences, limit: number = 8) => {
    return getRecommendationsByPreferences(products, preferences, limit);
  };

  const getTrendingProductsList = (limit: number = 8) => {
    return getTrendingProducts(products, limit);
  };

  const getPersonalizedRecommendationsForUser = (
    productId: string | null,
    preferences?: UserPreferences,
    limit: number = 8
  ) => {
    const targetProduct = productId ? getProductById(productId) : null;

    // Get viewed products from localStorage
    const viewedProductIds = JSON.parse(localStorage.getItem('elegance_viewed_products') || '[]');
    const viewedProducts = viewedProductIds
      .map((id: string) => getProductById(id))
      .filter((p: Product | undefined): p is Product => p !== undefined)
      .slice(0, 10); // Limit to last 10 viewed

    return getPersonalizedRecommendations(
      targetProduct,
      products,
      preferences,
      viewedProducts,
      limit
    );
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        getSimilarProducts: getSimilarProductsForProduct,
        getRecommendationsByPreferences: getRecommendationsForPreferences,
        getTrendingProducts: getTrendingProductsList,
        getPersonalizedRecommendations: getPersonalizedRecommendationsForUser,
        refreshProducts,
        isLoading,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
}

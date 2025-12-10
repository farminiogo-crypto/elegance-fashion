// @ts-ignore - Vite provides import.meta.env
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://elegance-fashion-production.up.railway.app' : 'http://localhost:8000');

class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private tokenSetTime: number | null = null; // Track when token was last set

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Token not in localStorage - this is expected if user is not logged in
        this.token = null;
        this.tokenSetTime = null;
        return;
      }

      // Trim and validate token
      const trimmedToken = token.trim();

      // Validate token format first
      const parts = trimmedToken.split('.');
      if (parts.length !== 3) {
        // Invalid token format, clear it
        if (process.env.NODE_ENV === 'development') {
          console.debug('Token in localStorage has invalid format, clearing it');
        }
        this.token = null;
        this.tokenSetTime = null;
        localStorage.removeItem('auth_token');
        return;
      }

      // Check if token is expired before using it
      if (this.isTokenExpired(trimmedToken)) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Token in localStorage is expired, clearing it');
        }
        this.token = null;
        this.tokenSetTime = null;
        localStorage.removeItem('auth_token');
        return;
      }

      // Token is valid, set it
      this.token = trimmedToken;

      if (!this.tokenSetTime) {
        // Token exists in localStorage but we don't have a timestamp
        // This happens on page reload - set a recent timestamp to give it grace period
        this.tokenSetTime = Date.now() - 1000; // 1 second ago, so it has ~1 second of grace period
      }
    }
  }

  setToken(token: string | null) {
    if (!token) {
      // If token is null/undefined, clear it
      this.token = null;
      this.tokenSetTime = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      return;
    }

    // Ensure token is a valid string and trim whitespace
    if (typeof token !== 'string' || token.trim().length === 0) {
      console.error('Invalid token provided to setToken:', token);
      return;
    }

    // Trim token to remove any leading/trailing whitespace
    const trimmedToken = token.trim();
    this.token = trimmedToken;

    if (typeof window !== 'undefined') {
      try {
        // Save trimmed token to localStorage
        localStorage.setItem('auth_token', trimmedToken);

        // Immediately verify token was stored correctly
        const stored = localStorage.getItem('auth_token');
        if (!stored || stored !== trimmedToken) {
          console.error('Token storage verification failed!', {
            expected: trimmedToken,
            stored: stored,
            storedLength: stored?.length,
            tokenLength: trimmedToken.length
          });
          // Try one more time
          localStorage.setItem('auth_token', trimmedToken);
          const retryStored = localStorage.getItem('auth_token');
          if (!retryStored || retryStored !== trimmedToken) {
            throw new Error('Failed to save token to localStorage after retry');
          }
        }
      } catch (error) {
        console.error('Error saving token to localStorage:', error);
        // Check if localStorage is available
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
        } catch (e) {
          console.error('localStorage is not available or blocked:', e);
        }
        throw error;
      }

      // Record when token was set (for grace period after login)
      this.tokenSetTime = Date.now();
    }
  }

  // Reload token from localStorage (useful after login)
  reloadToken() {
    this.loadToken();
    // Only log if we're in a context where we expect a token (e.g., authenticated user)
    // Don't spam console for unauthenticated users
    if (this.token) {
      console.log('🔍 Token reloaded from localStorage:', this.token.length, 'chars');
    }
  }

  // Verify token exists
  hasToken(): boolean {
    this.loadToken();
    return !!this.token;
  }

  // Check if token was recently set (within grace period)
  // This helps prevent clearing tokens due to race conditions
  isTokenRecent(gracePeriodMs: number = 5000): boolean {
    if (!this.tokenSetTime) {
      return false;
    }
    const timeSinceSet = Date.now() - this.tokenSetTime;
    return timeSinceSet < gracePeriodMs;
  }

  // Check if JWT token is expired (without verifying signature)
  // This is a client-side check to provide better error messages
  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.token;

    if (!tokenToCheck) {
      return true;
    }

    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = tokenToCheck.trim().split('.');
      if (parts.length !== 3) {
        return true; // Invalid token format
      }

      // Decode the payload (base64url)
      // Handle base64url encoding properly
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if needed
      const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);

      const payload = JSON.parse(atob(paddedBase64));

      // Check expiration (with 5 second buffer to account for clock skew)
      if (payload.exp) {
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const bufferTime = 5000; // 5 second buffer
        return currentTime >= (expirationTime - bufferTime);
      }

      return false; // No expiration claim, assume not expired
    } catch (error) {
      // If we can't decode, assume it might be expired/invalid
      if (process.env.NODE_ENV === 'development') {
        console.debug('Error checking token expiration:', error);
      }
      return true;
    }
  }

  // Centralized method to get the current valid token
  private getValidToken(): string | null {
    // First, try to get token from instance
    let token = this.token;

    // If no token in instance, load from localStorage
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        token = storedToken.trim();
        // Update instance token
        this.token = token;
        if (!this.tokenSetTime) {
          this.tokenSetTime = Date.now() - 1000;
        }
      }
    }

    // Validate token before returning
    if (token) {
      token = token.trim();

      // Validate token format first (JWT should have 3 parts)
      const parts = token.split('.');
      if (parts.length !== 3) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Invalid token format - expected 3 parts, got', parts.length);
        }
        this.setToken(null);
        return null;
      }

      // Check if token is expired (pass token to method for validation)
      if (this.isTokenExpired(token)) {
        // Clear expired token
        if (process.env.NODE_ENV === 'development') {
          console.debug('Token is expired, clearing it');
        }
        this.setToken(null);
        return null;
      }
    }

    return token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Skip token loading for login/signup endpoints (they don't need auth)
    const isAuthEndpoint = endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/signup') ||
      endpoint.includes('/auth/admin/login');

    // Ensure endpoint starts with / and doesn't have trailing slash issues
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${cleanEndpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Get valid token for authenticated endpoints
    let tokenToUse: string | null = null;
    if (!isAuthEndpoint) {
      tokenToUse = this.getValidToken();

      if (tokenToUse) {
        // Ensure Authorization header is properly formatted: "Bearer <token>" with no extra spaces
        headers['Authorization'] = `Bearer ${tokenToUse}`;

        // Debug logging for authenticated endpoints in development
        const authEndpoints = ['/api/cart', '/api/wishlist', '/api/orders', '/api/auth/me'];
        if (process.env.NODE_ENV === 'development' && authEndpoints.some(ep => endpoint.includes(ep))) {
          // Try to decode token payload to see what's in it
          let tokenInfo = {};
          try {
            const tokenParts = tokenToUse.split('.');
            const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
            tokenInfo = {
              userId: payload.sub || payload.user_id || 'unknown',
              exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'no exp',
              iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'no iat',
              isExpired: payload.exp ? Date.now() >= payload.exp * 1000 : false,
              timeUntilExpiry: payload.exp ? Math.max(0, payload.exp * 1000 - Date.now()) : null
            };
          } catch (e) {
            tokenInfo = { decodeError: 'Could not decode token payload' };
          }

          console.debug('📤 Sending authenticated request:', {
            endpoint,
            tokenLength: tokenToUse.length,
            tokenPrefix: tokenToUse.substring(0, 30) + '...',
            hasToken: true,
            tokenInfo
          });
        }
      } else {
        // Only log warning for authenticated endpoints
        const authEndpoints = ['/api/cart', '/api/wishlist', '/api/orders', '/api/auth/me'];
        if (authEndpoints.some(ep => endpoint.includes(ep))) {
          console.warn('⚠️ No valid token found for authenticated request to', endpoint);
        }
      }
    }

    try {
      // Explicitly set redirect to 'follow' to ensure Authorization header is preserved on redirects
      const response = await fetch(url, {
        ...options,
        headers,
        redirect: 'follow', // Explicitly follow redirects and preserve headers
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - token might be invalid, expired, or missing
        if (response.status === 401) {
          const authEndpoints = ['/api/cart', '/api/wishlist', '/api/orders', '/api/auth/me'];
          const requiresAuth = authEndpoints.some(ep => endpoint.includes(ep));

          let errorDetail = 'Could not validate credentials';
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.message || errorDetail;
          } catch {
            // Couldn't parse error, use default
          }

          // Enhanced debugging for 401 errors
          if (process.env.NODE_ENV === 'development' && requiresAuth) {
            const tokenInfo = tokenToUse ? {
              tokenLength: tokenToUse.length,
              tokenPrefix: tokenToUse.substring(0, 30) + '...',
              isExpired: this.isTokenExpired(),
              timeSinceSet: this.tokenSetTime ? Date.now() - this.tokenSetTime : null
            } : null;

            console.error('🔴 401 Unauthorized Error:', {
              endpoint,
              hadToken: !!tokenToUse,
              errorDetail,
              tokenInfo
            });
          }

          // Handle token clearing for authenticated endpoints
          if (requiresAuth && tokenToUse) {
            // Check if error suggests invalid/expired token
            const invalidTokenIndicators = ['invalid', 'expired', 'malformed', 'decode', 'credentials'];
            const isInvalidToken = invalidTokenIndicators.some(indicator =>
              errorDetail.toLowerCase().includes(indicator)
            );

            // Grace period: Don't clear token if it was just set (within last 3 seconds)
            // This prevents clearing token due to race conditions after login
            const timeSinceTokenSet = this.tokenSetTime ? Date.now() - this.tokenSetTime : Infinity;
            const isRecentToken = timeSinceTokenSet < 3000; // 3 second grace period

            // Also check if token is expired client-side
            const clientSideExpired = this.isTokenExpired();

            if (clientSideExpired || (isInvalidToken && !isRecentToken)) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Clearing invalid/expired token:', {
                  clientSideExpired,
                  isInvalidToken,
                  isRecentToken,
                  errorDetail
                });
              }
              this.setToken(null);
            } else if (isRecentToken) {
              // Token was just set, don't clear it - likely a race condition
              if (process.env.NODE_ENV === 'development') {
                console.debug('401 error but token was just set (grace period), keeping token');
              }
            }
          }

          throw new Error(errorDetail || 'Authentication failed. Please login again.');
        }

        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null as T;
      }

      const jsonData = await response.json();

      // Debug logging for auth endpoints (only in development)
      if (process.env.NODE_ENV === 'development' && (endpoint.includes('/auth/login') || endpoint.includes('/auth/signup') || endpoint.includes('/auth/admin/login'))) {
        console.debug('API Response JSON:', {
          endpoint,
          hasData: !!jsonData,
          dataKeys: jsonData ? Object.keys(jsonData) : [],
          hasToken: !!(jsonData as any)?.token,
        });
      }

      return jsonData;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please ensure the backend is running on http://localhost:8000');
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    // Don't send token in login request (it's a public endpoint)
    const response = await this.request<{ user: any; message: string; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Immediately save token to localStorage as backup
    if (response && (response as any).token && typeof window !== 'undefined') {
      try {
        const token = (response as any).token.trim();
        if (process.env.NODE_ENV === 'development') {
          console.debug('💾 Saving new token to localStorage:', {
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 30) + '...',
            timestamp: new Date().toISOString()
          });
        }
        localStorage.setItem('auth_token', token);
        const verify = localStorage.getItem('auth_token');
        if (verify !== token) {
          console.error('❌ Token save verification failed in login method');
        } else {
          // Update instance token immediately
          this.token = token;
          this.tokenSetTime = Date.now();
        }
      } catch (e) {
        console.error('Error saving token directly in login method:', e);
      }
    }

    return response;
  }

  async adminLogin(email: string, password: string) {
    // Don't send token in admin login request (it's a public endpoint)
    const response = await this.request<{ user: any; message: string; token: string }>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Immediately save token to localStorage as backup
    if (response && (response as any).token && typeof window !== 'undefined') {
      try {
        const token = (response as any).token.trim();
        if (process.env.NODE_ENV === 'development') {
          console.debug('💾 Saving new admin token to localStorage:', {
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 30) + '...',
            timestamp: new Date().toISOString()
          });
        }
        localStorage.setItem('auth_token', token);
        const verify = localStorage.getItem('auth_token');
        if (verify !== token) {
          console.error('❌ Token save verification failed in adminLogin method');
        } else {
          // Update instance token immediately
          this.token = token;
          this.tokenSetTime = Date.now();
        }
      } catch (e) {
        console.error('Error saving token directly in adminLogin method:', e);
      }
    }

    return response;
  }

  async signup(name: string, email: string, password: string) {
    // Don't send token in signup request (it's a public endpoint)
    const response = await this.request<{ user: any; message: string; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    // Immediately save token to localStorage as backup
    if (response && (response as any).token && typeof window !== 'undefined') {
      try {
        const token = (response as any).token.trim();
        if (process.env.NODE_ENV === 'development') {
          console.debug('💾 Saving new signup token to localStorage:', {
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 30) + '...',
            timestamp: new Date().toISOString()
          });
        }
        localStorage.setItem('auth_token', token);
        const verify = localStorage.getItem('auth_token');
        if (verify !== token) {
          console.error('❌ Token save verification failed in signup method');
        } else {
          // Update instance token immediately
          this.token = token;
          this.tokenSetTime = Date.now();
        }
      } catch (e) {
        console.error('Error saving token directly in signup method:', e);
      }
    }

    return response;
  }

  async getCurrentUser() {
    // Get valid token using centralized method
    const token = this.getValidToken();

    if (!token) {
      throw new Error('No valid authentication token found. Please login again.');
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('🔍 Getting current user with token:', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 30) + '...',
        isExpired: this.isTokenExpired(token)
      });
    }

    return this.request<any>('/api/auth/me');
  }

  // Product endpoints
  async getProducts(params?: { category?: string; featured?: boolean; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.featured !== undefined) queryParams.append('featured', String(params.featured));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    const query = queryParams.toString();
    return this.request<any[]>(`/api/products/${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/api/products/${id}`);
  }

  /**
   * Search products with multiple filters
   * Used by chatbot and search functionality
   */
  async searchProducts(params: {
    q?: string;           // Search query (name/description)
    category?: string;    // Filter by category (women, men, accessories, kids)
    subCategory?: string; // Filter by sub-category
    minPrice?: number;    // Minimum price
    maxPrice?: number;    // Maximum price
    color?: string;       // Filter by color
    size?: string;        // Filter by size
    featured?: boolean;   // Featured products only
    limit?: number;       // Max results (default: 20)
  }) {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.category) queryParams.append('category', params.category);
    if (params.subCategory) queryParams.append('sub_category', params.subCategory);
    if (params.minPrice !== undefined) queryParams.append('min_price', String(params.minPrice));
    if (params.maxPrice !== undefined) queryParams.append('max_price', String(params.maxPrice));
    if (params.color) queryParams.append('color', params.color);
    if (params.size) queryParams.append('size', params.size);
    if (params.featured !== undefined) queryParams.append('featured', String(params.featured));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const query = queryParams.toString();
    return this.request<any[]>(`/api/products/search${query ? `?${query}` : ''}`);
  }

  /**
   * AI Chat endpoint - sends message to backend for Gemini processing
   * Returns AI response with matching products and clarification info
   */
  async chat(params: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    language?: 'ar' | 'en';
  }): Promise<{
    message: string;
    products: Array<{
      id: string;
      name: string;
      short_name: string;
      price: number;
      sale_price?: number;
      category: string;
      image: string;
      reason?: string;
    }>;
    language: string;
    needs_clarification: boolean;
    clarification_questions: string[];
  }> {
    return this.request('/api/chat/', {
      method: 'POST',
      body: JSON.stringify({
        message: params.message,
        history: params.history || [],
        language: params.language,
      }),
    });
  }

  // AI Fit Assistant endpoint
  async getFitRecommendations(params: {
    gender?: string;
    height_cm?: number | null;
    weight_kg?: number | null;
    body_shape?: string;
    usual_size?: string;
    fit_pain_points?: string[];
    fit_preference?: string;
    style_aesthetic?: string;
    main_occasion?: string;
    budget_min?: number | null;
    budget_max?: number | null;
    favorite_colors?: string[];
    avoid_colors?: string[];
  }): Promise<{
    summary: string;
    fit_tips: string[];
    products: Array<{
      id: string;
      name: string;
      short_name: string;
      price: number;
      sale_price?: number;
      category: string;
      image: string;
      reason: string;
    }>;
  }> {
    return this.request('/api/fit-assistant/recommend', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // AI Product Assistant endpoint
  async generateProductInfo(params: {
    raw_name: string;
    raw_description?: string;
    category?: string;
    subcategory?: string;
    colors?: string[];
    sizes?: string[];
  }): Promise<{
    name: string;
    short_name: string;
    description: string;
    category?: string;
    subcategory?: string;
    colors: string[];
    sizes: string[];
    tags: string[];
    notes?: string;
    error?: string;
  }> {
    return this.request('/api/product-ai/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }



  async createProduct(product: any) {
    return this.request<any>('/api/products/', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: any) {
    return this.request<any>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string) {
    return this.request<void>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  async regenerateProductTags(id: string) {
    return this.request<any>(`/api/products/${id}/regenerate-tags`, {
      method: 'POST',
    });
  }

  // Cart endpoints
  async getCartItems() {
    return this.request<any[]>('/api/cart/');
  }

  async addToCart(item: { product_id: string; size: string; color: string; quantity: number }) {
    return this.request<any>('/api/cart/', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateCartItem(itemId: number, quantity: number) {
    return this.request<any>(`/api/cart/${itemId}?quantity=${quantity}`, {
      method: 'PUT',
    });
  }

  async removeFromCart(itemId: number) {
    return this.request<void>(`/api/cart/${itemId}`, {
      method: 'DELETE',
    });
  }

  async clearCart() {
    return this.request<void>('/api/cart/', {
      method: 'DELETE',
    });
  }

  // Order endpoints
  async getOrders(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/api/orders${query}`);
  }

  async getOrder(id: string) {
    return this.request<any>(`/api/orders/${id}`);
  }

  async createOrder(order: any) {
    return this.request<any>('/api/orders/', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request<any>(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Wishlist endpoints
  async getWishlist() {
    return this.request<any[]>('/api/wishlist/');
  }

  async addToWishlist(productId: string) {
    return this.request<any>(`/api/wishlist/${productId}`, {
      method: 'POST',
    });
  }

  async removeFromWishlist(productId: string) {
    return this.request<void>(`/api/wishlist/${productId}`, {
      method: 'DELETE',
    });
  }

  // ============ Admin Inventory API ============

  async getAdminInventory(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      sku: string;
      stock: number;
      status: 'in_stock' | 'low_stock' | 'out_of_stock';
      image?: string;
    }>;
    total: number;
    page: number;
    page_size: number;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('page_size', params.pageSize.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString();
    return this.request(`/api/admin/inventory${queryString ? `?${queryString}` : ''}`);
  }

  async restockProduct(productId: string, amount: number): Promise<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    status: string;
    message: string;
  }> {
    return this.request(`/api/admin/inventory/${productId}/restock`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getLowStockProducts(threshold?: number, limit?: number): Promise<Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    status: string;
    image?: string;
  }>> {
    const query = new URLSearchParams();
    if (threshold !== undefined) query.set('threshold', threshold.toString());
    if (limit !== undefined) query.set('limit', limit.toString());

    const queryString = query.toString();
    return this.request(`/api/admin/inventory/low-stock${queryString ? `?${queryString}` : ''}`);
  }

  // ============ Admin Categories API ============

  async getAdminCategoriesSummary(): Promise<Array<{
    id: number | null;
    name: string;
    slug: string;
    product_count: number;
  }>> {
    return this.request('/api/admin/categories/summary');
  }

  async getAdminSubcategoriesSummary(category?: string): Promise<Array<{
    id: number | null;
    name: string;
    slug: string;
    product_count: number;
  }>> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/admin/categories/subcategories${query}`);
  }

  async createCategory(data: { name: string; slug: string }): Promise<{
    id: number | null;
    name: string;
    slug: string;
    product_count: number;
    message: string;
  }> {
    return this.request('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminCategory(slug: string): Promise<{
    success: boolean;
    slug: string;
    message: string;
  }> {
    return this.request(`/api/admin/categories/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);


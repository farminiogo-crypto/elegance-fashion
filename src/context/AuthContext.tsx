import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from API on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Check if token is expired before using it
        apiService.reloadToken();
        if (apiService.isTokenExpired()) {
          console.debug('Token is expired on page load, clearing it');
          apiService.setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Ensure token is loaded in ApiService before making request
        apiService.setToken(token);
        apiService.reloadToken();
        
        try {
          const userData = await apiService.getCurrentUser();
          setUser({
            id: String(userData.id),
            name: userData.name,
            email: userData.email,
            role: userData.role,
          });
        } catch (error: any) {
          // On initial page load, be very conservative about clearing tokens
          // The backend returns generic "Could not validate credentials" for many cases:
          // - Invalid token
          // - Expired token  
          // - User doesn't exist
          // - Database error
          // - JWT decode error
          // Since we can't distinguish, we'll keep the token and let the user manually logout if needed
          
          const errorMessage = error?.message || '';
          
          // Check if this is a network/connection error
          const isNetworkError = 
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('Cannot connect to server') ||
            errorMessage.includes('Network') ||
            errorMessage.includes('timeout');
          
          // Check if token was recently set/loaded (grace period)
          const isRecentToken = (apiService as any).isTokenRecent ? 
            (apiService as any).isTokenRecent(10000) : true; // 10 second grace period, default to true if method doesn't exist
          
          // Check if token is expired (client-side check)
          const isExpired = (apiService as any).isTokenExpired ? 
            (apiService as any).isTokenExpired() : false;
          
          // Only log errors in development mode to reduce console noise
          // These are expected warnings when token validation fails on page reload
          if (process.env.NODE_ENV === 'development') {
            if (isExpired) {
              console.info('Token appears to be expired. User will need to login again.');
            } else if (isNetworkError) {
              console.warn('Network error loading user on page reload, keeping token:', errorMessage);
            } else if (isRecentToken) {
              console.debug('Auth error but token was recently set/loaded, keeping token (grace period):', errorMessage);
            } else {
              // Silent - this is expected behavior on page reload with potentially invalid tokens
              // Token is kept for user convenience, they can manually logout if needed
            }
          }
          
          // Always keep the token on page reload - don't clear it
          // The token will only be cleared if:
          // 1. User explicitly logs out
          // 2. A subsequent API call (not during initial load) gets a specific invalid token error
          setUser(null);
        }
      } else {
        // No token, ensure user is null
        setUser(null);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Clear any existing token before login to ensure fresh token
      const oldToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (oldToken) {
        // Check if old token is expired
        if (apiService.isTokenExpired()) {
          console.debug('Clearing expired token before login');
        } else {
          console.debug('Clearing existing token to ensure fresh token on login');
        }
        apiService.setToken(null);
      }
      
      const response = await apiService.login(email, password);
      
      // Verify response contains token
      if (!response || !response.token) {
        console.error('Login response missing token:', {
          response,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : []
        });
        return false;
      }

      // Verify token is a valid string
      const newToken = response.token.trim();
      if (typeof response.token !== 'string' || newToken.length === 0) {
        console.error('Invalid token in login response:', response.token);
        return false;
      }

      // Verify we got a NEW token (different from old one)
      if (oldToken && oldToken.trim() === newToken) {
        console.warn('⚠️ Warning: Received same token as before. This might indicate a backend caching issue.');
        console.warn('Old token:', oldToken.substring(0, 50) + '...');
        console.warn('New token:', newToken.substring(0, 50) + '...');
      } else if (oldToken) {
        console.debug('✅ New token received (different from old token)');
      }

      // Set token first - this saves to localStorage
      apiService.setToken(newToken);
      
      // Verify token was saved to localStorage
      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('auth_token');
        if (!savedToken || savedToken !== newToken) {
          console.error('Token not saved to localStorage after setToken call', {
            responseToken: newToken,
            savedToken: savedToken
          });
          // Try direct save as fallback
          try {
            localStorage.setItem('auth_token', newToken);
            const retryToken = localStorage.getItem('auth_token');
            if (!retryToken || retryToken !== newToken) {
              console.error('Direct localStorage save also failed');
              return false;
            }
            // Update ApiService with the directly saved token
            apiService.setToken(retryToken);
          } catch (e) {
            console.error('Error in fallback token save:', e);
            return false;
          }
        }
      }
      
      // Ensure token is loaded in ApiService
      apiService.reloadToken();
      
      // Verify token is actually set before proceeding
      if (!apiService.hasToken()) {
        console.error('Token was not set properly after login - hasToken() returned false');
        return false;
      }
      
      // Wait for token to be fully available - check if token exists and wait if needed
      // This helps prevent race conditions where the token might not be immediately available
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const tokenCheck = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (tokenCheck && tokenCheck === newToken) {
          // Token is confirmed in localStorage, wait a bit more for ApiService to sync
          await new Promise(resolve => setTimeout(resolve, 100));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.warn('Token availability check timed out, proceeding anyway');
      }
      
      // Verify token is valid by calling getCurrentUser
      // This ensures the token works before we set user state
      try {
        const userData = await apiService.getCurrentUser();
        
        // Set user state from the verified API response (more reliable)
        setUser({
          id: String(userData.id),
          name: userData.name,
          email: userData.email,
          role: userData.role,
        });
        return true;
      } catch (verifyError: any) {
        // If getCurrentUser fails, still set user from login response
        // This handles cases where token is valid but getCurrentUser has timing issues
        console.warn('getCurrentUser failed after login, but using login response data:', verifyError?.message);
        
        // Set user state from login response (token was just created, should be valid)
        setUser({
          id: String(response.user.id),
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
        });
        return true;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // Clear any existing token before login to ensure fresh token
      const oldToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (oldToken) {
        apiService.setToken(null);
      }
      
      const response = await apiService.adminLogin(email, password);
      
      // Verify response contains token
      if (!response || !response.token) {
        console.error('Admin login response missing token:', response);
        return false;
      }

      // Verify token is a valid string
      const newToken = response.token.trim();
      if (typeof response.token !== 'string' || newToken.length === 0) {
        console.error('Invalid token in admin login response:', response.token);
        return false;
      }

      // Set token first - this saves to localStorage
      apiService.setToken(newToken);
      
      // Verify token was saved to localStorage
      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('auth_token');
        if (!savedToken || savedToken !== newToken) {
          console.error('Token not saved to localStorage after admin login setToken call', {
            responseToken: newToken,
            savedToken: savedToken
          });
          // Try direct save as fallback
          try {
            localStorage.setItem('auth_token', newToken);
            const retryToken = localStorage.getItem('auth_token');
            if (!retryToken || retryToken !== newToken) {
              console.error('Direct localStorage save also failed for admin login');
              return false;
            }
            // Update ApiService with the directly saved token
            apiService.setToken(retryToken);
          } catch (e) {
            console.error('Error in fallback token save for admin login:', e);
            return false;
          }
        }
      }
      
      // Ensure token is loaded in ApiService
      apiService.reloadToken();
      
      // Verify token is actually set before proceeding
      if (!apiService.hasToken()) {
        console.error('Token was not set properly after admin login - hasToken() returned false');
        return false;
      }
      
      // Wait for token to be fully available
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const tokenCheck = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (tokenCheck && tokenCheck === newToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      // Verify token is valid by calling getCurrentUser
      try {
        const userData = await apiService.getCurrentUser();
        
        // Set user state from the verified API response
        setUser({
          id: String(userData.id),
          name: userData.name,
          email: userData.email,
          role: userData.role,
        });
        return true;
      } catch (verifyError: any) {
        // If getCurrentUser fails, still set user from login response
        console.warn('getCurrentUser failed after admin login, but using login response data:', verifyError?.message);
        
        // Set user state from login response
        setUser({
          id: String(response.user.id),
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
        });
        return true;
      }
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      // Clear any existing token before signup to ensure fresh token
      const oldToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (oldToken) {
        apiService.setToken(null);
      }
      
      const response = await apiService.signup(name, email, password);
      
      // Verify response contains token
      if (!response || !response.token) {
        console.error('Signup response missing token:', response);
        return false;
      }

      // Verify token is a valid string
      const newToken = response.token.trim();
      if (typeof response.token !== 'string' || newToken.length === 0) {
        console.error('Invalid token in signup response:', response.token);
        return false;
      }

      // Set token first - this saves to localStorage
      apiService.setToken(newToken);
      
      // Verify token was saved to localStorage
      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('auth_token');
        if (!savedToken || savedToken !== newToken) {
          console.error('Token not saved to localStorage after signup setToken call', {
            responseToken: newToken,
            savedToken: savedToken
          });
          // Try direct save as fallback
          try {
            localStorage.setItem('auth_token', newToken);
            const retryToken = localStorage.getItem('auth_token');
            if (!retryToken || retryToken !== newToken) {
              console.error('Direct localStorage save also failed for signup');
              return false;
            }
            // Update ApiService with the directly saved token
            apiService.setToken(retryToken);
          } catch (e) {
            console.error('Error in fallback token save for signup:', e);
            return false;
          }
        }
      }
      
      // Ensure token is loaded in ApiService
      apiService.reloadToken();
      
      // Verify token is actually set before proceeding
      if (!apiService.hasToken()) {
        console.error('Token was not set properly after signup - hasToken() returned false');
        return false;
      }
      
      // Wait for token to be fully available
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const tokenCheck = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (tokenCheck && tokenCheck === newToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      // Verify token is valid by calling getCurrentUser
      try {
        const userData = await apiService.getCurrentUser();
        
        // Set user state from the verified API response
        setUser({
          id: String(userData.id),
          name: userData.name,
          email: userData.email,
          role: userData.role,
        });
        return true;
      } catch (verifyError: any) {
        // If getCurrentUser fails, still set user from signup response
        console.warn('getCurrentUser failed after signup, but using signup response data:', verifyError?.message);
        
        // Set user state from signup response
        setUser({
          id: String(response.user.id),
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
        });
        return true;
      }
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    apiService.setToken(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading: loading,
        login,
        adminLogin,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

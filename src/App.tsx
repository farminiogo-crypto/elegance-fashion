import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AIFitAssistantDocsPage from './pages/AIFitAssistantDocsPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { OrderProvider } from './context/OrderContext';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerServiceAgent from './components/CustomerServiceAgent';

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <OrderProvider>
          <CartProvider>
            <WishlistProvider>
              <>
                <Router>
                  <div className="min-h-screen bg-white">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/index.html" element={<Navigate to="/" replace />} />
                      <Route path="/preview_page.html" element={<Navigate to="/" replace />} />
                      <Route path="/shop" element={<ShopPage category="all" />} />
                      <Route path="/shop/women" element={<ShopPage category="women" />} />
                      <Route path="/shop/men" element={<ShopPage category="men" />} />
                      <Route path="/shop/kids" element={<ShopPage category="kids" />} />
                      <Route path="/shop/accessories" element={<ShopPage category="accessories" />} />
                      <Route path="/shop/new-arrivals" element={<ShopPage category="new-arrivals" />} />
                      <Route path="/product/:id" element={<ProductDetailPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/ai-fit-assistant-docs" element={<AIFitAssistantDocsPage />} />

                      {/* Auth Routes */}
                      <Route path="/signin" element={<SignInPage />} />
                      <Route path="/signup" element={<SignUpPage />} />
                      <Route path="/admin/login" element={<AdminLoginPage />} />

                      {/* Protected Routes */}
                      <Route
                        path="/checkout"
                        element={
                          <ProtectedRoute>
                            <CheckoutPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute requireAdmin>
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      />

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <Toaster position="top-right" />
                  </div>
                  <CustomerServiceAgent />
                </Router>
              </>
            </WishlistProvider>
          </CartProvider>
        </OrderProvider>
      </ProductProvider>
    </AuthProvider>
  );
}

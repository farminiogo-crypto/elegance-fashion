import { Link, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingBag, Menu, X, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { toast } from 'sonner';

export default function Header() {
  const { totalItems } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${searchQuery}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  return (
    <>
      {/* Announcement Banner */}
      <div className="bg-neutral-900 text-white text-center py-2 px-4">
        <p className="text-sm">Free shipping on orders over $200 | New Arrivals Now Available</p>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 bg-white border-b border-neutral-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <h1 className="tracking-[0.3em] uppercase">Élégance</h1>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                Home
              </Link>
              <Link to="/shop" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                Shop
              </Link>
              <Link to="/shop/women" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                Women
              </Link>
              <Link to="/shop/men" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                Men
              </Link>
              <Link to="/shop/kids" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                Kids
              </Link>
              <Link to="/shop/accessories" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                Accessories
              </Link>
              <Link to="/shop/new-arrivals" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                New Arrivals
              </Link>
              <Link to="/about" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                About
              </Link>
              <Link to="/contact" className="text-neutral-700 hover:text-neutral-900 transition-colors">
                Contact
              </Link>
            </nav>

            {/* Icons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <Search size={20} />
              </button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-2 hover:bg-neutral-100 rounded-full transition-colors outline-none">
                    <User size={20} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-sm">
                      <p className="truncate">{user?.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      My Account
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/signin"
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <User size={20} />
                </Link>
              )}

              <Link
                to="/cart"
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors relative"
              >
                <ShoppingBag size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-neutral-900 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-neutral-200 overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <form onSubmit={handleSearch} className="flex items-center">
                  <input
                    type="text"
                    placeholder="Search for products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-neutral-900 text-white rounded-r-md hover:bg-neutral-800 transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-neutral-200 overflow-hidden"
            >
              <nav className="px-4 py-4 space-y-3">
                <Link
                  to="/"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/shop"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Shop
                </Link>
                <Link
                  to="/shop/women"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Women
                </Link>
                <Link
                  to="/shop/men"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Men
                </Link>
                <Link
                  to="/shop/kids"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Kids
                </Link>
                <Link
                  to="/shop/accessories"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Accessories
                </Link>
                <Link
                  to="/shop/new-arrivals"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  New Arrivals
                </Link>
                <Link
                  to="/about"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  className="block py-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

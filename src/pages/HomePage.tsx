import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import AIFitStudio from '../components/AIFitStudio';
import RecentlyViewed from '../components/RecentlyViewed';
import { useProducts } from '../context/ProductContext';
import { recommendationService } from '../services/recommendationService';
import type { Product } from '../services/recommendationService';
import { Button } from '../components/ui/button';

export default function HomePage() {
  const { products, getTrendingProducts } = useProducts();
  const [fitAssistantOpen, setFitAssistantOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [personalizedProducts, setPersonalizedProducts] = useState<Product[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);

  // Fetch personalized recommendations from backend API
  useEffect(() => {
    const fetchPersonalizedRecommendations = async () => {
      setIsLoadingRecommendations(true);
      try {
        const recommendations = await recommendationService.getPersonalizedRecommendations(8);
        setPersonalizedProducts(recommendations);
      } catch (error) {
        console.error('Failed to fetch personalized recommendations:', error);
        // Fallback to empty array on error
        setPersonalizedProducts([]);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchPersonalizedRecommendations();
  }, []);

  // Get featured products, fallback to trending if none are featured
  let featuredProducts = products.filter((p) => p.featured);
  const trendingProducts = getTrendingProducts(8);

  // If no featured products, use trending products as fallback
  if (featuredProducts.length === 0 && trendingProducts.length > 0) {
    featuredProducts = trendingProducts.slice(0, 8);
  }

  // If still no products, use first 8 products
  if (featuredProducts.length === 0 && products.length > 0) {
    featuredProducts = products.slice(0, 8);
  }

  const testimonials = [
    {
      name: 'Sarah Johnson',
      text: 'The quality and attention to detail is exceptional. Every piece feels luxurious and timeless.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      text: 'Finally found a brand that understands minimalist elegance. The fit is perfect every time.',
      rating: 5,
    },
    {
      name: 'Emma Williams',
      text: 'Outstanding customer service and beautiful pieces that I know will last for years.',
      rating: 5,
    },
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div>
      <Header />

      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/hero-banner.jpg"
            alt="Hero"
            className="w-full h-full object-cover"
          />
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center text-white px-4 max-w-3xl"
        >
          {/* AI Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span className="text-sm tracking-wider uppercase">AI-Powered Fashion</span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-light mb-4 text-white">
            Timeless <span className="font-semibold">Elegance</span>
          </h1>

          {/* Animated separator line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="w-20 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-6"
          />

          <p className="text-lg mb-8 max-w-lg mx-auto text-white/90">
            Discover your perfect style with our AI-powered recommendations, designed for those who appreciate quality and simplicity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop">
              <Button size="lg" className="bg-white text-neutral-900 hover:bg-neutral-100 shadow-lg hover:shadow-xl transition-all">
                Shop Now <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setFitAssistantOpen(true)}
              className="bg-white/10 backdrop-blur-sm text-white border-white/50 hover:bg-white/20 hover:border-white transition-all"
            >
              <Sparkles size={18} className="mr-2 text-amber-300" />
              AI Fit Assistant
            </Button>
          </div>
        </motion.div>
      </section>


      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-light mb-3">Shop by Category</h2>
          <p className="text-neutral-500">Explore our curated collections</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Women', path: '/shop/women', image: 'https://images.unsplash.com/photo-1638717366457-dbcaf6b1afbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600' },
            { name: 'Men', path: '/shop/men', image: 'https://images.unsplash.com/photo-1744551154437-133615e57adb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600' },
            { name: 'Kids', path: '/shop/kids', image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600' },
            { name: 'Accessories', path: '/shop/accessories', image: 'https://images.unsplash.com/photo-1569388330292-79cc1ec67270?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600' },
          ].map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Link
                to={category.path}
                className="group relative aspect-square overflow-hidden rounded-xl block shadow-md hover:shadow-2xl transition-shadow duration-500"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition-all duration-500" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <h3 className="text-white text-xl md:text-2xl font-light tracking-wide group-hover:scale-110 transition-transform duration-300">
                    {category.name}
                  </h3>
                  <motion.span
                    className="text-white/70 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    Shop Now →
                  </motion.span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>


      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-light mb-4">Featured Collection</h2>
          <p className="text-neutral-500 max-w-2xl mx-auto">
            Handpicked pieces that embody our commitment to timeless design and exceptional quality.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-12"
        >
          <Link to="/shop">
            <Button variant="outline" size="lg" className="hover:shadow-lg transition-shadow">
              View All Products <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>


      {/* Trending Products */}
      {trendingProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="mb-2">Trending Now</h2>
              <p className="text-neutral-600">Most popular products this season</p>
            </div>
            <Link to="/shop?sort=trending">
              <Button variant="outline" className="flex items-center gap-2">
                View All <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Personalized Recommendations - Based on Real User Activity */}
      {!isLoadingRecommendations && personalizedProducts.length > 0 && (
        <section className="bg-neutral-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={24} className="text-neutral-900" />
                  <h2 className="mb-0">Recommended For You</h2>
                </div>
                <p className="text-neutral-600">Based on your browsing activity and interactions</p>
              </div>
              <Link to="/shop?sort=recommended">
                <Button variant="outline" className="flex items-center gap-2">
                  View All <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {personalizedProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">
                💡 Recommendations update based on products you view, add to cart, and wishlist
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Recently Viewed Products */}
      <RecentlyViewed maxItems={4} />

      {/* AI Fit Assistant CTA */}
      <section className="bg-neutral-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles size={48} className="mx-auto mb-6 text-neutral-900" />
          <h2 className="mb-4">Discover Your Perfect Fit</h2>
          <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
            Our AI-powered fit assistant helps you find pieces that match your body type, style preferences, and fit requirements.
          </p>
          <Button
            size="lg"
            onClick={() => setFitAssistantOpen(true)}
            className="bg-neutral-900 hover:bg-neutral-800"
          >
            <Sparkles size={18} className="mr-2" />
            Get Started
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="mb-4">What Our Customers Say</h2>
        </div>
        <div className="relative">
          <motion.div
            key={currentTestimonial}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center px-12"
          >
            <div className="flex justify-center mb-4">
              {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                <span key={i} className="text-neutral-900 text-2xl">★</span>
              ))}
            </div>
            <p className="text-lg mb-6 text-neutral-700">
              "{testimonials[currentTestimonial].text}"
            </p>
            <p className="text-neutral-900">{testimonials[currentTestimonial].name}</p>
          </motion.div>
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </section>

      <Footer />
      <AIFitStudio isOpen={fitAssistantOpen} onClose={() => setFitAssistantOpen(false)} />
    </div>
  );
}

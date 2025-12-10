import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success('Thank you for subscribing!');
      setEmail('');
    }
  };

  return (
    <footer className="bg-neutral-50 border-t border-neutral-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="tracking-[0.3em] uppercase mb-4">Élégance</h3>
            <p className="text-neutral-600 mb-4">
              Timeless fashion for the modern minimalist. Curated collections that blend elegance with everyday comfort.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/shop/new-arrivals" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="mb-4">Customer Service</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Shipping & Returns
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Size Guide
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-4">Newsletter</h4>
            <p className="text-neutral-600 mb-4">
              Subscribe to receive exclusive offers and updates.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-600 text-sm mb-4 md:mb-0">
            © 2025 Élégance. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
              <Instagram size={20} />
            </a>
            <a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
              <Facebook size={20} />
            </a>
            <a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
              <Twitter size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

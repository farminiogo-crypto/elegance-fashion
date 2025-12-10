import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <ShoppingBag size={64} className="mx-auto mb-4 text-neutral-300" />
            <h2 className="mb-2">Your cart is empty</h2>
            <p className="text-neutral-600 mb-8">Add some items to get started</p>
            <Link to="/shop">
              <Button size="lg" className="bg-neutral-900 hover:bg-neutral-800">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.size}-${item.color}`}
                  className="flex gap-4 p-4 border border-neutral-200 rounded-lg"
                >
                  <Link to={`/product/${item.id}`} className="flex-shrink-0">
                    <div className="w-24 h-32 bg-neutral-100 rounded-md overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>

                  <div className="flex-1 flex flex-col">
                    <Link to={`/product/${item.id}`}>
                      <h3 className="hover:text-neutral-600 transition-colors">{item.name}</h3>
                    </Link>
                    <p className="text-sm text-neutral-600 mt-1">
                      {item.color} / {item.size}
                    </p>
                    <p className="mt-2">${item.price}</p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.size, item.color, item.quantity - 1)
                          }
                          className="w-8 h-8 border border-neutral-300 rounded-md hover:border-neutral-900 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.size, item.color, item.quantity + 1)
                          }
                          className="w-8 h-8 border border-neutral-300 rounded-md hover:border-neutral-900 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id, item.size, item.color)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-50 p-6 rounded-lg sticky top-24">
              <h3 className="mb-6">Order Summary</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-neutral-200">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping</span>
                  <span>{totalPrice >= 200 ? 'Free' : '$15.00'}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Tax</span>
                  <span>${(totalPrice * 0.08).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <span>Total</span>
                <span>
                  ${(totalPrice + (totalPrice >= 200 ? 0 : 15) + totalPrice * 0.08).toFixed(2)}
                </span>
              </div>

              <Link to="/checkout">
                <Button size="lg" className="w-full bg-neutral-900 hover:bg-neutral-800">
                  Proceed to Checkout
                </Button>
              </Link>

              <Link to="/shop">
                <Button variant="outline" size="lg" className="w-full mt-3">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

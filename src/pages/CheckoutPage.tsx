import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const firstName = (form.querySelector('#firstName') as HTMLInputElement)?.value || '';
      const lastName = (form.querySelector('#lastName') as HTMLInputElement)?.value || '';
      const email = (form.querySelector('#email') as HTMLInputElement)?.value || user?.email || '';
      const address = (form.querySelector('#address') as HTMLInputElement)?.value || '';
      const city = (form.querySelector('#city') as HTMLInputElement)?.value || '';
      const postalCode = (form.querySelector('#postalCode') as HTMLInputElement)?.value || '';
      const country = (form.querySelector('[role="combobox"]') as HTMLElement)?.textContent || '';

      const shippingAddress = `${address}, ${city}, ${postalCode}, ${country}`;
      const customerName = `${firstName} ${lastName}`.trim() || user?.name || '';

      const order = {
        customer: customerName,
        email: email,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: 'Pending' as const,
        total: totalPrice,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
      };

      await addOrder(order);
      await clearCart();

      toast.success('Order placed successfully!');
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
      console.error('Error placing order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  if (items.length === 0) {
    return null;
  }

  const shipping = totalPrice >= 200 ? 0 : 15;
  const tax = totalPrice * 0.08;
  const total = totalPrice + shipping + tax;

  return (
    <div>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Information */}
              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h3 className="mb-6">Shipping Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue={user?.name.split(' ')[0]} required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue={user?.name.split(' ')[1] || ''} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={user?.email} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" required />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" required />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" required />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="country">Country</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h3 className="mb-6">Payment Method</h3>

                <div className="flex gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-colors ${paymentMethod === 'card'
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200'
                      }`}
                  >
                    <CreditCard className="mx-auto mb-2" size={24} />
                    <p className="text-sm">Credit Card</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-colors ${paymentMethod === 'paypal'
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200'
                      }`}
                  >
                    <div className="mx-auto mb-2">💳</div>
                    <p className="text-sm">PayPal</p>
                  </button>
                </div>

                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input id="cardNumber" placeholder="1234 5678 9012 3456" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input id="expiry" placeholder="MM/YY" required />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" placeholder="123" required />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center gap-2 text-sm text-neutral-600">
                  <Lock size={16} />
                  <span>Your payment information is secure and encrypted</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-neutral-50 p-6 rounded-lg sticky top-24">
                <h3 className="mb-6">Order Summary</h3>

                {/* Items */}
                <div className="space-y-4 mb-6 pb-6 border-b border-neutral-200">
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${item.size}-${item.color}`}
                      className="flex gap-3"
                    >
                      <div className="w-16 h-20 bg-white rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-xs text-neutral-600">
                          {item.color} / {item.size}
                        </p>
                        <p className="text-sm mt-1">
                          ${item.price} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6 pb-6 border-b border-neutral-200">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between mb-6">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-neutral-900 hover:bg-neutral-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

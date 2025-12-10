import { useState } from 'react';
import { Package, Heart, User, MapPin } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ProductCard from '../components/ProductCard';

export default function ProfilePage() {
  const { items: wishlistItems } = useWishlist();
  const { user } = useAuth();
  const { products } = useProducts();
  
  const orders = [
    {
      id: 'ORD-001',
      date: 'November 5, 2025',
      status: 'Delivered',
      total: 495.00,
      items: [
        { name: 'Cashmere Blend Coat', quantity: 1, image: products[0].images[0] },
      ],
    },
    {
      id: 'ORD-002',
      date: 'October 28, 2025',
      status: 'Shipped',
      total: 350.00,
      items: [
        { name: 'Leather Tote Bag', quantity: 1, image: products[2].images[0] },
      ],
    },
    {
      id: 'ORD-003',
      date: 'October 15, 2025',
      status: 'Processing',
      total: 125.00,
      items: [
        { name: 'Oversized Linen Shirt', quantity: 1, image: products[1].images[0] },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const wishlistProducts = products.filter(p => wishlistItems.some(w => w.id === p.id));

  return (
    <div>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="mb-8">My Account</h1>

        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="orders"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 gap-2"
            >
              <Package size={18} />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 gap-2"
            >
              <Heart size={18} />
              Wishlist ({wishlistItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 gap-2"
            >
              <User size={18} />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="addresses"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 gap-2"
            >
              <MapPin size={18} />
              Addresses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="border border-neutral-200 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <div>
                    <p className="mb-1">Order #{order.id}</p>
                    <p className="text-sm text-neutral-600">{order.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-20 h-24 bg-neutral-100 rounded-md overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p>{item.name}</p>
                        <p className="text-sm text-neutral-600">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-200 flex gap-3">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Track Order</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="wishlist">
            {wishlistProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {wishlistProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Heart size={64} className="mx-auto mb-4 text-neutral-300" />
                <p className="text-neutral-600">Your wishlist is empty</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="max-w-2xl">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">First Name</label>
                  <input
                    type="text"
                    defaultValue={user?.name.split(' ')[0]}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Last Name</label>
                  <input
                    type="text"
                    defaultValue={user?.name.split(' ')[1] || ''}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Phone</label>
                  <input
                    type="tel"
                    defaultValue="+1 (555) 123-4567"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>
              <Button className="bg-neutral-900 hover:bg-neutral-800">Save Changes</Button>
            </div>
          </TabsContent>

          <TabsContent value="addresses" className="max-w-2xl">
            <div className="space-y-4">
              <div className="border border-neutral-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-2">
                  <p>Primary Address</p>
                  <Badge>Default</Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  123 Fashion Street<br />
                  New York, NY 10001<br />
                  United States
                </p>
                <div className="mt-4 flex gap-3">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">Remove</Button>
                </div>
              </div>
              <Button variant="outline" className="w-full">Add New Address</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

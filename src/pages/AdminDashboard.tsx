import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  AlertCircle,
  Settings,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

import { apiService } from '../services/api';
import { useProducts } from '../context/ProductContext';
import { useOrders } from '../context/OrderContext';
import AddProductDialog from '../components/AddProductDialog';
import EditProductDialog from '../components/EditProductDialog';

// ============ Types ============

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image?: string;
};

type CategorySummary = {
  name: string;
  slug: string;
  product_count: number;
};

// ============ Component ============

export default function AdminDashboard() {
  // ---------- Context (safe access) ----------
  const productsCtx = useProducts();
  const ordersCtx = useOrders();

  const products = productsCtx?.products ?? [];
  const deleteProduct = productsCtx?.deleteProduct;
  const refreshProducts = productsCtx?.refreshProducts;
  const orders = ordersCtx?.orders ?? [];
  const updateOrderStatus = ordersCtx?.updateOrderStatus;

  // ---------- Product dialogs ----------
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // ---------- Products pagination ----------
  const [productPage, setProductPage] = useState(1);
  const productPageSize = 20;

  const paginatedProducts = useMemo(
    () => products.slice((productPage - 1) * productPageSize, productPage * productPageSize),
    [products, productPage]
  );
  const totalProductPages = Math.max(1, Math.ceil(products.length / productPageSize));

  // ---------- Inventory state ----------
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // ---------- Categories state ----------
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // ---------- Category dialog ----------
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategorySummary | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  // ---------- Category delete dialog ----------
  const [categoryDeleteDialogOpen, setCategoryDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategorySummary | null>(null);
  const [categoryDeleting, setCategoryDeleting] = useState(false);

  // ---------- Restock dialog ----------
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<{ id: string; name: string; stock: number } | null>(null);
  const [restockAmount, setRestockAmount] = useState(5);
  const [restockLoading, setRestockLoading] = useState(false);

  // ============ Fetch Inventory (full list) ============
  useEffect(() => {
    const fetchInventory = async () => {
      setInventoryLoading(true);
      setInventoryError(null);
      try {
        const data = await apiService.getAdminInventory({ pageSize: 200 });
        const items = data?.items ?? (Array.isArray(data) ? data : []);
        setInventoryItems(items);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        setInventoryError('Failed to load inventory data');
        setInventoryItems([]);
      } finally {
        setInventoryLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // ============ Fetch Categories ============
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await apiService.getAdminCategoriesSummary();
      const categories = Array.isArray(data) ? data : [];
      setCategorySummary(categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategoriesError('Failed to load categories');
      setCategorySummary([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ============ Analytics (computed, defensive) ============
  const analytics = useMemo(() => {
    const safeOrders = orders ?? [];
    const safeProducts = products ?? [];

    const totalRevenue = safeOrders.reduce(
      (sum: number, order: any) => sum + (order.total || 0),
      0
    );
    const totalOrders = safeOrders.length;
    const completedOrders = safeOrders.filter((o: any) => o.status === 'Delivered').length;
    const pendingOrders = safeOrders.filter(
      (o: any) => o.status === 'Pending' || o.status === 'Processing'
    ).length;

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalCustomers: 8549, // mock
      activeCustomers: 3245, // mock
      totalProducts: safeProducts.length,
    };
  }, [orders, products]);

  // ---------- Derived data for Overview ----------
  const recentOrders = (orders ?? []).slice(0, 5);

  // Low stock products from inventory API (no fallback to mock data)
  const lowStockProducts = useMemo(() => {
    return inventoryItems
      .filter((item) => item.status === 'low_stock' || item.status === 'out_of_stock')
      .slice(0, 5);
  }, [inventoryItems]);

  // ============ Product Handlers ============

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setEditProductOpen(true);
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete || !deleteProduct) return;
    try {
      await deleteProduct(productToDelete);
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      console.error('Delete product error:', error);
      const errorMessage = error?.message || error?.detail || 'Failed to delete product';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Not authenticated')) {
        toast.error('You must be logged in as admin to delete products');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('You do not have permission to delete this product');
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        toast.error('Product not found');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleRegenerateTags = async (productId: string) => {
    try {
      toast.loading('Regenerating tags...', { id: 'regenerate-tags' });
      await apiService.regenerateProductTags(productId);
      toast.success('Tags regenerated successfully!', { id: 'regenerate-tags' });
      if (refreshProducts) refreshProducts();
    } catch (error: any) {
      console.error('Regenerate tags error:', error);
      toast.error('Failed to regenerate tags', { id: 'regenerate-tags' });
    }
  };

  // ============ Category Handlers ============

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategorySlug('');
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: CategorySummary) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setCategoryDialogOpen(true);
  };

  const handleCategorySave = async () => {
    const name = categoryName.trim();
    const slug = categorySlug.trim().toLowerCase();

    if (!name || !slug) {
      toast.error('Name and slug are required');
      return;
    }

    setCategorySaving(true);
    try {
      // Call the real API endpoint
      const result = await apiService.createCategory({ name, slug });

      // Show success message from API
      toast.success(result.message || 'Category created successfully');

      // Add to local state if it's a new category
      const exists = categorySummary.some((c) => c.slug === result.slug);
      if (!exists) {
        setCategorySummary((prev) => [
          ...prev,
          { name: result.name, slug: result.slug, product_count: result.product_count }
        ]);
      }

      setCategoryDialogOpen(false);
      // Clear form
      setCategoryName('');
      setCategorySlug('');
      setEditingCategory(null);
    } catch (err) {
      console.error('Failed to save category:', err);
      toast.error('Failed to save category');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleCategoryDeleteClick = (category: CategorySummary) => {
    setCategoryToDelete(category);
    setCategoryDeleteDialogOpen(true);
  };

  const handleCategoryDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setCategoryDeleting(true);
    try {
      const result = await apiService.deleteAdminCategory(categoryToDelete.slug);
      toast.success(result.message || 'Category deleted successfully');

      // Remove from local state
      setCategorySummary((prev: CategorySummary[]) =>
        prev.filter((c: CategorySummary) => c.slug !== categoryToDelete.slug)
      );

      setCategoryDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      // Show the detailed error message from the backend
      const errorMessage = error?.message || 'Failed to delete category';
      toast.error(errorMessage);
    } finally {
      setCategoryDeleting(false);
    }
  };

  // ============ Restock Handlers ============

  const handleRestockClick = (product: { id: string; name: string; stock: number }) => {
    setRestockProduct(product);
    setRestockAmount(5);
    setRestockDialogOpen(true);
  };

  const handleRestockConfirm = async () => {
    if (!restockProduct || restockAmount <= 0) return;
    setRestockLoading(true);
    try {
      const result = await apiService.restockProduct(restockProduct.id, restockAmount);
      setInventoryItems((prev: InventoryItem[]) =>
        prev.map((item: InventoryItem) =>
          item.id === restockProduct.id
            ? { ...item, stock: result.stock, status: result.status as InventoryItem['status'] }
            : item
        )
      );
      toast.success(result.message || 'Product restocked successfully');
      setRestockDialogOpen(false);
      setRestockProduct(null);

      // Refresh products context so Products tab shows updated stock
      if (refreshProducts) {
        await refreshProducts();
      }
    } catch (error) {
      console.error('Failed to restock:', error);
      toast.error('Failed to restock product. Please try again.');
    } finally {
      setRestockLoading(false);
    }
  };

  // ============ Helper Functions ============

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-orange-100 text-orange-800">Low Stock</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  const getProductStockStatus = (stock: number | undefined): string => {
    const s = stock ?? 0;
    if (s === 0) return 'out_of_stock';
    if (s <= 5) return 'low_stock';
    return 'in_stock';
  };


  // ============ Stats Cards ============
  const stats = [
    {
      title: 'Total Revenue',
      value: `$${analytics.totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Total Orders',
      value: analytics.totalOrders.toString(),
      change: '+8.2%',
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      title: 'Active Users',
      value: analytics.totalCustomers.toLocaleString(),
      change: '+23.1%',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Products',
      value: analytics.totalProducts.toString(),
      change: `+${(products ?? []).filter((p: any) => p.featured).length}`,
      icon: Package,
      color: 'text-orange-600',
    },
  ];

  // ============ Render ============
  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-neutral-600">
                Manage products, orders, inventory and categories.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/shop">View Storefront</Link>
            </Button>
            <Button onClick={() => setAddProductOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* ============ OVERVIEW TAB ============ */}
          <TabsContent value="overview" className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-600">{stat.title}</p>
                        <p className="text-2xl font-semibold">{stat.value}</p>
                        <p className={`text-sm ${stat.color}`}>
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                          {stat.change}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full bg-neutral-100 ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Orders + Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <p className="text-neutral-500 text-center py-8">No orders yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentOrders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell>#{order.id?.slice(0, 8)}</TableCell>
                            <TableCell>{order.customer || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>${order.total?.toFixed(2) || '0.00'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Low Stock */}
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900"></div>
                      <span className="ml-2 text-sm text-neutral-500">Loading...</span>
                    </div>
                  ) : inventoryError ? (
                    <p className="text-red-500 text-center py-8 text-sm">{inventoryError}</p>
                  ) : lowStockProducts.length === 0 ? (
                    <p className="text-neutral-500 text-center py-8">No low stock products.</p>
                  ) : (
                    <div className="space-y-3">
                      {lowStockProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral-100 rounded overflow-hidden">
                              <img
                                src={product.image || '/placeholder.jpg'}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                              <p className="text-xs text-neutral-500">{product.stock} in stock</p>
                            </div>
                          </div>
                          {getStockBadge(product.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ ORDERS TAB ============ */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {(orders ?? []).length === 0 ? (
                  <p className="text-neutral-500 text-center py-8">No orders found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(orders ?? []).map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell>#{order.id?.slice(0, 8)}</TableCell>
                            <TableCell>{order.customer || 'Unknown'}</TableCell>
                            <TableCell>{order.date || 'N/A'}</TableCell>
                            <TableCell>
                              <Select
                                defaultValue={order.status}
                                onValueChange={(value: string) => updateOrderStatus?.(order.id, value as any)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Processing">Processing</SelectItem>
                                  <SelectItem value="Shipped">Shipped</SelectItem>
                                  <SelectItem value="Delivered">Delivered</SelectItem>
                                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>${order.total?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ PRODUCTS TAB ============ */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Products ({products.length})</CardTitle>
                <Button onClick={() => setAddProductOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-neutral-500 text-center py-8">No products found.</p>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[35%]">Product</TableHead>
                            <TableHead className="w-[12%]">Category</TableHead>
                            <TableHead className="w-[10%] text-right">Price</TableHead>
                            <TableHead className="w-[10%] text-right">Stock</TableHead>
                            <TableHead className="w-[15%]">Status</TableHead>
                            <TableHead className="w-[18%] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedProducts.map((product: any) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                                    <img
                                      src={product.images?.[0] || '/placeholder.jpg'}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate max-w-[200px]">
                                      {product.short_name || product.name}
                                    </p>
                                    <p className="text-xs text-neutral-500 truncate">
                                      ID: {product.id?.slice(0, 8)}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="capitalize">{product.category || 'N/A'}</TableCell>
                              <TableCell className="text-right">${(product.price ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">{product.stock ?? 0}</TableCell>
                              <TableCell>{getStockBadge(getProductStockStatus(product.stock))}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditProduct(product)}
                                    title="Edit Product"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRegenerateTags(product.id)}
                                    title="Regenerate AI Tags"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteClick(product.id)}
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 text-sm text-neutral-600">
                      <span>
                        Showing {(productPage - 1) * productPageSize + 1}–
                        {Math.min(productPage * productPageSize, products.length)} of {products.length} products
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={productPage === 1}
                          onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={productPage === totalProductPages}
                          onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ CATEGORIES TAB ============ */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Categories</CardTitle>
                <Button size="sm" onClick={openAddCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                    <span className="ml-2">Loading categories...</span>
                  </div>
                ) : categoriesError ? (
                  <div className="flex items-center justify-center py-8 text-red-600">
                    <AlertCircle className="w-6 h-6 mr-2" />
                    <span>{categoriesError}</span>
                  </div>
                ) : categorySummary.length === 0 ? (
                  <p className="text-neutral-500 text-center py-8">No categories found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categorySummary.map((category) => (
                      <div key={category.slug} className="border border-neutral-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{category.name}</h4>
                          <Settings
                            size={18}
                            className="text-neutral-400 cursor-pointer hover:text-neutral-900"
                            onClick={() => openEditCategory(category)}
                          />
                        </div>
                        <p className="text-sm text-neutral-600 mb-3">
                          {category.product_count} products
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditCategory(category)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                            onClick={() => handleCategoryDeleteClick(category)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ INVENTORY TAB ============ */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management ({inventoryItems.length} items)</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                {inventoryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                    <span className="ml-2">Loading inventory...</span>
                  </div>
                ) : inventoryError ? (
                  <div className="flex items-center justify-center py-8 text-red-600">
                    <AlertCircle className="w-6 h-6 mr-2" />
                    <span>{inventoryError}</span>
                  </div>
                ) : inventoryItems.length === 0 ? (
                  <p className="text-neutral-500 text-center py-8">No products in inventory.</p>
                ) : (
                  <div className="border rounded-lg">
                    <Table className="w-full" style={{ tableLayout: 'fixed' }}>
                      <TableHeader>
                        <TableRow>
                          <TableHead style={{ width: '35%' }}>Product</TableHead>
                          <TableHead style={{ width: '15%' }}>SKU</TableHead>
                          <TableHead style={{ width: '12%' }} className="text-right">Stock</TableHead>
                          <TableHead style={{ width: '18%' }}>Status</TableHead>
                          <TableHead style={{ width: '20%' }} className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryItems.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                                  <img
                                    src={product.image || '/placeholder.jpg'}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-sm font-medium truncate"
                                    title={product.name}
                                  >
                                    {product.name?.slice(0, 40)}{product.name?.length > 40 ? '...' : ''}
                                  </p>
                                  <p className="text-xs text-neutral-400">
                                    {product.id?.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm truncate">
                              {product.sku?.slice(0, 12)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {product.stock}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  product.status === 'out_of_stock'
                                    ? 'destructive'
                                    : product.status === 'low_stock'
                                      ? 'secondary'
                                      : 'default'
                                }
                                className={
                                  product.status === 'in_stock'
                                    ? 'bg-green-100 text-green-800 text-xs'
                                    : 'text-xs'
                                }
                              >
                                {product.status === 'out_of_stock'
                                  ? 'Out'
                                  : product.status === 'low_stock'
                                    ? 'Low'
                                    : 'In Stock'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleRestockClick({
                                    id: product.id,
                                    name: product.name,
                                    stock: product.stock,
                                  })
                                }
                              >
                                Restock
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {inventoryItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-neutral-500">
                              No products found in inventory.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ============ DIALOGS ============ */}

      {/* Add Product Dialog */}
      <AddProductDialog isOpen={addProductOpen} onClose={() => setAddProductOpen(false)} />

      {/* Edit Product Dialog */}
      {selectedProduct && (
        <EditProductDialog
          isOpen={editProductOpen}
          onClose={() => {
            setEditProductOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryName(e.target.value)}
                placeholder="e.g. Women's Clothing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={categorySlug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategorySlug(e.target.value)}
                placeholder="e.g. womens-clothing"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCategorySave} disabled={categorySaving}>
              {categorySaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirmation Dialog */}
      <Dialog open={categoryDeleteDialogOpen} onOpenChange={setCategoryDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"?
              {categoryToDelete && categoryToDelete.product_count > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ This category has {categoryToDelete.product_count} products.
                  You must move or delete those products first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCategoryDeleteConfirm}
              disabled={categoryDeleting}
            >
              {categoryDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Add inventory for: {restockProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Current Stock: {restockProduct?.stock || 0}</Label>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="restock-amount">Amount to Add:</Label>
              <Input
                id="restock-amount"
                type="number"
                min={1}
                value={restockAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRestockAmount(Number(e.target.value))}
                className="w-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestockConfirm} disabled={restockLoading}>
              {restockLoading ? 'Restocking...' : 'Confirm Restock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import RecommendationPanel from '../components/RecommendationPanel';
import { useProducts } from '../context/ProductContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

interface ShopPageProps {
  category: string;
}

export default function ShopPage({ category }: ShopPageProps) {
  const { products, isLoading } = useProducts();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const allColors = ['White', 'Black', 'Beige', 'Cream', 'Gray', 'Navy'];
  const allSubcategories = ['t-shirt', 'dress', 'pants', 'shirt', 'jacket', 'shorts', 'skirt', 'sweater', 'jumpsuit', 'bags', 'shoes', 'hats', 'watches', 'clocks', 'rings', 'socks', 'underwear', 'accessories'];

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Category filter (case-insensitive, partial match)
    if (category !== 'all') {
      const categoryLower = category.toLowerCase();
      filtered = filtered.filter((p) => {
        const productCategory = p.category?.toLowerCase() || '';
        // Strict equality for category matching
        return productCategory === categoryLower;
      });
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price filter
    filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Size filter
    if (selectedSizes.length > 0) {
      filtered = filtered.filter((p) =>
        p.sizes && Array.isArray(p.sizes) && p.sizes.some((size: string) => selectedSizes.includes(size))
      );
    }

    // Color filter
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) =>
        p.colors && Array.isArray(p.colors) && p.colors.some((color: string) => selectedColors.includes(color))
      );
    }

    // Subcategory filter
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter((p) =>
        p.subcategory && selectedSubcategories.includes(p.subcategory.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      case 'popularity':
        filtered = [...filtered].sort((a, b) => b.reviews - a.reviews);
        break;
      default:
        // newest - keep original order
        break;
    }

    return filtered;
  }, [products, category, searchQuery, priceRange, selectedSizes, selectedColors, selectedSubcategories, sortBy]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const toggleSubcategory = (subcategory: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcategory) ? prev.filter((s) => s !== subcategory) : [...prev, subcategory]
    );
  };

  const clearFilters = () => {
    setPriceRange([0, 500]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedSubcategories([]);
    setSortBy('newest');
  };

  const categoryTitle = category === 'all' ? 'All Products' :
    category === 'new-arrivals' ? 'New Arrivals' :
      category.charAt(0).toUpperCase() + category.slice(1);

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <Label className="mb-4 block">Price Range</Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={500}
          step={10}
          className="mb-2"
        />
        <div className="flex justify-between text-sm text-neutral-600">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <Label className="mb-4 block">Size</Label>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`px-4 py-2 border rounded-md transition-colors ${selectedSizes.includes(size)
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-300 hover:border-neutral-900'
                }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <Label className="mb-4 block">Color</Label>
        <div className="space-y-2">
          {allColors.map((color) => (
            <div key={color} className="flex items-center">
              <Checkbox
                id={color}
                checked={selectedColors.includes(color)}
                onCheckedChange={() => toggleColor(color)}
              />
              <label htmlFor={color} className="ml-2 text-sm cursor-pointer">
                {color}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Subcategories */}
      <div>
        <Label className="mb-4 block">Subcategory</Label>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allSubcategories.map((subcategory) => (
            <div key={subcategory} className="flex items-center">
              <Checkbox
                id={subcategory}
                checked={selectedSubcategories.includes(subcategory)}
                onCheckedChange={() => toggleSubcategory(subcategory)}
              />
              <label htmlFor={subcategory} className="ml-2 text-sm cursor-pointer capitalize">
                {subcategory}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <Button variant="outline" onClick={clearFilters} className="w-full">
        Clear All Filters
      </Button>
    </div>
  );

  return (
    <div>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">{categoryTitle}</h1>
          <p className="text-neutral-600">
            {searchQuery ? `Search results for "${searchQuery}"` : `${filteredProducts.length} products`}
          </p>
        </div>

        {/* Filters & Sort Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Mobile Filters */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal size={18} className="mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-neutral-600">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h3 className="mb-6">Filters</h3>
              <FilterContent />
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-neutral-600 mb-4">No products found matching your criteria.</p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation Panel */}
      <RecommendationPanel mode="personalized" limit={6} />

      <Footer />
    </div>
  );
}

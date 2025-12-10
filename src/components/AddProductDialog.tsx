import { useState } from 'react';
import { Plus, Upload, X, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useProducts } from '../context/ProductContext';
import { apiService } from '../services/api';

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProductDialog({ isOpen, onClose }: AddProductDialogProps) {
  const { addProduct } = useProducts();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    salePrice: '',
    category: '',
    subCategory: '',
    description: '',
    images: '',
    colors: '',
    sizes: '',
    featured: false,
  });
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // AI Assistant state
  const [aiCategoryHint, setAiCategoryHint] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPreviews: string[] = [];
    const newImages: string[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        newPreviews.push(result);
        newImages.push(result);

        setImagePreview((prev) => [...prev, result]);
        setUploadedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImagePreview((prev) => prev.filter((_, i) => i !== index));
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAiGenerate = async () => {
    // Validation: require at least product name or description
    if (!formData.name.trim() && !formData.description.trim()) {
      toast.error('Please enter at least a product name before using AI.');
      return;
    }

    setIsAiLoading(true);
    setAiApplied(false);

    try {
      // Build payload with current form data
      const currentColors = formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
      const currentSizes = formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];

      const payload = {
        raw_name: formData.name,
        raw_description: formData.description || undefined,
        category: formData.category || undefined,
        subcategory: formData.subCategory || undefined,
        colors: currentColors.length > 0 ? currentColors : undefined,
        sizes: currentSizes.length > 0 ? currentSizes : undefined,
      };

      console.log('AI Product Assistant: Sending request', payload);
      const result = await apiService.generateProductInfo(payload);
      console.log('AI Product Assistant: Received response', result);

      // Check for errors in response
      if (result.error) {
        console.warn('AI returned with error:', result.error);
        toast.error(`AI Note: ${result.error}`);
        return;
      }

      // Apply AI suggestions with proper overwrite rules
      setFormData(prev => {
        // Parse current colors/sizes as arrays
        const prevColors = prev.colors ? prev.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
        const prevSizes = prev.sizes ? prev.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];

        return {
          ...prev,
          // ALWAYS update name and description
          name: result.name || prev.name,
          description: result.description || prev.description,
          // ONLY fill if currently empty
          category: prev.category || result.category || '',
          subCategory: prev.subCategory || result.subcategory || '',
          colors: prevColors.length > 0 ? prev.colors : (result.colors?.length ? result.colors.join(', ') : ''),
          sizes: prevSizes.length > 0 ? prev.sizes : (result.sizes?.length ? result.sizes.join(', ') : ''),
        };
      });

      setAiApplied(true);
      toast.success('AI suggestions applied. Please review before saving.');

      if (result.notes) {
        toast.info(`AI Note: ${result.notes}`, { duration: 5000 });
      }

    } catch (error: any) {
      console.error('AI Product Assistant error:', error);
      toast.error('AI Note: Something went wrong. Please try again or fill the fields manually.');
    } finally {
      setIsAiLoading(false);
    }
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Combine uploaded images and URL images
    const urlImages = formData.images.split(',').map(url => url.trim()).filter(url => url);
    const allImages = [...uploadedImages, ...urlImages];

    const newProduct = {
      name: formData.name,
      price: Number(formData.price),
      salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
      category: formData.category,
      subCategory: formData.subCategory || undefined,
      description: formData.description,
      images: allImages.length > 0 ? allImages : ['https://images.unsplash.com/photo-1737438696465-516c17c5e0f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'],
      colors: formData.colors.split(',').map(c => c.trim()).filter(c => c),
      sizes: formData.sizes.split(',').map(s => s.trim()).filter(s => s),
      featured: formData.featured,
      rating: 4.5,
      reviews: 0,
    };

    addProduct(newProduct);
    toast.success('Product added successfully!');

    // Reset form
    setFormData({
      name: '',
      price: '',
      salePrice: '',
      category: '',
      subCategory: '',
      description: '',
      images: '',
      colors: '',
      sizes: '',
      featured: false,
    });
    setImagePreview([]);
    setUploadedImages([]);
    setAiCategoryHint('');
    setAiApplied(false);

    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product listing for your store
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Product Assistant Card */}
          <div style={{ background: 'linear-gradient(to right, #f5f3ff, #eff6ff)', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '16px' }}>
            {/* Header row with title + button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles style={{ width: '20px', height: '20px', color: '#7c3aed' }} />
                <span style={{ fontWeight: '500', color: '#581c87' }}>AI Product Assistant</span>
              </div>

              {/* GENERATE WITH AI BUTTON - Always visible */}
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={isAiLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: isAiLoading ? '#a78bfa' : '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isAiLoading ? 'not-allowed' : 'pointer',
                  opacity: isAiLoading ? 0.7 : 1,
                }}
              >
                {isAiLoading ? (
                  <>
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles style={{ width: '16px', height: '16px' }} />
                    ✨ Generate with AI
                  </>
                )}
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#6d28d9', marginBottom: '12px' }}>
              Paste a messy Shein/AliExpress product name below, then click the button above to clean it up.
            </p>

            {/* Category Hint */}
            <div style={{ maxWidth: '200px' }}>
              <Label htmlFor="ai-hint" style={{ fontSize: '12px', color: '#7c3aed' }}>
                Category Hint (optional)
              </Label>
              <Select value={aiCategoryHint} onValueChange={setAiCategoryHint}>
                <SelectTrigger style={{ backgroundColor: 'white' }}>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="Women">Women</SelectItem>
                  <SelectItem value="Men">Men</SelectItem>
                  <SelectItem value="Kids">Kids</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aiApplied && (
              <div style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '14px', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <span>✓</span>
                AI suggestions applied – review and edit before saving
              </div>
            )}
          </div>



          {/* Product Images Upload */}
          <div className="space-y-3">
            <Label>Product Images</Label>
            <div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 hover:border-neutral-300 transition-colors">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-neutral-600" />
                </div>
                <div className="text-center">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <span className="text-sm text-neutral-900 hover:underline">
                      Click to upload
                    </span>
                    <span className="text-sm text-neutral-500"> or drag and drop</span>
                  </label>
                  <p className="text-xs text-neutral-400 mt-1">PNG, JPG, WEBP up to 10MB</p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Image Previews */}
            {imagePreview.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-4">
                {imagePreview.map((preview, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-neutral-200">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-neutral-900/80 hover:bg-neutral-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Alternative: Add Image URLs */}
            <div>
              <Label htmlFor="images" className="text-xs text-neutral-500">
                Or add image URLs (comma-separated)
              </Label>
              <Input
                id="images"
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                value={formData.images}
                onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="h-px bg-neutral-200" />

          {/* Product Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="Paste raw product name here (e.g., SHEIN EZwear Women Solid Color...)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-neutral-500 mt-1">
                Paste messy Shein/AliExpress names here, then use AI to clean them
              </p>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="women">Women</SelectItem>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="kids">Kids</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="new-arrivals">New Arrivals</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subCategory">Subcategory <span className="text-neutral-400">(Optional)</span></Label>
              <Input
                id="subCategory"
                placeholder="e.g., bags, dress, shoes, tops"
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="price">Regular Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="e.g., 299.99"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>


            <div className="md:col-span-2">
              <Label htmlFor="salePrice">Sale Price ($) <span className="text-neutral-400">(Optional)</span></Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                placeholder="e.g., 199.99"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Leave empty if product is not on sale
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Paste raw description here or let AI generate one..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="colors">Available Colors <span className="text-neutral-400">(comma-separated)</span></Label>
              <Input
                id="colors"
                placeholder="e.g., Black, White, Beige"
                value={formData.colors}
                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="sizes">Available Sizes <span className="text-neutral-400">(comma-separated)</span></Label>
              <Input
                id="sizes"
                placeholder="e.g., XS, S, M, L, XL"
                value={formData.sizes}
                onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <Label htmlFor="featured" className="cursor-pointer">
                Mark as Featured Product
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-neutral-900 hover:bg-neutral-800">
              <Plus size={18} className="mr-2" />
              Add Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


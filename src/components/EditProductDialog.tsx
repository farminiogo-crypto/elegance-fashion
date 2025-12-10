import { useState, useEffect } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useProducts } from '../context/ProductContext';
import { Product } from '../data/products';

interface EditProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function EditProductDialog({ isOpen, onClose, product }: EditProductDialogProps) {
  const { updateProduct } = useProducts();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    salePrice: '',
    category: '',
    description: '',
    images: '',
    colors: '',
    sizes: '',
    featured: false,
  });
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: String(product.price),
        salePrice: product.salePrice ? String(product.salePrice) : '',
        category: product.category,
        description: product.description,
        images: '',
        colors: product.colors.join(', '),
        sizes: product.sizes.join(', '),
        featured: product.featured,
      });
      setExistingImages(product.images);
      setImagePreview(product.images);
      setUploadedImages([]);
    }
  }, [product]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview((prev) => [...prev, result]);
        setUploadedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const imageToRemove = imagePreview[index];
    
    // Remove from preview
    setImagePreview((prev) => prev.filter((_, i) => i !== index));
    
    // Check if it's an existing image or newly uploaded
    if (existingImages.includes(imageToRemove)) {
      setExistingImages((prev) => prev.filter((img) => img !== imageToRemove));
    } else {
      setUploadedImages((prev) => prev.filter((img) => img !== imageToRemove));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    // Combine existing images (not removed), uploaded images, and URL images
    const urlImages = formData.images.split(',').map(url => url.trim()).filter(url => url);
    const allImages = [...existingImages, ...uploadedImages, ...urlImages];

    const updatedProduct = {
      name: formData.name,
      price: Number(formData.price),
      salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
      category: formData.category,
      description: formData.description,
      images: allImages.length > 0 ? allImages : product.images,
      colors: formData.colors.split(',').map(c => c.trim()).filter(c => c),
      sizes: formData.sizes.split(',').map(s => s.trim()).filter(s => s),
      featured: formData.featured,
    };

    updateProduct(product.id, updatedProduct);
    toast.success('Product updated successfully!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Images */}
          <div className="space-y-3">
            <Label>Product Images</Label>
            
            {/* Image Previews */}
            {imagePreview.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
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

            {/* Upload More Images */}
            <div className="border-2 border-dashed border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4 text-neutral-600" />
                </div>
                <div className="flex-1">
                  <label htmlFor="image-upload-edit" className="cursor-pointer">
                    <span className="text-sm text-neutral-900 hover:underline">
                      Add more images
                    </span>
                  </label>
                  <p className="text-xs text-neutral-400">PNG, JPG, WEBP up to 10MB</p>
                </div>
                <input
                  id="image-upload-edit"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Alternative: Add Image URLs */}
            <div>
              <Label htmlFor="images" className="text-xs text-neutral-500">
                Or add image URLs (comma-separated)
              </Label>
              <Input
                id="images"
                placeholder="https://example.com/image1.jpg"
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="price">Regular Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
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
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="colors">Available Colors <span className="text-neutral-400">(comma-separated)</span></Label>
              <Input
                id="colors"
                value={formData.colors}
                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="sizes">Available Sizes <span className="text-neutral-400">(comma-separated)</span></Label>
              <Input
                id="sizes"
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
              <Save size={18} className="mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

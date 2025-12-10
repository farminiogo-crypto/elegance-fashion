import { useState } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useProducts } from '../context/ProductContext';
import { UserPreferences } from '../utils/recommendationEngine';

interface AIFitAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIFitAssistant({ isOpen, onClose }: AIFitAssistantProps) {
  const { getRecommendationsByPreferences } = useProducts();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: '',
    height: '170',  // Default for slider
    weight: '65',   // Default for slider
    bodyShape: '',
    fitPreference: '',
    style: '',
  });
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Helper function to estimate size from measurements
  const calculateSizeFromMeasurements = (height: number, weight: number): string[] => {
    // Simple BMI-based size estimation
    if (!height || !weight || height <= 0 || weight <= 0) return [];

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // Rough size estimation based on BMI
    if (bmi < 18.5) return ['XS', 'S'];
    if (bmi < 22) return ['S', 'M'];
    if (bmi < 25) return ['M', 'L'];
    if (bmi < 28) return ['L', 'XL'];
    return ['XL', 'XXL'];
  };

  const generateRecommendations = () => {
    // Map form data to user preferences
    const preferences: UserPreferences = {
      styleAesthetic: formData.style,
      fitPreference: formData.fitPreference,
      bodyShape: formData.bodyShape,
      // Add gender preference for filtering
      gender: formData.gender,
      // Map style aesthetic to actual style (improved mapping for better results)
      style: formData.style === 'minimal' ? 'casual' :
        formData.style === 'classic' ? 'vintage' :
          formData.style === 'modern' ? 'sexy' :
            formData.style === 'casual' ? 'casual' :
              formData.style === 'elegant' ? 'sexy' : undefined,
      // Determine size preference from body measurements
      preferredSizes: formData.height && formData.weight ?
        calculateSizeFromMeasurements(parseFloat(formData.height), parseFloat(formData.weight)) :
        undefined,
    };

    // Get recommendations based on preferences from real products
    // getRecommendationsByPreferences from context already uses products internally
    const recommended = getRecommendationsByPreferences(preferences, 8); // Get 8, show top 4

    // If no recommendations, try with fewer constraints
    if (recommended.length === 0) {
      // Fallback: try without style constraint but keep size requirement
      const fallbackPreferences: UserPreferences = {
        preferredSizes: preferences.preferredSizes,
        fitPreference: preferences.fitPreference,
      };
      const fallback = getRecommendationsByPreferences(fallbackPreferences, 8);
      setRecommendations(fallback.slice(0, 4));
    } else {
      setRecommendations(recommended.slice(0, 4));
    }

    setStep(4);
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      generateRecommendations();
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      gender: '',
      height: '170',  // Default for slider
      weight: '65',   // Default for slider
      bodyShape: '',
      fitPreference: '',
      style: '',
    });
    setRecommendations([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-neutral-900" />
            AI Fit Assistant
          </DialogTitle>
          <DialogDescription>
            Answer a few questions to get personalized product recommendations based on your fit preferences.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="mb-2">Body Measurements</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Help us find your perfect fit by providing your measurements.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="women">Women</SelectItem>
                      <SelectItem value="men">Men</SelectItem>
                      <SelectItem value="kids">Kids</SelectItem>
                      <SelectItem value="unisex">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="height">Height: {formData.height || '170'} cm</Label>
                  <input
                    type="range"
                    id="height"
                    min="140"
                    max="220"
                    step="1"
                    value={formData.height || '170'}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 mt-2"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>140 cm</span>
                    <span>220 cm</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="weight">Weight: {formData.weight || '65'} kg</Label>
                  <input
                    type="range"
                    id="weight"
                    min="40"
                    max="150"
                    step="1"
                    value={formData.weight || '65'}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 mt-2"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>40 kg</span>
                    <span>150 kg</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bodyShape">Body Shape</Label>
                  <Select value={formData.bodyShape} onValueChange={(value) => setFormData({ ...formData, bodyShape: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your body shape" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectangle">Rectangle</SelectItem>
                      <SelectItem value="triangle">Triangle</SelectItem>
                      <SelectItem value="inverted-triangle">Inverted Triangle</SelectItem>
                      <SelectItem value="hourglass">Hourglass</SelectItem>
                      <SelectItem value="oval">Oval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full bg-neutral-900 hover:bg-neutral-800">
                Next <ArrowRight size={16} className="ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="mb-2">Fit Preferences</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Tell us how you like your clothes to fit.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="fitPreference">Preferred Fit</Label>
                  <Select value={formData.fitPreference} onValueChange={(value) => setFormData({ ...formData, fitPreference: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your preferred fit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slim">Slim Fit</SelectItem>
                      <SelectItem value="regular">Regular Fit</SelectItem>
                      <SelectItem value="relaxed">Relaxed Fit</SelectItem>
                      <SelectItem value="oversized">Oversized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 bg-neutral-900 hover:bg-neutral-800">
                  Next <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="mb-2">Style Preferences</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  What's your go-to style?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="style">Style Aesthetic</Label>
                  <Select value={formData.style} onValueChange={(value) => setFormData({ ...formData, style: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal & Clean</SelectItem>
                      <SelectItem value="classic">Classic & Timeless</SelectItem>
                      <SelectItem value="modern">Modern & Trendy</SelectItem>
                      <SelectItem value="casual">Casual & Relaxed</SelectItem>
                      <SelectItem value="elegant">Elegant & Sophisticated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 bg-neutral-900 hover:bg-neutral-800">
                  Get Recommendations <Sparkles size={16} className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="mb-2">Your Perfect Matches</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Based on your preferences, we recommend these products:
                </p>
              </div>

              {recommendations.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {recommendations.map((product) => (
                    <a
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="group block"
                      onClick={handleClose}
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-neutral-100 rounded-md mb-2">
                        <img
                          src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=500'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=500';
                          }}
                        />
                      </div>
                      <h4 className="text-sm font-medium line-clamp-2">{product.name}</h4>
                      <p className="text-sm text-neutral-600">
                        ${product.sale_price || product.price}
                        {product.sale_price && product.sale_price < product.price && (
                          <span className="ml-2 text-xs line-through text-neutral-400">${product.price}</span>
                        )}
                      </p>
                      {product.sizes && product.sizes.length > 0 && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Available in: {product.sizes.slice(0, 3).join(', ')}
                          {product.sizes.length > 3 && '...'}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-600 mb-4">
                    We couldn't find products matching your exact preferences.
                  </p>
                  <p className="text-sm text-neutral-500 mb-4">
                    Try adjusting your preferences or browse our full collection.
                  </p>
                  <Button onClick={resetForm} variant="outline">
                    Start Over
                  </Button>
                </div>
              )}

              <Button onClick={resetForm} variant="outline" className="w-full">
                Start Over
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        {step < 4 && (
          <div className="mt-6">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-neutral-900' : 'bg-neutral-200'
                    }`}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

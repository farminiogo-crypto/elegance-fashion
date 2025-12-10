import { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { UserPreferences, getRecommendationsByPreferences } from '../utils/recommendationEngine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronDown, ChevronUp, Calculator, TrendingUp, Database, Sparkles } from 'lucide-react';

export default function AIFitAssistantDocs() {
  const { products } = useProducts();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [demoData, setDemoData] = useState({
    height: '170',
    weight: '65',
    bodyShape: '',
    fitPreference: '',
    style: '',
  });
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);
  const [estimatedSizes, setEstimatedSizes] = useState<string[]>([]);
  const [demoRecommendations, setDemoRecommendations] = useState<any[]>([]);
  const [selectedExample, setSelectedExample] = useState<string>('');

  // Calculate BMI and sizes when height/weight change
  useEffect(() => {
    if (demoData.height && demoData.weight) {
      const height = parseFloat(demoData.height);
      const weight = parseFloat(demoData.weight);
      if (height > 0 && weight > 0) {
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        setCalculatedBMI(parseFloat(bmi.toFixed(2)));

        // Estimate sizes based on BMI
        let sizes: string[] = [];
        if (bmi < 18.5) sizes = ['XS', 'S'];
        else if (bmi < 22) sizes = ['S', 'M'];
        else if (bmi < 25) sizes = ['M', 'L'];
        else if (bmi < 28) sizes = ['L', 'XL'];
        else sizes = ['XL', 'XXL'];
        setEstimatedSizes(sizes);
      }
    } else {
      setCalculatedBMI(null);
      setEstimatedSizes([]);
    }
  }, [demoData.height, demoData.weight]);

  // Generate recommendations when all data is filled
  useEffect(() => {
    if (demoData.height && demoData.weight && demoData.fitPreference && demoData.style) {
      const preferences: UserPreferences = {
        styleAesthetic: demoData.style,
        fitPreference: demoData.fitPreference,
        bodyShape: demoData.bodyShape,
        style: demoData.style === 'minimal' ? 'casual' :
               demoData.style === 'classic' ? 'vintage' :
               demoData.style === 'modern' ? 'sexy' :
               demoData.style === 'casual' ? 'casual' :
               demoData.style === 'elegant' ? 'sexy' : undefined,
        preferredSizes: estimatedSizes.length > 0 ? estimatedSizes : undefined,
      };
      const recommendations = getRecommendationsByPreferences(products, preferences, 4);
      setDemoRecommendations(recommendations);
    } else {
      setDemoRecommendations([]);
    }
  }, [demoData, estimatedSizes, products]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const loadExample = (example: string) => {
    setSelectedExample(example);
    switch (example) {
      case 'minimal':
        setDemoData({
          height: '165',
          weight: '58',
          bodyShape: 'rectangle',
          fitPreference: 'slim',
          style: 'minimal',
        });
        break;
      case 'elegant':
        setDemoData({
          height: '175',
          weight: '70',
          bodyShape: 'hourglass',
          fitPreference: 'regular',
          style: 'elegant',
        });
        break;
      case 'casual':
        setDemoData({
          height: '170',
          weight: '65',
          bodyShape: 'triangle',
          fitPreference: 'relaxed',
          style: 'casual',
        });
        break;
    }
  };

  const stats = {
    totalProducts: products.length,
    productsWithSizes: products.filter(p => p.sizes && p.sizes.length > 0).length,
    averageRating: products.length > 0 
      ? (products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length).toFixed(2)
      : '0.00',
    categories: [...new Set(products.map(p => p.category))].length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          <Sparkles className="text-neutral-900" />
          AI Fit Assistant Documentation
        </h1>
        <p className="text-neutral-600">Interactive guide to how the AI Fit Assistant works</p>
      </div>

      {/* Live Statistics */}
      <Card className="bg-gradient-to-r from-neutral-50 to-neutral-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="text-neutral-900" />
            Live Database Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900">{stats.totalProducts}</div>
              <div className="text-sm text-neutral-600">Total Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900">{stats.productsWithSizes}</div>
              <div className="text-sm text-neutral-600">With Sizes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900">{stats.averageRating}</div>
              <div className="text-sm text-neutral-600">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900">{stats.categories}</div>
              <div className="text-sm text-neutral-600">Categories</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-neutral-50 transition-colors"
          onClick={() => toggleSection('overview')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Overview</span>
            {expandedSections.has('overview') ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>
        {expandedSections.has('overview') && (
          <CardContent>
            <p className="text-neutral-600 mb-4">
              The AI Fit Assistant is a 3-step wizard that helps users find products based on their body measurements, fit preferences, and style preferences.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-semibold mb-2">Step 1: Body Measurements</h4>
                <p className="text-sm text-neutral-600">Height, Weight, Body Shape</p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-semibold mb-2">Step 2: Fit Preferences</h4>
                <p className="text-sm text-neutral-600">Slim, Regular, Relaxed, Oversized</p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-semibold mb-2">Step 3: Style Preferences</h4>
                <p className="text-sm text-neutral-600">Minimal, Classic, Modern, Casual, Elegant</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Interactive BMI Calculator */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-neutral-50 transition-colors"
          onClick={() => toggleSection('bmi')}
        >
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="text-neutral-900" />
              Step 1: Body Measurements & BMI Calculation
            </span>
            {expandedSections.has('bmi') ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>
        {expandedSections.has('bmi') && (
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="demo-height">Height (cm)</Label>
                  <Input
                    id="demo-height"
                    type="number"
                    value={demoData.height}
                    onChange={(e) => setDemoData({ ...demoData, height: e.target.value })}
                    placeholder="e.g., 170"
                  />
                </div>
                <div>
                  <Label htmlFor="demo-weight">Weight (kg)</Label>
                  <Input
                    id="demo-weight"
                    type="number"
                    value={demoData.weight}
                    onChange={(e) => setDemoData({ ...demoData, weight: e.target.value })}
                    placeholder="e.g., 65"
                  />
                </div>
                <div>
                  <Label htmlFor="demo-body-shape">Body Shape</Label>
                  <Select 
                    value={demoData.bodyShape} 
                    onValueChange={(value) => setDemoData({ ...demoData, bodyShape: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select body shape" />
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
              <div className="space-y-4">
                {calculatedBMI !== null && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2 text-blue-900">Calculated BMI</h4>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{calculatedBMI}</div>
                    <div className="text-sm text-blue-700">
                      {calculatedBMI < 18.5 && 'Underweight'}
                      {calculatedBMI >= 18.5 && calculatedBMI < 25 && 'Normal weight'}
                      {calculatedBMI >= 25 && calculatedBMI < 30 && 'Overweight'}
                      {calculatedBMI >= 30 && 'Obese'}
                    </div>
                  </div>
                )}
                {estimatedSizes.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-2 text-green-900">Estimated Sizes</h4>
                    <div className="flex gap-2">
                      {estimatedSizes.map((size) => (
                        <span key={size} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {size}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      Based on BMI ranges:
                      <br />• BMI &lt; 18.5 → XS, S
                      <br />• BMI &lt; 22 → S, M
                      <br />• BMI &lt; 25 → M, L
                      <br />• BMI &lt; 28 → L, XL
                      <br />• BMI ≥ 28 → XL, XXL
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Fit Preferences */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-neutral-50 transition-colors"
          onClick={() => toggleSection('fit')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Step 2: Fit Preferences</span>
            {expandedSections.has('fit') ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>
        {expandedSections.has('fit') && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="demo-fit">Preferred Fit</Label>
                <Select 
                  value={demoData.fitPreference} 
                  onValueChange={(value) => setDemoData({ ...demoData, fitPreference: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred fit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">Slim Fit</SelectItem>
                    <SelectItem value="regular">Regular Fit</SelectItem>
                    <SelectItem value="relaxed">Relaxed Fit</SelectItem>
                    <SelectItem value="oversized">Oversized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-600">
                  <strong>Selected:</strong> {demoData.fitPreference || 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Style Preferences */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-neutral-50 transition-colors"
          onClick={() => toggleSection('style')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Step 3: Style Preferences</span>
            {expandedSections.has('style') ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>
        {expandedSections.has('style') && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="demo-style">Style Aesthetic</Label>
                <Select 
                  value={demoData.style} 
                  onValueChange={(value) => setDemoData({ ...demoData, style: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
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
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-600 mb-2">
                  <strong>Selected:</strong> {demoData.style || 'None'}
                </p>
                {demoData.style && (
                  <p className="text-xs text-neutral-500">
                    Maps to: {demoData.style === 'minimal' ? 'casual, brief' :
                             demoData.style === 'classic' ? 'vintage, casual' :
                             demoData.style === 'modern' ? 'sexy, party' :
                             demoData.style === 'casual' ? 'casual, brief, cute' :
                             demoData.style === 'elegant' ? 'sexy, party, vintage' : 'N/A'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="text-neutral-900" />
            Quick Examples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={selectedExample === 'minimal' ? 'default' : 'outline'}
              onClick={() => loadExample('minimal')}
            >
              Minimal Style
            </Button>
            <Button 
              variant={selectedExample === 'elegant' ? 'default' : 'outline'}
              onClick={() => loadExample('elegant')}
            >
              Elegant Style
            </Button>
            <Button 
              variant={selectedExample === 'casual' ? 'default' : 'outline'}
              onClick={() => loadExample('casual')}
            >
              Casual Style
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Recommendations */}
      {demoRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Live Recommendations Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 mb-4">
              Based on your selections above, here are the top {demoRecommendations.length} recommendations:
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {demoRecommendations.map((product) => (
                <a
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <img
                      src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=500'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=500';
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
                    <p className="text-sm font-semibold text-neutral-900">
                      ${product.salePrice || product.price}
                      {product.salePrice && product.salePrice < product.price && (
                        <span className="ml-2 text-xs line-through text-neutral-400">${product.price}</span>
                      )}
                    </p>
                    {product.rating > 0 && (
                      <p className="text-xs text-neutral-500 mt-1">
                        ⭐ {product.rating.toFixed(1)} ({product.reviews || 0} reviews)
                      </p>
                    )}
                    {product.subcategory && (
                      <p className="text-xs text-neutral-400 mt-1 capitalize">
                        {product.subcategory}
                      </p>
                    )}
                    {product.sizes && product.sizes.length > 0 && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Sizes: {product.sizes.slice(0, 3).join(', ')}
                        {product.sizes.length > 3 && '...'}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Engine Details */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-neutral-50 transition-colors"
          onClick={() => toggleSection('engine')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Recommendation Engine Details</span>
            {expandedSections.has('engine') ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>
        {expandedSections.has('engine') && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Scoring Weights</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded">
                    <span className="text-sm">Style Matching</span>
                    <span className="font-semibold">25%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded">
                    <span className="text-sm">Price Range</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded">
                    <span className="text-sm">Size Preference</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded">
                    <span className="text-sm">Color Preference</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded">
                    <span className="text-sm">Season</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded">
                    <span className="text-sm">Rating Boost</span>
                    <span className="font-semibold">10%</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Database Fields Used</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['sizes', 'colors', 'category', 'price', 'rating', 'name', 'description', 'subcategory'].map((field) => (
                    <div key={field} className="p-2 bg-green-50 rounded text-sm">
                      ✅ {field}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}


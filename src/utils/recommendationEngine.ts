import { Product } from '../data/products';

// Extended product interface with CSV attributes for recommendations
export interface ProductWithAttributes extends Product {
  attributes?: {
    style?: string;
    season?: string;
    neckLine?: string;
    sleeveLength?: string;
    material?: string;
    fabricType?: string;
    decoration?: string;
    patternType?: string;
  };
}

// User preferences interface
export interface UserPreferences {
  gender?: string;
  style?: string;
  season?: string;
  priceRange?: [number, number];
  preferredSizes?: string[];
  preferredColors?: string[];
  bodyShape?: string;
  fitPreference?: string;
  styleAesthetic?: string;
}

// Extract attributes from product name and description
// Improved to better match SHEIN product naming conventions
function extractAttributes(product: Product): ProductWithAttributes['attributes'] {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const combinedText = `${name} ${desc}`;

  // Extract style from name/description (expanded keywords for SHEIN products)
  const styles = [
    'sexy', 'casual', 'brief', 'flare', 'cute', 'vintage', 'bohemian', 'party',
    'work', 'novelty', 'elegant', 'sophisticated', 'minimal', 'classic', 'modern',
    'sporty', 'chic', 'trendy', 'fashionable', 'stylish', 'designer', 'luxury'
  ];
  const style = styles.find(s => combinedText.includes(s)) || 'casual';

  // Extract season from name/description
  const seasons = ['summer', 'spring', 'winter', 'autumn', 'automn', 'fall'];
  const season = seasons.find(s => combinedText.includes(s)) || null;

  // Extract other attributes from description (expanded for SHEIN)
  const neckLines = [
    'o-neck', 'v-neck', 'boat-neck', 'sweetheart', 'slash-neck', 'peterpan-collor',
    'turndowncollor', 'round neck', 'crew neck', 'turtle neck', 'collar', 'halter',
    'off-shoulder', 'one-shoulder', 'strapless', 'square neck'
  ];
  const neckLine = neckLines.find(nl => combinedText.includes(nl)) || null;

  const sleeveLengths = [
    'sleevless', 'sleeveless', 'short', 'full', 'threequarter', 'halfsleeve',
    'cap-sleeves', 'long sleeve', 'short sleeve', 'no sleeve', '3/4 sleeve',
    'half sleeve', 'full sleeve', 'batwing', 'raglan'
  ];
  const sleeveLength = sleeveLengths.find(sl => combinedText.includes(sl)) || null;

  const materials = [
    'cotton', 'silk', 'polyster', 'polyester', 'nylon', 'chiffon', 'linen',
    'wool', 'cashmere', 'spandex', 'elastane', 'rayon', 'viscose', 'modal',
    'acrylic', 'leather', 'denim', 'jersey', 'knit', 'woven'
  ];
  const material = materials.find(m => combinedText.includes(m)) || null;

  const fabricTypes = [
    'chiffon', 'broadcloth', 'jersey', 'worsted', 'satin', 'tulle', 'mesh',
    'lace', 'velvet', 'suede', 'canvas', 'corduroy', 'flannel', 'organza'
  ];
  const fabricType = fabricTypes.find(ft => combinedText.includes(ft)) || null;

  const decorations = [
    'lace', 'ruffles', 'beading', 'embroidary', 'embroidery', 'applique',
    'sequined', 'sequins', 'bow', 'ribbon', 'pearls', 'studs', 'zips',
    'buttons', 'patches', 'prints', 'embellished'
  ];
  const decoration = decorations.find(d => combinedText.includes(d)) || null;

  const patterns = [
    'print', 'printed', 'solid', 'dot', 'dotted', 'striped', 'stripes',
    'animal', 'geometric', 'floral', 'flowers', 'patchwork', 'plaid',
    'checkered', 'polka dot', 'abstract', 'graphic', 'textured'
  ];
  const patternType = patterns.find(p => combinedText.includes(p)) || 'solid';

  return {
    style,
    season: season || undefined,
    neckLine: neckLine || undefined,
    sleeveLength: sleeveLength || undefined,
    material: material || undefined,
    fabricType: fabricType || undefined,
    decoration: decoration || undefined,
    patternType: patternType || undefined,
  };
}

// Calculate similarity score between two products (0-1)
function calculateSimilarity(product1: Product, product2: Product): number {
  if (product1.id === product2.id) return 0; // Don't recommend the same product

  const attrs1 = extractAttributes(product1);
  const attrs2 = extractAttributes(product2);

  let score = 0;
  let factors = 0;

  // Style similarity (weight: 0.3)
  if (attrs1.style && attrs2.style) {
    factors += 0.3;
    if (attrs1.style === attrs2.style) {
      score += 0.3;
    } else {
      // Partial match for similar styles
      const similarStyles: Record<string, string[]> = {
        'casual': ['brief', 'cute'],
        'sexy': ['party'],
        'vintage': ['bohemian'],
      };
      const similar = similarStyles[attrs1.style]?.includes(attrs2.style) ||
        similarStyles[attrs2.style]?.includes(attrs1.style);
      if (similar) score += 0.15;
    }
  }

  // Season similarity (weight: 0.2)
  if (attrs1.season && attrs2.season) {
    factors += 0.2;
    if (attrs1.season === attrs2.season) {
      score += 0.2;
    }
  }

  // Category similarity (weight: 0.2)
  factors += 0.2;
  if (product1.category === product2.category) {
    score += 0.2;
  }

  // Price similarity (weight: 0.1) - products in similar price ranges
  factors += 0.1;
  const priceDiff = Math.abs(product1.price - product2.price);
  const maxPrice = Math.max(product1.price, product2.price);
  if (maxPrice > 0) {
    const priceSimilarity = 1 - Math.min(priceDiff / maxPrice, 1);
    score += priceSimilarity * 0.1;
  }

  // Rating similarity (weight: 0.1) - prefer products with similar ratings
  factors += 0.1;
  const ratingDiff = Math.abs(product1.rating - product2.rating);
  const ratingSimilarity = 1 - Math.min(ratingDiff / 5, 1);
  score += ratingSimilarity * 0.1;

  // Pattern type similarity (weight: 0.1)
  if (attrs1.patternType && attrs2.patternType) {
    factors += 0.1;
    if (attrs1.patternType === attrs2.patternType) {
      score += 0.1;
    }
  }

  // Normalize score
  return factors > 0 ? score / factors : 0;
}

// Calculate preference match score
function calculatePreferenceScore(product: Product, preferences: UserPreferences): number {
  const attrs = extractAttributes(product);
  let score = 0;
  let factors = 0;

  // Style preference (weight: 0.25)
  if (preferences.style && attrs.style) {
    factors += 0.25;
    const styleMap: Record<string, string[]> = {
      'minimal': ['casual', 'brief'],
      'classic': ['vintage', 'casual'],
      'modern': ['sexy', 'party'],
      'casual': ['casual', 'brief', 'cute'],
      'elegant': ['sexy', 'party', 'vintage'],
    };
    const preferredStyles = styleMap[preferences.style] || [];
    if (preferredStyles.includes(attrs.style)) {
      score += 0.25;
    }
  }

  // Subcategory matching bonus (if subcategory is available)
  if (product.subcategory) {
    // Boost score if subcategory matches style preference
    const subcategoryLower = product.subcategory.toLowerCase();
    if (preferences.styleAesthetic) {
      const styleAestheticLower = preferences.styleAesthetic.toLowerCase();
      // Add small bonus for subcategory relevance
      if (subcategoryLower.includes(styleAestheticLower) ||
        styleAestheticLower.includes(subcategoryLower)) {
        score += 0.05; // Small bonus
      }
    }
  }

  // Price range preference (weight: 0.2)
  if (preferences.priceRange) {
    factors += 0.2;
    const [minPrice, maxPrice] = preferences.priceRange;
    if (product.price >= minPrice && product.price <= maxPrice) {
      score += 0.2;
    } else {
      // Partial score if close to range
      const distance = product.price < minPrice
        ? minPrice - product.price
        : product.price - maxPrice;
      const maxDistance = maxPrice - minPrice;
      if (maxDistance > 0) {
        const proximityScore = Math.max(0, 1 - (distance / maxDistance));
        score += proximityScore * 0.1;
      }
    }
  }

  // Size preference (weight: 0.15)
  // Improved matching for database sizes (handles "one-size", "XS", "S", etc.)
  if (preferences.preferredSizes && preferences.preferredSizes.length > 0 && product.sizes && product.sizes.length > 0) {
    factors += 0.15;
    const productSizes = product.sizes.map(s => s.toString().toLowerCase().trim());
    const preferredSizes = preferences.preferredSizes.map(s => s.toLowerCase().trim());

    // Check for exact match or partial match
    const hasPreferredSize = productSizes.some(size => {
      // Handle "one-size" products - match with any preference
      if (size === 'one-size' || size === 'one size') {
        return true;
      }
      // Check for exact or partial match
      return preferredSizes.some(pref =>
        size === pref ||
        size.includes(pref) ||
        pref.includes(size) ||
        // Handle size variations (e.g., "S" matches "Small", "XS" matches "Extra Small")
        (pref === 'xs' && size.startsWith('x') && size.includes('s')) ||
        (pref === 's' && (size === 's' || size === 'small')) ||
        (pref === 'm' && (size === 'm' || size === 'medium')) ||
        (pref === 'l' && (size === 'l' || size === 'large')) ||
        (pref === 'xl' && (size.startsWith('x') && size.includes('l'))) ||
        (pref === 'xxl' && size.includes('xxl'))
      );
    });

    if (hasPreferredSize) {
      score += 0.15;
    }
  }

  // Color preference (weight: 0.15)
  if (preferences.preferredColors && preferences.preferredColors.length > 0) {
    factors += 0.15;
    const hasPreferredColor = product.colors.some(color =>
      preferences.preferredColors!.some(pref =>
        color.toLowerCase().includes(pref.toLowerCase()) ||
        pref.toLowerCase().includes(color.toLowerCase())
      )
    );
    if (hasPreferredColor) {
      score += 0.15;
    }
  }

  // Season preference (weight: 0.15)
  if (preferences.season && attrs.season) {
    factors += 0.15;
    if (attrs.season === preferences.season.toLowerCase()) {
      score += 0.15;
    }
  }

  // Rating boost (weight: 0.1) - prefer higher rated products
  factors += 0.1;
  score += (product.rating / 5) * 0.1;

  return factors > 0 ? score / factors : 0;
}

// Get similar products based on content-based filtering
export function getSimilarProducts(
  targetProduct: Product,
  allProducts: Product[],
  limit: number = 4
): Product[] {
  const scoredProducts = allProducts
    .map(product => ({
      product,
      score: calculateSimilarity(targetProduct, product),
    }))
    .filter(item => item.score > 0) // Remove same product and zero-similarity
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.product);

  return scoredProducts;
}

// Get recommendations based on user's liked/viewed products (collaborative filtering)
export function getRecommendationsByProducts(
  likedProducts: Product[],
  allProducts: Product[],
  limit: number = 8
): Product[] {
  if (likedProducts.length === 0) {
    return getTrendingProducts(allProducts, limit);
  }

  const scoredProducts = allProducts
    .filter(product => !likedProducts.some(liked => liked.id === product.id))
    .map(product => {
      // Calculate average similarity to all liked products
      const avgSimilarity = likedProducts.reduce((sum, liked) => {
        return sum + calculateSimilarity(liked, product);
      }, 0) / likedProducts.length;

      return {
        product,
        score: avgSimilarity,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.product);

  return scoredProducts;
}

// Get recommendations based on user preferences
export function getRecommendationsByPreferences(
  allProducts: Product[],
  preferences: UserPreferences,
  limit: number = 8
): Product[] {
  // Filter by gender/category if specified
  let filteredProducts = allProducts;
  if (preferences.gender) {
    const genderLower = preferences.gender.toLowerCase();
    filteredProducts = allProducts.filter(product => {
      const productCategory = product.category?.toLowerCase();
      // Match gender preference to category (women, men, kids) or allow unisex/accessories
      return productCategory === genderLower ||
        productCategory === 'unisex' ||
        productCategory === 'accessories';
    });
  }

  const scoredProducts = filteredProducts
    .map(product => ({
      product,
      score: calculatePreferenceScore(product, preferences),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.product);

  return scoredProducts;
}

// Get trending/popular products
export function getTrendingProducts(
  allProducts: Product[],
  limit: number = 8
): Product[] {
  return allProducts
    .filter(p => p.rating > 0)
    .sort((a, b) => {
      // Combine rating and reviews for popularity score
      const scoreA = a.rating * Math.log(a.reviews + 1);
      const scoreB = b.rating * Math.log(b.reviews + 1);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

// Get personalized recommendations combining multiple factors
export function getPersonalizedRecommendations(
  targetProduct: Product | null,
  allProducts: Product[],
  preferences?: UserPreferences,
  viewedProducts?: Product[],
  limit: number = 8
): Product[] {
  const recommendations: Product[] = [];
  const usedIds = new Set<string>();

  // 1. If viewing a product, get similar products (40%)
  if (targetProduct) {
    const similar = getSimilarProducts(targetProduct, allProducts, Math.ceil(limit * 0.4));
    similar.forEach(p => {
      if (!usedIds.has(p.id)) {
        recommendations.push(p);
        usedIds.add(p.id);
      }
    });
  }

  // 2. If user has preferences, get preference-based recommendations (30%)
  if (preferences) {
    const preferenceBased = getRecommendationsByPreferences(
      allProducts,
      preferences,
      Math.ceil(limit * 0.3)
    );
    preferenceBased.forEach(p => {
      if (!usedIds.has(p.id)) {
        recommendations.push(p);
        usedIds.add(p.id);
      }
    });
  }

  // 3. If user has viewed products, get collaborative recommendations (20%)
  if (viewedProducts && viewedProducts.length > 0) {
    const collaborative = getRecommendationsByProducts(
      viewedProducts,
      allProducts,
      Math.ceil(limit * 0.2)
    );
    collaborative.forEach(p => {
      if (!usedIds.has(p.id)) {
        recommendations.push(p);
        usedIds.add(p.id);
      }
    });
  }

  // 4. Fill remaining with trending products (10%)
  const remaining = limit - recommendations.length;
  if (remaining > 0) {
    const trending = getTrendingProducts(allProducts, remaining);
    trending.forEach(p => {
      if (!usedIds.has(p.id)) {
        recommendations.push(p);
        usedIds.add(p.id);
      }
    });
  }

  return recommendations.slice(0, limit);
}


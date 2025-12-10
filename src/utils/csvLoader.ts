import { Product } from '../data/products';

// Price mapping from CSV values to numeric prices
const priceMap: Record<string, number> = {
  'Low': 50,
  'Average': 150,
  'Medium': 200,
  'High': 300,
  'very-high': 500,
};

// Generate a product name from CSV attributes
function generateProductName(style: string, season: string, patternType: string): string {
  const styleCapitalized = style && style !== 'null' && style.trim() !== ''
    ? style.charAt(0).toUpperCase() + style.slice(1).toLowerCase()
    : 'Casual';
  const normalizedSeason = season === 'Automn' ? 'Autumn' : season;
  const seasonCapitalized = normalizedSeason && normalizedSeason !== 'null' && normalizedSeason.trim() !== ''
    ? normalizedSeason.charAt(0).toUpperCase() + normalizedSeason.slice(1).toLowerCase()
    : 'Seasonal';
  const patternCapitalized = patternType && patternType !== 'null' && patternType.trim() !== ''
    ? patternType.charAt(0).toUpperCase() + patternType.slice(1).toLowerCase()
    : '';
  
  if (patternCapitalized && patternCapitalized !== 'Solid') {
    return `${styleCapitalized} ${patternCapitalized} Dress - ${seasonCapitalized} Collection`;
  }
  return `${styleCapitalized} Dress - ${seasonCapitalized} Collection`;
}

// Generate description from CSV attributes
function generateDescription(
  style: string,
  season: string,
  neckLine: string,
  sleeveLength: string,
  material: string,
  fabricType: string,
  decoration: string,
  patternType: string
): string {
  const parts: string[] = [];
  
  // Normalize values (handle "null" strings and empty values)
  const normalizeValue = (val: string): string | null => {
    const trimmed = val.trim().toLowerCase();
    return (trimmed === '' || trimmed === 'null' || trimmed === 'none') ? null : trimmed;
  };
  
  const normalizedStyle = normalizeValue(style);
  const normalizedSeason = normalizeValue(season === 'Automn' ? 'Autumn' : season);
  const normalizedNeckLine = normalizeValue(neckLine);
  const normalizedSleeveLength = normalizeValue(sleeveLength);
  const normalizedMaterial = normalizeValue(material);
  const normalizedFabricType = normalizeValue(fabricType);
  const normalizedDecoration = normalizeValue(decoration);
  const normalizedPatternType = normalizeValue(patternType);
  
  if (normalizedStyle) {
    parts.push(`A ${normalizedStyle} style dress`);
  }
  
  if (normalizedSeason) {
    parts.push(`perfect for ${normalizedSeason}`);
  }
  
  if (normalizedNeckLine) {
    parts.push(`featuring a ${normalizedNeckLine} neckline`);
  }
  
  if (normalizedSleeveLength) {
    parts.push(`${normalizedSleeveLength} sleeves`);
  }
  
  if (normalizedMaterial) {
    parts.push(`crafted from ${normalizedMaterial}`);
  }
  
  if (normalizedFabricType) {
    parts.push(`${normalizedFabricType} fabric`);
  }
  
  if (normalizedDecoration) {
    parts.push(`with ${normalizedDecoration} details`);
  }
  
  if (normalizedPatternType && normalizedPatternType !== 'solid') {
    parts.push(`in a ${normalizedPatternType} pattern`);
  }
  
  return parts.length > 0 
    ? parts.join(', ') + '.'
    : 'A beautiful dress perfect for any occasion.';
}

// Generate placeholder image URL based on product attributes
function generateImageUrl(dressId: string, style: string): string {
  // Use Unsplash with fashion-related search terms
  const searchTerms = style.toLowerCase().replace(/[^a-z]/g, '');
  const seed = dressId.slice(-6); // Use last 6 digits of ID as seed
  return `https://images.unsplash.com/photo-1594633313593-bab3825d0caf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080&seed=${seed}`;
}

// Parse CSV line
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Convert CSV row to Product
function csvRowToProduct(row: string[], headers: string[]): Product | null {
  if (row.length !== headers.length) return null;
  
  const rowData: Record<string, string> = {};
  headers.forEach((header, index) => {
    rowData[header] = row[index] || '';
  });
  
  const dressId = rowData['Dress_ID'] || '';
  const style = rowData['Style'] || 'Casual';
  const priceStr = rowData['Price'] || 'Average';
  const ratingStr = rowData['Rating'] || '0';
  const size = rowData['Size'] || 'M';
  const season = (rowData['Season'] || 'Summer').trim();
  const neckLine = (rowData['NeckLine'] || '').trim();
  const sleeveLength = (rowData['SleeveLength'] || '').trim();
  const material = (rowData['Material'] || '').trim();
  const fabricType = (rowData['FabricType'] || '').trim();
  const decoration = (rowData['Decoration'] || '').trim();
  const patternType = (rowData['Pattern Type'] || 'solid').trim();
  const recommendation = (rowData['Recommendation'] || '0').trim();
  
  // Skip if essential data is missing
  if (!dressId || !style) return null;
  
  const price = priceMap[priceStr] || priceMap['Average'];
  const rating = parseFloat(ratingStr) || 0;
  const featured = recommendation === '1';
  
  // Generate sizes array
  const sizes = size === 'free' 
    ? ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    : [size.toUpperCase()];
  
  // Normalize season name (handle typos like "Automn")
  const normalizedSeason = season === 'Automn' ? 'Autumn' : season;
  
  // Generate colors based on style and season
  const colorOptions: Record<string, string[]> = {
    'Summer': ['White', 'Cream', 'Light Blue', 'Pink'],
    'Spring': ['Pastel Pink', 'Lavender', 'Mint', 'Peach'],
    'spring': ['Pastel Pink', 'Lavender', 'Mint', 'Peach'],
    'Winter': ['Black', 'Navy', 'Burgundy', 'Gray'],
    'winter': ['Black', 'Navy', 'Burgundy', 'Gray'],
    'Autumn': ['Burgundy', 'Olive', 'Brown', 'Mustard'],
    'Automn': ['Burgundy', 'Olive', 'Brown', 'Mustard'],
  };
  const colors = colorOptions[normalizedSeason] || colorOptions[season] || ['Black', 'White', 'Navy'];
  
  // Generate category based on style
  const categoryMap: Record<string, string> = {
    'Sexy': 'women',
    'sexy': 'women',
    'Casual': 'women',
    'Brief': 'women',
    'Flare': 'women',
    'cute': 'women',
    'vintage': 'women',
    'bohemian': 'women',
    'party': 'women',
    'work': 'women',
    'OL': 'women',
    'Novelty': 'women',
    'fashion': 'women',
  };
  const category = categoryMap[style] || 'women';
  
  return {
    id: dressId,
    name: generateProductName(style, season, patternType),
    price,
    category,
    images: [
      generateImageUrl(dressId, style),
      `https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080&seed=${dressId.slice(-5)}`,
    ],
    colors,
    sizes,
    description: generateDescription(style, season, neckLine, sleeveLength, material, fabricType, decoration, patternType),
    featured,
    rating: rating || 4.5, // Default to 4.5 if rating is 0
    reviews: rating > 0 ? Math.floor(Math.random() * 200) + 10 : 0, // Generate reviews count
  };
}

// Load products from CSV file
export async function loadProductsFromCSV(): Promise<Product[]> {
  try {
    const response = await fetch('/Attribute dataset.csv');
    if (!response.ok) {
      throw new Error('Failed to load CSV file');
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    const products: Product[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      const product = csvRowToProduct(row, headers);
      if (product) {
        products.push(product);
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error loading products from CSV:', error);
    return [];
  }
}


# AI Fit Assistant - How It Works

## Overview
The AI Fit Assistant is a 3-step wizard that helps users find products based on their body measurements, fit preferences, and style preferences.

## Component Flow

### Step 1: Body Measurements
- **Height** (cm): User enters their height
- **Weight** (kg): User enters their weight  
- **Body Shape**: Select from (Rectangle, Triangle, Inverted Triangle, Hourglass, Oval)

**What it does:**
- Calculates BMI from height/weight
- Estimates preferred sizes based on BMI:
  - BMI < 18.5 → XS, S
  - BMI < 22 → S, M
  - BMI < 25 → M, L
  - BMI < 28 → L, XL
  - BMI >= 28 → XL, XXL

### Step 2: Fit Preferences
- **Preferred Fit**: Select from (Slim Fit, Regular Fit, Relaxed Fit, Oversized)

### Step 3: Style Preferences
- **Style Aesthetic**: Select from:
  - Minimal & Clean
  - Classic & Timeless
  - Modern & Trendy
  - Casual & Relaxed
  - Elegant & Sophisticated

## How It Searches the Database

### 1. Data Source
- Uses `ProductContext` which loads ALL products from the database via API
- Products are fetched from: `GET /api/products?limit=10000`
- All products are stored in React state

### 2. Recommendation Engine (`getRecommendationsByPreferences`)

The engine scores each product based on user preferences:

#### Scoring Weights:
- **Style Matching (25%)**: Maps user style to product attributes
  - Minimal → casual, brief
  - Classic → vintage, casual
  - Modern → sexy, party
  - Casual → casual, brief, cute
  - Elegant → sexy, party, vintage

- **Price Range (20%)**: Filters by price (if specified)
- **Size Preference (15%)**: Matches calculated sizes with product sizes
- **Color Preference (15%)**: Matches preferred colors (if specified)
- **Season (15%)**: Matches seasonal preferences (if specified)
- **Rating Boost (10%)**: Prefers higher-rated products

### 3. Attribute Extraction

The engine extracts attributes from product **name** and **description**:

**Extracted Attributes:**
- **Style**: sexy, casual, brief, flare, cute, vintage, bohemian, party, work, novelty
- **Season**: summer, spring, winter, autumn
- **Neckline**: o-neck, v-neck, boat-neck, sweetheart, etc.
- **Sleeve Length**: sleeveless, short, full, three-quarter, etc.
- **Material**: cotton, silk, polyester, nylon, chiffon, linen, wool, cashmere
- **Fabric Type**: chiffon, broadcloth, jersey, worsted, satin, tulle
- **Decoration**: lace, ruffles, beading, embroidery, applique, sequined, bow
- **Pattern Type**: print, solid, dot, striped, animal, geometric, floral, patchwork, plaid

**How it works:**
- Searches product name/description for keywords
- First match wins
- Defaults to 'casual' for style, 'solid' for pattern

### 4. Database Fields Used

The engine uses these database fields directly:
- ✅ `sizes` (JSON array) - For size matching
- ✅ `colors` (JSON array) - For color matching  
- ✅ `category` (string) - For category filtering
- ✅ `price` (float) - For price range filtering
- ✅ `rating` (float) - For rating boost
- ✅ `name` (string) - For attribute extraction
- ✅ `description` (text) - For attribute extraction

## Current Limitations

1. **Attribute Extraction**: Based on keyword matching in name/description, may not be 100% accurate
2. **No Stored Attributes**: The `other_attributes` from SHEIN CSV is not stored in database
3. **Style Mapping**: Hardcoded mappings may not match all SHEIN products perfectly

## Recommendations Returned

- Returns top 4 products (configurable)
- Sorted by preference score (highest first)
- Products must have matching sizes available
- Products are filtered by category if specified

## User Experience

1. User fills out 3-step form
2. On completion, calls `getRecommendationsByPreferences()`
3. Shows 4 recommended products in a grid
4. Each product shows: image, name, price
5. Clicking product navigates to product detail page

## Integration Points

- **ProductContext**: Provides `getRecommendationsByPreferences()` function
- **RecommendationEngine**: Contains scoring logic
- **Database**: Products loaded via API from MySQL database
- **Frontend**: React component with form and results display


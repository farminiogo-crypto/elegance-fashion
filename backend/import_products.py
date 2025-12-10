"""
Import products from CSV file into the database
"""
import csv
import json
import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Product, Base
from dotenv import load_dotenv

load_dotenv()

# Price mapping from text to actual prices
PRICE_MAP = {
    'Low': 29.99,
    'Average': 49.99,
    'Medium': 69.99,
    'High': 99.99,
    'very-high': 149.99,
    '': 49.99  # Default for empty
}

# Default colors based on pattern/material
DEFAULT_COLORS = ['Black', 'White', 'Navy', 'Beige', 'Pink', 'Red', 'Blue', 'Green']

# Default images (placeholder - you can replace with actual image URLs)
DEFAULT_IMAGES = [
    'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=500',
    'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500',
    'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=500'
]


def normalize_size(size_str):
    """Normalize size string and return list of available sizes"""
    if not size_str or size_str.lower() in ['null', 'free', '']:
        return ['S', 'M', 'L', 'XL']
    
    size_str = size_str.strip().upper()
    
    # If it's a single size
    if size_str in ['S', 'M', 'L', 'XL', 'XXL']:
        return [size_str]
    
    # If it says 'free' or similar, return all sizes
    if 'free' in size_str.lower():
        return ['S', 'M', 'L', 'XL']
    
    # Try to parse multiple sizes
    sizes = []
    for s in ['S', 'M', 'L', 'XL', 'XXL']:
        if s in size_str:
            sizes.append(s)
    
    return sizes if sizes else ['S', 'M', 'L', 'XL']


def get_colors_from_attributes(pattern, material, fabric):
    """Generate colors based on pattern and material"""
    colors = []
    
    # Add colors based on pattern
    if pattern and pattern.lower() not in ['null', 'none', '']:
        pattern_lower = pattern.lower()
        if 'solid' in pattern_lower:
            colors.extend(['Black', 'White', 'Navy'])
        elif 'print' in pattern_lower:
            colors.extend(['Blue', 'Red', 'Green'])
        elif 'dot' in pattern_lower:
            colors.extend(['Black', 'White', 'Pink'])
        elif 'striped' in pattern_lower:
            colors.extend(['Navy', 'White', 'Red'])
        elif 'animal' in pattern_lower or 'leopard' in pattern_lower:
            colors.extend(['Beige', 'Brown', 'Black'])
        elif 'floral' in pattern_lower:
            colors.extend(['Pink', 'White', 'Blue'])
        else:
            colors.extend(['Black', 'White', 'Navy'])
    
    # Add colors based on material
    if material and material.lower() not in ['null', 'none', '']:
        material_lower = material.lower()
        if 'cotton' in material_lower:
            colors.append('White')
        if 'silk' in material_lower:
            colors.append('Ivory')
        if 'polyster' in material_lower or 'polyester' in material_lower:
            colors.append('Black')
    
    # Remove duplicates and return
    unique_colors = list(dict.fromkeys(colors))  # Preserves order
    return unique_colors[:5] if unique_colors else DEFAULT_COLORS[:3]


def create_product_name(style, neckline, sleeve, season):
    """Create a product name from attributes"""
    parts = []
    
    if style and style.lower() not in ['null', 'none', '']:
        parts.append(style.capitalize())
    
    if neckline and neckline.lower() not in ['null', 'none', '']:
        neckline_clean = neckline.replace('-', ' ').title()
        parts.append(neckline_clean)
    
    if sleeve and sleeve.lower() not in ['null', 'none', '']:
        sleeve_clean = sleeve.replace('-', ' ').title()
        parts.append(sleeve_clean)
    
    if season and season.lower() not in ['null', 'none', '']:
        parts.append(season.capitalize())
    
    name = ' '.join(parts) if parts else 'Fashion Dress'
    return f"{name} Dress" if 'Dress' not in name else name


def create_description(row):
    """Create product description from CSV row"""
    parts = []
    
    if row.get('Style') and row['Style'].lower() not in ['null', 'none', '']:
        parts.append(f"Style: {row['Style'].capitalize()}")
    
    if row.get('Season') and row['Season'].lower() not in ['null', 'none', '']:
        parts.append(f"Perfect for {row['Season'].capitalize()} season")
    
    if row.get('NeckLine') and row['NeckLine'].lower() not in ['null', 'none', '']:
        parts.append(f"Neckline: {row['NeckLine'].replace('-', ' ').title()}")
    
    if row.get('SleeveLength') and row['SleeveLength'].lower() not in ['null', 'none', '']:
        parts.append(f"Sleeve: {row['SleeveLength'].replace('-', ' ').title()}")
    
    if row.get('Material') and row['Material'].lower() not in ['null', 'none', '']:
        parts.append(f"Material: {row['Material'].capitalize()}")
    
    if row.get('FabricType') and row['FabricType'].lower() not in ['null', 'none', '']:
        parts.append(f"Fabric: {row['FabricType'].capitalize()}")
    
    if row.get('Decoration') and row['Decoration'].lower() not in ['null', 'none', '']:
        parts.append(f"Decoration: {row['Decoration'].capitalize()}")
    
    if row.get('Pattern Type') and row['Pattern Type'].lower() not in ['null', 'none', '']:
        parts.append(f"Pattern: {row['Pattern Type'].capitalize()}")
    
    description = '. '.join(parts) if parts else 'Beautiful fashion dress with elegant design.'
    return description + '.'


def import_products_from_csv(csv_path: str):
    """Import products from CSV file"""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Check if CSV file exists
        if not os.path.exists(csv_path):
            print(f"Error: CSV file not found at {csv_path}")
            return
        
        # Read CSV file
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            products_imported = 0
            products_skipped = 0
            
            for row in reader:
                try:
                    # Get Dress_ID as product ID
                    product_id = str(row.get('Dress_ID', '').strip())
                    if not product_id:
                        print(f"Skipping row with empty Dress_ID")
                        products_skipped += 1
                        continue
                    
                    # Check if product already exists
                    existing = db.query(Product).filter(Product.id == product_id).first()
                    if existing:
                        print(f"Product {product_id} already exists, skipping...")
                        products_skipped += 1
                        continue
                    
                    # Get price
                    price_str = row.get('Price', 'Average').strip()
                    price = PRICE_MAP.get(price_str, PRICE_MAP['Average'])
                    
                    # Get rating
                    rating_str = row.get('Rating', '0').strip()
                    try:
                        rating = float(rating_str) if rating_str and rating_str != '0' else 0.0
                    except (ValueError, TypeError):
                        rating = 0.0
                    
                    # Get sizes
                    size_str = row.get('Size', 'free').strip()
                    sizes = normalize_size(size_str)
                    
                    # Get colors
                    pattern = row.get('Pattern Type', '').strip()
                    material = row.get('Material', '').strip()
                    fabric = row.get('FabricType', '').strip()
                    colors = get_colors_from_attributes(pattern, material, fabric)
                    
                    # Create product name
                    name = create_product_name(
                        row.get('Style', ''),
                        row.get('NeckLine', ''),
                        row.get('SleeveLength', ''),
                        row.get('Season', '')
                    )
                    
                    # Create description
                    description = create_description(row)
                    
                    # Get category (use Style or default to 'Dresses')
                    category = row.get('Style', 'Dresses').strip().capitalize()
                    if not category or category.lower() in ['null', 'none', '']:
                        category = 'Dresses'
                    
                    # Get featured status
                    recommendation = row.get('Recommendation', '0').strip()
                    featured = recommendation == '1'
                    
                    # Create product
                    product = Product(
                        id=product_id,
                        name=name,
                        price=price,
                        sale_price=None,  # No sale price from CSV
                        category=category,
                        images=DEFAULT_IMAGES,
                        colors=colors,
                        sizes=sizes,
                        description=description,
                        featured=featured,
                        rating=rating,
                        reviews=int(rating * 10) if rating > 0 else 0  # Estimate reviews from rating
                    )
                    
                    db.add(product)
                    products_imported += 1
                    
                    if products_imported % 50 == 0:
                        print(f"Imported {products_imported} products...")
                        db.commit()  # Commit in batches
                
                except Exception as e:
                    print(f"Error importing product {row.get('Dress_ID', 'unknown')}: {e}")
                    products_skipped += 1
                    continue
            
            # Final commit
            db.commit()
            print(f"\n✓ Import complete!")
            print(f"  - Products imported: {products_imported}")
            print(f"  - Products skipped: {products_skipped}")
            print(f"  - Total processed: {products_imported + products_skipped}")
    
    except Exception as e:
        print(f"Error during import: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    # Get CSV file path
    # Try different possible locations
    current_dir = Path(__file__).parent
    csv_paths = [
        current_dir.parent / "Attribute dataset.csv",
        current_dir / "Attribute dataset.csv",
        Path("Attribute dataset.csv"),
    ]
    
    csv_path = None
    for path in csv_paths:
        if path.exists():
            csv_path = str(path)
            break
    
    if not csv_path:
        print("Error: Could not find 'Attribute dataset.csv' file")
        print("Please ensure the CSV file is in the project root or backend directory")
        sys.exit(1)
    
    print(f"Importing products from: {csv_path}")
    print("This may take a few moments...\n")
    
    import_products_from_csv(csv_path)


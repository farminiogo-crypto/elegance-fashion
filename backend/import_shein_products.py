"""
Import products from SHEIN CSV file into the database
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


def parse_json_field(field_value):
    """Parse JSON string field, return empty list if invalid"""
    if not field_value or field_value.lower() in ['null', 'none', '']:
        return []
    
    try:
        # Try to parse as JSON
        parsed = json.loads(field_value)
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, str):
            # Sometimes it's a string representation of a list
            try:
                return json.loads(parsed)
            except:
                return [parsed]
        return []
    except (json.JSONDecodeError, TypeError):
        # If not valid JSON, try to extract from string
        if '[' in field_value and ']' in field_value:
            try:
                # Try to extract JSON array from string
                start = field_value.find('[')
                end = field_value.rfind(']') + 1
                json_str = field_value[start:end]
                return json.loads(json_str)
            except:
                pass
        return []


def parse_image_urls(image_urls_str):
    """Parse image URLs from JSON string"""
    if not image_urls_str or image_urls_str.lower() in ['null', 'none', '']:
        return []
    
    urls = parse_json_field(image_urls_str)
    
    # Filter out invalid URLs
    valid_urls = []
    for url in urls:
        if isinstance(url, str) and (url.startswith('http://') or url.startswith('https://')):
            valid_urls.append(url)
    
    return valid_urls[:10]  # Limit to 10 images


def parse_sizes(size_str, all_available_sizes_str):
    """Parse available sizes"""
    sizes = []
    
    # Try to get sizes from all_available_sizes first
    if all_available_sizes_str:
        sizes = parse_json_field(all_available_sizes_str)
    
    # If no sizes from all_available_sizes, use size field
    if not sizes and size_str:
        size_str = size_str.strip()
        if size_str.lower() not in ['null', 'none', '']:
            # If it's a single size, add it
            if size_str.lower() == 'one-size':
                sizes = ['One Size']
            else:
                sizes = [size_str]
    
    # Default sizes if still empty
    if not sizes:
        sizes = ['S', 'M', 'L', 'XL']
    
    return sizes


def parse_colors(color_str, other_attributes_str):
    """Parse available colors"""
    colors = []
    
    # First try to get color from color field
    if color_str and color_str.lower() not in ['null', 'none', '']:
        color_str = color_str.strip()
        if color_str.lower() == 'multicolor' or color_str.lower() == 'multi-color':
            colors = ['Multicolor', 'Black', 'White']
        else:
            colors = [color_str]
    
    # Try to extract colors from other_attributes
    if other_attributes_str:
        attrs = parse_json_field(other_attributes_str)
        for attr in attrs:
            if isinstance(attr, dict):
                if attr.get('name') == 'Color' and attr.get('value'):
                    color_value = attr.get('value')
                    if color_value not in colors:
                        colors.append(color_value)
    
    # Default colors if still empty
    if not colors:
        colors = ['Black', 'White', 'Navy']
    
    return colors[:5]  # Limit to 5 colors


def determine_subcategory(name):
    """Determine subcategory based on product name"""
    name_lower = name.lower()
    
    # Map keywords to subcategories
    mappings = {
        't-shirt': ['t-shirt', 'tee', 'tshirt', 'top'],
        'sleeve': ['sleeve'],
        'trouser': ['trouser', 'pants', 'jeans', 'leggings', 'joggers'],
        'bags': ['bag', 'tote', 'purse', 'handbag', 'clutch', 'backpack'],
        'shoes': ['shoe', 'sneaker', 'boot', 'sandal', 'heel', 'flat', 'pump', 'loafer'],
        'hats': ['hat', 'cap', 'beanie', 'fedora'],
        'watches': ['watch'],
        'clocks': ['clock'],
        'helmet': ['helmet'],
        'underwear': ['underwear', 'panty', 'panties', 'bra', 'lingerie', 'boxer', 'brief'],
        'socks': ['sock'],
        'rings': ['ring'],
        'dress': ['dress', 'gown'],
        'skirt': ['skirt'],
        'jacket': ['jacket', 'coat', 'blazer', 'cardigan', 'sweater', 'hoodie', 'sweatshirt'],
        'accessories': ['necklace', 'earring', 'bracelet', 'jewelry', 'scarf', 'belt', 'sunglasses']
    }
    
    for subcat, keywords in mappings.items():
        if any(keyword in name_lower for keyword in keywords):
            return subcat
            
    return 'etc'


def normalize_category(category_str, root_category_str, category_tree_str):
    """Normalize category to match frontend expectations (women, men, kids, accessories)"""
    # Parse category_tree to get all category names
    category_tree = parse_json_field(category_tree_str)
    all_category_names = []
    
    if category_tree:
        for item in category_tree:
            if isinstance(item, dict) and 'name' in item:
                all_category_names.append(item['name'].lower())
    
    # Combine all category strings for checking
    all_categories = []
    if category_str:
        all_categories.append(category_str.lower())
    if root_category_str:
        all_categories.append(root_category_str.lower())
    all_categories.extend(all_category_names)
    
    all_categories_text = ' '.join(all_categories)
    
    # Map to frontend categories
    # Women's products
    if any(keyword in all_categories_text for keyword in ['women', "women's", 'womens', 'ladies', 'female']):
        return 'women'
    
    # Men's products
    if any(keyword in all_categories_text for keyword in ['men', "men's", 'mens', 'male']):
        return 'men'
    
    # Kids' products
    if any(keyword in all_categories_text for keyword in ['kids', "kids'", "kid's", 'children', "children's", 'boys', "boys'", "boy's", 'girls', "girls'", "girl's"]):
        return 'kids'
    
    # Accessories (jewelry, bags, watches, etc.)
    if any(keyword in all_categories_text for keyword in ['jewelry', 'jewellery', 'watches', 'accessories', 'bags', 'luggage', 'belts', 'hats', 'caps', 'scarves', 'sunglasses', 'wallets', 'handbags', 'backpacks']):
        return 'accessories'
    
    # Default fallback
    if category_str and category_str.lower() not in ['null', 'none', '']:
        return category_str.strip()
    elif root_category_str and root_category_str.lower() not in ['null', 'none', '']:
        return root_category_str.strip()
    else:
        return 'women'  # Default to women if unclear


def import_shein_products_from_csv(csv_path: str):
    """Import products from SHEIN CSV file"""
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
            products_created = 0  # Track number of products created for featured logic
            
            for row in reader:
                try:
                    # Get product_id
                    product_id = str(row.get('product_id', '').strip())
                    if not product_id or product_id.lower() in ['null', 'none', '']:
                        print(f"Skipping row with empty product_id")
                        products_skipped += 1
                        continue
                    
                    # Check if product already exists
                    existing = db.query(Product).filter(Product.id == product_id).first()
                    if existing:
                        print(f"Product {product_id} already exists, skipping...")
                        products_skipped += 1
                        continue
                    
                    # Get product name
                    name = row.get('product_name', '').strip()
                    if not name or name.lower() in ['null', 'none', '']:
                        name = f"Product {product_id}"
                    
                    # Get prices
                    try:
                        initial_price = float(row.get('initial_price', 0) or 0)
                        final_price = float(row.get('final_price', 0) or 0)
                    except (ValueError, TypeError):
                        initial_price = 0.0
                        final_price = 0.0
                    
                    # Use final_price as main price, initial_price as sale_price if different
                    price = final_price if final_price > 0 else initial_price
                    sale_price = initial_price if initial_price > final_price and initial_price > 0 else None
                    
                    # Get rating
                    try:
                        rating = float(row.get('rating', 0) or 0)
                    except (ValueError, TypeError):
                        rating = 0.0
                    
                    # Get reviews count
                    try:
                        reviews = int(row.get('reviews_count', 0) or 0)
                    except (ValueError, TypeError):
                        reviews = 0
                    
                    # Get images
                    main_image = row.get('main_image', '').strip()
                    image_urls_str = row.get('image_urls', '')
                    images = parse_image_urls(image_urls_str)
                    
                    # Add main_image if not in images list
                    if main_image and main_image.startswith('http') and main_image not in images:
                        images.insert(0, main_image)
                    
                    # If no images, use placeholder
                    if not images:
                        images = [
                            'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=500',
                            'https://images.unsplash.com/photo-1594633312681-425c7b7bccd1?w=500'
                        ]
                    
                    # Get sizes
                    size_str = row.get('size', '')
                    all_available_sizes_str = row.get('all_available_sizes', '')
                    sizes = parse_sizes(size_str, all_available_sizes_str)
                    
                    # Get colors
                    color_str = row.get('color', '')
                    other_attributes_str = row.get('other_attributes', '')
                    colors = parse_colors(color_str, other_attributes_str)
                    
                    # Get and normalize category
                    category = normalize_category(
                        row.get('category', ''),
                        row.get('root_category', ''),
                        row.get('category_tree', '')
                    )

                    # Determine subcategory
                    sub_category = determine_subcategory(name)
                    
                    # Get description
                    description = row.get('description', '').strip()
                    if not description or description.lower() in ['null', 'none', '']:
                        description = name
                    
                    # Featured products (you can customize this logic)
                    # Mark products as featured based on multiple criteria:
                    # 1. High rating (>= 4.0) OR
                    # 2. Has reviews (> 0) OR
                    # 3. First 12 products (to ensure we have featured products)
                    featured = (
                        rating >= 4.0 or 
                        reviews > 0 or 
                        products_created < 12  # First 12 products are featured
                    )
                    
                    # Create product
                    product = Product(
                        id=product_id,
                        name=name,
                        price=price,
                        sale_price=sale_price,
                        category=category,
                        sub_category=sub_category,
                        images=images,
                        colors=colors,
                        sizes=sizes,
                        description=description,
                        featured=featured,
                        rating=rating,
                        reviews=reviews
                    )
                    
                    db.add(product)
                    products_imported += 1
                    products_created += 1  # Increment for featured logic
                    
                    if products_imported % 50 == 0:
                        print(f"Imported {products_imported} products...")
                        db.commit()  # Commit in batches
                
                except Exception as e:
                    print(f"Error importing product {row.get('product_id', 'unknown')}: {e}")
                    import traceback
                    traceback.print_exc()
                    products_skipped += 1
                    continue
            
            # Final commit
            db.commit()
            print(f"\nImport complete!")
            print(f"  - Products imported: {products_imported}")
            print(f"  - Products skipped: {products_skipped}")
            print(f"  - Total processed: {products_imported + products_skipped}")
    
    except Exception as e:
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    # Get CSV file path (prefer filtered version if available)
    current_dir = Path(__file__).parent
    csv_paths = [
        current_dir.parent / "shein-products_filtered.csv",  # Prefer filtered version
        current_dir / "shein-products_filtered.csv",
        current_dir.parent / "shein-products.csv",
        current_dir / "shein-products.csv",
        Path("shein-products_filtered.csv"),
        Path("shein-products.csv"),
    ]
    
    csv_path = None
    for path in csv_paths:
        if path.exists():
            csv_path = str(path)
            break
    
    if not csv_path:
        print("Error: Could not find 'shein-products.csv' or 'shein-products_filtered.csv' file")
        print("Please ensure the CSV file is in the project root or backend directory")
        print("\nTip: Run 'python filter_shein_products.py' first to filter the CSV")
        sys.exit(1)
    
    print(f"Importing products from: {csv_path}")
    if "filtered" in csv_path:
        print("(Using filtered CSV - only clothing and jewelry products)")
    print("This may take a few moments...\n")
    
    import_shein_products_from_csv(csv_path)


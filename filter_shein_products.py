"""
Filter SHEIN products CSV to only include:
- Clothing for Men
- Clothing for Women
- Clothing for Kids
- Jewelry and Accessories
"""
import csv
import json
import os
from pathlib import Path


def parse_json_field(field_value):
    """Parse JSON string field"""
    if not field_value or field_value.lower() in ['null', 'none', '']:
        return []
    
    try:
        parsed = json.loads(field_value)
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, str):
            try:
                return json.loads(parsed)
            except:
                return [parsed]
        return []
    except (json.JSONDecodeError, TypeError):
        return []


def is_valid_category(row):
    """Check if product belongs to valid categories"""
    root_category = row.get('root_category', '').strip().lower()
    category = row.get('category', '').strip().lower()
    category_tree_str = row.get('category_tree', '')
    
    # Parse category_tree
    category_tree = parse_json_field(category_tree_str)
    category_names = []
    if category_tree:
        for item in category_tree:
            if isinstance(item, dict) and 'name' in item:
                category_names.append(item['name'].lower())
    
    # Combine all category strings for checking
    all_categories = [root_category, category] + category_names
    all_categories_text = ' '.join(all_categories)
    
    # Valid categories to keep
    valid_keywords = [
        # Men's clothing
        'men',
        "men's",
        'mens',
        
        # Women's clothing
        'women',
        "women's",
        'womens',
        
        # Kids clothing
        'kids',
        "kids'",
        "kid's",
        'children',
        "children's",
        'boys',
        "boys'",
        "boy's",
        'girls',
        "girls'",
        "girl's",
        
        # Jewelry and accessories
        'jewelry',
        'jewellery',
        'watches',
        'accessories',
        'bags',
        'luggage',
        'belts',
        'hats',
        'caps',
        'scarves',
        'sunglasses',
        'glasses',
        'wallets',
        'handbags',
        'backpacks',
        'jewelry making',  # Keep jewelry making supplies
    ]
    
    # Invalid categories to exclude
    invalid_keywords = [
        'home & living',
        'home living',
        'tools',
        'automotive',
        'beauty & health',
        'beauty health',
        'office',
        'school',
        'kitchen',
        'dining',
        'furniture',
        'storage',
        'cleaning',
        'janitorial',
        'party supplies',
        'event',
        'balloons',
        'decorative',
        'crafts',
        'artificial',
        'plants',
        'cushion',
        'pillow',
        'textile',
        'perfume',
        'fragrance',
        'nail',
        'makeup',
        'cosmetic',
        'crystal shapes',
        'crystal carvings',
        'jewelry making findings',  # Exclude jewelry making supplies (not actual jewelry)
        # Toys, Books, Games, Electronics
        'toys',
        'toy',
        'books',
        'book',
        'games',
        'game',
        'gaming',
        'electronics',
        'electronic',
        'computer',
        'computers',
        'laptop',
        'tablet',
        'phone',
        'smartphone',
        'mobile',
        'headphones',
        'earphones',
        'speaker',
        'speakers',
        'camera',
        'cameras',
        'tv',
        'television',
        'console',
        'playstation',
        'xbox',
        'nintendo',
        'board game',
        'board games',
        'puzzle',
        'puzzles',
        'educational',
        'learning',
        'stationery',  # Office/school supplies
        'notebooks',  # Books/notebooks
        'writing',
        'pencils',
        'pens',
    ]
    
    # Check if it contains any invalid keywords (exclude these)
    for invalid in invalid_keywords:
        if invalid in all_categories_text:
            return False
    
    # Check if it contains any valid keywords (include these)
    for valid in valid_keywords:
        if valid in all_categories_text:
            return True
    
    return False


def filter_shein_csv(input_csv_path: str, output_csv_path: str = None):
    """Filter SHEIN CSV to only include clothing and jewelry products"""
    
    if not os.path.exists(input_csv_path):
        print(f"Error: CSV file not found at {input_csv_path}")
        return
    
    # Default output path
    if output_csv_path is None:
        input_path = Path(input_csv_path)
        output_csv_path = str(input_path.parent / f"{input_path.stem}_filtered{input_path.suffix}")
    
    print(f"Reading CSV from: {input_csv_path}")
    print(f"Filtered CSV will be saved to: {output_csv_path}")
    print()
    
    total_rows = 0
    filtered_rows = 0
    excluded_rows = 0
    
    # Read and filter CSV
    with open(input_csv_path, 'r', encoding='utf-8') as infile, \
         open(output_csv_path, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        
        if not fieldnames:
            print("Error: CSV file has no headers")
            return
        
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in reader:
            total_rows += 1
            
            if is_valid_category(row):
                writer.writerow(row)
                filtered_rows += 1
                
                if filtered_rows % 50 == 0:
                    print(f"Filtered {filtered_rows} products...")
            else:
                excluded_rows += 1
    
    print()
    print("=" * 60)
    print("✓ Filtering complete!")
    print("=" * 60)
    print(f"  - Total products processed: {total_rows}")
    print(f"  - Products kept: {filtered_rows}")
    print(f"  - Products excluded: {excluded_rows}")
    print(f"  - Filtered CSV saved to: {output_csv_path}")
    print()
    print("Categories included:")
    print("  ✓ Men's Clothing")
    print("  ✓ Women's Clothing")
    print("  ✓ Kids' Clothing")
    print("  ✓ Jewelry & Accessories")
    print()
    print("Categories excluded:")
    print("  ✗ Home & Living")
    print("  ✗ Tools & Home Improvement")
    print("  ✗ Beauty & Health")
    print("  ✗ Office & School Supplies")
    print("  ✗ Automotive")
    print("  ✗ Toys & Games")
    print("  ✗ Books & Stationery")
    print("  ✗ Electronics")
    print("  ✗ And other non-clothing categories")


if __name__ == "__main__":
    # Find CSV file
    current_dir = Path(__file__).parent
    csv_paths = [
        current_dir / "shein-products.csv",
        current_dir.parent / "shein-products.csv",
        Path("shein-products.csv"),
    ]
    
    csv_path = None
    for path in csv_paths:
        if path.exists():
            csv_path = str(path)
            break
    
    if not csv_path:
        print("Error: Could not find 'shein-products.csv' file")
        print("Please ensure the CSV file is in the project root or current directory")
        exit(1)
    
    # Filter the CSV
    filter_shein_csv(csv_path)


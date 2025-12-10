"""
Populate sub_category column based on product name and category
"""
import sys
from pathlib import Path
from sqlalchemy import or_

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Product
from dotenv import load_dotenv

load_dotenv()

def populate_subcategories():
    """Populate sub_category for all products"""
    db: Session = SessionLocal()
    
    try:
        print("Fetching all products...")
        products = db.query(Product).all()
        print(f"Found {len(products)} products.")
        
        updated_count = 0
        
        # Define mapping of keywords to subcategories
        # Order matters: more specific first
        keyword_map = {
            't-shirt': 'T-Shirt',
            'tshirt': 'T-Shirt',
            'tee': 'T-Shirt',
            'shirt': 'Shirt',
            'blouse': 'Blouse',
            'tank': 'Top',
            'cami': 'Top',
            'top': 'Top',
            'sweater': 'Sweater',
            'cardigan': 'Cardigan',
            'pullover': 'Sweater',
            'hoodie': 'Hoodie',
            'sweatshirt': 'Sweatshirt',
            'jacket': 'Jacket',
            'coat': 'Coat',
            'blazer': 'Blazer',
            'vest': 'Vest',
            'dress': 'Dress',
            'gown': 'Dress',
            'skirt': 'Skirt',
            'jeans': 'Jeans',
            'denim': 'Jeans',
            'pants': 'Pants',
            'trousers': 'Pants',
            'leggings': 'Leggings',
            'shorts': 'Shorts',
            'jumpsuit': 'Jumpsuit',
            'romper': 'Romper',
            'bodysuit': 'Bodysuit',
            'suit': 'Suit',
            'kimono': 'Kimono',
            'swim': 'Swimwear',
            'bikini': 'Swimwear',
            'lingerie': 'Lingerie',
            'sleep': 'Sleepwear',
            'pyjama': 'Sleepwear',
            'robe': 'Sleepwear'
        }
        
        print("Analyzing products and assigning subcategories...")
        
        for product in products:
            name_lower = product.name.lower()
            category_lower = product.category.lower()
            
            sub_category = None
            
            # Check name for keywords
            for keyword, sub in keyword_map.items():
                if keyword in name_lower:
                    sub_category = sub
                    break
            
            # If not found in name, check category
            if not sub_category:
                for keyword, sub in keyword_map.items():
                    if keyword in category_lower:
                        sub_category = sub
                        break
            
            # Fallback: use category as subcategory if it's specific enough
            if not sub_category:
                # If category is one of our target subcategories
                if product.category in keyword_map.values():
                    sub_category = product.category
                else:
                    # Default to 'Other' or keep None? Let's use 'Other' for now or just leave empty?
                    # User asked to "read the name... to understand what subcategory to have"
                    # Let's leave it as None if we can't determine it, or maybe 'General'
                    pass
            
            if sub_category:
                product.sub_category = sub_category
                updated_count += 1
                # print(f"  {product.name[:30]}... -> {sub_category}")
        
        db.commit()
        print(f"Successfully updated {updated_count} products with subcategories.")
        
        # Show distribution
        from collections import Counter
        sub_counts = Counter([p.sub_category for p in products if p.sub_category])
        
        print("\nSubcategory Distribution:")
        print("-" * 30)
        for sub, count in sorted(sub_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {sub}: {count}")
            
        missing = len(products) - updated_count
        if missing > 0:
            print(f"\nWarning: {missing} products could not be assigned a subcategory.")
            
    except Exception as e:
        print(f"Error populating subcategories: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()

if __name__ == "__main__":
    populate_subcategories()

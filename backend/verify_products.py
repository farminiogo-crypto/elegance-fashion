"""
Verify what products are in the database
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Product
from dotenv import load_dotenv
from collections import Counter

load_dotenv()


def verify_products():
    """Show statistics about products in the database"""
    db: Session = SessionLocal()
    
    try:
        # Count total products
        total = db.query(Product).count()
        
        if total == 0:
            print("⚠ No products found in database")
            print("   Run 'python import_shein_products.py' to import products")
            return
        
        print("=" * 60)
        print("DATABASE PRODUCT VERIFICATION")
        print("=" * 60)
        print()
        print(f"Total products in database: {total}")
        print()
        
        # Get category distribution
        categories = db.query(Product.category).all()
        category_counts = Counter([cat[0] for cat in categories])
        
        print("Products by category:")
        print("-" * 60)
        for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {category}: {count}")
        print()
        
        # Check for non-clothing categories (warnings)
        non_clothing_keywords = [
            'home', 'living', 'tools', 'automotive', 'beauty', 'health',
            'office', 'school', 'kitchen', 'dining', 'furniture', 'storage',
            'cleaning', 'party', 'event', 'decorative', 'crafts', 'artificial',
            'toy', 'toys', 'book', 'books', 'game', 'games', 'gaming',
            'electronic', 'electronics', 'computer', 'laptop', 'tablet', 'phone',
            'console', 'puzzle', 'puzzles', 'stationery', 'notebooks'
        ]
        
        suspicious_categories = []
        for category in category_counts.keys():
            category_lower = category.lower()
            for keyword in non_clothing_keywords:
                if keyword in category_lower:
                    suspicious_categories.append(category)
                    break
        
        if suspicious_categories:
            print("⚠ WARNING: Found categories that might not be clothing/jewelry:")
            print("-" * 60)
            for cat in suspicious_categories:
                print(f"  ⚠ {cat}: {category_counts[cat]} products")
            print()
            print("   These might be non-clothing products.")
            print("   Consider running 'python filter_shein_products.py' and re-importing.")
            print()
        else:
            print("✓ All categories appear to be clothing/jewelry related")
            print()
        
        # Show sample products
        print("Sample products (first 5):")
        print("-" * 60)
        sample_products = db.query(Product).limit(5).all()
        for product in sample_products:
            print(f"  - {product.name[:60]}...")
            print(f"    Category: {product.category}, Price: ${product.price}")
        print()
        
        # Check if filtered CSV exists
        current_dir = Path(__file__).parent
        filtered_csv = current_dir.parent / "shein-products_filtered.csv"
        original_csv = current_dir.parent / "shein-products.csv"
        
        print("CSV Files:")
        print("-" * 60)
        if filtered_csv.exists():
            print(f"  ✓ Found: {filtered_csv.name}")
            print("    (This is the filtered CSV - clothing & jewelry only)")
        else:
            print(f"  ✗ Not found: {filtered_csv.name}")
            print("    (Run 'python filter_shein_products.py' to create it)")
        
        if original_csv.exists():
            print(f"  ✓ Found: {original_csv.name}")
        else:
            print(f"  ✗ Not found: {original_csv.name}")
        print()
        
        print("=" * 60)
        print("Verification complete!")
        print("=" * 60)
    
    except Exception as e:
        print(f"Error verifying products: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()


if __name__ == "__main__":
    verify_products()


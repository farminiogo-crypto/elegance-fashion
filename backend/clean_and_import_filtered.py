"""
Clean database and import only filtered products
This ensures only clothing and jewelry products are in the database
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Product
from import_shein_products import import_shein_products_from_csv
from dotenv import load_dotenv

load_dotenv()


def clean_and_import_filtered():
    """Clear all products and import only filtered ones"""
    print("=" * 60)
    print("CLEAN DATABASE & IMPORT FILTERED PRODUCTS")
    print("=" * 60)
    print()
    
    # Step 1: Check current products
    db = SessionLocal()
    try:
        current_count = db.query(Product).count()
        print(f"Current products in database: {current_count}")
    finally:
        db.close()
    
    if current_count > 0:
        print()
        print("⚠ WARNING: This will delete ALL existing products!")
        response = input("Continue? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Operation cancelled.")
            return
    
    # Step 2: Clear all products
    print()
    print("Step 1: Clearing all products...")
    print("-" * 60)
    try:
        db = SessionLocal()
        try:
            count = db.query(Product).count()
            if count > 0:
                db.query(Product).delete()
                db.commit()
                print(f"✓ Deleted {count} products from database")
            else:
                print("No products to delete.")
        finally:
            db.close()
        print()
    except Exception as e:
        print(f"Error clearing products: {e}")
        return
    
    # Step 3: Import filtered products
    print("Step 2: Importing filtered products...")
    print("-" * 60)
    
    # Get CSV file path (prefer filtered version)
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
        print("Error: Could not find CSV file")
        print("Please run 'python filter_shein_products.py' first to create filtered CSV")
        return
    
    if "filtered" in csv_path:
        print("✓ Using filtered CSV (clothing & jewelry only)")
    else:
        print("⚠ WARNING: Using unfiltered CSV!")
        print("   Run 'python filter_shein_products.py' first to filter products")
        response = input("Continue anyway? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Operation cancelled.")
            return
    
    try:
        import_shein_products_from_csv(csv_path)
        print()
        
        # Step 4: Verify
        print("Step 3: Verifying import...")
        print("-" * 60)
        db = SessionLocal()
        try:
            final_count = db.query(Product).count()
            print(f"✓ Total products in database: {final_count}")
            
            # Show category breakdown
            from collections import Counter
            categories = db.query(Product.category).all()
            category_counts = Counter([cat[0] for cat in categories])
            
            print(f"\nProducts by category:")
            for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  - {category}: {count}")
        finally:
            db.close()
        
        print()
        print("=" * 60)
        print("✓ Complete! Database now contains only filtered products")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Restart your backend server")
        print("  2. Refresh your website")
        print("  3. All products should now be visible on /shop page")
        
    except Exception as e:
        print(f"Error importing products: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    clean_and_import_filtered()


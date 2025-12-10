import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import Product
from sqlalchemy import func

def check_subcategories():
    db = SessionLocal()
    try:
        # Get counts of products by subcategory
        results = db.query(Product.sub_category, func.count(Product.id)).group_by(Product.sub_category).all()
        
        print("Product Subcategories Distribution:")
        print("-" * 30)
        for subcat, count in results:
            print(f"{subcat}: {count}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_subcategories()

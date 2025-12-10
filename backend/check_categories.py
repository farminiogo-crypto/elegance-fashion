import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import Product
from sqlalchemy import func

def check_categories():
    db = SessionLocal()
    try:
        # Get counts of products by category
        results = db.query(Product.category, func.count(Product.id)).group_by(Product.category).all()
        
        print("Product Categories Distribution:")
        print("-" * 30)
        for category, count in results:
            print(f"{category}: {count}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_categories()

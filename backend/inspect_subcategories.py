"""
Inspect product details to debug subcategory assignment
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import Product
from dotenv import load_dotenv

load_dotenv()

def inspect_products():
    db = SessionLocal()
    try:
        products = db.query(Product).offset(100).limit(20).all()
        print(f"Inspecting products 101-120:")
        print("-" * 80)
        print(f"{'Name':<50} | {'Category':<15} | {'SubCategory':<15}")
        print("-" * 80)
        for p in products:
            print(f"{p.name[:47]:<50} | {p.category:<15} | {p.sub_category:<15}")
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect_products()

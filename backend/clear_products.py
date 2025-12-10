"""
Clear all products from the database
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Product
from dotenv import load_dotenv

load_dotenv()


def clear_all_products():
    """Delete all products from the database"""
    db: Session = SessionLocal()
    
    try:
        # Count products before deletion
        count = db.query(Product).count()
        print(f"Found {count} products in database")
        
        if count == 0:
            print("No products to delete.")
            return
        
        # Delete all products
        db.query(Product).delete()
        db.commit()
        
        print(f"Successfully deleted {count} products from database")
    
    except Exception as e:
        print(f"Error clearing products: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    print("This will delete ALL products from the database.")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        clear_all_products()
    else:
        print("Operation cancelled.")


"""
Remove products with 'sexy' or inappropriate keywords from the database
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import SessionLocal
from app.models import Product
from dotenv import load_dotenv

load_dotenv()


def remove_sexy_products():
    """Delete products with inappropriate keywords from the database"""
    db: Session = SessionLocal()
    
    # List of keywords to filter out
    keywords = [
        'sexy', 'lingerie', 'erotic', 'thong', 'bikini', 'bra', 
        'panty', 'underwear', 'babydoll', 'teddies', 'corset'
    ]
    
    try:
        print("Searching for products with inappropriate keywords...")
        
        # Build the query
        query = db.query(Product)
        
        # Create a list of conditions
        conditions = []
        for keyword in keywords:
            term = f"%{keyword}%"
            conditions.append(Product.name.ilike(term))
            conditions.append(Product.description.ilike(term))
            conditions.append(Product.category.ilike(term))
            
        # Apply the filter with OR condition
        products_to_delete = query.filter(or_(*conditions)).all()
        
        count = len(products_to_delete)
        
        if count == 0:
            print("No products found matching the keywords.")
            return
            
        print(f"Found {count} products matching keywords: {', '.join(keywords)}")
        
        # Confirm deletion
        # In a script we might want to just do it, or ask for confirmation. 
        # Since this is a specific removal script, we'll proceed but print what we're doing.
        
        print("Deleting products...")
        
        # Delete the products
        # We can use bulk delete for efficiency if we query just IDs, but iterating is safer for cascading if needed
        # However, SQLAlchemy's delete() with synchronization_session=False is efficient
        
        db.query(Product).filter(or_(*conditions)).delete(synchronize_session=False)
        db.commit()
        
        print(f"Successfully deleted {count} products.")
        
    except Exception as e:
        print(f"Error removing products: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    remove_sexy_products()

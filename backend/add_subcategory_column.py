"""
Add sub_category column to products table
"""
import sys
from pathlib import Path
from sqlalchemy import text

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine

def add_subcategory_column():
    """Add sub_category column to products table if it doesn't exist"""
    print("Checking for sub_category column...")
    
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("SHOW COLUMNS FROM products LIKE 'sub_category'"))
        if result.fetchone():
            print("Column 'sub_category' already exists.")
            return

        print("Adding 'sub_category' column...")
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN sub_category VARCHAR(50) NULL AFTER category"))
            conn.commit()
            print("Successfully added 'sub_category' column.")
        except Exception as e:
            print(f"Error adding column: {e}")
            raise

if __name__ == "__main__":
    add_subcategory_column()

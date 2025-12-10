"""
Database Auto-Seed Module
Automatically seeds the products table from SQL dump when database is empty
"""
import os
import re
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import Product


# Path to SQL dump file
SQL_DUMP_FILE = Path(__file__).parent.parent.parent / "fashion_db (3).sql"


def get_products_count(db: Session) -> int:
    """Get the number of products in the database"""
    try:
        result = db.execute(text("SELECT COUNT(*) FROM products"))
        return result.scalar() or 0
    except Exception as e:
        print(f"⚠️ Could not count products: {e}")
        return 0


def extract_product_inserts(sql_content: str) -> list:
    """Extract product INSERT statements from SQL dump"""
    inserts = []
    
    # Find all INSERT INTO products statements
    pattern = r"INSERT INTO `products`.*?VALUES\s*(.*?);"
    matches = re.findall(pattern, sql_content, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        # Build complete INSERT statement
        insert_sql = f"INSERT INTO products (`id`, `name`, `price`, `sale_price`, `category`, `sub_category`, `images`, `colors`, `sizes`, `description`, `featured`, `rating`, `reviews`, `created_at`, `updated_at`) VALUES {match}"
        inserts.append(insert_sql)
    
    return inserts


def seed_from_sql_dump(db: Session) -> int:
    """Seed products from SQL dump file"""
    if not SQL_DUMP_FILE.exists():
        print(f"❌ SQL dump file not found: {SQL_DUMP_FILE}")
        return 0
    
    print(f"📂 Loading products from: {SQL_DUMP_FILE}")
    
    try:
        # Read SQL content
        with open(SQL_DUMP_FILE, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Execute the INSERT statements for products
        inserts = extract_product_inserts(sql_content)
        
        if not inserts:
            print("⚠️ No product INSERT statements found in SQL dump")
            return 0
        
        total_inserted = 0
        for insert_sql in inserts:
            try:
                # Count rows in this INSERT (count VALUES tuples)
                values_content = insert_sql.split("VALUES")[1] if "VALUES" in insert_sql else ""
                row_count = values_content.count("('") 
                
                db.execute(text(insert_sql))
                db.commit()
                total_inserted += row_count
                print(f"✓ Inserted batch of ~{row_count} products")
            except Exception as e:
                db.rollback()
                print(f"⚠️ Error inserting batch: {str(e)[:100]}")
                continue
        
        return total_inserted
        
    except Exception as e:
        print(f"❌ Error reading SQL dump: {e}")
        db.rollback()
        return 0


def check_and_seed_database():
    """Check if products table is empty and seed if needed"""
    db = SessionLocal()
    
    try:
        # Check current product count
        product_count = get_products_count(db)
        
        if product_count > 0:
            print(f"✓ Products table already has {product_count} products, skipping seed")
            return
        
        print("📊 Products table is empty, starting auto-seed...")
        
        # Try to seed from SQL dump
        inserted = seed_from_sql_dump(db)
        
        if inserted > 0:
            print(f"✅ Auto-seed complete! Inserted {inserted} products")
        else:
            print("⚠️ Auto-seed completed but no products were inserted")
            print("   Please manually import the SQL dump if needed")
            
    except Exception as e:
        print(f"❌ Auto-seed error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    # Allow running directly for testing
    check_and_seed_database()

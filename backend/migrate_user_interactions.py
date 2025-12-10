"""
Database migration script to add user_interactions table.
Run this script to create the user_interactions table in your existing database.
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root@localhost/fashion_db")

def run_migration():
    """Create user_interactions table"""
    engine = create_engine(DATABASE_URL)
    
    # SQL to create user_interactions table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS user_interactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        session_id VARCHAR(255) NULL,
        product_id VARCHAR(50) NOT NULL,
        interaction_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_session_id (session_id),
        INDEX idx_product_id (product_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    try:
        with engine.connect() as conn:
            print("Creating user_interactions table...")
            conn.execute(text(create_table_sql))
            conn.commit()
            print("✓ user_interactions table created successfully!")
            
    except Exception as e:
        print(f"Error creating table: {e}")
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    print("Running database migration...")
    run_migration()
    print("Migration completed!")

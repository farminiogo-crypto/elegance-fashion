"""
Database initialization script
Run this script to create the database and tables
"""
import os
import sys
from sqlalchemy import create_engine, text
from app.database import DATABASE_URL, Base, engine
from app.models import User, Product, CartItem, Order, OrderItem, WishlistItem

def create_database():
    """Create the database if it doesn't exist"""
    # Extract database name from URL
    db_url_parts = DATABASE_URL.split('/')
    db_name = db_url_parts[-1]
    base_url = '/'.join(db_url_parts[:-1])
    
    # Connect to MySQL server (without database)
    engine_no_db = create_engine(base_url.replace('/fashion_db', ''))
    
    with engine_no_db.connect() as conn:
        # Check if database exists
        result = conn.execute(text(f"SHOW DATABASES LIKE '{db_name}'"))
        if result.fetchone() is None:
            # Create database
            conn.execute(text(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            conn.commit()
            print(f"Database '{db_name}' created successfully")
        else:
            print(f"Database '{db_name}' already exists")
    
    engine_no_db.dispose()


def init_tables():
    """Create all tables"""
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully")


def create_default_admin():
    """Create a default admin user"""
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "admin@elegance.com").first()
        if admin:
            print("Default admin user already exists")
            return
        
        # Create admin user
        admin = User(
            name="Admin User",
            email="admin@elegance.com",
            role="admin"
        )
        admin.set_password("admin123")
        
        db.add(admin)
        db.commit()
        print("Default admin user created:")
        print("  Email: admin@elegance.com")
        print("  Password: admin123")
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


def create_default_user():
    """Create a default regular user"""
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        # Check if user already exists
        user = db.query(User).filter(User.email == "user@example.com").first()
        if user:
            print("Default user already exists")
            return
        
        # Create user
        user = User(
            name="John Doe",
            email="user@example.com",
            role="user"
        )
        user.set_password("password")
        
        db.add(user)
        db.commit()
        print("Default user created:")
        print("  Email: user@example.com")
        print("  Password: password")
    except Exception as e:
        print(f"Error creating user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Initializing database...")
    try:
        create_database()
        init_tables()
        create_default_admin()
        create_default_user()
        print("\nDatabase initialization completed successfully!")
    except Exception as e:
        print(f"\nError during initialization: {e}")
        sys.exit(1)


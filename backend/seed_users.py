import sys
import os

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User

def seed_users():
    db = SessionLocal()
    try:
        users_to_seed = [
            {"name": "Alice Smith", "email": "alice@example.com", "password": "password123", "role": "user"},
            {"name": "Bob Jones", "email": "bob@example.com", "password": "password123", "role": "user"},
            {"name": "Charlie Brown", "email": "charlie@example.com", "password": "password123", "role": "user"},
            {"name": "Admin User", "email": "admin@elegance.com", "password": "admin123", "role": "admin"}
        ]

        print("Seeding users...")
        for user_data in users_to_seed:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                print(f"User {user_data['email']} already exists.")
            else:
                new_user = User(
                    name=user_data["name"],
                    email=user_data["email"],
                    role=user_data["role"]
                )
                new_user.set_password(user_data["password"])
                db.add(new_user)
                print(f"Created user: {user_data['name']} ({user_data['email']})")
        
        db.commit()
        print("User seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from sqlalchemy import text

from app.routers import auth, products, cart, orders, wishlist, recommendations, chat, fit_assistant, product_ai, admin_inventory, admin_categories
from app.database import engine, Base
from app.init_db import check_and_seed_database


# Create database tables (with error handling)
def init_database():
    """Initialize database tables with better error handling"""
    try:
        # Quick connection test first (faster than table creation)
        print("Checking database connection...")
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        # If connection works, create tables
        print("✓ Database connection successful, creating tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created/verified successfully")

        # Auto-seed products if table is empty
        print("Checking if products need to be seeded...")
        check_and_seed_database()

        return True
    except Exception as e:
        error_msg = str(e)
        if "Can't connect" in error_msg or "timed out" in error_msg.lower():
            print("⚠ Database connection failed: MySQL server is not running or not accessible")
        elif "Access denied" in error_msg:
            print("⚠ Database authentication failed: Check your username/password in .env file")
        elif "Unknown database" in error_msg:
            print("⚠ Database not found: Run 'python init_db.py' to create the database")
        else:
            print(f"⚠ Database error: {error_msg}")

        print("⚠ Server will start, but database operations will fail until MySQL is running")
        print("⚠ To fix:")
        print("   1. Ensure MySQL is installed and running")
        print("   2. Check your DATABASE_URL in backend/.env file")
        print("   3. Run 'python init_db.py' to create the database")
        return False


# Initialize database
try:
    init_database()
except KeyboardInterrupt:
    print("\n⚠ Startup interrupted by user")
except Exception as e:
    print(f"⚠ Unexpected error during database initialization: {e}")
    print("⚠ Server will start anyway, but database may not be available")


app = FastAPI(
    title="Fashion Website API",
    description="Backend API for Fashion Website with AI Recommendations",
    version="1.0.0",
)

# ==========================
# CORS middleware (DEV MODE)
# ==========================
# نسمح بكل الـ origins عشان Vite ممكن يشتغل على 3000 أو 3004 أو غيره
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 👈 أهم تغيير
    allow_credentials=True,
    allow_methods=["*"],          # يسمح بكل الميثودز (GET, POST, OPTIONS, ...)
    allow_headers=["*"],          # يسمح بكل الهيدرز
    expose_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(cart.router, prefix="/api/cart", tags=["Cart"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(wishlist.router, prefix="/api/wishlist", tags=["Wishlist"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(fit_assistant.router, prefix="/api/fit-assistant", tags=["AI Fit Assistant"])
app.include_router(product_ai.router, prefix="/api/product-ai", tags=["AI Product Assistant"])
app.include_router(admin_inventory.router, prefix="/api/admin/inventory", tags=["Admin Inventory"])
app.include_router(admin_categories.router, prefix="/api/admin/categories", tags=["Admin Categories"])


@app.get("/")
async def root():
    return {"message": "Fashion Website API", "status": "running"}


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
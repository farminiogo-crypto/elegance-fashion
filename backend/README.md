# Fashion Website Backend API

FastAPI backend for the Fashion Website with AI Recommendations.

## Features

- User authentication (login, signup, admin login)
- Product management (CRUD operations)
- Shopping cart functionality
- Order management
- Wishlist functionality
- MySQL database integration
- JWT token-based authentication

## Prerequisites

- Python 3.8 or higher
- MySQL 5.7 or higher (or MariaDB)
- pip (Python package manager)

## Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up MySQL database:**
   - Create a MySQL database (or use the init script)
   - Update the `.env` file with your database credentials:
     ```
     DATABASE_URL=mysql+pymysql://username:password@localhost:3306/fashion_db
     SECRET_KEY=your-secret-key-here
     ```

3. **Initialize the database:**
   ```bash
   python init_db.py
   ```
   This will:
   - Create the database if it doesn't exist
   - Create all necessary tables
   - Create a default admin user (admin@elegance.com / admin123)
   - Create a default regular user (user@example.com / password)

## Running the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user info

### Products
- `GET /api/products/` - Get all products (with optional filters)
- `GET /api/products/{product_id}` - Get product by ID
- `POST /api/products/` - Create product (Admin only)
- `PUT /api/products/{product_id}` - Update product (Admin only)
- `DELETE /api/products/{product_id}` - Delete product (Admin only)

### Cart
- `GET /api/cart/` - Get user's cart items
- `POST /api/cart/` - Add item to cart
- `PUT /api/cart/{item_id}` - Update cart item quantity
- `DELETE /api/cart/{item_id}` - Remove item from cart
- `DELETE /api/cart/` - Clear cart

### Orders
- `GET /api/orders/` - Get user's orders (or all orders if admin)
- `GET /api/orders/{order_id}` - Get order by ID
- `POST /api/orders/` - Create new order
- `PUT /api/orders/{order_id}/status` - Update order status (Admin only)

### Wishlist
- `GET /api/wishlist/` - Get user's wishlist
- `POST /api/wishlist/{product_id}` - Add product to wishlist
- `DELETE /api/wishlist/{product_id}` - Remove product from wishlist

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Database Schema

The database includes the following tables:
- `users` - User accounts
- `products` - Product catalog
- `cart_items` - Shopping cart items
- `orders` - Customer orders
- `order_items` - Order line items
- `wishlist_items` - User wishlists

## Environment Variables

Create a `.env` file in the backend directory with:

```env
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/fashion_db
SECRET_KEY=your-secret-key-here
HOST=0.0.0.0
PORT=8000
```

## Development

To run in development mode with auto-reload:

```bash
uvicorn main:app --reload
```

## Production Deployment

For production, use a production ASGI server like Gunicorn with Uvicorn workers:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Make sure to:
- Set a strong `SECRET_KEY` in production
- Use environment variables for sensitive data
- Enable HTTPS
- Set up proper CORS origins
- Use a production-grade database connection pool


# Fashion Website - Backend API

This is the FastAPI backend for the Fashion Website with AI Recommendations. It provides a RESTful API with MySQL database integration.

## Architecture

- **Framework**: FastAPI (Python)
- **Database**: MySQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT tokens
- **API Documentation**: Swagger UI & ReDoc

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── database.py          # Database connection and session management
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic schemas for request/response validation
│   ├── dependencies.py      # FastAPI dependencies (auth, etc.)
│   └── routers/
│       ├── __init__.py
│       ├── auth.py          # Authentication endpoints
│       ├── products.py      # Product management endpoints
│       ├── cart.py          # Shopping cart endpoints
│       ├── orders.py        # Order management endpoints
│       └── wishlist.py      # Wishlist endpoints
├── main.py                  # FastAPI application entry point
├── init_db.py               # Database initialization script
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variables template
└── README.md                # Setup instructions
```

## Features

### Authentication
- User registration
- User login
- Admin login
- JWT token-based authentication
- Protected routes

### Products
- List all products (with filtering)
- Get product by ID
- Create product (Admin only)
- Update product (Admin only)
- Delete product (Admin only)

### Shopping Cart
- Get user's cart items
- Add item to cart
- Update cart item quantity
- Remove item from cart
- Clear entire cart

### Orders
- Create new order
- Get user's orders
- Get order by ID
- Update order status (Admin only)

### Wishlist
- Get user's wishlist
- Add product to wishlist
- Remove product from wishlist

## Database Schema

### Users
- id, name, email, password_hash, role, created_at, updated_at

### Products
- id, name, price, sale_price, category, images (JSON), colors (JSON), sizes (JSON), description, featured, rating, reviews, created_at, updated_at

### Cart Items
- id, user_id, product_id, size, color, quantity, created_at, updated_at

### Orders
- id, user_id, customer_name, email, status, total, shipping_address, payment_method, created_at, updated_at

### Order Items
- id, order_id, product_id, name, quantity, price, size, color, image

### Wishlist Items
- id, user_id, product_id, created_at

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user info

### Products
- `GET /api/products/` - List products (query params: category, featured, skip, limit)
- `GET /api/products/{id}` - Get product by ID
- `POST /api/products/` - Create product (Admin)
- `PUT /api/products/{id}` - Update product (Admin)
- `DELETE /api/products/{id}` - Delete product (Admin)

### Cart
- `GET /api/cart/` - Get cart items
- `POST /api/cart/` - Add item to cart
- `PUT /api/cart/{item_id}?quantity={qty}` - Update cart item
- `DELETE /api/cart/{item_id}` - Remove item from cart
- `DELETE /api/cart/` - Clear cart

### Orders
- `GET /api/orders/` - Get orders (query param: status)
- `GET /api/orders/{id}` - Get order by ID
- `POST /api/orders/` - Create order
- `PUT /api/orders/{id}/status` - Update order status (Admin)

### Wishlist
- `GET /api/wishlist/` - Get wishlist
- `POST /api/wishlist/{product_id}` - Add to wishlist
- `DELETE /api/wishlist/{product_id}` - Remove from wishlist

## Frontend Integration

The frontend has been updated to use this API. Make sure to:

1. Set the API URL in your frontend `.env`:
   ```
   VITE_API_URL=http://localhost:8000
   ```

2. The frontend contexts (AuthContext, ProductContext, CartContext, etc.) now use the API service instead of localStorage.

3. All API calls include JWT tokens in the Authorization header automatically.

## Development

### Running the Server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing

Access the interactive API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Database Migrations

Currently using SQLAlchemy's `create_all()` for table creation. For production, consider using Alembic for migrations.

## Production Considerations

1. **Security**:
   - Change `SECRET_KEY` to a strong random value
   - Use environment variables for all sensitive data
   - Enable HTTPS
   - Set proper CORS origins (not `*`)

2. **Database**:
   - Use connection pooling
   - Set up database backups
   - Use read replicas for scaling

3. **Performance**:
   - Add caching (Redis)
   - Use CDN for static assets
   - Implement rate limiting
   - Add database indexes

4. **Monitoring**:
   - Add logging
   - Set up error tracking (Sentry)
   - Monitor API performance

## Troubleshooting

See `SETUP.md` for detailed setup instructions and troubleshooting tips.


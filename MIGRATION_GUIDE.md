# Migration Guide: Serverless to FastAPI Backend

This guide explains the changes made when migrating from a serverless/localStorage-based system to a FastAPI backend with MySQL.

## What Changed

### Backend
- **New**: FastAPI backend with MySQL database
- **New**: JWT-based authentication
- **New**: RESTful API endpoints for all features
- **Removed**: Serverless functions (Hono)

### Frontend
- **Updated**: All contexts now use API calls instead of localStorage
- **New**: API service layer (`src/services/api.ts`)
- **Updated**: Authentication now uses JWT tokens
- **Updated**: Cart, Orders, Wishlist now persist to database

## Key Changes by Component

### Authentication (`src/context/AuthContext.tsx`)
- **Before**: Mock users in memory, localStorage for persistence
- **After**: API calls to `/api/auth/*` endpoints
- **New**: JWT token stored in localStorage as `auth_token`
- **New**: Automatic token validation on app load

### Products (`src/context/ProductContext.tsx`)
- **Before**: Loaded from CSV file, stored in localStorage
- **After**: Loaded from `/api/products/` endpoint
- **New**: Admin CRUD operations use API
- **Kept**: Recommendation engine logic (still client-side)

### Cart (`src/context/CartContext.tsx`)
- **Before**: Stored in component state only
- **After**: Persisted to database via `/api/cart/` endpoints
- **New**: Cart persists across sessions
- **New**: User-specific carts

### Orders (`src/context/OrderContext.tsx`)
- **Before**: Mock data in localStorage
- **After**: Real orders in database via `/api/orders/` endpoints
- **New**: Order status management
- **New**: Order history per user

### Wishlist (`src/context/WishlistContext.tsx`)
- **Before**: Component state only
- **After**: Persisted to database via `/api/wishlist/` endpoints
- **New**: Wishlist persists across sessions

### Checkout (`src/pages/CheckoutPage.tsx`)
- **Before**: Mock order creation
- **After**: Real order creation via API
- **New**: Form data sent to backend
- **New**: Error handling for failed orders

## Setup Instructions

### Backend Setup
1. Install Python dependencies: `pip install -r requirements.txt`
2. Configure MySQL database in `.env`
3. Run `python init_db.py` to initialize database
4. Start server: `python main.py`

### Frontend Setup
1. Create `.env` file with: `VITE_API_URL=http://localhost:8000`
2. Frontend will automatically use the API

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/signup` - Register new user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products/` - List products
- `GET /api/products/{id}` - Get product
- `POST /api/products/` - Create product (Admin)
- `PUT /api/products/{id}` - Update product (Admin)
- `DELETE /api/products/{id}` - Delete product (Admin)

### Cart
- `GET /api/cart/` - Get cart items
- `POST /api/cart/` - Add to cart
- `PUT /api/cart/{id}?quantity={qty}` - Update quantity
- `DELETE /api/cart/{id}` - Remove item
- `DELETE /api/cart/` - Clear cart

### Orders
- `GET /api/orders/` - Get orders
- `GET /api/orders/{id}` - Get order
- `POST /api/orders/` - Create order
- `PUT /api/orders/{id}/status` - Update status (Admin)

### Wishlist
- `GET /api/wishlist/` - Get wishlist
- `POST /api/wishlist/{product_id}` - Add to wishlist
- `DELETE /api/wishlist/{product_id}` - Remove from wishlist

## Default Credentials

After running `init_db.py`:
- **Admin**: `admin@elegance.com` / `admin123`
- **User**: `user@example.com` / `password`

## Breaking Changes

1. **Authentication Required**: Most endpoints now require authentication
2. **Data Persistence**: All data is now in database, not localStorage
3. **API Errors**: Frontend now handles API errors (network issues, validation errors)
4. **Async Operations**: All context methods are now async

## Migration Checklist

- [x] Backend API created
- [x] Database models defined
- [x] Authentication endpoints implemented
- [x] Product endpoints implemented
- [x] Cart endpoints implemented
- [x] Order endpoints implemented
- [x] Wishlist endpoints implemented
- [x] Frontend contexts updated
- [x] API service layer created
- [x] Error handling added
- [x] Documentation created

## Next Steps

1. Test all functionality
2. Add error boundaries in frontend
3. Add loading states
4. Implement retry logic for failed requests
5. Add request caching where appropriate
6. Set up production database
7. Configure CORS for production domain
8. Add rate limiting
9. Set up monitoring and logging


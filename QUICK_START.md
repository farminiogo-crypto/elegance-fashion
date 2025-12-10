# Quick Start Guide - Frontend to Backend Connection

## Step 1: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure database in `.env` file:**
   ```env
   DATABASE_URL=mysql+pymysql://root:password@localhost:3306/fashion_db
   SECRET_KEY=your-secret-key-change-this-in-production
   ```

4. **Initialize database:**
   ```bash
   python init_db.py
   ```
   This creates:
   - Database and all tables
   - Default admin: `admin@elegance.com` / `admin123`
   - Default user: `user@example.com` / `password`

5. **Start backend server:**
   ```bash
   python main.py
   ```
   Backend will run at: `http://localhost:8000`

## Step 2: Frontend Setup

1. **Navigate to root directory** (if not already there):
   ```bash
   cd ..
   ```

2. **Create `.env` file** in root directory:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Install frontend dependencies** (if not already installed):
   ```bash
   npm install
   ```

4. **Start frontend development server:**
   ```bash
   npm run dev
   ```
   Frontend will run at: `http://localhost:5173` (or port shown)

## Step 3: Verify Connection

1. **Check backend is running:**
   - Open: `http://localhost:8000/api/health`
   - Should see: `{"status": "ok"}`

2. **Check API documentation:**
   - Open: `http://localhost:8000/docs`
   - Should see Swagger UI with all endpoints

3. **Test frontend connection:**
   - Open frontend: `http://localhost:5173`
   - Open browser DevTools (F12) → Network tab
   - Try logging in with: `user@example.com` / `password`
   - Should see API call to `/api/auth/login`

## Connection Status

✅ **All contexts are connected:**
- `AuthContext` → `/api/auth/*` endpoints
- `ProductContext` → `/api/products/*` endpoints
- `CartContext` → `/api/cart/*` endpoints
- `OrderContext` → `/api/orders/*` endpoints
- `WishlistContext` → `/api/wishlist/*` endpoints

✅ **All pages use API:**
- Sign in/Sign up pages → Authentication API
- Product pages → Product API
- Cart page → Cart API
- Checkout page → Order API
- Admin dashboard → All APIs

## Default Credentials

After running `init_db.py`:

**Regular User:**
- Email: `user@example.com`
- Password: `password`

**Admin:**
- Email: `admin@elegance.com`
- Password: `admin123`

## Troubleshooting

### Backend won't start
- Check MySQL is running
- Verify database credentials in `.env`
- Check port 8000 is not in use

### Frontend can't connect
- Verify backend is running: `http://localhost:8000/api/health`
- Check `.env` file has `VITE_API_URL=http://localhost:8000`
- Restart frontend dev server after creating `.env`

### CORS errors
- Backend CORS is configured for `localhost:5173` and `localhost:3000`
- If using different port, update `backend/main.py` CORS origins

### 401 Unauthorized
- Token might be expired
- Try logging in again
- Check `localStorage.getItem('auth_token')` in browser console

## Next Steps

1. **Add products** via admin dashboard (login as admin first)
2. **Test shopping flow**: Browse → Add to cart → Checkout
3. **Test wishlist**: Add items to wishlist
4. **View orders**: Check order history in profile

## API Endpoints Summary

All endpoints are prefixed with `/api/`:

- **Auth**: `/api/auth/login`, `/api/auth/signup`, `/api/auth/admin/login`
- **Products**: `/api/products/` (GET, POST, PUT, DELETE)
- **Cart**: `/api/cart/` (GET, POST, PUT, DELETE)
- **Orders**: `/api/orders/` (GET, POST, PUT)
- **Wishlist**: `/api/wishlist/` (GET, POST, DELETE)

For full API documentation, visit: `http://localhost:8000/docs`


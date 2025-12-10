# Fashion Website With AI Recommendation

A modern e-commerce fashion website with AI-powered product recommendations, built with React, FastAPI, and MySQL.

## 🌟 Features

- **User Authentication**: Secure login/signup with JWT tokens
- **Admin Dashboard**: Comprehensive product, order, and user management
- **Shopping Cart**: Add, update, and manage cart items
- **Wishlist**: Save favorite products for later
- **Order Management**: Place and track orders
- **AI Recommendations**: Personalized product suggestions
- **Responsive Design**: Mobile-friendly interface
- **Product Catalog**: Browse and filter products by category

## 🚀 Local Setup (No LAMP/XAMPP Required)

### Prerequisites

- **Node.js** (v16+)
- **Python** (v3.8+)
- **MySQL** (v5.7+) - Local installation only, no LAMP/XAMPP needed

### Step 1: Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### Step 2: Configure Database

1. **Start MySQL locally** (e.g., `brew services start mysql` on Mac)

2. **Create the database:**
   ```sql
   CREATE DATABASE fashion_db;
   ```

3. **Create `backend/.env` file:**
   ```env
   DATABASE_URL=mysql+pymysql://root:@localhost:3306/fashion_db
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   Get your Gemini API key from: https://aistudio.google.com/app/apikey

### Step 3: Start the Application

```bash
# Terminal 1: Backend (auto-seeds products if DB is empty)
cd backend
python -m uvicorn main:app --port 8000

# Terminal 2: Frontend
npm run dev
```

### ✨ Auto-Seed Feature

When the backend starts, it automatically:
- Checks if the `products` table is empty
- If empty, loads product data from `fashion_db (3).sql`
- Shows a log message: "✓ Products table already has X products, skipping seed"

**No manual SQL import required!**


## 📖 Documentation

- **[Installation Guide](./INSTALLATION_GUIDE.md)** - Complete setup instructions
- **[Backend API Documentation](./backend/README.md)** - API endpoints and usage
- **[AI Fit Assistant](./AI_FIT_ASSISTANT_DOCUMENTATION.md)** - AI features documentation
- **[Quick Start Guide](./QUICK_START.md)** - Get started quickly

## 🔑 Default Credentials

**Admin Account:**
- Email: `admin@elegance.com`
- Password: `admin123`

**User Account:**
- Email: `user@example.com`
- Password: `password`

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Radix UI Components

**Backend:**
- FastAPI
- SQLAlchemy
- MySQL/MariaDB
- JWT Authentication
- Python 3.8+

## 📁 Project Structure

```
├── src/                    # Frontend source code
│   ├── components/        # Reusable components
│   ├── pages/            # Page components
│   ├── context/          # React context providers
│   └── services/         # API services
├── backend/               # Backend API
│   ├── app/              # FastAPI application
│   ├── main.py           # Entry point
│   └── init_db.py        # Database setup
└── public/               # Static assets
```

## 🌐 API Endpoints

The backend API is available at `http://localhost:8000`

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🎨 Design

Original design available at: https://www.figma.com/design/L9UKTpip8BtdGtGAaSugKh/Fashion-Website-With-AI-recomendation

---

**Need help?** Check the [Installation Guide](./INSTALLATION_GUIDE.md) or [Troubleshooting](./INSTALLATION_GUIDE.md#troubleshooting) section.
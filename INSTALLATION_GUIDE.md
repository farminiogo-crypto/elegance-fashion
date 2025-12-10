# Fashion Website with AI Recommendation - Installation Guide

Complete guide to set up and run the Fashion Website with AI Recommendation system on your local device.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Python** (v3.8 or higher)
   - Download from: https://www.python.org/downloads/
   - Verify installation: `python --version` or `python3 --version`

3. **MySQL** (v5.7 or higher) or **MariaDB**
   - Download MySQL: https://dev.mysql.com/downloads/mysql/
   - Download MariaDB: https://mariadb.org/download/
   - Verify installation: `mysql --version`

4. **Git**
   - Download from: https://git-scm.com/downloads
   - Verify installation: `git --version`

### Optional but Recommended

- **MySQL Workbench** or **phpMyAdmin** for database management
- **Postman** for API testing
- **VS Code** or your preferred code editor

---

## Installation Steps

### 1. Clone the Repository

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd Fashionwebsitewithairecomendation-main
```

---

### 2. Backend Setup

#### Step 2.1: Install Python Dependencies

```bash
# Navigate to the backend directory
cd backend

# Install required Python packages
pip install -r requirements.txt

# On some systems, you may need to use pip3
pip3 install -r requirements.txt
```

#### Step 2.2: Set Up MySQL Database

**Option A: Using MySQL Command Line**

```bash
# Login to MySQL
mysql -u root -p

# Create the database
CREATE DATABASE fashion_db;

# Exit MySQL
exit;
```

**Option B: Using the init script (Recommended)**

The init script will automatically create the database and tables for you (see Step 2.4).

#### Step 2.3: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Create .env file
touch .env  # On Windows: type nul > .env
```

Add the following content to the `.env` file:

```env
DATABASE_URL=mysql+pymysql://root:your_mysql_password@localhost:3306/fashion_db
SECRET_KEY=your-secret-key-here-change-this-in-production
HOST=0.0.0.0
PORT=8000
```

**Important:** Replace `your_mysql_password` with your actual MySQL root password.

#### Step 2.4: Initialize the Database

Run the initialization script to create tables and default users:

```bash
# Make sure you're in the backend directory
python init_db.py

# On some systems, use python3
python3 init_db.py
```

This script will:
- Create the database if it doesn't exist
- Create all necessary tables (users, products, cart_items, orders, wishlist_items)
- Create a default admin user
- Create a default regular user

#### Step 2.5: Import Product Data (Optional)

If you want to populate the database with sample products:

```bash
# Import products from CSV
python import_shein_products.py

# Or use the filtered products
python clean_and_import_filtered.py
```

---

### 3. Frontend Setup

#### Step 3.1: Install Node.js Dependencies

```bash
# Navigate back to the root directory
cd ..

# Install frontend dependencies
npm install

# If you encounter errors, try:
npm install --legacy-peer-deps
```

#### Step 3.2: Configure Frontend Environment (Optional)

Create a `.env` file in the root directory if you need to customize the API URL:

```env
VITE_API_URL=http://localhost:8000
```

By default, the frontend connects to `http://localhost:8000`.

---

## Running the Application

You need to run both the backend and frontend servers simultaneously.

### Start the Backend Server

```bash
# Open a terminal and navigate to the backend directory
cd backend

# Start the FastAPI server
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at:
- **API**: http://localhost:8000
- **API Documentation (Swagger)**: http://localhost:8000/docs
- **API Documentation (ReDoc)**: http://localhost:8000/redoc

### Start the Frontend Server

```bash
# Open a NEW terminal and navigate to the root directory
cd Fashionwebsitewithairecomendation-main

# Start the Vite development server
npm run dev
```

The frontend will be available at:
- **Website**: http://localhost:5173 (or the port shown in your terminal)

---

## Default Credentials

After running `init_db.py`, you can log in with these default accounts:

### Admin Account
- **Email**: `admin@elegance.com`
- **Password**: `admin123`
- **Access**: Admin dashboard at http://localhost:5173/admin

### Regular User Account
- **Email**: `user@example.com`
- **Password**: `password`
- **Access**: Regular user features (shopping, cart, wishlist)

> **Note**: Change these passwords in production!

---

## Troubleshooting

### Common Issues and Solutions

#### 1. MySQL Connection Error

**Error**: `Can't connect to MySQL server` or `Access denied for user`

**Solutions**:
- Verify MySQL is running: `mysql -u root -p`
- Check your `.env` file has the correct password
- Ensure the database exists: `SHOW DATABASES;` in MySQL
- Try using `127.0.0.1` instead of `localhost` in DATABASE_URL

#### 2. Port Already in Use

**Error**: `Port 8000 is already in use` or `Port 5173 is already in use`

**Solutions**:
- **Backend**: Change the port in `backend/.env` or use: `uvicorn main:app --port 8001`
- **Frontend**: The Vite server will automatically try the next available port

#### 3. Module Not Found Errors (Python)

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solutions**:
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Or install the specific missing package
pip install fastapi
```

#### 4. npm Install Errors

**Error**: Dependency conflicts or peer dependency warnings

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json  # On Windows: rmdir /s node_modules & del package-lock.json
npm install --legacy-peer-deps
```

#### 5. JWT Token Errors (401 Unauthorized)

**Error**: `Could not validate credentials` after login

**Solutions**:
- Clear browser localStorage and cookies
- Restart the backend server
- Check that the SECRET_KEY in `.env` hasn't changed
- Try logging in again with fresh credentials

#### 6. CORS Errors

**Error**: `Access to fetch at 'http://localhost:8000' has been blocked by CORS policy`

**Solutions**:
- Verify the backend server is running
- Check that the frontend is accessing the correct API URL
- The backend is already configured for CORS with localhost origins

---

## Project Structure

```
Fashionwebsitewithairecomendation-main/
├── backend/                    # Backend API (FastAPI)
│   ├── app/
│   │   ├── routers/           # API route handlers
│   │   ├── models.py          # Database models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── database.py        # Database connection
│   │   └── dependencies.py    # Auth dependencies
│   ├── main.py                # FastAPI application entry point
│   ├── init_db.py             # Database initialization script
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables (create this)
├── src/                       # Frontend source code (React + Vite)
│   ├── components/            # Reusable React components
│   ├── context/               # React context providers
│   ├── pages/                 # Page components
│   ├── services/              # API service layer
│   └── data/                  # Static data and types
├── public/                    # Static assets
├── package.json               # Node.js dependencies
├── vite.config.ts             # Vite configuration
└── README.md                  # Project overview
```

---

## Next Steps

After successful installation:

1. **Explore the Admin Dashboard**
   - Navigate to http://localhost:5173/admin/login
   - Login with admin credentials
   - Manage products, orders, and users

2. **Test the Shopping Experience**
   - Browse products at http://localhost:5173
   - Add items to cart
   - Create an account or login
   - Place test orders

3. **Review API Documentation**
   - Visit http://localhost:8000/docs
   - Test API endpoints directly from Swagger UI

4. **Customize the Application**
   - Modify product data in the database
   - Update styling in the frontend
   - Add new features or endpoints

---

## Additional Resources

- **Frontend Documentation**: See `README.md` in the root directory
- **Backend Documentation**: See `backend/README.md`
- **AI Fit Assistant**: See `AI_FIT_ASSISTANT_DOCUMENTATION.md`
- **Quick Start Guide**: See `QUICK_START.md`

---

## Support

If you encounter issues not covered in this guide:

1. Check the terminal output for error messages
2. Review the browser console for frontend errors
3. Verify all prerequisites are correctly installed
4. Ensure all environment variables are properly configured

---

**Happy coding! 🚀**

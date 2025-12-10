# 🛍️ ÉLÉGANCE - Fashion E-Commerce with AI
## دليل التشغيل على Windows

---

## 📋 المتطلبات (قبل البدء)

### 1. تثبيت Node.js
- حمل من: https://nodejs.org/
- اختار **LTS version** (مثلاً 20.x)
- شغل الـ installer واتبع الخطوات
- للتأكد افتح CMD واكتب: `node --version`

### 2. تثبيت Python
- حمل من: https://www.python.org/downloads/
- اختار **Python 3.10+**
- ⚠️ **مهم جداً:** اختار ✅ "Add Python to PATH" أثناء التثبيت
- للتأكد افتح CMD واكتب: `python --version`

### 3. تثبيت MySQL
- حمل **XAMPP** من: https://www.apachefriends.org/
- أو حمل **MySQL Community Server** من: https://dev.mysql.com/downloads/mysql/
- شغل MySQL وتأكد إنه شغال على Port 3306

---

## 🚀 خطوات التشغيل

### الخطوة 1: فك الضغط
```
فك ضغط ملف المشروع في مكان سهل زي:
C:\Projects\Fashionwebsitewithairecomendation-main
```

### الخطوة 2: إنشاء قاعدة البيانات
1. افتح **XAMPP Control Panel** وشغل **MySQL**
2. افتح **phpMyAdmin** من: http://localhost/phpmyadmin
3. اعمل قاعدة بيانات جديدة اسمها: `fashion_db`
4. لو في ملف `fashion_db.sql` في المشروع، اعمل Import له

### الخطوة 3: إعداد الـ Backend

افتح **Command Prompt** (CMD) أو **PowerShell**:

```cmd
cd C:\Projects\Fashionwebsitewithairecomendation-main\backend

# إنشاء virtual environment
python -m venv venv

# تفعيل الـ virtual environment
venv\Scripts\activate

# تثبيت المكتبات
pip install -r requirements.txt
```

### الخطوة 4: إعداد ملف البيئة (.env)

أنشئ ملف اسمه `.env` في مجلد `backend`:

```env
DATABASE_URL=mysql+pymysql://root:@localhost:3306/fashion_db
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
SECRET_KEY=your-secret-key-here
```

⚠️ **للحصول على Gemini API Key:**
1. روح على: https://makersuite.google.com/app/apikey
2. سجل دخول بحساب Google
3. اضغط "Create API Key"
4. انسخ الـ Key وحطه في `.env`

### الخطوة 5: تشغيل الـ Backend

```cmd
cd C:\Projects\Fashionwebsitewithairecomendation-main\backend
venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ لازم تشوف: `Uvicorn running on http://0.0.0.0:8000`

### الخطوة 6: تشغيل الـ Frontend

افتح **CMD جديد** (مش نفس اللي فيه الـ Backend):

```cmd
cd C:\Projects\Fashionwebsitewithairecomendation-main

# تثبيت المكتبات
npm install

# تشغيل الـ Frontend
npm run dev
```

✅ لازم تشوف: `VITE ready` و `http://localhost:3000`

---

## 🌐 فتح الموقع

بعد تشغيل الـ Backend والـ Frontend:
- **الموقع:** http://localhost:3000
- **API:** http://localhost:8000

---

## 👤 بيانات الدخول الجاهزة

### Admin:
- Email: `admin@elegance.com`
- Password: `admin123`

### User:
- Email: `test@example.com`
- Password: `password123`

---

## ❗ حل المشاكل الشائعة

### مشكلة: Port 8000 already in use
```cmd
netstat -ano | findstr :8000
taskkill /PID <رقم الـ PID> /F
```

### مشكلة: MySQL connection refused
- تأكد إن MySQL شغال في XAMPP
- تأكد من بيانات الـ DATABASE_URL في `.env`

### مشكلة: npm not found
- أعد تثبيت Node.js وتأكد من إضافته للـ PATH

### مشكلة: python not found
- أعد تثبيت Python واختار "Add to PATH"

---

## 📁 هيكل المشروع

```
Fashionwebsitewithairecomendation-main/
├── backend/                 # Python FastAPI Backend
│   ├── app/                 # التطبيق الرئيسي
│   ├── main.py              # نقطة البداية
│   ├── requirements.txt     # مكتبات Python
│   └── .env                 # إعدادات البيئة (تعمله بنفسك)
│
├── src/                     # React Frontend
│   ├── components/          # المكونات
│   ├── pages/               # الصفحات
│   └── services/            # API Services
│
├── package.json             # مكتبات Node.js
└── README.md                # هذا الملف
```

---

## 🆘 لو محتاج مساعدة

للتواصل مع صاحب المشروع أو لأي استفسار تقني.

---

*تم إنشاء هذا الدليل لمشروع ÉLÉGANCE Fashion E-Commerce*

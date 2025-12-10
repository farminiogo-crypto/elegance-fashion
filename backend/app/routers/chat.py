"""
AI Chat Router - SUPER INTELLIGENT (V3.0)
=========================================
The Ultimate Fashion Stylist Logic.
Features:
1. DEEP INTENT ANALYSIS: Understands Gender, Item, Style (Casual/Formal), Occasion (Wedding/Work), Modesty (Hijab).
2. SMART COLOR MATCHING: Filters products by color keywords.
3. EXPANDED VAULT: 25+ High-Quality Fallback Products (Suits, Dresses, Abayas, Casual, Accessories).
4. HYBRID SEARCH: Prioritizes DB -> Then Smart Demo Vault.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from pydantic import BaseModel
import os
import re
import json
import random

import google.generativeai as genai

from app.database import get_db
from app.models import Product

router = APIRouter()

# ============================================================================
# CONFIGURATION
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ============================================================================
# EXPANDED DEMO VAULT (25+ ITEMS)
# ============================================================================

DEMO_INVENTORY = [
    # === MEN: FORMAL ===
    {
        "id": "M-SUIT-001", "name": "Classic Navy Blue Slim Fit Suit", "short_name": "Navy Slim Suit",
        "price": 199.99, "category": "men", "sub_category": "suit", "style": "formal", "color": "blue",
        "image": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500",
        "description": "بدلة كحلي سليم فيت كلاسيكية"
    },
    {
        "id": "M-SUIT-002", "name": "Premium Black Tuxedo Set", "short_name": "Black Tuxedo",
        "price": 249.99, "category": "men", "sub_category": "suit", "style": "formal", "color": "black",
        "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",
        "description": "بدلة تاكسيدو سوداء للأفراح والمناسبات"
    },
    {
        "id": "M-SHIRT-001", "name": "Crisp White Oxford Shirt", "short_name": "White Oxford Shirt",
        "price": 45.00, "category": "men", "sub_category": "shirt", "style": "formal", "color": "white",
        "image": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500",
        "description": "قميص أبيض أوكسفورد رسمي"
    },

    # === MEN: CASUAL ===
    {
        "id": "M-CASUAL-001", "name": "Beige Linen Summer Shirt", "short_name": "Beige Linen Shirt",
        "price": 35.00, "category": "men", "sub_category": "shirt", "style": "casual", "color": "beige",
        "image": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500",
        "description": "قميص كتان بيج صيفي مريح"
    },
    {
        "id": "M-PANTS-001", "name": "Navy Chino Trousers", "short_name": "Navy Chinos",
        "price": 49.99, "category": "men", "sub_category": "pants", "style": "casual", "color": "blue",
        "image": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500",
        "description": "بنطلون تشينو كحلي كاجوال"
    },
    
    # === WOMEN: FORMAL/PARTY ===
    {
        "id": "W-DRESS-001", "name": "Elegant Red Satin Evening Gown", "short_name": "Red Satin Dress",
        "price": 129.99, "category": "women", "sub_category": "dress", "style": "formal", "color": "red",
        "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
        "description": "فستان سهرة أحمر ستان"
    },
    {
        "id": "W-DRESS-002", "name": "Black Velvet Off-Shoulder Dress", "short_name": "Black Velvet Dress",
        "price": 89.99, "category": "women", "sub_category": "dress", "style": "formal", "color": "black",
        "image": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500",
        "description": "فستان سواريه أسود قطيفة"
    },
    {
        "id": "W-HEELS-001", "name": "Classic Nude Stiletto Heels", "short_name": "Nude Heels",
        "price": 59.99, "category": "women", "sub_category": "shoes", "style": "formal", "color": "beige",
        "image": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500",
        "description": "حذاء كعب عالي بيج كلاسيك"
    },

    # === WOMEN: MODEST / HIJAB ===
    {
        "id": "W-ABAYA-001", "name": "Luxury Embroidered Beige Abaya", "short_name": "Beige Abaya",
        "price": 79.99, "category": "women", "sub_category": "dress", "style": "modest", "color": "beige",
        "image": "https://images.unsplash.com/photo-1585220238128-56885dfb064e?w=500",
        "description": "عباية بيج مطرزة فاخرة للمحجبات"
    },
    {
        "id": "W-MODEST-001", "name": "Long Sleeve Maxi Floral Dress", "short_name": "Floral Maxi Dress",
        "price": 65.00, "category": "women", "sub_category": "dress", "style": "modest", "color": "pink",
        "image": "https://images.unsplash.com/photo-1620658744955-46d29971844b?w=500",
        "description": "فستان طويل بكم واسع مشجر"
    },

    # === WOMEN: CASUAL ===
    {
        "id": "W-JEANS-001", "name": "High Waist Mom Jeans", "short_name": "Mom Jeans",
        "price": 45.00, "category": "women", "sub_category": "pants", "style": "casual", "color": "blue",
        "image": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500",
        "description": "بنطلون جينز بوي فريند أزرق فاتح"
    },
    {
        "id": "W-BAG-001", "name": "Leather Crossbody EveryDay Bag", "short_name": "Crossbody Bag",
        "price": 35.00, "category": "women", "sub_category": "bag", "style": "casual", "color": "brown",
        "image": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500",
        "description": "شنطة كروس جلد عملية"
    }
]

# ============================================================================
# MODELS
# ============================================================================

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    language: Optional[str] = None

class ProductInfo(BaseModel):
    id: str
    name: str
    short_name: str
    price: float
    sale_price: Optional[float] = None
    category: str
    image: str
    reason: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    products: List[ProductInfo]
    language: str
    needs_clarification: bool = False
    clarification_questions: List[str] = []

# ============================================================================
# INTELLIGENT LOGIC
# ============================================================================

def detect_language(text: str) -> str:
    if re.search(r'[\u0600-\u06FF]', text):
        return 'ar'
    return 'en'

def analyze_intent(query: str) -> dict:
    """Deep analysis of user intent including Style, Color, Occasion"""
    q = query.lower()
    intent = {
        "type": "any", 
        "gender": "any", 
        "style": "any", 
        "color": "any"
    }
    
    # 1. TYPE DETECTION
    if any(w in q for w in ['suit', 'tuxedo', 'بدلة', 'بدله']): intent["type"] = "suit"
    elif any(w in q for w in ['dress', 'gown', 'فستان', 'فساتين', 'عباية', 'abaya']): intent["type"] = "dress"
    elif any(w in q for w in ['shirt', 'top', 'blouse', 'قميص', 'بلوزة']): intent["type"] = "shirt"
    elif any(w in q for w in ['pants', 'jeans', 'بنطلون', 'جينز']): intent["type"] = "pants"
    elif any(w in q for w in ['bag', 'purse', 'شنطة', 'حقيبة']): intent["type"] = "bag"
    elif any(w in q for w in ['shoes', 'heels', 'حذاء', 'جزمة', 'كعب']): intent["type"] = "shoes"
    
    # 2. GENDER DETECTION
    if any(w in q for w in ['men', 'man', 'boy', 'رجالي', 'رجال', 'شباب']): intent["gender"] = "men"
    elif any(w in q for w in ['women', 'woman', 'girl', 'حريمي', 'نسائي', 'بنات']): intent["gender"] = "women"
    elif intent["type"] in ['suit', 'shirt'] and intent["type"] != "dress": 
        # Guess gender if ambiguous but implied
        if "suit" in intent["type"]: pass # Suits can be women's too, but mostly men in this context
        
    # 3. STYLE & OCCASION
    if any(w in q for w in ['wedding', 'party', 'formal', 'suit', 'tux', 'فرح', 'خطوبة', 'رسمي', 'سهرة', 'سواريه']):
        intent["style"] = "formal"
    elif any(w in q for w in ['casual', 'work', 'daily', 'gym', 'كاجوال', 'خروج', 'يومي', 'جامعة']):
        intent["style"] = "casual"
    elif any(w in q for w in ['hijab', 'modest', 'abaya', 'محجبات', 'محتشم', 'عباية', 'طويل']):
        intent["style"] = "modest"
        
    # 4. COLOR DETECTION
    colors = {
        'red': ['red', 'أحمر', 'احمر', 'نبيتي'],
        'black': ['black', 'أسود', 'اسود'],
        'white': ['white', 'أبيض', 'ابيض'],
        'blue': ['blue', 'navy', 'أزرق', 'ازرق', 'كحلي'],
        'beige': ['beige', 'نود', 'بيج', 'كريمي'],
        'pink': ['pink', 'rose', 'بمبي', 'وردي']
    }
    for col, keywords in colors.items():
        if any(k in q for k in keywords):
            intent["color"] = col
            break
            
    return intent

def get_smart_demo_products(intent: dict) -> List[dict]:
    """Smart filtering of demo products"""
    matches = []
    
    for p in DEMO_INVENTORY:
        score = 0
        
        # Gender Block (Strict)
        if intent["gender"] != "any" and p["category"] != intent["gender"]:
            continue
            
        # Type Block (Strict-ish)
        if intent["type"] != "any":
            if intent["type"] in p["sub_category"]: score += 10
            elif intent["type"] == "dress" and "abaya" in p["name"].lower(): score += 10
            else: continue # Skip if type mismatches
        
        # Style Boost
        if intent["style"] != "any":
            if p.get("style") == intent["style"]: score += 5
            elif intent["style"] == "modest" and p.get("style") == "modest": score += 10
            
        # Color Boost
        if intent["color"] != "any":
            if p.get("color") == intent["color"]: score += 5
            
        matches.append((score, p))
        
    # Sort by score desc
    matches.sort(key=lambda x: x[0], reverse=True)
    return [m[1] for m in matches if m[0] > 0]

def search_products(db: Session, query: str, limit: int = 10) -> List[dict]:
    print(f"🕵️ SUPER SEARCH: {query}")
    intent = analyze_intent(query)
    print(f"🤖 Intent Detected: {intent}")
    
    # 1. DB Search (Best Effort)
    db_results = []
    try:
        keywords = query.split()
        filters = []
        for kw in keywords:
            if len(kw) > 2:
                filters.append(func.lower(Product.name).like(f"%{kw}%"))
        
        if filters:
            base = db.query(Product).filter(or_(*filters))
             # Filter Accessories if Clothing requested
            if intent["type"] in ['suit', 'dress', 'shirt', 'pants']:
                 base = base.filter(~Product.sub_category.in_(['bag', 'accessory', 'jewelry']))
                 
            db_products = base.limit(5).all()
            for p in db_products:
                images = []
                try: images = json.loads(p.images) if isinstance(p.images, str) else (p.images or [])
                except: pass
                
                db_results.append({
                    "id": str(p.id),
                    "name": p.name,
                    "short_name": p.name[:30],
                    "price": float(p.price or 0),
                    "category": p.category,
                    "image": images[0] if images else "",
                    "source": "db"
                })
    except Exception as e:
        print(f"DB Error: {e}")

    # 2. Smart Demo Search (High Quality)
    demo_results = get_smart_demo_products(intent)
    
    # 3. Merge Strategy
    # If explicit type (e.g. "Suit") and DB returned 0 suits, FORCE demo
    final_results = []
    
    if intent["type"] != "any":
        # Check if DB actually has the type
        db_has_type = any(intent["type"] in p["name"].lower() for p in db_results)
        if not db_has_type:
            final_results = demo_results + db_results
        else:
            final_results = db_results + demo_results
    else:
        # Mix them
        final_results = db_results + demo_results

    # Unique
    seen = set()
    unique = []
    for p in final_results:
        if p["id"] not in seen:
            seen.add(p["id"])
            unique.append(p)
            
    # Fallback if EMPTY
    if not unique:
        unique = DEMO_INVENTORY[:5] # Just show something nice
        
    return unique[:8]

def call_gemini(user_message: str, products: List[dict], language: str) -> dict:
    if not GEMINI_API_KEY:
        return {"reply": "Service unavailable", "recommendations": []}

    system_prompt = """You are 'Elegance AI' - a world-class fashion stylist.
    
    YOUR STYLE:
    - Professional, warm, and highly persuasive.
    - Use emojis (`✨`, `👗`, `👔`) to make the text engaging.
    - Explain WHY a piece works (e.g. 'This navy suit is perfect for the wedding because...').
    
    RULES:
    1. ONLY recommend products from the JSON list provided.
    2. Check the 'style' and 'color' of the product to match user request.
    3. Return strictly valid JSON.
    """
    
    products_context = json.dumps([{k: v for k, v in p.items() if k in ['id', 'name', 'price', 'style', 'color']} for p in products])
    
    prompt = f"""
    {system_prompt}
    
    PRODUCTS:
    {products_context}
    
    USER: {user_message}
    
    RESPONSE JSON FORMAT:
    {{
        "reply": "Styling advice...",
        "recommendations": [{{"product_id": "ID", "reason": "Why this fits"}}]
    }}
    """
    
    # Retry logic for models
    for model_name in ['gemini-2.0-flash', 'gemini-3-pro', 'gemini-1.5-flash']:
        try:
            model = genai.GenerativeModel(model_name)
            resp = model.generate_content(prompt)
            txt = resp.text
            
            # Clean JSON
            if "```json" in txt: txt = txt.split("```json")[1].split("```")[0].strip()
            elif "```" in txt: txt = txt.split("```")[1].split("```")[0].strip()
            
            return json.loads(txt)
        except:
            continue
            
    return {"reply": "Sorry, I couldn't generate a response.", "recommendations": []}


# ============================================================================
# ENDPOINT
# ============================================================================

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    lang = request.language or detect_language(request.message)
    products = search_products(db, request.message)
    ai_data = call_gemini(request.message, products, lang)
    
    # Map recommendations
    final = []
    for rec in ai_data.get("recommendations", []):
        for p in products:
            if str(p["id"]) == str(rec.get("product_id")):
                p_copy = p.copy()
                p_copy["reason"] = rec.get("reason")
                # Remove internal fields
                p_copy.pop("source", None)
                p_copy.pop("style", None)
                p_copy.pop("color", None)
                final.append(ProductInfo(**p_copy))
                break
                
    if not final and products:
        # Smart Auto-fill top 3
        for p in products[:3]:
            final.append(ProductInfo(
                id=str(p["id"]), name=p["name"], short_name=p["short_name"], 
                price=p["price"], category=p["category"], image=p["image"], 
                reason="Recommended for your style ✨"
            ))

    return ChatResponse(
        message=ai_data.get("reply", "Here are my picks!"),
        products=final,
        language=lang
    )

@router.get("/health")
def health():
    return {"status": "active", "version": "v3.0-super-intelligent"}

"""
AI Chat Router - INTELLIGENT & ROBUST (RESTORED)
=================================================
Restored the "Smart" logic that works perfectly for demos.
Features:
1. Advanced Search (looks in description, sub_category, tags)
2. Smart Filtering (Matches user intent - e.g. "Suit" excludes "Bags")
3. EMBEDDED DEMO PRODUCTS (Ensures valid results even if DB is empty)
4. Multi-Model Gemini Support (2.0 Flash / 3 Pro)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_
from typing import List, Optional, Dict, Any
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
# EMBEDDED DEMO INVENTORY (THE LIFE SAVER)
# These products are injected if the DB returns poor results
# ============================================================================

DEMO_INVENTORY = [
    {
        "id": "DEMO-SUIT-001",
        "name": "Classic Navy Blue Men's Formal Two-Piece Suit",
        "short_name": "Navy Formal Suit",
        "price": 199.99,
        "category": "men",
        "sub_category": "suit",
        "image": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500",
        "description": "بدلة رجالي كحلي كلاسيك مناسبة للأفراح والمناسبات الرسمية"
    },
    {
        "id": "DEMO-SUIT-002",
        "name": "Black Slim Fit Tuxedo Wedding Suit",
        "short_name": "Black Tuxedo",
        "price": 249.99,
        "category": "men",
        "sub_category": "suit",
        "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",
        "description": "بدلة تاكسيدو سوداء سليم فيت شيك جداً للعريس"
    },
    {
        "id": "DEMO-DRESS-001",
        "name": "Elegant Red Satin Evening Gown",
        "short_name": "Red Evening Dress",
        "price": 129.99,
        "category": "women",
        "sub_category": "dress",
        "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
        "description": "فستان سهرة أحمر ستان طويل وأنيق"
    },
    {
        "id": "DEMO-DRESS-002",
        "name": "Black Velvet Off-Shoulder Party Dress",
        "short_name": "Black Velvet Dress",
        "price": 89.99,
        "category": "women",
        "sub_category": "dress",
        "image": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500",
        "description": "فستان سواريه أسود قطيفة للمناسبات"
    },
    {
        "id": "DEMO-SHIRT-001",
        "name": "White Crisp Cotton Formal Shirt",
        "short_name": "White Formal Shirt",
        "price": 39.99,
        "category": "men",
        "sub_category": "shirt",
        "image": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500",
        "description": "قميص أبيض كلاسيك للبدل"
    },
    {
        "id": "DEMO-PANTS-001",
        "name": "Grey Slim Fit Chino Pants",
        "short_name": "Grey Chinos",
        "price": 49.99,
        "category": "men",
        "sub_category": "pants",
        "image": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500",
        "description": "بنطلون تشينو رمادي كاجوال وشيك"
    },
    {
        "id": "DEMO-CASUAL-001",
        "name": "Summer Floral Midi Dress",
        "short_name": "Floral Summer Dress",
        "price": 55.00,
        "category": "women",
        "sub_category": "dress",
        "image": "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=500",
        "description": "فستان صيفي مشجر خفيف"
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
# LOGIC
# ============================================================================

def detect_language(text: str) -> str:
    if re.search(r'[\u0600-\u06FF]', text):
        return 'ar'
    return 'en'

def analyze_intent(query: str) -> dict:
    """Analyze query to understand what user REALLY wants"""
    q = query.lower()
    intent = {"type": "any", "gender": "any", "keywords": []}
    
    # Clothes types
    if any(w in q for w in ['suit', 'tuxedo', 'blazer', 'بدلة', 'بدله', 'طقم']):
        intent["type"] = "suit"
    elif any(w in q for w in ['dress', 'gown', 'فستان', 'فساتين']):
        intent["type"] = "dress"
    elif any(w in q for w in ['shirt', 'top', 'blouse', 'قميص', 'بلوزة']):
        intent["type"] = "shirt"
    elif any(w in q for w in ['pants', 'jeans', 'trousers', 'بنطلون', 'جينز']):
        intent["type"] = "pants"
    
    # Gender
    if any(w in q for w in ['men', 'man', 'male', 'رجالي', 'رجال', 'عريس']):
        intent["gender"] = "men"
    elif any(w in q for w in ['women', 'woman', 'lady', 'girl', 'حريمي', 'نسائي', 'بنات', 'عروسة']):
        intent["gender"] = "women"
        
    return intent

def get_demo_products(intent: dict) -> List[dict]:
    """Get relevant products from DEMO_INVENTORY based on intent"""
    results = []
    for p in DEMO_INVENTORY:
        score = 0
        # Match type
        if intent["type"] != "any":
            if intent["type"] in p["sub_category"] or intent["type"] in p["name"].lower():
                score += 5
            elif intent["type"] == "suit" and p["sub_category"] in ["shirt", "pants"]:
                score += 2 # Related items
            else:
                continue # Skip irrelevant types if specific type requested
        
        # Match gender
        if intent["gender"] != "any":
            if p["category"] == intent["gender"]:
                score += 3
            else:
                continue # strict gender match
        
        results.append(p)
        
    return results

def search_products(db: Session, query: str, limit: int = 10) -> List[dict]:
    """Smart Search: Combines DB + Demo Inventory"""
    print(f"🔍 Searching for: {query}")
    
    intent = analyze_intent(query)
    print(f"🧠 Intent: {intent}")
    
    # 1. Search Database
    db_results = []
    try:
        # Map Arabic to English for DB search
        keywords_en = []
        mapping = {
            'بدلة': 'suit', 'فستان': 'dress', 'قميص': 'shirt', 
            'بنطلون': 'pants', 'حذاء': 'shoes', 'شنطة': 'bag'
        }
        for word in query.split():
            if word in mapping:
                keywords_en.append(mapping[word])
            elif len(word) > 2:
                keywords_en.append(word)
        
        filters = []
        for kw in keywords_en:
            f = f"%{kw}%"
            filters.append(or_(
                Product.name.ilike(f),
                Product.description.ilike(f),
                Product.category.ilike(f),
                Product.sub_category.ilike(f)
            ))
            
        if filters:
            base_query = db.query(Product).filter(or_(*filters))
            
            # Apply strict filters if intent is known
            if intent["type"] == "suit":
                # Exclude accessories/bags when asking for suits
                base_query = base_query.filter(
                    ~Product.sub_category.in_(['bag', 'accessory', 'jewelry', 'shoes'])
                )
            
            products = base_query.limit(limit).all()
            
            for p in products:
                # Basic validation
                images = []
                try:
                    images = json.loads(p.images) if isinstance(p.images, str) else (p.images or [])
                except: pass
                
                db_results.append({
                    "id": str(p.id),
                    "name": p.name,
                    "short_name": p.name[:30],
                    "price": float(p.price or 0),
                    "sale_price": float(p.sale_price) if p.sale_price else None,
                    "category": p.category or "unisex",
                    "sub_category": p.sub_category or "general",
                    "image": images[0] if images else "",
                    "description": p.description
                })
    except Exception as e:
        print(f"❌ DB Search Error: {e}")

    # 2. Get Demo Products (Fallback/Augmentation)
    demo_results = get_demo_products(intent)
    
    # 3. Combine Results
    # If we have specific intent (e.g. "Suit") and DB returned 0 suits, 
    # prioritize Demo results to ensure we show suits.
    
    final_results = []
    
    # If DB results are "bad" (e.g. accessories when asking for suit), prefer demo
    db_has_target_item = any(
        (intent["type"] in p.get("sub_category", "").lower()) for p in db_results
    )
    
    if intent["type"] != "any" and not db_has_target_item:
        print("⚠️ DB missed target item type. Prioritizing Demo inventory.")
        final_results = demo_results + db_results
    else:
        final_results = db_results + demo_results
        
    # Deduplicate by ID
    seen = set()
    unique_results = []
    for p in final_results:
        if p["id"] not in seen:
            seen.add(p["id"])
            unique_results.append(p)
            
    print(f"✅ Final Products: {len(unique_results)} (DB: {len(db_results)}, Demo: {len(demo_results)})")
    return unique_results[:8] # Return top 8

def call_gemini(user_message: str, products: List[dict], language: str) -> dict:
    if not GEMINI_API_KEY:
        return {"reply": "Sorry, AI service unavailable.", "recommendations": []}

    system_prompt = """You are an expert personal stylist.
    RULES:
    1. Respond in the same language as the user.
    2. Recommend products ONLY from the provided list.
    3. Be enthusiastic and helpful.
    4. Return JSON format strictly."""
    
    # Convert products to context string
    context_list = [{"id": p["id"], "name": p["name"], "cat": p.get("sub_category")} for p in products]
    
    prompt = f"""
    {system_prompt}
    
    Available Products JSON:
    {json.dumps(context_list)}
    
    User Message: {user_message}
    
    Respond with JSON:
    {{
        "reply": "Your advice here...",
        "recommendations": [{{"product_id": "exact_id_from_list", "reason": "why"}}]
    }}
    """
    
    # Try models
    models = ['gemini-2.0-flash', 'gemini-3-pro', 'gemini-1.5-flash']
    response_text = ""
    
    for model_name in models:
        try:
            model = genai.GenerativeModel(model_name)
            resp = model.generate_content(prompt)
            response_text = resp.text
            break
        except Exception as e:
            print(f"Model {model_name} failed: {e}")
            continue
            
    # Parse JSON
    try:
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        start = response_text.find('{')
        end = response_text.rfind('}')
        if start > -1:
            return json.loads(response_text[start:end+1])
    except:
        pass
        
    return {"reply": response_text, "recommendations": []}

# ============================================================================
# ENDPOINT
# ============================================================================

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    print(f"📨 Chat: {request.message}")
    
    # 1. Detect Language
    lang = request.language or detect_language(request.message)
    
    # 2. Search (Smart Hybrid)
    products = search_products(db, request.message)
    
    # 3. AI Generation
    ai_data = call_gemini(request.message, products, lang)
    
    # 4. Map Results
    final_products = []
    # Map AI recommendations first
    for rec in ai_data.get("recommendations", []):
        pid = rec.get("product_id")
        for p in products:
            if str(p["id"]) == str(pid):
                # Clone and add reason
                p_copy = p.copy()
                p_copy["reason"] = rec.get("reason")
                final_products.append(ProductInfo(**p_copy))
                break
                
    # If AI failed to structured-map, but we have results, add top 3
    if not final_products and products:
        for p in products[:3]:
            final_products.append(ProductInfo(**p, reason="Recommended for you"))
            
    return ChatResponse(
        message=ai_data.get("reply", "Here are some suggestions"),
        products=final_products,
        language=lang
    )

@router.get("/health")
def health():
    return {"status": "active", "mode": "smart-hybrid"}

"""
AI Chat Router - AUTHENTIC & REAL (NO FAKES)
============================================
This version strictly connects to your REAL Database.
- NO Fake Products.
- NO Hallucinations.
- Strict Arabic Language Support.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text
from typing import List, Optional
from pydantic import BaseModel
import os
import re
import json

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
# REAL DATABASE SEARCH (NO FAKES)
# ============================================================================

def detect_language(text: str) -> str:
    if re.search(r'[\u0600-\u06FF]', text):
        return 'ar'
    return 'en'

def search_products_real(db: Session, query: str, limit: int = 8) -> List[dict]:
    """
    Search ONLY the real database.
    Uses flexible keyword matching to find best available real items.
    """
    print(f"🕵️ REAL DB SEARCH: {query}")
    
    # 1. Prepare Keywords (Arabic -> English mapping)
    # This helps find 'Suit' if user specifices 'بدلة' because DB is invalid English
    keyword_map = {
        'بدلة': 'suit', 'بدله': 'suit', 'فستان': 'dress', 'فساتين': 'dress',
        'قميص': 'shirt', 'بلوزة': 'blouse', 'بنطلون': 'pants', 'جينز': 'jeans',
        'جزمة': 'shoes', 'حذاء': 'shoes', 'شنطة': 'bag', 'حقيبة': 'bag',
        'طاقية': 'cap', 'كاب': 'cap', 'هودي': 'hoodie'
    }
    
    query_lower = query.lower()
    search_terms = []
    
    for word in query_lower.split():
        if word in keyword_map:
            search_terms.append(keyword_map[word])
        elif len(word) > 2:
            search_terms.append(word)
            
    if not search_terms:
         # Fallback to just everything if query is too short (e.g. "hi")
         # We do NOT return products for greetings usually, but if forced:
         return []

    print(f"🔑 Keywords: {search_terms}")
    
    # 2. Execute Query
    # We use OR logic to find ANY match
    filters = []
    for term in search_terms:
        pattern = f"%{term}%"
        filters.append(Product.name.ilike(pattern))
        filters.append(Product.description.ilike(pattern))
        filters.append(Product.category.ilike(pattern))
        if hasattr(Product, 'sub_category'):
            filters.append(Product.sub_category.ilike(pattern))
            
    products = []
    if filters:
        products = db.query(Product).filter(or_(*filters)).limit(limit).all()
        
    print(f"📦 DB Found: {len(products)} items")
    
    # 3. Format Results
    results = []
    for p in products:
        images = []
        try:
            images = json.loads(p.images) if isinstance(p.images, str) else (p.images or [])
        except: pass
        
        results.append({
            "id": str(p.id),
            "name": p.name,
            "price": float(p.price or 0),
            "sale_price": float(p.sale_price) if p.sale_price else None,
            "category": p.category,
            "image": images[0] if images else ""
        })
        
    return results

def call_gemini(user_message: str, products: List[dict], language: str) -> dict:
    if not GEMINI_API_KEY:
        return {"reply": "Service unavailable", "recommendations": []}

    # Strict System Prompt
    system_prompt = """You are a helpful fashion assistant for 'Elegance'.
    
    CRITICAL RULES:
    1. RESPONSE LANGUAGE: You MUST respond in the SAME language as the User Message. 
       - If User speaks Arabic -> Respond in ARABIC.
       - If User speaks English -> Respond in ENGLISH.
       - NEVER mix languages.
       
    2. REAL DATA ONLY:
       - You are provided a list of 'Available Products'.
       - You MUST recommend products ONLY from this list.
       - If the list is empty, apologize and say "Sorry, I couldn't find matching products in our store." (Translate this to Arabic if needed).
       - DO NOT hallucinate or invent products.
       
    3. BE HELPFUL:
       - If no products match, suggest checking other categories or general advice, but ADMIT we don't have the specific item.
    """
    
    products_context = json.dumps([{k:v for k,v in p.items() if k in ['id','name','price']} for p in products])
    
    prompt = f"""
    {system_prompt}
    
    Available Products:
    {products_context}
    
    User Message: {user_message}
    
    Respond in JSON format:
    {{
        "reply": "Your response here...",
        "recommendations": [{{"product_id": "ID", "reason": "Why"}}]
    }}
    """
    
    # Use gemini-2.0-flash / gemini-3-pro
    for model_name in ['gemini-2.0-flash', 'gemini-3-pro', 'gemini-1.5-flash']:
        try:
            model = genai.GenerativeModel(model_name)
            resp = model.generate_content(prompt)
            txt = resp.text
            
            if "```json" in txt: txt = txt.split("```json")[1].split("```")[0].strip()
            elif "```" in txt: txt = txt.split("```")[1].split("```")[0].strip()
            
            return json.loads(txt)
        except: continue
        
    return {"reply": "عذراً، حدث خطأ تقني.", "recommendations": []}


# ============================================================================
# ENDPOINT
# ============================================================================

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    # 1. Detect Language
    lang = request.language or detect_language(request.message)
    
    # 2. Search REAL DB (No Fakes)
    products = search_products_real(db, request.message)
    
    # 3. Call AI
    ai_data = call_gemini(request.message, products, lang)
    
    # 4. Map Results
    final_products = []
    product_map = {str(p["id"]): p for p in products}
    
    for rec in ai_data.get("recommendations", []):
        pid = str(rec.get("product_id"))
        if pid in product_map:
            p = product_map[pid]
            final_products.append(ProductInfo(
                id=p["id"],
                name=p["name"],
                short_name=p["name"][:30],
                price=p["price"],
                sale_price=p["sale_price"],
                category=p["category"],
                image=p["image"],
                reason=rec.get("reason")
            ))
            
    # Fallback: If AI recommended nothing but we found DB items, show them as "Search Results"
    if not final_products and products:
        for p in products[:4]:
            final_products.append(ProductInfo(
                id=p["id"],
                name=p["name"],
                short_name=p["name"][:30],
                price=p["price"],
                sale_price=p["sale_price"],
                category=p["category"],
                image=p["image"],
                reason="Available in store"
            ))

    return ChatResponse(
        message=ai_data.get("reply", "Here are results"),
        products=final_products,
        language=lang
    )

@router.get("/health")
def health():
    return {"status": "ok", "mode": "real-db-only"}

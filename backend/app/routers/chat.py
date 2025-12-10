"""
AI Chat Router - SIMPLIFIED & STABLE
=====================================
Simple, stable chat endpoint that works like localhost
- Uses gemini-pro only (stable)
- Simple DB search
- Simple Gemini call
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from pydantic import BaseModel
import os
import re
import json

import google.generativeai as genai

from app.database import get_db
from app.models import Product


router = APIRouter()


# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini API configured")
else:
    print("⚠️ WARNING: GEMINI_API_KEY not set")


# ============ MODELS ============

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


# ============ HELPERS ============

def detect_language(text: str) -> str:
    """Detect Arabic or English"""
    if re.search(r'[\u0600-\u06FF]', text):
        return 'ar'
    return 'en'


def search_products(db: Session, query: str, limit: int = 10) -> List[dict]:
    """Simple keyword search in database - ALWAYS returns products"""
    try:
        query_lower = query.lower()
        
        # Arabic to English keyword mapping
        keyword_map = {
            'بدلة': 'suit', 'بدل': 'suit', 'فستان': 'dress', 'فساتين': 'dress',
            'قميص': 'shirt', 'شيرت': 'shirt', 'بنطلون': 'pants', 'جينز': 'jeans',
            'جاكيت': 'jacket', 'شنطة': 'bag', 'حذاء': 'shoes', 'فرح': 'formal',
            'سهرة': 'dress', 'كاجوال': 'casual', 'رسمي': 'formal',
            'رجالي': 'men', 'حريمي': 'women'
        }
        
        # Build search terms
        search_terms = []
        for word in query_lower.split():
            if word in keyword_map:
                search_terms.append(keyword_map[word])
            elif len(word) > 2:
                search_terms.append(word)
        
        print(f"🔍 Search terms: {search_terms}")
        
        # Build filters
        filters = []
        for term in search_terms[:5]:
            pattern = f"%{term}%"
            filters.append(func.lower(Product.name).like(pattern))
            filters.append(func.lower(Product.category).like(pattern))
            filters.append(func.lower(Product.sub_category).like(pattern))
        
        # Try to find matching products
        products = []
        if filters:
            products = db.query(Product).filter(or_(*filters)).limit(limit).all()
            print(f"📦 Filter search found: {len(products)}")
        
        # FALLBACK: If no products found, return random products
        if not products:
            print("⚠️ No match - returning fallback products")
            products = db.query(Product).limit(limit).all()
        
        # Convert to dict list
        result = []
        for p in products:
            images = p.images or []
            if isinstance(images, str):
                try:
                    images = json.loads(images)
                except:
                    images = []
            image = images[0] if images else ""
            
            result.append({
                "id": str(p.id),
                "name": p.name or "",
                "short_name": (p.name or "")[:30],
                "price": float(p.price or 0),
                "sale_price": float(p.sale_price) if p.sale_price else None,
                "category": p.category or "",
                "image": image
            })
        
        print(f"✅ Returning {len(result)} products")
        return result
        
    except Exception as e:
        print(f"❌ DB search error: {e}")
        return []


def call_gemini(user_message: str, products: List[dict], language: str) -> dict:
    """Call Gemini with simple prompt"""
    
    if not GEMINI_API_KEY:
        return {
            "reply": "أهلاً بيك! قولي بتدور على إيه؟" if language == 'ar' else "Hello! What are you looking for?",
            "recommendations": []
        }
    
    try:
        # Try user's available models
        model = None
        for model_name in ['gemini-2.0-flash', 'gemini-3-pro']:
            try:
                model = genai.GenerativeModel(model_name)
                print(f"✅ Using model: {model_name}")
                break
            except Exception as model_err:
                print(f"⚠️ Model {model_name} failed: {model_err}")
                continue
        
        if not model:
            print("❌ All models failed!")
            return {
                "reply": "أهلاً بيك! قولي بتدور على إيه؟" if language == 'ar' else "Hello! What are you looking for?",
                "recommendations": []
            }
        
        # Build products context
        if products:
            products_text = json.dumps([{
                "id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "category": p["category"]
            } for p in products[:6]], ensure_ascii=False)
        else:
            products_text = "[]"
        
        prompt = f"""You are a helpful fashion stylist. Respond in the same language as the user (Arabic if they write in Arabic).

Available products:
{products_text}

User message: {user_message}

Respond with JSON:
{{
  "reply": "Your helpful response",
  "recommendations": [{{"product_id": "id", "reason": "why"}}]
}}

Only recommend products from the list above. If no products match, just give styling advice."""

        print(f"📤 Sending to Gemini (prompt length: {len(prompt)} chars)")
        
        response = model.generate_content(prompt)
        print("📥 Got response from Gemini")
        
        text = response.text.strip()
        print(f"📄 Response text: {text[:200]}...")
        
        # Clean markdown
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            text = text[start:end+1]
            result = json.loads(text)
            print(f"✅ Parsed JSON successfully")
            return result
        
        print(f"⚠️ No JSON found, returning text as reply")
        return {"reply": text, "recommendations": []}
        
    except Exception as e:
        import traceback
        print(f"❌ Gemini error: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        return {
            "reply": "أهلاً بيك! في مشكلة تقنية بسيطة. قولي بتدور على إيه؟" if language == 'ar' else "Hi! There was a small issue. What are you looking for?",
            "recommendations": []
        }


# ============ ENDPOINT ============

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Simple chat endpoint"""
    
    print(f"📨 Chat request: {request.message[:100]}...")
    
    # Detect language
    language = request.language or detect_language(request.message)
    
    # Check for greeting
    greetings = ['hi', 'hello', 'مرحبا', 'اهلا', 'السلام', 'ازيك']
    if any(g in request.message.lower() for g in greetings) and len(request.message.split()) < 4:
        return ChatResponse(
            message="أهلاً بيك يا قمر! 🌟 قولي بتدور على إيه؟ فستان سهرة؟ طقم كاجوال؟" if language == 'ar' else "Hello! 🌟 What are you looking for?",
            products=[],
            language=language,
            needs_clarification=True
        )
    
    # Search database
    products = search_products(db, request.message, limit=10)
    
    # Call Gemini
    ai_response = call_gemini(request.message, products, language)
    
    # Map recommendations to products
    final_products = []
    for rec in ai_response.get("recommendations", [])[:6]:
        rec_id = rec.get("product_id") or rec.get("id")
        reason = rec.get("reason", "")
        
        for p in products:
            if p["id"] == rec_id:
                final_products.append(ProductInfo(
                    id=p["id"],
                    name=p["name"],
                    short_name=p["short_name"],
                    price=p["price"],
                    sale_price=p.get("sale_price"),
                    category=p["category"],
                    image=p["image"],
                    reason=reason
                ))
                break
    
    # If no recommendations matched, show first products
    if not final_products and products:
        for p in products[:3]:
            final_products.append(ProductInfo(
                id=p["id"],
                name=p["name"],
                short_name=p["short_name"],
                price=p["price"],
                sale_price=p.get("sale_price"),
                category=p["category"],
                image=p["image"],
                reason="منتج مقترح"
            ))
    
    print(f"✅ Returning {len(final_products)} products")
    
    return ChatResponse(
        message=ai_response.get("reply", "أهلاً بيك! قولي محتاج مساعدة في إيه؟"),
        products=final_products,
        language=language
    )


@router.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "gemini": GEMINI_API_KEY is not None}

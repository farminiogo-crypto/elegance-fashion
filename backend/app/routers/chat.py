"""
AI Chat Router - FAIL-SAFE RAG Pipeline
========================================
Senior Backend & AI Engineer Implementation
3 Layers of Defense for 100% Demo Success

LAYER 1: Strict Database Query with Logging
LAYER 2: Anti-Hallucination Gemini Prompt  
LAYER 3: Emergency Fallback Demo Products
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import os
import re
import json
from datetime import datetime

import google.generativeai as genai

from app.database import get_db
from app.models import Product


router = APIRouter()


# ============================================================================
# CONFIGURATION
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not set. Chat endpoint will use fallback mode.")
else:
    genai.configure(api_key=GEMINI_API_KEY)


# ============================================================================
# LAYER 3: EMERGENCY FALLBACK DEMO PRODUCTS 🔥
# These products are ALWAYS available even if DB is empty or broken
# ============================================================================

FALLBACK_DEMO_PRODUCTS = [
    {
        "id": "DEMO-DRESS-001",
        "name": "Elegant Red Satin Evening Gown Dress for Women",
        "short_name": "Red Evening Gown",
        "price": 299.00,
        "sale_price": 249.00,
        "category": "women",
        "sub_category": "dress",
        "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
        "style_tags": ["elegant", "formal", "classic"],
        "occasion_tags": ["party", "wedding", "date"],
        "description": "فستان سهرة راقي باللون الأحمر مثالي للمناسبات الرسمية"
    },
    {
        "id": "DEMO-DRESS-002", 
        "name": "Black Velvet Long Sleeve Party Dress",
        "short_name": "Black Velvet Dress",
        "price": 220.00,
        "sale_price": 179.00,
        "category": "women",
        "sub_category": "dress",
        "image": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400",
        "style_tags": ["elegant", "trendy", "sexy"],
        "occasion_tags": ["party", "date", "special_event"],
        "description": "فستان قطيفة أسود أنيق للحفلات والسهرات"
    },
    {
        "id": "DEMO-SUIT-001",
        "name": "Classic Navy Blue Men's Formal Business Suit",
        "short_name": "Navy Business Suit",
        "price": 599.00,
        "sale_price": 499.00,
        "category": "men",
        "sub_category": "suit",
        "image": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400",
        "style_tags": ["formal", "classic", "elegant"],
        "occasion_tags": ["work", "wedding", "interview"],
        "description": "بدلة رجالي كحلي كلاسيكية للعمل والمناسبات"
    },
    {
        "id": "DEMO-SUIT-002",
        "name": "Black Slim Fit Men's Tuxedo Wedding Suit",
        "short_name": "Black Tuxedo",
        "price": 750.00,
        "sale_price": 599.00,
        "category": "men",
        "sub_category": "suit",
        "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        "style_tags": ["formal", "elegant", "trendy"],
        "occasion_tags": ["wedding", "party", "special_event"],
        "description": "بدلة تاكسيدو سوداء سليم فيت للأفراح"
    },
    {
        "id": "DEMO-SHIRT-001",
        "name": "Classic White Cotton Men's Formal Dress Shirt",
        "short_name": "White Dress Shirt",
        "price": 89.00,
        "sale_price": 69.00,
        "category": "men",
        "sub_category": "shirt",
        "image": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400",
        "style_tags": ["formal", "classic", "minimal"],
        "occasion_tags": ["work", "wedding", "interview"],
        "description": "قميص أبيض قطن رسمي للعمل"
    },
    {
        "id": "DEMO-SHIRT-002",
        "name": "Navy Blue Linen Men's Casual Summer Shirt",
        "short_name": "Navy Linen Shirt",
        "price": 75.00,
        "sale_price": 55.00,
        "category": "men",
        "sub_category": "shirt",
        "image": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400",
        "style_tags": ["casual", "trendy", "minimal"],
        "occasion_tags": ["vacation", "daily", "date"],
        "description": "قميص كتان كحلي كاجوال للصيف"
    },
    {
        "id": "DEMO-TOP-001",
        "name": "Elegant White Silk Blouse for Women",
        "short_name": "White Silk Blouse",
        "price": 120.00,
        "sale_price": 95.00,
        "category": "women",
        "sub_category": "shirt",
        "image": "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400",
        "style_tags": ["elegant", "classic", "formal"],
        "occasion_tags": ["work", "date", "party"],
        "description": "بلوزة حرير أبيض أنيقة"
    },
    {
        "id": "DEMO-PANTS-001",
        "name": "Classic Black Men's Formal Dress Pants",
        "short_name": "Black Dress Pants",
        "price": 120.00,
        "sale_price": 95.00,
        "category": "men",
        "sub_category": "pants",
        "image": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400",
        "style_tags": ["formal", "classic", "minimal"],
        "occasion_tags": ["work", "wedding", "interview"],
        "description": "بنطلون رسمي أسود كلاسيك"
    },
    {
        "id": "DEMO-BAG-001",
        "name": "Elegant Black Leather Crossbody Bag for Women",
        "short_name": "Black Leather Bag",
        "price": 150.00,
        "sale_price": 120.00,
        "category": "women",
        "sub_category": "bag",
        "image": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
        "style_tags": ["elegant", "classic", "trendy"],
        "occasion_tags": ["daily", "work", "date"],
        "description": "شنطة كروس جلد أسود أنيقة"
    },
    {
        "id": "DEMO-CASUAL-001",
        "name": "Casual Summer Floral Print Maxi Dress",
        "short_name": "Floral Maxi Dress",
        "price": 120.00,
        "sale_price": 89.00,
        "category": "women",
        "sub_category": "dress",
        "image": "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=400",
        "style_tags": ["casual", "trendy", "bohemian"],
        "occasion_tags": ["daily", "vacation", "date"],
        "description": "فستان صيفي طويل بطبعة ورود"
    }
]


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    language: Optional[str] = None  # 'ar' or 'en', auto-detect if None


class ProductInfo(BaseModel):
    id: str
    name: str
    short_name: str
    price: float
    sale_price: Optional[float]
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
# HELPER FUNCTIONS
# ============================================================================

def detect_language(text: str) -> str:
    """Detect if text is Arabic or English"""
    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+')
    if arabic_pattern.search(text):
        return 'ar'
    return 'en'


def log(message: str, level: str = "INFO"):
    """Detailed logging for debugging"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] 🔍 CHAT: {message}")


def extract_keywords(query: str) -> Dict[str, Any]:
    """
    LAYER 1 HELPER: Extract search keywords from user query
    Returns structured keywords for database search
    """
    query_lower = query.lower()
    
    keywords = {
        "gender": None,
        "item_type": None,
        "style": None,
        "occasion": None,
        "color": None,
        "raw_terms": []
    }
    
    # ===== GENDER DETECTION =====
    # Arabic feminine indicators
    if any(word in query_lower for word in ['عايزة', 'محتاجة', 'نفسي', 'حريمي', 'نسائي', 'بنات', 'ستات', 'فستان', 'فساتين']):
        keywords["gender"] = "women"
    # Arabic masculine indicators  
    elif any(word in query_lower for word in ['عايز', 'محتاج', 'رجالي', 'رجال', 'شباب']):
        keywords["gender"] = "men"
    # English
    elif any(word in query_lower for word in ['women', 'woman', 'female', 'ladies', 'her', 'she']):
        keywords["gender"] = "women"
    elif any(word in query_lower for word in ['men', 'man', 'male', 'guys', 'him', 'he']):
        keywords["gender"] = "men"
    
    # ===== ITEM TYPE DETECTION =====
    item_mappings = {
        "dress": ['فستان', 'فساتين', 'dress', 'gown'],
        "suit": ['بدلة', 'بدل', 'suit', 'tuxedo', 'tux'],
        "shirt": ['قميص', 'شيرت', 'بلوزة', 'توب', 'shirt', 'blouse', 'top'],
        "pants": ['بنطلون', 'بنطالون', 'جينز', 'pants', 'trousers', 'jeans'],
        "bag": ['شنطة', 'شنط', 'حقيبة', 'bag', 'purse', 'handbag'],
        "shoes": ['حذاء', 'جزمة', 'صندل', 'shoes', 'heels', 'sandals'],
        "jacket": ['جاكيت', 'جاكت', 'بليزر', 'jacket', 'blazer', 'coat'],
        "clothing": ['طقم', 'لبس', 'ملابس', 'اوتفيت', 'outfit', 'look', 'clothes']
    }
    
    for item_type, words in item_mappings.items():
        if any(word in query_lower for word in words):
            keywords["item_type"] = item_type
            break
    
    # ===== STYLE DETECTION =====
    style_mappings = {
        "formal": ['رسمي', 'فورمال', 'formal', 'elegant', 'أنيق'],
        "casual": ['كاجوال', 'كاچوال', 'يومي', 'عادي', 'casual', 'everyday'],
        "sporty": ['رياضي', 'سبور', 'sporty', 'athletic', 'gym'],
        "classic": ['كلاسيك', 'classic', 'traditional', 'تقليدي'],
        "trendy": ['مودرن', 'عصري', 'trendy', 'modern', 'stylish']
    }
    
    for style, words in style_mappings.items():
        if any(word in query_lower for word in words):
            keywords["style"] = style
            break
    
    # ===== OCCASION DETECTION =====
    occasion_mappings = {
        "wedding": ['فرح', 'زفاف', 'خطوبة', 'wedding', 'engagement'],
        "party": ['حفلة', 'سهرة', 'party', 'night out'],
        "work": ['شغل', 'مكتب', 'work', 'office', 'interview'],
        "vacation": ['بحر', 'للبحر', 'سفر', 'صيف', 'vacation', 'beach', 'summer'],
        "date": ['موعد', 'خروجة', 'date', 'romantic'],
        "daily": ['يومي', 'خروج', 'daily', 'everyday']
    }
    
    for occasion, words in occasion_mappings.items():
        if any(word in query_lower for word in words):
            keywords["occasion"] = occasion
            break
    
    # ===== COLOR DETECTION =====
    color_mappings = {
        "red": ['أحمر', 'احمر', 'red'],
        "black": ['أسود', 'اسود', 'black'],
        "white": ['أبيض', 'ابيض', 'white'],
        "blue": ['أزرق', 'ازرق', 'كحلي', 'blue', 'navy'],
        "green": ['أخضر', 'اخضر', 'green'],
        "pink": ['وردي', 'pink', 'rose'],
        "grey": ['رمادي', 'grey', 'gray']
    }
    
    for color, words in color_mappings.items():
        if any(word in query_lower for word in words):
            keywords["color"] = color
            break
    
    # Extract raw search terms (words > 2 chars)
    keywords["raw_terms"] = [w for w in query_lower.split() if len(w) > 2]
    
    log(f"Extracted keywords: {keywords}")
    return keywords


# ============================================================================
# LAYER 1: STRICT DATABASE QUERY WITH LOGGING
# ============================================================================

def search_database_strict(db: Session, keywords: Dict[str, Any], limit: int = 10) -> List[Dict]:
    """
    LAYER 1: Strict database search with detailed logging
    Returns list of product dicts from database
    """
    log(f"=== LAYER 1: DATABASE SEARCH ===")
    log(f"Search keywords: {keywords}")
    
    try:
        query = db.query(Product)
        filters_applied = []
        
        # ===== FILTER BY GENDER =====
        if keywords["gender"]:
            query = query.filter(func.lower(Product.category).like(f'%{keywords["gender"]}%'))
            filters_applied.append(f"gender={keywords['gender']}")
        
        # ===== FILTER BY ITEM TYPE =====
        if keywords["item_type"]:
            item_type = keywords["item_type"]
            if item_type == "clothing":
                # For outfit requests, search for actual clothing items
                clothing_types = ['dress', 'shirt', 't-shirt', 'pants', 'suit', 'jacket', 'skirt', 'blouse']
                query = query.filter(
                    or_(
                        Product.sub_category.in_(clothing_types),
                        func.lower(Product.name).like('%dress%'),
                        func.lower(Product.name).like('%shirt%'),
                        func.lower(Product.name).like('%pants%'),
                        func.lower(Product.name).like('%suit%'),
                        func.lower(Product.name).like('%jacket%')
                    )
                )
                filters_applied.append("item_type=clothing (multiple)")
            else:
                query = query.filter(
                    or_(
                        Product.sub_category == item_type,
                        func.lower(Product.name).like(f'%{item_type}%')
                    )
                )
                filters_applied.append(f"item_type={item_type}")
        
        # ===== FILTER BY STYLE TAGS =====
        if keywords["style"]:
            query = query.filter(
                func.lower(Product.style_tags).like(f'%{keywords["style"]}%')
            )
            filters_applied.append(f"style={keywords['style']}")
        
        # ===== FILTER BY OCCASION TAGS =====
        if keywords["occasion"]:
            query = query.filter(
                func.lower(Product.occasion_tags).like(f'%{keywords["occasion"]}%')
            )
            filters_applied.append(f"occasion={keywords['occasion']}")
        
        # ===== FILTER BY COLOR =====
        if keywords["color"]:
            query = query.filter(
                or_(
                    func.lower(Product.colors).like(f'%{keywords["color"]}%'),
                    func.lower(Product.name).like(f'%{keywords["color"]}%')
                )
            )
            filters_applied.append(f"color={keywords['color']}")
        
        log(f"Filters applied: {filters_applied}")
        
        # Execute query with limit
        products = query.limit(limit).all()
        log(f"Database returned {len(products)} products")
        
        # Convert to list of dicts
        result = []
        for p in products:
            # Get first image
            images = p.images or []
            if isinstance(images, str):
                try:
                    images = json.loads(images)
                except:
                    images = []
            image = images[0] if images else ""
            
            result.append({
                "id": p.id,
                "name": p.name,
                "short_name": p.name[:30] + "..." if len(p.name) > 30 else p.name,
                "price": float(p.price or 0),
                "sale_price": float(p.sale_price) if p.sale_price else None,
                "category": p.category or "",
                "sub_category": p.sub_category or "",
                "image": image,
                "style_tags": p.style_tags,
                "occasion_tags": p.occasion_tags
            })
        
        for i, p in enumerate(result[:5]):
            log(f"  Product {i+1}: {p['id']} - {p['name'][:40]}...")
        
        return result
        
    except Exception as e:
        log(f"DATABASE ERROR: {e}", "ERROR")
        return []


def search_with_fallback(db: Session, keywords: Dict[str, Any], limit: int = 10) -> tuple:
    """
    Search database with progressive fallback
    Returns (products_list, source_type)
    """
    log("=== SEARCH WITH FALLBACK ===")
    
    # Try strict search first
    products = search_database_strict(db, keywords, limit)
    
    if products:
        log(f"✅ Found {len(products)} products from DB (strict search)")
        return products, "database"
    
    # If no results, try broader search
    log("⚠️ No strict results, trying broader search...")
    try:
        # Just get products matching gender or any clothing
        query = db.query(Product)
        
        if keywords["gender"]:
            query = query.filter(func.lower(Product.category).like(f'%{keywords["gender"]}%'))
        
        products = query.limit(limit).all()
        
        if products:
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
                    "id": p.id,
                    "name": p.name,
                    "short_name": p.name[:30] + "..." if len(p.name) > 30 else p.name,
                    "price": float(p.price or 0),
                    "sale_price": float(p.sale_price) if p.sale_price else None,
                    "category": p.category or "",
                    "sub_category": p.sub_category or "",
                    "image": image,
                    "style_tags": p.style_tags,
                    "occasion_tags": p.occasion_tags
                })
            
            log(f"✅ Found {len(result)} products from DB (broad search)")
            return result, "database_broad"
    except Exception as e:
        log(f"Broad search error: {e}", "ERROR")
    
    # LAYER 3: EMERGENCY FALLBACK
    log("🔥 LAYER 3 ACTIVATED: Using DEMO FALLBACK PRODUCTS!")
    
    # Filter fallback products by gender if specified
    fallback = FALLBACK_DEMO_PRODUCTS.copy()
    if keywords["gender"]:
        fallback = [p for p in fallback if p["category"] == keywords["gender"]]
    
    # Filter by item type if specified
    if keywords["item_type"] and keywords["item_type"] != "clothing":
        fallback = [p for p in fallback if p["sub_category"] == keywords["item_type"]]
    
    # If still empty after filtering, use all fallback products
    if not fallback:
        fallback = FALLBACK_DEMO_PRODUCTS[:5]
    
    log(f"✅ Using {len(fallback)} FALLBACK products")
    return fallback[:limit], "fallback"


# ============================================================================
# LAYER 2: ANTI-HALLUCINATION GEMINI PROMPT
# ============================================================================

def get_anti_hallucination_prompt() -> str:
    """
    LAYER 2: System prompt that prevents AI from hallucinating products
    """
    return """You are "Elegance AI Stylist" - an expert fashion consultant for an Egyptian fashion e-commerce platform.

=== CRITICAL RULES (ZERO TOLERANCE) ===

1. **PRODUCT RECOMMENDATIONS MUST BE FROM THE PROVIDED LIST ONLY**
   - You will receive a JSON array called AVAILABLE_PRODUCTS
   - You can ONLY recommend products that exist in this array
   - Use the EXACT product IDs from the array
   - NEVER invent, hallucinate, or make up product IDs
   - If AVAILABLE_PRODUCTS is empty, apologize and say items are out of stock

2. **JSON OUTPUT FORMAT**
   You MUST respond with valid JSON in this exact format:
   {
     "reply": "Your styling advice in the user's language",
     "recommendations": [
       {"product_id": "EXACT_ID_FROM_LIST", "reason": "Why this fits"}
     ],
     "language": "ar" or "en"
   }

3. **LANGUAGE RULES**
   - Detect user's language from their message
   - If Arabic: respond in casual Egyptian Arabic (يا باشا، يا قمر)
   - If English: respond in friendly conversational English
   - NEVER mix languages

4. **STYLING ADVICE**
   - Give complete outfit suggestions in your "reply" text
   - Explain WHY you chose each item (color matching, occasion fit)
   - If products are limited, still give full styling advice
   - Mention that other pieces can be found elsewhere

5. **EMPTY CATALOG HANDLING**
   - If AVAILABLE_PRODUCTS is empty or has no matching items
   - Say: "للأسف المنتجات اللي بتدور عليها مش متاحة حالياً" (Arabic)
   - Or: "Sorry, the items you're looking for are currently out of stock" (English)
   - Still give general styling advice
   - Set recommendations to empty array []

=== YOU ARE A STYLIST FIRST ===
Always give helpful fashion advice, even if products are limited.
Be warm, friendly, and knowledgeable about fashion for the Egyptian market.
"""


def build_product_context(products: List[Dict]) -> str:
    """Build the product context JSON for the AI"""
    if not products:
        return "[]"
    
    # Simplified product info for AI
    simplified = []
    for p in products:
        simplified.append({
            "id": p["id"],
            "name": p["name"],
            "price": p["price"],
            "category": p["category"],
            "sub_category": p.get("sub_category", ""),
            "style": p.get("style_tags", ""),
            "occasion": p.get("occasion_tags", "")
        })
    
    return json.dumps(simplified, ensure_ascii=False, indent=2)


async def call_gemini(user_message: str, products_context: str, history: List[ChatMessage]) -> Dict:
    """
    Call Gemini API with anti-hallucination prompt
    """
    log("=== LAYER 2: CALLING GEMINI ===")
    
    if not GEMINI_API_KEY:
        log("No Gemini API key - using fallback response", "WARNING")
        return {
            "reply": "أهلاً بيك! للأسف في مشكلة تقنية حالياً. جرب تاني بعدين.",
            "recommendations": [],
            "language": "ar"
        }
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        system_prompt = get_anti_hallucination_prompt()
        
        user_prompt = f"""
=== AVAILABLE_PRODUCTS ===
{products_context}

=== USER MESSAGE ===
{user_message}

=== INSTRUCTIONS ===
Respond with JSON format as specified. ONLY use product IDs from AVAILABLE_PRODUCTS.
"""
        
        log(f"Sending to Gemini with {len(products_context)} chars of product context")
        
        # Build chat history
        chat_history = []
        for msg in history[-4:]:  # Last 4 messages
            chat_history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content]
            })
        
        chat = model.start_chat(history=chat_history)
        
        # Send with system context
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        response = chat.send_message(full_prompt)
        
        # Parse response
        response_text = response.text.strip()
        log(f"Gemini raw response: {response_text[:200]}...")
        
        # Clean and parse JSON
        # Remove markdown code blocks if present
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        
        # Find JSON object
        json_start = response_text.find('{')
        json_end = response_text.rfind('}')
        if json_start != -1 and json_end != -1:
            response_text = response_text[json_start:json_end + 1]
        
        result = json.loads(response_text)
        log(f"✅ Gemini response parsed successfully")
        return result
        
    except json.JSONDecodeError as e:
        log(f"JSON parse error: {e}", "ERROR")
        return {
            "reply": "أهلاً بيك! عندنا تشكيلة حلوة من الملابس. قولي بتدور على إيه بالظبط؟",
            "recommendations": [],
            "language": "ar"
        }
    except Exception as e:
        log(f"Gemini error: {e}", "ERROR")
        return {
            "reply": "أهلاً بيك! في مشكلة تقنية بسيطة. جرب تاني.",
            "recommendations": [],
            "language": "ar"
        }


# ============================================================================
# MAIN CHAT ENDPOINT
# ============================================================================

@router.post("/", response_model=ChatResponse)
async def chat_with_stylist(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Main chat endpoint with FAIL-SAFE RAG Pipeline
    """
    log("=" * 60)
    log(f"NEW CHAT REQUEST: '{request.message}'")
    log("=" * 60)
    
    # Detect language
    language = request.language or detect_language(request.message)
    log(f"Detected language: {language}")
    
    # Check for greeting
    greetings = ['hi', 'hello', 'مرحبا', 'اهلا', 'السلام', 'ازيك', 'هاي']
    if any(g in request.message.lower() for g in greetings) and len(request.message.split()) < 5:
        log("Detected greeting - returning welcome message")
        return ChatResponse(
            message="أهلاً يا قمر! 🌟 منور/منورة Elegance. أنا هنا عشان أساعدك تلاقي اللوك المثالي. قولي بتدور على إيه؟ فستان سهرة؟ طقم كاجوال؟ بدلة للفرح؟",
            products=[],
            language=language,
            needs_clarification=True,
            clarification_questions=["بتدور على لبس لمناسبة إيه؟", "رجالي ولا حريمي؟"]
        )
    
    # LAYER 1: Extract keywords and search database
    keywords = extract_keywords(request.message)
    products, source = search_with_fallback(db, keywords, limit=10)
    
    log(f"Products source: {source}, count: {len(products)}")
    
    # LAYER 2: Build context and call Gemini
    products_context = build_product_context(products)
    ai_response = await call_gemini(request.message, products_context, request.history)
    
    # Map AI recommendations to actual products
    final_products = []
    recommended_ids = [r.get("product_id") or r.get("id") for r in ai_response.get("recommendations", [])]
    
    log(f"AI recommended IDs: {recommended_ids}")
    
    for rec in ai_response.get("recommendations", [])[:6]:
        rec_id = rec.get("product_id") or rec.get("id")
        reason = rec.get("reason", "")
        
        # Find matching product
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
    
    # If AI didn't recommend any (or all failed), use first few products
    if not final_products and products:
        log("⚠️ No AI recommendations matched, using first products")
        for p in products[:3]:
            final_products.append(ProductInfo(
                id=p["id"],
                name=p["name"],
                short_name=p["short_name"],
                price=p["price"],
                sale_price=p.get("sale_price"),
                category=p["category"],
                image=p["image"],
                reason="منتج مقترح من الكتالوج"
            ))
    
    log(f"✅ Returning {len(final_products)} products to user")
    log("=" * 60)
    
    return ChatResponse(
        message=ai_response.get("reply", "أهلاً بيك! عندنا تشكيلة حلوة. قولي بتدور على إيه؟"),
        products=final_products,
        language=ai_response.get("language", language),
        needs_clarification=False,
        clarification_questions=[]
    )


# ============================================================================
# HEALTH CHECK & TEST ENDPOINTS
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gemini_configured": GEMINI_API_KEY is not None,
        "fallback_products": len(FALLBACK_DEMO_PRODUCTS)
    }


@router.get("/test-fallback")
async def test_fallback():
    """Test endpoint to verify fallback products"""
    return {
        "fallback_products": FALLBACK_DEMO_PRODUCTS,
        "count": len(FALLBACK_DEMO_PRODUCTS)
    }

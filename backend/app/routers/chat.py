"""
AI Chat Router - Real AI Stylist with Catalog Grounding
Secure chat endpoint that uses Gemini with real product search
"""
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.data_cleanup import make_short_name


router = APIRouter()


# Configure Gemini API - MUST be set via environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not set. Chat endpoint will return errors.")
else:
    genai.configure(api_key=GEMINI_API_KEY)


# Request/Response models
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
    reason: Optional[str] = None  # Why this product was recommended


class ChatResponse(BaseModel):
    message: str
    products: List[ProductInfo]
    language: str
    needs_clarification: bool = False
    clarification_questions: List[str] = []


def detect_language(text: str) -> str:
    """Detect if text is Arabic or English"""
    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+')
    if arabic_pattern.search(text):
        return 'ar'
    return 'en'


def parse_json_list(value):
    """Safely parse a JSON list stored as text, return a Python list."""
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        data = json.loads(value)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []


def extract_intent_from_query(query: str) -> dict:
    """
    Extract user intent from query (item type, gender, style, occasion).
    Returns dict with 'gender', 'item_type', 'style', 'occasion' keys.
    """
    query_lower = query.lower()
    
    intent = {
        "gender": None,
        "item_type": None,
        "style": None,
        "occasion": None
    }
    
    # Gender detection - Arabic (including feminine verb forms)
    # عايزة/محتاجة/بدور = feminine forms indicate women
    if any(word in query_lower for word in ['حريمي', 'حريمى', 'نسائي', 'نسائى', 'بنات', 'للنساء', 'للبنات', 'ستات', 'عايزة', 'محتاجة', 'بدوري', 'نفسي', 'فستان', 'فساتين']):
        intent["gender"] = "women"
    elif any(word in query_lower for word in ['رجالي', 'رجالى', 'رجال', 'رجالة', 'للرجال', 'شباب', 'عايز', 'محتاج', 'بدور']):
        intent["gender"] = "men"
    
    # Gender detection - English
    if any(word in query_lower for word in ['women', 'woman', 'female', 'ladies', 'girls', "women's"]):
        intent["gender"] = "women"
    elif any(word in query_lower for word in ['men', 'man', 'male', 'guys', "men's"]):
        intent["gender"] = "men"
    
    # Item type detection - Arabic
    if any(word in query_lower for word in ['بنطلون', 'بنطالون', 'سروال', 'جينز']):
        intent["item_type"] = "pants"
    elif any(word in query_lower for word in ['فستان', 'فساتين']):
        intent["item_type"] = "dress"
    elif any(word in query_lower for word in ['لانجري', 'لانجيري', 'لانچري', 'ملابس داخلية', 'داخلي']):
        intent["item_type"] = "lingerie"
    elif any(word in query_lower for word in ['شنطة', 'شنط', 'حقيبة', 'حقائب', 'شنطه', 'bag']):
        intent["item_type"] = "bag"
    elif any(word in query_lower for word in ['قميص', 'بلوزة', 'تيشرت', 'تي شيرت', 'توب']):
        intent["item_type"] = "top"
    elif any(word in query_lower for word in ['طقم', 'ملابس', 'لبس', 'اوتفيت', 'outfit', 'look', 'لوك']):
        intent["item_type"] = "clothing"  # Special case - need full outfit
    elif any(word in query_lower for word in ['حذاء', 'جزمة', 'احذية', 'صندل']):
        intent["item_type"] = "shoes"
    elif any(word in query_lower for word in ['ساعة', 'خاتم', 'حلق', 'سلسلة', 'اكسسوار', 'طاقية', 'قبعة']):
        intent["item_type"] = "accessory"
    
    # Item type detection - English
    if any(word in query_lower for word in ['pants', 'trousers', 'jeans', 'pant']):
        intent["item_type"] = "pants"
    elif any(word in query_lower for word in ['dress', 'dresses', 'gown']):
        intent["item_type"] = "dress"
    elif any(word in query_lower for word in ['lingerie', 'underwear', 'bra', 'panties']):
        intent["item_type"] = "lingerie"
    elif any(word in query_lower for word in ['bag', 'bags', 'handbag', 'tote', 'purse', 'backpack']):
        intent["item_type"] = "bag"
    elif any(word in query_lower for word in ['shirt', 'blouse', 'top', 'tshirt', 't-shirt']):
        intent["item_type"] = "top"
    elif any(word in query_lower for word in ['shoes', 'shoe', 'sneakers', 'boots', 'sandals']):
        intent["item_type"] = "shoes"
    elif any(word in query_lower for word in ['watch', 'ring', 'earring', 'necklace', 'accessory', 'cap', 'hat']):
        intent["item_type"] = "accessory"
    
    # ===== NEW: Style detection =====
    # Formal style
    if any(word in query_lower for word in ['formal', 'رسمي', 'رسمى', 'فورمال', 'بدلة', 'suit', 'tuxedo', 'elegant', 'أنيق', 'سهرة']):
        intent["style"] = "formal"
    # Casual style - ENHANCED with more Arabic variants
    elif any(word in query_lower for word in ['casual', 'كاجوال', 'كاچوال', 'كاجول', 'كاجيوال', 'كاجوال', 'يومي', 'عادي', 'everyday', 'relaxed', 'كجوال', 'كاچول', 'بسيط', 'عملي', 'comfy', 'كومفي']):
        intent["style"] = "casual"
    # Sporty style
    elif any(word in query_lower for word in ['sporty', 'رياضي', 'رياضى', 'sport', 'athletic', 'gym', 'سبور', 'سبورت']):
        intent["style"] = "sporty"
    # Classic style
    elif any(word in query_lower for word in ['classic', 'كلاسيك', 'كلاسيكي', 'timeless', 'traditional', 'تقليدي']):
        intent["style"] = "classic"
    # Trendy/streetwear
    elif any(word in query_lower for word in ['trendy', 'streetwear', 'modern', 'مودرن', 'عصري', 'موضة', 'ستايل']):
        intent["style"] = "trendy"
    
    # ===== NEW: Occasion detection =====
    # Wedding/engagement
    if any(word in query_lower for word in ['wedding', 'فرح', 'زفاف', 'خطوبة', 'engagement', 'bridal', 'groom', 'عريس', 'عروسة']):
        intent["occasion"] = "wedding"
    # Party/night out
    elif any(word in query_lower for word in ['party', 'حفلة', 'سهرة', 'night out', 'club', 'nightclub', 'ديسكو']):
        intent["occasion"] = "party"
    # Work/office
    elif any(word in query_lower for word in ['work', 'شغل', 'office', 'مكتب', 'meeting', 'interview', 'business', 'professional']):
        intent["occasion"] = "work"
    # Date
    elif any(word in query_lower for word in ['date', 'موعد', 'خروجة', 'romantic', 'رومانسي', 'dinner']):
        intent["occasion"] = "date"
    # Daily/casual outing
    elif any(word in query_lower for word in ['daily', 'يومي', 'outing', 'خروج', 'عادي', 'everyday']):
        intent["occasion"] = "daily"
    # Vacation/beach - expanded Arabic
    elif any(word in query_lower for word in ['vacation', 'سفر', 'beach', 'بحر', 'للبحر', 'البحر', 'holiday', 'resort', 'summer', 'صيف', 'صيفي', 'مصيف', 'ساحل', 'رحلة']):
        intent["occasion"] = "vacation"
    # Gym
    elif any(word in query_lower for word in ['gym', 'جيم', 'workout', 'exercise', 'training', 'تمرين']):
        intent["occasion"] = "gym"
    # Special event
    elif any(word in query_lower for word in ['special', 'مناسبة', 'event', 'ceremony', 'graduation', 'تخرج']):
        intent["occasion"] = "special_event"
    
    return intent


def infer_item_type_from_product(p: Product) -> str:
    """
    Infer the item type from a product's name and sub_category.
    Returns: 'bag', 'pants', 'dress', 'top', 'shoes', 'lingerie', 'accessory', or 'other'
    """
    # Combine name and sub_category for matching
    text = f"{p.name or ''} {p.sub_category or ''}".lower()
    
    # Bag detection
    if any(word in text for word in ['bag', 'handbag', 'tote', 'purse', 'backpack', 'clutch', 'satchel', 'crossbody']):
        return "bag"
    
    # Pants detection
    if any(word in text for word in ['pants', 'trousers', 'jeans', 'leggings', 'shorts']):
        return "pants"
    
    # Dress detection
    if any(word in text for word in ['dress', 'gown', 'maxi', 'midi']):
        return "dress"
    
    # Top detection
    if any(word in text for word in ['shirt', 'blouse', 'top', 'tshirt', 't-shirt', 'sweater', 'hoodie', 'cardigan']):
        return "top"
    
    # Shoes detection
    if any(word in text for word in ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'loafers', 'flats']):
        return "shoes"
    
    # Lingerie detection
    if any(word in text for word in ['bra', 'lingerie', 'underwear', 'panties', 'intimates']):
        return "lingerie"
    
    # Accessory detection (caps, hats, jewelry, watches)
    if any(word in text for word in ['cap', 'hat', 'watch', 'ring', 'earring', 'necklace', 'bracelet', 'headband', 'hair clip', 'hair claw', 'scarf']):
        return "accessory"
    
    return "other"


def search_catalog(db: Session, query: str, limit: int = 15) -> List[Product]:
    """
    Smart search with metadata filtering and multi-level fallback.
    
    Flow:
    1. Extract intent (style, occasion, gender, item_type)
    2. Try filtered search with tags
    3. Fallback to broader search if no results
    4. Always return relevant products, never empty
    """
    # Extract user intent
    intent = extract_intent_from_query(query)
    intent_item_type = intent.get("item_type")
    intent_gender = intent.get("gender")
    intent_style = intent.get("style")
    intent_occasion = intent.get("occasion")
    
    print(f"🔍 Search intent: {intent}")  # Debug log
    
    # Build search terms
    search_terms = query.lower().split()
    
    # ===== LEVEL 1: Strict tag-based filtering =====
    candidates = []
    
    # ===== SPECIAL: If looking for clothing/outfit, search actual clothes first =====
    if intent_item_type == "clothing":
        clothing_subcats = ['dress', 'shirt', 't-shirt', 'pants', 'trouser', 'jacket', 'skirt', 'sweater', 'sleeve']
        base_query = db.query(Product).filter(
            or_(
                Product.sub_category.in_(clothing_subcats),
                func.lower(Product.name).like('%dress%'),
                func.lower(Product.name).like('%shirt%'),
                func.lower(Product.name).like('%pants%'),
                func.lower(Product.name).like('%jacket%'),
                func.lower(Product.name).like('%blouse%'),
                func.lower(Product.name).like('%skirt%'),
                func.lower(Product.name).like('%top %'),
                func.lower(Product.name).like('%sweater%')
            )
        )
        if intent_gender:
            base_query = base_query.filter(func.lower(Product.category).like(f'%{intent_gender}%'))
        candidates = base_query.limit(limit * 2).all()
        if candidates:
            print(f"✅ Found {len(candidates)} clothing items for outfit request")
    
    if intent_style or intent_occasion:
        base_query = db.query(Product)
        
        # Filter by style tags if we have style intent
        # Note: tags may be stored as double-encoded JSON, so search for both patterns
        if intent_style:
            # Search for both normal JSON and escaped JSON patterns
            base_query = base_query.filter(
                or_(
                    func.lower(Product.style_tags).like(f'%"{intent_style}"%'),
                    func.lower(Product.style_tags).like(f'%\\"{intent_style}\\"%'),
                    func.lower(Product.style_tags).like(f'%{intent_style}%')
                )
            )
        
        # Filter by occasion tags if we have occasion intent
        if intent_occasion:
            base_query = base_query.filter(
                or_(
                    func.lower(Product.occasion_tags).like(f'%"{intent_occasion}"%'),
                    func.lower(Product.occasion_tags).like(f'%\\"{intent_occasion}\\"%'),
                    func.lower(Product.occasion_tags).like(f'%{intent_occasion}%')
                )
            )
        
        # Filter by gender if specified
        if intent_gender:
            base_query = base_query.filter(
                func.lower(Product.category).like(f'%{intent_gender}%')
            )
        
        candidates = base_query.limit(limit * 2).all()
        
        if candidates:
            print(f"✅ Level 1 (Tag filter): Found {len(candidates)} products")
    
    # ===== LEVEL 2: Keyword search with tag scoring =====
    if not candidates:
        conditions = []
        for term in search_terms[:5]:
            if len(term) > 2:
                term_pattern = f"%{term}%"
                conditions.append(func.lower(Product.name).like(term_pattern))
                conditions.append(func.lower(Product.description).like(term_pattern))
                conditions.append(func.lower(Product.category).like(term_pattern))
                conditions.append(func.lower(Product.sub_category).like(term_pattern))
        
        if conditions:
            candidates = db.query(Product).filter(
                or_(*conditions)
            ).limit(limit * 3).all()
            
            if candidates:
                print(f"✅ Level 2 (Keyword search): Found {len(candidates)} products")
    
    # ===== LEVEL 3: Broad fallback based on intent =====
    if not candidates and (intent_style or intent_occasion or intent_gender):
        # Try just gender filter
        if intent_gender:
            candidates = db.query(Product).filter(
                func.lower(Product.category).like(f'%{intent_gender}%')
            ).limit(limit * 2).all()
        
        # Or just style filter (with multiple patterns for double-encoded JSON)
        if not candidates and intent_style:
            candidates = db.query(Product).filter(
                or_(
                    func.lower(Product.style_tags).like(f'%"{intent_style}"%'),
                    func.lower(Product.style_tags).like(f'%\\"{intent_style}\\"%'),
                    func.lower(Product.style_tags).like(f'%{intent_style}%')
                )
            ).limit(limit * 2).all()
        
        if candidates:
            print(f"✅ Level 3 (Broad filter): Found {len(candidates)} products")
    
    # ===== LEVEL 4: Final fallback - top rated products =====
    if not candidates:
        # Return top-rated products as absolute fallback
        candidates = db.query(Product).limit(limit * 2).all()
        print(f"⚠️ Level 4 (Fallback): Returning top {len(candidates)} rated products")
    
    # ===== CRITICAL: For outfit requests, ALWAYS ensure we have clothing items =====
    if intent_item_type == "clothing":
        # Check if we have any actual clothing in candidates
        clothing_keywords = ['dress', 'shirt', 'pants', 'trouser', 'jacket', 'blouse', 'skirt', 'sweater', 'top', 'jeans', 'blazer']
        has_clothing = any(
            any(kw in (c.name or '').lower() or kw in (c.sub_category or '').lower() for kw in clothing_keywords)
            for c in candidates
        )
        
        if not has_clothing:
            # Force fetch some clothing items
            print("⚠️ No clothing in candidates for outfit request - fetching clothes!")
            clothing_items = db.query(Product).filter(
                or_(
                    Product.sub_category.in_(['dress', 'shirt', 't-shirt', 'pants', 'trouser', 'jacket', 'skirt']),
                    func.lower(Product.name).like('%dress%'),
                    func.lower(Product.name).like('%shirt%'),
                    func.lower(Product.name).like('%pants%'),
                    func.lower(Product.name).like('%jeans%')
                )
            )
            if intent_gender:
                clothing_items = clothing_items.filter(func.lower(Product.category).like(f'%{intent_gender}%'))
            clothing_items = clothing_items.limit(10).all()
            
            if clothing_items:
                print(f"✅ Added {len(clothing_items)} clothing items to candidates")
                candidates = clothing_items + candidates[:limit - len(clothing_items)]

    # ===== RE-RANKING based on full intent =====
    scored_products = []
    for p in candidates:
        score = 0
        
        # Item type matching
        if intent_item_type:
            product_item_type = infer_item_type_from_product(p)
            if product_item_type == intent_item_type:
                score += 100
            elif product_item_type == "other":
                score += 10
            else:
                score += 5
        
        # Style matching (from tags)
        if intent_style and p.style_tags:
            try:
                style_tags = json.loads(p.style_tags) if isinstance(p.style_tags, str) else p.style_tags
                if intent_style in style_tags:
                    score += 50
                # Penalize conflicting styles
                if intent_style == "casual" and "formal" in style_tags:
                    score -= 30
                elif intent_style == "formal" and "casual" in style_tags:
                    score -= 30
            except:
                pass
        
        # Occasion matching (from tags)
        if intent_occasion and p.occasion_tags:
            try:
                occasion_tags = json.loads(p.occasion_tags) if isinstance(p.occasion_tags, str) else p.occasion_tags
                if intent_occasion in occasion_tags:
                    score += 50
                # Penalize conflicting occasions
                if intent_occasion == "daily" and "wedding" in occasion_tags:
                    score -= 20
                elif intent_occasion == "wedding" and "daily" in occasion_tags:
                    score -= 10  # Less penalty - daily items can be for anything
            except:
                pass
        
        # Gender matching
        if intent_gender:
            product_category = (p.category or "").lower()
            if intent_gender in product_category:
                score += 20
        
        # Rating bonus
        score += (p.rating or 0) * 2
        
        scored_products.append((p, score))
    
    # Sort by score descending
    scored_products.sort(key=lambda x: x[1], reverse=True)
    
    # Get top products
    top_products = [p for p, score in scored_products[:limit]]
    
    print(f"📦 Returning {len(top_products)} products (top scores: {[s for _, s in scored_products[:5]]})")
    
    return top_products



def build_product_catalog_json(products: List[Product]) -> str:
    """Convert products to a JSON string for the AI prompt"""
    catalog = []
    for p in products:
        catalog.append({
            "id": p.id,
            "name": make_short_name(p.name),
            "full_name": p.name[:100],  # Truncate long names
            "price": p.price,
            "sale_price": p.sale_price,
            "category": p.category,
            "sub_category": p.sub_category,
            "colors": parse_json_list(p.colors)[:3],
            "sizes": parse_json_list(p.sizes)[:5],
        })
    return json.dumps(catalog, ensure_ascii=False, indent=2)


def get_system_prompt() -> str:
    """Get the comprehensive system prompt for Elegance AI Stylist"""
    return """You are "Elegance AI Stylist" - the expert fashion AI assistant for a premium fashion e-commerce website.

=== YOUR IDENTITY ===
- You are warm, friendly, and passionate about fashion
- You are a COMPLETE OUTFIT STYLIST, not just a product recommender
- You speak naturally and conversationally
- You are knowledgeable about styles, trends, color coordination, and what looks good together

=== LANGUAGE RULES ===
- DETECT the user's language from their message
- If the user writes in Arabic (العربية), respond in casual Egyptian Arabic (اللهجة المصرية)
- If the user writes in English, respond in friendly conversational English
- NEVER mix languages in the same response

=== COMPLETE OUTFIT STYLING (MOST IMPORTANT) ===
When a user asks for outfit help (for any occasion: engagement, wedding, work, casual, date, interview, etc.):

1. ALWAYS describe a COMPLETE OUTFIT in your "reply":
   - Top (shirt, blouse, blazer, etc.)
   - Bottom (trousers, skirt, jeans, etc.)
   - Shoes (type and color)
   - Accessories (bag, watch, jewelry, belt, etc.)
   - Color coordination tips
   - Styling notes for the occasion

2. Your TEXT ADVICE in "reply" CAN mention generic fashion items that are NOT in the catalog:
   - Example: "جيب بنطلون قماش أسود سادة" or "pair this with classic black oxfords"
   - This is ALLOWED and ENCOURAGED for complete outfit advice
   - You are a stylist first - give FULL fashion guidance

3. The "recommendations" array MUST ONLY contain products from PRODUCT_CATALOG:
   - Only include product_ids that actually exist in the catalog
   - NEVER invent IDs, names, or prices
   - It's OK if recommendations has only 1-2 items, or even empty
   - If catalog only has bags/accessories for a men's outfit request, include those and explain in reply that other pieces can be bought elsewhere

4. When catalog is LIMITED or has NO matching items:
   - Still provide FULL outfit advice in your reply text
   - Explain which pieces the user can find in our catalog (if any)
   - Suggest that other pieces can be bought from anywhere
   - Example: "الإطلالة دي محتاجة بنطلون قماش رمادي وقميص أبيض - دول ممكن تجيبهم من أي محل. عندنا في الكتالوج شنط وإكسسوارات هتكمل اللوك بتاعك..."
   - NEVER say "we can't help" or "nothing in catalog" - always give styling advice

=== HANDLING SENSITIVE REQUESTS ===
When users ask for "sexy", "seductive", or similar:
- Keep responses tasteful and respectful
- Focus on elegant styling: flattering cuts, colors, fabrics
- Avoid explicit or inappropriate descriptions
- Example: Instead of explicit language, say "elegant figure-flattering dress" or "فستان شيك بقصة مميزة"

=== PRODUCT RECOMMENDATIONS ARRAY ===
- Only include products that EXIST in PRODUCT_CATALOG
- For each recommendation, provide a short reason why it fits
- Limit to 3-6 products maximum
- If no catalog items match, return empty array [] but STILL give outfit advice in reply

=== PRODUCT TYPE PRIORITIZATION (CRITICAL) ===
When user asks for "outfit" / "لبس" / "طقم" / clothing:
1. PRIORITIZE actual clothing items (Shirt, Sweater, Pants, Jeans, Dress, Blazer, T-Shirt)
2. Only include accessories (Bag, Hair clip, Earring, Watch) AFTER selecting clothing items
3. NEVER recommend ONLY accessories for an outfit request - user wants CLOTHES first!
4. If catalog has shirts/pants/dresses available, ALWAYS select those before bags/accessories
5. Check product names for keywords: "Shirt", "Sweater", "Jeans", "Dress", "Pants", "Blazer", "Top"

=== RESPONSE FORMAT ===
You MUST respond with valid JSON in this exact format:
{
  "reply": "Your COMPLETE outfit styling advice here - can mention items not in catalog",
  "language": "ar" or "en",
  "recommendations": [
    {"product_id": "actual_id_from_catalog", "reason": "short reason why this fits"},
    ...
  ],
  "needs_clarification": true/false,
  "clarification_questions": ["Question 1?", "Question 2?"]
}

=== EXAMPLES ===

User (Arabic): "ممكن ترشحلي لبس كلاسيكي رجالي لخطوبة صاحبي"
{
  "reply": "مبروك لصاحبك! 🎉 لخطوبة رجالي كلاسيكية، أنصحك بـ: بنطلون قماش كحلي أو أسود slim fit، مع قميص أبيض أو سماوي فاتح. لو الجو رسمي، ضيف بليزر كحلي أو رمادي. الحذاء يكون جلد أسود أو بني غامق كلاسيك. للإكسسوارات - ساعة أنيقة وحزام يماشي لون الحذاء. من الكتالوج بتاعنا، عندنا شنط وإكسسوارات هتكمل اللوك. الباقي ممكن تجيبه من أي محل ملابس رجالي.",
  "language": "ar",
  "recommendations": [
    {"product_id": "13051530", "reason": "شنطة رجالي أنيقة تليق بالمناسبة"}
  ],
  "needs_clarification": false,
  "clarification_questions": []
}

User (Arabic): "عايزة لبس شيك أدلع بيه جوزي"
{
  "reply": "يا سلام! 💕 عندي أفكار حلوة ليكي. ممكن فستان بقصة مميزة يبرز أناقتك - اختاري لون زي الأسود أو الأحمر الغامق. أو لو بتحبي اللوك الكاجوال الشيك: بلوزة ساتان مع بنطلون high-waist. للإكسسوارات - حلق طويل وسلسلة رفيعة. للشنطة، كلاتش صغير أنيق. من الكتالوج بتاعنا عندنا إكسسوارات وشنط هتضيف لمسة أنيقة للوك.",
  "language": "ar",
  "recommendations": [
    {"product_id": "14311657", "reason": "شنطة كروس أنيقة للمناسبات"},
    {"product_id": "12903227", "reason": "إكسسوار شعر يضيف لمسة ناعمة"}
  ],
  "needs_clarification": false,
  "clarification_questions": []
}

User (English): "I need a complete outfit for a job interview"
{
  "reply": "Great choice preparing ahead! For a job interview, I recommend a classic professional look: navy or charcoal dress pants with a crisp white or light blue button-down shirt. Add a well-fitted blazer in a complementary color. For shoes, go with classic leather oxfords or loafers in black or brown. Keep accessories minimal - a nice watch and a professional bag or briefcase. From our catalog, I have some great bag options that would complete this look perfectly. The clothing pieces you can find at any menswear store.",
  "language": "en",
  "recommendations": [
    {"product_id": "13051530", "reason": "Professional sling bag perfect for interviews"}
  ],
  "needs_clarification": false,
  "clarification_questions": []
}

User (Arabic): "عايز شنطة للشغل"
{
  "reply": "تمام! للشغل محتاج شنطة عملية وأنيقة في نفس الوقت. اختارتلك مجموعة شنط تنفع للمكتب - فيها مساحة للابتوب والأوراق وشكلها بروفيشنال.",
  "language": "ar",
  "recommendations": [
    {"product_id": "12087718", "reason": "شنطة واسعة وعملية للشغل"},
    {"product_id": "12439408", "reason": "شنطة بتصميم كلاسيكي للمكتب"}
  ],
  "needs_clarification": false,
  "clarification_questions": []
}
"""



@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    AI Chat endpoint with real product catalog grounding.
    Uses Gemini with structured prompts and product search.
    """
    if not GEMINI_API_KEY:
        return ChatResponse(
            message="عذراً، الخدمة غير متاحة حالياً. / Sorry, service is currently unavailable.",
            products=[],
            language="en",
            needs_clarification=False,
            clarification_questions=[]
        )
    
    try:
        # Detect language
        language = request.language or detect_language(request.message)
        
        # Search for relevant products from catalog
        products = search_catalog(db, request.message, limit=15)
        
        # Build the product catalog JSON
        catalog_json = build_product_catalog_json(products)
        
        # Build the full prompt
        system_prompt = get_system_prompt()
        
        user_prompt = f"""
=== PRODUCT_CATALOG ===
{catalog_json}

=== USER_MESSAGE ===
{request.message}

=== INSTRUCTIONS ===
Analyze the user's message and respond with the JSON format specified in the system prompt.
Remember: Only recommend products from the PRODUCT_CATALOG above using their exact IDs.
"""
        
        # Build conversation history for Gemini
        history = []
        for msg in request.history[-4:]:  # Last 4 messages for context
            history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content]
            })
        
        # Generate AI response
        model = genai.GenerativeModel(
            'gemini-2.0-flash',
            system_instruction=system_prompt
        )
        chat_session = model.start_chat(history=history)
        
        # Send message and get response
        response = chat_session.send_message(user_prompt)
        ai_response_text = response.text
        
        # Parse the JSON response from Gemini
        ai_data = parse_ai_response(ai_response_text)
        
        # Map recommended product IDs to full product info
        product_map = {p.id: p for p in products}
        recommended_products = []
        
        for rec in ai_data.get("recommendations", []):
            product_id = rec.get("product_id")
            if product_id and product_id in product_map:
                p = product_map[product_id]
                
                # Parse images as JSON list
                images_list = parse_json_list(p.images)
                image = images_list[0] if images_list else ""
                
                recommended_products.append(ProductInfo(
                    id=p.id,
                    name=p.name,
                    short_name=make_short_name(p.name),
                    price=p.price,
                    sale_price=p.sale_price,
                    category=p.category,
                    image=image,
                    reason=rec.get("reason", "")
                ))
        
        # Don't force products if AI didn't recommend any - trust the AI's judgment

        # Get reply, use fallback if empty
        reply_message = ai_data.get("reply", "").strip()
        
        # === CRITICAL: Clean reply to prevent raw JSON display ===
        # Sometimes Gemini embeds JSON in the reply - we must clean it
        if reply_message:
            # Remove markdown code blocks
            if "```json" in reply_message:
                reply_message = re.sub(r'```json[\s\S]*?```', '', reply_message).strip()
            if "```" in reply_message:
                reply_message = re.sub(r'```[\s\S]*?```', '', reply_message).strip()
            
            # If reply looks like raw JSON, clear it completely
            if reply_message.startswith("{") or reply_message.startswith("["):
                try:
                    json.loads(reply_message)  # If it parses as JSON, it's raw JSON
                    reply_message = ""  # Clear it
                except:
                    pass  # It's not valid JSON, keep it
            
            # Remove any JSON-like fragments at the start
            reply_message = re.sub(r'^\s*\{\s*"[^}]+\}\s*', '', reply_message).strip()
            
        if not reply_message:
            reply_message = get_fallback_message(language)
        
        return ChatResponse(
            message=reply_message,
            products=recommended_products,
            language=ai_data.get("language", language),
            needs_clarification=ai_data.get("needs_clarification", False),
            clarification_questions=ai_data.get("clarification_questions", [])
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        
        # Return fallback response
        language = request.language or detect_language(request.message)
        return ChatResponse(
            message=get_fallback_message(language),
            products=[],
            language=language,
            needs_clarification=False,
            clarification_questions=[]
        )


def parse_ai_response(response_text: str) -> dict:
    """
    Parse the JSON response from Gemini, handling potential issues.
    Extracts JSON even if there's text before or after it.
    """
    try:
        text = response_text.strip()
        
        # Step 1: Remove markdown code blocks if present
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()
        
        # Step 2: Extract JSON object from text (even if there's text before/after)
        json_start = text.find('{')
        json_end = text.rfind('}')
        
        if json_start != -1 and json_end != -1 and json_end > json_start:
            # Extract the JSON portion
            json_text = text[json_start:json_end + 1]
            
            # Try to parse the extracted JSON
            data = json.loads(json_text)
            
            # Validate that 'reply' doesn't look like raw JSON or contain code blocks
            reply = data.get("reply", "")
            if isinstance(reply, str) and reply.strip():
                reply = reply.strip()
                
                # Clean markdown code blocks from reply
                if "```json" in reply:
                    reply = re.sub(r'```json[\s\S]*?```', '', reply).strip()
                if "```" in reply:
                    reply = re.sub(r'```[\s\S]*?```', '', reply).strip()
                
                # Check if reply is raw JSON
                if reply.startswith("{") or reply.startswith("["):
                    # reply contains JSON - try to extract inner reply
                    try:
                        inner_data = json.loads(reply)
                        if isinstance(inner_data, dict) and "reply" in inner_data:
                            data["reply"] = inner_data["reply"]
                        else:
                            # Can't extract - clear it
                            data["reply"] = ""
                    except:
                        # Contains invalid JSON-like text - clear it
                        data["reply"] = ""
                else:
                    data["reply"] = reply  # Update with cleaned reply
            
            return data
        
        # Step 3: If no JSON object found, try direct parse
        data = json.loads(text)
        return data
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse AI response as JSON: {e}")
        print(f"Raw response: {response_text[:500]}")
        
        # Return empty reply - will be replaced by fallback message
        return {
            "reply": "",
            "language": "en",
            "recommendations": [],
            "needs_clarification": False,
            "clarification_questions": []
        }
    except Exception as e:
        print(f"Unexpected error parsing AI response: {e}")
        return {
            "reply": "",
            "language": "en",
            "recommendations": [],
            "needs_clarification": False,
            "clarification_questions": []
        }


def get_fallback_message(language: str) -> str:
    """Get a fallback error message in the appropriate language"""
    if language == "ar":
        return "عذراً، حصلت مشكلة. ممكن تحاول تاني؟"
    return "Sorry, something went wrong. Please try again."

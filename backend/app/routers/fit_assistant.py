"""
AI Fit Assistant Router
Personalized AI-powered outfit recommendations based on body measurements and style preferences
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from pydantic import BaseModel
import os
import json

import google.generativeai as genai

from app.database import get_db
from app.models import Product
from app.data_cleanup import make_short_name


router = APIRouter()


# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


# ============ Pydantic Models ============

class FitAssistantRequest(BaseModel):
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    body_shape: Optional[str] = None
    usual_size: Optional[str] = None
    fit_pain_points: List[str] = []
    fit_preference: Optional[str] = None
    style_aesthetic: Optional[str] = None
    main_occasion: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    favorite_colors: List[str] = []
    avoid_colors: List[str] = []


class FitAssistantProduct(BaseModel):
    id: str
    name: str
    short_name: str
    price: float
    sale_price: Optional[float]
    category: str
    image: str
    reason: str


class FitAssistantResponse(BaseModel):
    summary: str
    fit_tips: List[str]
    products: List[FitAssistantProduct]


# ============ Helpers ============

def parse_json_list(value):
    """Safely parse a JSON list stored as text."""
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        data = json.loads(value)
        return data if isinstance(data, list) else []
    except:
        return []


def get_candidate_products(db: Session, request: FitAssistantRequest, limit: int = 50) -> List[Product]:
    """Get candidate products based on user preferences."""
    query = db.query(Product)
    
    # Filter by gender/category
    if request.gender:
        gender_lower = request.gender.lower()
        if gender_lower in ['women', 'woman', 'female']:
            query = query.filter(func.lower(Product.category) == 'women')
        elif gender_lower in ['men', 'man', 'male']:
            query = query.filter(func.lower(Product.category) == 'men')
    
    # Filter by budget
    if request.budget_min is not None:
        query = query.filter(Product.price >= request.budget_min)
    if request.budget_max is not None:
        query = query.filter(Product.price <= request.budget_max)
    
    # Order by ID (simpler, no sort memory) and get candidates
    # Reduced limit for Railway free tier memory constraints
    products = query.limit(min(limit, 20)).all()
    
    # If too few results, relax the category filter
    if len(products) < 10:
        query = db.query(Product)
        if request.budget_min is not None:
            query = query.filter(Product.price >= request.budget_min)
        if request.budget_max is not None:
            query = query.filter(Product.price <= request.budget_max)
        products = query.limit(min(limit, 20)).all()
    
    return products


# ============ Conflict Resolution Logic ============

def apply_body_shape_rules(products: List[Product], request: FitAssistantRequest) -> tuple:
    """
    Apply body shape conflict resolution rules.
    Returns: (filtered_products, override_tips)
    """
    override_tips = []
    filtered_products = list(products)
    
    body_shape = (request.body_shape or "").lower()
    fit_preference = (request.fit_preference or "").lower()
    
    # RULE 1: Pear body + Slim preference → Override to Tapered/Straight
    if body_shape == "pear" and fit_preference in ["slim", "skinny", "fitted"]:
        # Keywords to EXCLUDE (problematic for pear shape)
        exclude_keywords = ["skinny", "skin tight", "super slim", "spray on"]
        
        # Keywords to PREFER (flattering for pear shape)
        prefer_keywords = ["tapered", "straight leg", "wide leg", "boot cut", "regular fit", "relaxed"]
        
        # Filter out problematic items
        new_filtered = []
        for p in filtered_products:
            name_lower = p.name.lower()
            desc_lower = (p.description or "").lower()
            full_text = name_lower + " " + desc_lower
            
            # Exclude skinny jeans/pants
            if any(kw in full_text for kw in exclude_keywords):
                continue  # Skip this product
            new_filtered.append(p)
        
        if len(new_filtered) < len(filtered_products):
            override_tips.append("عشان جسمك Pear، اخترتلك Tapered/Straight بدل الـ Slim عشان يعمل Balance لشكل الجسم ويخفي عرض الحوض.")
            filtered_products = new_filtered if new_filtered else filtered_products
    
    # RULE 2: Apple body → Prefer empire waist, A-line, avoid tight waist
    if body_shape == "apple":
        override_tips.append("لجسم Apple، اخترتلك قطع بقصة Empire أو A-line عشان تبرز أحسن مناطق جسمك.")
    
    # RULE 3: Hourglass → Fitted items work well
    if body_shape == "hourglass":
        override_tips.append("جسمك Hourglass متناسق، القطع الـ Fitted هتبرز جمال تناسق جسمك!")
    
    # RULE 4: Rectangle → Add definition with belts, structured pieces
    if body_shape == "rectangle":
        override_tips.append("لجسم Rectangle، جربي إضافة حزام أو قطع Structured عشان تحددي الخصر.")
    
    return filtered_products, override_tips


def apply_fit_issues_filtering(products: List[Product], request: FitAssistantRequest) -> tuple:
    """
    Apply fit issues conflict resolution.
    Down-rank problematic items, up-rank solutions.
    Returns: (ranked_products, issue_tips)
    """
    issue_tips = []
    fit_pain_points = [p.lower() for p in request.fit_pain_points] if request.fit_pain_points else []
    
    # RULE: Shoulders too tight
    shoulders_issues = ["shoulders", "shoulder", "tight shoulders", "كتف ضيق", "الاكتاف"]
    has_shoulder_issue = any(issue in " ".join(fit_pain_points) for issue in shoulders_issues)
    
    # Define ranking adjustments
    product_scores = {p.id: 0 for p in products}
    
    if has_shoulder_issue:
        # DOWN-RANK keywords (problematic for tight shoulders)
        downrank_keywords = ["structured blazer", "slim fit jacket", "tailored jacket", 
                            "fitted blazer", "slim blazer", "narrow shoulder"]
        
        # UP-RANK keywords (solutions for tight shoulders)
        uprank_keywords = ["stretch", "knit", "raglan", "oversized", "bomber", 
                         "relaxed fit", "loose fit", "drop shoulder", "soft"]
        
        for p in products:
            name_lower = p.name.lower()
            desc_lower = (p.description or "").lower()
            full_text = name_lower + " " + desc_lower
            
            # Down-rank problematic items
            if any(kw in full_text for kw in downrank_keywords):
                product_scores[p.id] -= 50
            
            # Up-rank solutions
            if any(kw in full_text for kw in uprank_keywords):
                product_scores[p.id] += 30
        
        issue_tips.append("لمشكلة الأكتاف الضيقة، رشحتلك قطع بـ Stretch أو Raglan Sleeves أو Oversized عشان تكون مريحة.")
    
    # RULE: Arms too tight
    arms_issues = ["arms", "arm", "tight sleeves", "ذراع ضيق", "الاكمام"]
    has_arm_issue = any(issue in " ".join(fit_pain_points) for issue in arms_issues)
    
    if has_arm_issue:
        for p in products:
            name_lower = p.name.lower()
            if any(kw in name_lower for kw in ["sleeveless", "short sleeve", "loose", "relaxed"]):
                product_scores[p.id] += 20
        issue_tips.append("لمشكلة ضيق الأكمام، Short Sleeves أو Sleeveless هتكون أريح.")
    
    # RULE: Waist too tight
    waist_issues = ["waist", "tight waist", "خصر ضيق", "البطن"]
    has_waist_issue = any(issue in " ".join(fit_pain_points) for issue in waist_issues)
    
    if has_waist_issue:
        for p in products:
            name_lower = p.name.lower()
            if any(kw in name_lower for kw in ["high waist", "elastic", "stretch", "relaxed"]):
                product_scores[p.id] += 25
        issue_tips.append("لمشكلة الخصر، القطع الـ Elastic أو High-Rise هتكون أريح.")
    
    # Sort products by score
    sorted_products = sorted(products, key=lambda p: product_scores[p.id], reverse=True)
    
    return sorted_products, issue_tips


def build_product_catalog(products: List[Product]) -> str:
    """Build product catalog JSON for AI prompt."""
    catalog = []
    for p in products:
        images = parse_json_list(p.images)
        colors = parse_json_list(p.colors)
        sizes = parse_json_list(p.sizes)
        
        catalog.append({
            "id": p.id,
            "name": make_short_name(p.name),
            "price": p.price,
            "sale_price": p.sale_price,
            "category": p.category,
            "sub_category": p.sub_category,
            "colors": colors[:3],
            "sizes": sizes[:5],
        })
    return json.dumps(catalog, ensure_ascii=False, indent=2)


def get_system_prompt() -> str:
    """System prompt for AI Fit Assistant."""
    return """You are an expert AI Fit & Style Assistant for a premium fashion e-commerce website.

=== YOUR ROLE ===
You help users find the perfect outfit based on their:
- Body measurements and shape
- Size preferences and fit issues
- Style aesthetic and occasion
- Color preferences and budget

=== USER PROFILE ===
The user will provide details about:
- gender, height_cm, weight_kg, body_shape
- usual_size, fit_pain_points (things that usually don't fit well)
- fit_preference (Slim/Regular/Oversized/Relaxed)
- style_aesthetic (Minimal/Elegant/Streetwear/Sporty/Modest)
- main_occasion (Work/Casual/Party/Interview/Wedding/Date)
- budget range, favorite_colors, avoid_colors

=== PRODUCT CATALOG ===
You will be given a PRODUCT_CATALOG with real products from our store.
ONLY recommend products that exist in the catalog - never invent IDs.

=== RESPONSE FORMAT ===
You MUST respond with valid JSON:
{
  "summary": "A warm, personalized 2-3 sentence summary addressing the user's needs and body type",
  "fit_tips": [
    "Specific tip based on their body shape/pain points",
    "Tip about colors that suit them",
    "Tip about the occasion they mentioned",
    "Any other relevant styling advice"
  ],
  "recommendations": [
    {"product_id": "actual_id", "reason": "Why this fits their body/style/occasion"},
    ...
  ]
}

=== RULES ===
1. Give 4-8 product recommendations maximum
2. Each recommendation must have a personalized "reason" explaining WHY it suits this specific user
3. Consider their fit_pain_points when recommending - avoid items that might cause the same issues
4. Match colors to their favorite_colors and avoid their avoid_colors
5. Keep the tone warm, encouraging, and body-positive
6. fit_tips should be specific and actionable, not generic
7. If body_shape is provided, give tips specific to that shape
"""


def parse_ai_response(response_text: str) -> dict:
    """Parse JSON response from Gemini."""
    try:
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except:
        return {
            "summary": response_text[:300] if response_text else "We've selected some great options for you!",
            "fit_tips": ["Choose pieces that make you feel confident", "Experiment with different styles"],
            "recommendations": []
        }


def get_fallback_response(products: List[Product]) -> FitAssistantResponse:
    """Generate fallback response when AI is unavailable."""
    product_list = []
    for p in products[:6]:
        images = parse_json_list(p.images)
        product_list.append(FitAssistantProduct(
            id=p.id,
            name=p.name,
            short_name=make_short_name(p.name),
            price=p.price,
            sale_price=p.sale_price,
            category=p.category,
            image=images[0] if images else "",
            reason="Highly rated and versatile piece"
        ))
    
    return FitAssistantResponse(
        summary="Here are some highly-rated pieces that we think you'll love! These versatile items can work for various occasions and styles.",
        fit_tips=[
            "Choose pieces that make you feel confident and comfortable",
            "Don't be afraid to experiment with different styles",
            "Consider the occasion when selecting your outfit",
            "Accessories can transform a simple outfit into something special"
        ],
        products=product_list
    )


# ============ Endpoint ============

@router.post("/recommend", response_model=FitAssistantResponse)
async def get_fit_recommendations(
    request: FitAssistantRequest,
    db: Session = Depends(get_db)
):
    """
    Get personalized outfit recommendations based on body measurements and style preferences.
    Uses Gemini AI to analyze user profile and match with catalog products.
    """
    # Get candidate products
    products = get_candidate_products(db, request, limit=50)
    
    if not products:
        return FitAssistantResponse(
            summary="We couldn't find products matching your criteria. Try adjusting your budget or preferences.",
            fit_tips=["Try expanding your budget range", "Consider different style options"],
            products=[]
        )
    
    # If no API key, return fallback
    if not GEMINI_API_KEY:
        return get_fallback_response(products)
    
    try:
        # ============ CONFLICT RESOLUTION ============
        # Step 1: Apply body shape rules (may filter products and add tips)
        products, body_shape_tips = apply_body_shape_rules(products, request)
        
        # Step 2: Apply fit issues filtering (re-ranks products and adds tips)
        products, fit_issue_tips = apply_fit_issues_filtering(products, request)
        
        # Combine all override tips
        conflict_resolution_tips = body_shape_tips + fit_issue_tips
        print(f"🧠 Conflict Resolution: {len(conflict_resolution_tips)} tips generated")
        
        # ============ BUILD CATALOG ============
        # Build catalog JSON (with pre-filtered/ranked products)
        catalog_json = build_product_catalog(products)
        
        # Build user profile JSON
        user_profile = {
            "gender": request.gender,
            "height_cm": request.height_cm,
            "weight_kg": request.weight_kg,
            "body_shape": request.body_shape,
            "usual_size": request.usual_size,
            "fit_pain_points": request.fit_pain_points,
            "fit_preference": request.fit_preference,
            "style_aesthetic": request.style_aesthetic,
            "main_occasion": request.main_occasion,
            "budget_range": f"${request.budget_min or 0} - ${request.budget_max or 'unlimited'}",
            "favorite_colors": request.favorite_colors,
            "avoid_colors": request.avoid_colors,
        }
        user_profile_json = json.dumps(user_profile, ensure_ascii=False, indent=2)
        
        # Build prompt
        system_prompt = get_system_prompt()
        user_prompt = f"""
=== USER_PROFILE ===
{user_profile_json}

=== PRODUCT_CATALOG ===
{catalog_json}

Please analyze this user's profile and recommend the best fitting products from the catalog.
Remember to give specific, personalized advice based on their body shape and fit issues.
Respond with the JSON format specified in the system prompt.
"""
        
        # Call Gemini
        model = genai.GenerativeModel(
            'gemini-2.0-flash',
            system_instruction=system_prompt
        )
        response = model.generate_content(user_prompt)
        ai_data = parse_ai_response(response.text)
        
        # Map product IDs to full product info
        product_map = {p.id: p for p in products}
        recommended_products = []
        
        for rec in ai_data.get("recommendations", []):
            product_id = rec.get("product_id")
            if product_id and product_id in product_map:
                p = product_map[product_id]
                images = parse_json_list(p.images)
                recommended_products.append(FitAssistantProduct(
                    id=p.id,
                    name=p.name,
                    short_name=make_short_name(p.name),
                    price=p.price,
                    sale_price=p.sale_price,
                    category=p.category,
                    image=images[0] if images else "",
                    reason=rec.get("reason", "Great choice for your style")
                ))
        
        # If no matches found, use fallback products
        if not recommended_products:
            return get_fallback_response(products)
        
        # Merge conflict resolution tips at the START of fit_tips
        ai_fit_tips = ai_data.get("fit_tips", ["Choose pieces that make you feel confident"])
        final_fit_tips = conflict_resolution_tips + ai_fit_tips  # Override tips first!
        
        return FitAssistantResponse(
            summary=ai_data.get("summary", "Here are your personalized recommendations!"),
            fit_tips=final_fit_tips,
            products=recommended_products
        )
        
    except Exception as e:
        print(f"Fit Assistant error: {e}")
        import traceback
        traceback.print_exc()
        return get_fallback_response(products)

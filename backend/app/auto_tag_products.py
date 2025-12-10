"""
Product Auto-Tagging Script
Uses Gemini AI to analyze products and assign style/occasion tags
Run with: python -m app.auto_tag_products
"""
import os
import json
import time
from sqlalchemy.orm import Session
from app.database import engine, get_db
from app.models import Product
import google.generativeai as genai

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Predefined tag categories
STYLE_TAGS = ["casual", "formal", "sporty", "elegant", "bohemian", "classic", "trendy", "minimal", "streetwear"]
OCCASION_TAGS = ["work", "party", "wedding", "daily", "date", "vacation", "gym", "lounge", "special_event"]


def get_tags_from_ai(product_name: str, product_description: str, category: str, sub_category: str) -> dict:
    """Use Gemini to analyze product and return appropriate tags"""
    
    if not GEMINI_API_KEY:
        # Fallback to rule-based tagging if no API key
        return get_tags_rule_based(product_name, category, sub_category)
    
    prompt = f"""Analyze this fashion product and assign appropriate tags.

Product Details:
- Name: {product_name}
- Category: {category}
- Sub-category: {sub_category or 'N/A'}
- Description: {product_description[:300] if product_description else 'N/A'}

Available Style Tags: {STYLE_TAGS}
Available Occasion Tags: {OCCASION_TAGS}

Respond with ONLY a valid JSON object in this exact format:
{{"style_tags": ["tag1", "tag2"], "occasion_tags": ["tag1", "tag2"]}}

Rules:
- Choose 1-3 most relevant tags from each category
- Be accurate - a formal suit should NOT have "casual"
- Bags/accessories can have multiple occasions
- If unsure, choose the most likely tags based on the product name
"""
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Extract JSON
        json_start = text.find('{')
        json_end = text.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            json_text = text[json_start:json_end]
            data = json.loads(json_text)
            
            # Validate tags
            style = [t for t in data.get("style_tags", []) if t in STYLE_TAGS]
            occasion = [t for t in data.get("occasion_tags", []) if t in OCCASION_TAGS]
            
            return {
                "style_tags": style if style else ["casual"],
                "occasion_tags": occasion if occasion else ["daily"]
            }
    except Exception as e:
        print(f"AI tagging failed for {product_name[:30]}: {e}")
    
    # Fallback to rule-based
    return get_tags_rule_based(product_name, category, sub_category)


def get_tags_rule_based(product_name: str, category: str, sub_category: str) -> dict:
    """Rule-based tagging as fallback"""
    name_lower = (product_name or "").lower()
    cat_lower = (category or "").lower()
    sub_lower = (sub_category or "").lower()
    combined = f"{name_lower} {cat_lower} {sub_lower}"
    
    style_tags = []
    occasion_tags = []
    
    # Style detection
    if any(w in combined for w in ["formal", "suit", "blazer", "tuxedo", "wedding"]):
        style_tags.append("formal")
        style_tags.append("elegant")
    elif any(w in combined for w in ["casual", "jeans", "t-shirt", "tee", "hoodie"]):
        style_tags.append("casual")
    elif any(w in combined for w in ["sport", "athletic", "gym", "yoga", "running"]):
        style_tags.append("sporty")
    elif any(w in combined for w in ["elegant", "evening", "gown", "cocktail"]):
        style_tags.append("elegant")
    else:
        style_tags.append("casual")  # Default
    
    # Add classic for timeless pieces
    if any(w in combined for w in ["classic", "oxford", "trench", "polo"]):
        style_tags.append("classic")
    
    # Occasion detection
    if any(w in combined for w in ["wedding", "bridal", "groom"]):
        occasion_tags.append("wedding")
        occasion_tags.append("special_event")
    elif any(w in combined for w in ["party", "cocktail", "evening", "night"]):
        occasion_tags.append("party")
    elif any(w in combined for w in ["office", "work", "business", "professional"]):
        occasion_tags.append("work")
    elif any(w in combined for w in ["gym", "sport", "workout", "yoga"]):
        occasion_tags.append("gym")
    elif any(w in combined for w in ["beach", "vacation", "summer", "resort"]):
        occasion_tags.append("vacation")
    elif any(w in combined for w in ["lounge", "sleep", "home", "pajama"]):
        occasion_tags.append("lounge")
    else:
        occasion_tags.append("daily")  # Default
    
    # Bags and accessories are versatile
    if any(w in combined for w in ["bag", "handbag", "tote", "backpack"]):
        if "daily" not in occasion_tags:
            occasion_tags.append("daily")
        if "work" not in occasion_tags and "formal" not in style_tags:
            occasion_tags.append("work")
    
    return {
        "style_tags": list(set(style_tags))[:3],
        "occasion_tags": list(set(occasion_tags))[:3]
    }


def tag_all_products(use_ai: bool = True, batch_size: int = 10):
    """Tag all products in the database"""
    
    db = next(get_db())
    
    try:
        # Get products without tags
        products = db.query(Product).filter(
            (Product.style_tags == None) | (Product.occasion_tags == None)
        ).all()
        
        if not products:
            print("✅ All products already have tags!")
            return
        
        print(f"📦 Found {len(products)} products to tag...")
        
        tagged_count = 0
        for i, product in enumerate(products):
            try:
                if use_ai and GEMINI_API_KEY:
                    tags = get_tags_from_ai(
                        product.name,
                        product.description,
                        product.category,
                        product.sub_category
                    )
                    # Rate limiting for API
                    if (i + 1) % batch_size == 0:
                        print(f"  Processed {i + 1}/{len(products)} products...")
                        time.sleep(1)  # Avoid rate limits
                else:
                    tags = get_tags_rule_based(
                        product.name,
                        product.category,
                        product.sub_category
                    )
                
                # Update product
                product.style_tags = json.dumps(tags["style_tags"])
                product.occasion_tags = json.dumps(tags["occasion_tags"])
                tagged_count += 1
                
            except Exception as e:
                print(f"❌ Error tagging product {product.id}: {e}")
                # Use fallback
                fallback = get_tags_rule_based(product.name, product.category, product.sub_category)
                product.style_tags = json.dumps(fallback["style_tags"])
                product.occasion_tags = json.dumps(fallback["occasion_tags"])
                tagged_count += 1
        
        db.commit()
        print(f"✅ Successfully tagged {tagged_count} products!")
        
    except Exception as e:
        print(f"❌ Error in tagging process: {e}")
        db.rollback()
    finally:
        db.close()


def show_sample_tags(limit: int = 10):
    """Show sample of tagged products"""
    db = next(get_db())
    
    products = db.query(Product).filter(
        Product.style_tags != None
    ).limit(limit).all()
    
    print(f"\n📋 Sample of {len(products)} tagged products:")
    print("-" * 60)
    
    for p in products:
        style = json.loads(p.style_tags) if p.style_tags else []
        occasion = json.loads(p.occasion_tags) if p.occasion_tags else []
        print(f"• {p.name[:40]}")
        print(f"  Style: {style}")
        print(f"  Occasion: {occasion}")
        print()
    
    db.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--show":
        show_sample_tags()
    else:
        print("🏷️  Product Auto-Tagging Script")
        print("=" * 40)
        
        use_ai = GEMINI_API_KEY is not None
        if use_ai:
            print("✅ Using Gemini AI for intelligent tagging")
        else:
            print("⚠️ GEMINI_API_KEY not set, using rule-based tagging")
        
        tag_all_products(use_ai=use_ai)
        show_sample_tags(5)

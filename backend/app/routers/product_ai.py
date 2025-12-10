"""
AI Product Assistant Router
Helps admins generate professional product data from any input (clean or messy, Arabic or English)
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import re

import google.generativeai as genai


router = APIRouter()


# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


# ============ Pydantic Models ============

class ProductAIGenerateRequest(BaseModel):
    raw_name: str
    raw_description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    colors: Optional[List[str]] = None
    sizes: Optional[List[str]] = None


class ProductAIGenerateResponse(BaseModel):
    name: str
    short_name: str
    description: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    colors: List[str] = []
    sizes: List[str] = []
    tags: List[str] = []
    notes: Optional[str] = None
    error: Optional[str] = None


# ============ System Prompt ============

SYSTEM_PROMPT = """You are an e-commerce product data assistant for a fashion store.
You receive partially filled product info (name, description, category, etc.).

Your job is to:
1. CLEAN and professionalize the product name (keep it concise, Title Case, remove spam/brand keywords like SHEIN/ROMWE)
2. Generate a SHORT_NAME: very short version (3-5 words) suitable for product cards
3. Generate a concise MARKETING DESCRIPTION (2-3 short paragraphs, no bullet points, professional tone)
4. Infer a high-level CATEGORY: one of ["women","men","kids","accessories","other"]
5. Infer a more specific SUBCATEGORY: e.g. "bags", "outerwear", "dress", "jeans", "knitwear", "tops", "shoes", "jewelry", "belt", "scarf", "pants", "shirt", "jacket", "sweater", etc.
6. Infer COLORS: array of simple lowercase English color names (e.g. ["navy","camel","black"]). If not mentioned, use []
7. Infer SIZES: ["XS","S","M","L","XL"], or ["One Size"] for accessories/bags, or any appropriate standard sizes. If not mentioned, use sensible defaults
8. Infer 3-6 short TAGS describing style/usage (e.g. "workwear", "smart casual", "evening", "minimal", "streetwear", "casual", "formal")

IMPORTANT RULES:
- If input is already clean, improve lightly but do NOT change meaning
- Handle both Arabic and English input
- Output JSON keys and values in English, EXCEPT description which should match the language of input
- Remove marketplace brand names (SHEIN, ROMWE, AliExpress, etc.) from name
- Do NOT invent features not implied by the input
- If something is unknown, use null or empty array

Return ONLY a single valid JSON object in this exact schema (no markdown, no code fences):
{
  "name": "Professional Product Name",
  "short_name": "Short Name",
  "description": "Marketing description paragraph 1.\\n\\nParagraph 2.\\n\\nParagraph 3.",
  "category": "women|men|kids|accessories|other",
  "subcategory": "bags|dress|shoes|outerwear|...",
  "colors": ["black", "navy"],
  "sizes": ["S", "M", "L", "XL"],
  "tags": ["casual", "workwear", "minimal"],
  "notes": null
}"""


def build_user_prompt(request: ProductAIGenerateRequest) -> str:
    """Build the user prompt with current form data."""
    parts = [f"PRODUCT NAME: {request.raw_name}"]
    
    if request.raw_description:
        parts.append(f"DESCRIPTION: {request.raw_description}")
    
    if request.category:
        parts.append(f"CURRENT CATEGORY: {request.category}")
    
    if request.subcategory:
        parts.append(f"CURRENT SUBCATEGORY: {request.subcategory}")
    
    if request.colors:
        parts.append(f"CURRENT COLORS: {', '.join(request.colors)}")
    
    if request.sizes:
        parts.append(f"CURRENT SIZES: {', '.join(request.sizes)}")
    
    parts.append("\nPlease generate complete product information. Return only valid JSON.")
    
    return "\n".join(parts)


def parse_json_response(text: str) -> dict:
    """Parse JSON from Gemini response with multiple fallback strategies."""
    if not text:
        return None
    
    text = text.strip()
    
    # Remove markdown code fences if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    # Try to find JSON object if response contains extra text
    if not text.startswith("{"):
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            text = match.group()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"AI_PRODUCT_ASSISTANT_ERROR: JSON parse failed: {e}")
        print(f"AI_PRODUCT_ASSISTANT_ERROR: Raw text (first 500): {text[:500]}")
        return None


def create_fallback_response(name: str, error_msg: str) -> ProductAIGenerateResponse:
    """Create minimal fallback response on error."""
    # Basic cleanup
    clean_name = name.strip()
    words = clean_name.split()[:8]
    
    return ProductAIGenerateResponse(
        name=clean_name,
        short_name=" ".join(words[:5]),
        description="",
        category=None,
        subcategory=None,
        colors=[],
        sizes=[],
        tags=[],
        notes=None,
        error=error_msg
    )


# ============ Endpoint ============

@router.post("/generate", response_model=ProductAIGenerateResponse)
async def generate_product_info(request: ProductAIGenerateRequest):
    """
    Generate professional product information from any input.
    Works with clean or messy text, Arabic or English.
    """
    # Validate input
    if not request.raw_name or not request.raw_name.strip():
        return create_fallback_response("", "Please enter a product name first.")
    
    # Check for API key
    if not GEMINI_API_KEY:
        print("AI_PRODUCT_ASSISTANT_ERROR: GEMINI_API_KEY not set")
        return create_fallback_response(request.raw_name, "AI service not configured.")
    
    try:
        # Build prompt
        user_prompt = build_user_prompt(request)
        
        print(f"AI_PRODUCT_ASSISTANT: Processing request for '{request.raw_name[:50]}...'")
        
        # Call Gemini
        model = genai.GenerativeModel(
            'gemini-2.0-flash',
            system_instruction=SYSTEM_PROMPT,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 1024,
            }
        )
        
        response = model.generate_content(user_prompt)
        
        if not response or not response.text:
            print("AI_PRODUCT_ASSISTANT_ERROR: Empty response from Gemini")
            return create_fallback_response(request.raw_name, "AI returned empty response. Try again.")
        
        # Log raw response for debugging
        print(f"AI_PRODUCT_ASSISTANT: Raw response (first 300): {response.text[:300]}")
        
        # Parse JSON
        data = parse_json_response(response.text)
        
        if not data:
            return create_fallback_response(request.raw_name, "Failed to parse AI response.")
        
        # Validate required fields
        if not data.get("name"):
            data["name"] = request.raw_name
        
        if not data.get("short_name"):
            data["short_name"] = " ".join(data["name"].split()[:5])
        
        if not data.get("description"):
            data["description"] = request.raw_description or ""
        
        # Normalize category to lowercase
        category = data.get("category")
        if category:
            category = category.lower()
            if category not in ["women", "men", "kids", "accessories", "other"]:
                category = None
        
        # Normalize subcategory to lowercase
        subcategory = data.get("subcategory")
        if subcategory:
            subcategory = subcategory.lower()
        
        return ProductAIGenerateResponse(
            name=data.get("name", request.raw_name),
            short_name=data.get("short_name", ""),
            description=data.get("description", ""),
            category=category,
            subcategory=subcategory,
            colors=data.get("colors", []),
            sizes=data.get("sizes", []),
            tags=data.get("tags", []),
            notes=data.get("notes"),
            error=None
        )
        
    except Exception as e:
        print(f"AI_PRODUCT_ASSISTANT_ERROR: {e}")
        import traceback
        traceback.print_exc()
        return create_fallback_response(request.raw_name, "AI processing failed. Please try again.")

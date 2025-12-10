"""
Product Data Cleanup Utilities
Provides functions to normalize and clean product data for better display
"""
import re
from typing import Optional


# Sub-category keyword mappings
SUB_CATEGORY_KEYWORDS = {
    'bags': ['bag', 'handbag', 'tote', 'purse', 'backpack', 'satchel', 'clutch', 'crossbody', 'shoulder bag', 'hobo'],
    'shoes': ['shoe', 'sneaker', 'boot', 'sandal', 'heel', 'loafer', 'flat', 'slipper', 'running'],
    'watches': ['watch', 'wristwatch', 'timepiece'],
    'jewelry': ['earring', 'necklace', 'bracelet', 'ring', 'pendant', 'anklet', 'choker', 'bangle'],
    'hats': ['hat', 'cap', 'beanie', 'beret', 'fedora', 'visor'],
    'accessories': ['sunglasses', 'glasses', 'scarf', 'belt', 'gloves', 'keychain', 'wallet'],
    'hair_accessories': ['hair clip', 'hair claw', 'headband', 'hair bow', 'hair band', 'barrette', 'scrunchie'],
    'clothing': ['t-shirt', 'dress', 'shirt', 'blouse', 'pants', 'jeans', 'skirt', 'jacket', 'coat', 'sweater'],
    'socks': ['sock', 'stockings', 'tights'],
}


def normalize_sub_category(name: str, current_sub_category: Optional[str], category: str) -> str:
    """
    Normalize sub_category based on product name keywords.
    
    Args:
        name: Product name to analyze
        current_sub_category: Current sub_category value from database
        category: Main category (women, men, kids, accessories)
    
    Returns:
        Normalized sub_category string
    """
    name_lower = name.lower()
    
    # Check each sub-category's keywords
    for sub_cat, keywords in SUB_CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in name_lower:
                return sub_cat
    
    # If no match found, keep current or use 'other'
    if current_sub_category and current_sub_category not in ['t-shirt', 'etc', 'underwear']:
        return current_sub_category
    
    return 'other'


# Patterns to remove from product names
NAME_CLEANUP_PATTERNS = [
    r'\s*\([^)]*\)\s*',  # Remove text in parentheses
    r'\s*\[[^\]]*\]\s*',  # Remove text in brackets
    r'(?:For|for)\s+(?:Women|Men|Girls|Boys|Kids|Unisex|Teen|Daily|Casual|Travel|School|College|Work|Business|Outdoor|Sports|Party|Holiday|Halloween|Christmas)',
    r'(?:Suitable|Perfect|Great|Ideal)\s+(?:For|for)\s+[^,]+',
    r'(?:Free Returns|Free Shipping)[^.]*',
    r'\bSHEIN\b[^.]*',
    r'\bBack To School\b',
    r'\bLarge Capacity\b',
    r'\bFashionable\b',
    r'\bMultifunctional\b',
    r'\bVersatile\b',
    r'\bLightweight\b',
    r'\bPortable\b',
    r'\bSimple\b',
    r'\bNew Arrival\b',
    r'\bNew Season\b',
    r'\bNew Spring\b',
    r'\bNew Summer\b',
    r'\bNew Fashion\b',
    r'\bTrendy\b',
    r'\s+at SHEIN\.',
    r'\s+-\s+Women\s+[^-]+$',
    r'\s+-\s+Men\s+[^-]+$',
]


def make_short_name(name: str, max_words: int = 6) -> str:
    """
    Generate a clean, short product name for display.
    
    Args:
        name: Original product name
        max_words: Maximum number of words to keep
    
    Returns:
        Clean, shortened product name
    """
    if not name:
        return ""
    
    clean_name = name
    
    # Apply cleanup patterns
    for pattern in NAME_CLEANUP_PATTERNS:
        clean_name = re.sub(pattern, ' ', clean_name, flags=re.IGNORECASE)
    
    # Remove multiple spaces
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    
    # Remove leading numbers/sizes if present
    clean_name = re.sub(r'^[\d]+\s*(?:pcs?|pairs?|sets?|pieces?)\s*', '', clean_name, flags=re.IGNORECASE)
    
    # Split into words and take first `max_words`
    words = clean_name.split()
    if len(words) > max_words:
        clean_name = ' '.join(words[:max_words])
    
    # Capitalize first letter of each word (title case)
    clean_name = clean_name.title()
    
    # Ensure we have something meaningful
    if len(clean_name) < 3:
        # Fall back to first part of original name
        return name.split(',')[0][:50].strip()
    
    return clean_name


def make_short_description(description: Optional[str], name: str, max_chars: int = 100) -> str:
    """
    Generate a clean, short description for product cards.
    
    Args:
        description: Original description (may be None)
        name: Product name as fallback
        max_chars: Maximum characters to return
    
    Returns:
        Clean, shortened description
    """
    text = description or name
    
    if not text:
        return ""
    
    # Remove promotional prefixes
    text = re.sub(r'^Free Returns\s*[✓✔]\s*Free Shipping\s*[✓✔]\.\s*', '', text, flags=re.IGNORECASE)
    
    # Remove "at SHEIN" suffix
    text = re.sub(r'\s*-\s*\w+\s+(?:at|from)\s+SHEIN\.$', '', text, flags=re.IGNORECASE)
    
    # Clean up multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Truncate to max_chars
    if len(text) > max_chars:
        # Try to break at word boundary
        truncated = text[:max_chars]
        last_space = truncated.rfind(' ')
        if last_space > max_chars * 0.7:
            truncated = truncated[:last_space]
        text = truncated.strip() + '...'
    
    return text


def clean_product_data(product_dict: dict) -> dict:
    """
    Apply all data cleanup transformations to a product dictionary.
    Adds short_name, short_description, and normalized_sub_category.
    
    Args:
        product_dict: Dictionary with product data
    
    Returns:
        Enhanced product dictionary with clean fields
    """
    name = product_dict.get('name', '')
    description = product_dict.get('description')
    category = product_dict.get('category', '')
    sub_category = product_dict.get('sub_category') or product_dict.get('subcategory')
    
    # Add cleaned fields
    product_dict['short_name'] = make_short_name(name)
    product_dict['short_description'] = make_short_description(description, name)
    product_dict['normalized_sub_category'] = normalize_sub_category(name, sub_category, category)
    
    return product_dict

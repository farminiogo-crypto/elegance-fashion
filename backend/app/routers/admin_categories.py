"""
Admin Categories Router
Manages category information - get summary with product counts
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Product, Category


router = APIRouter()


# ============ Pydantic Models ============

class CategorySummary(BaseModel):
    id: Optional[int] = None  # None since categories are derived from products
    name: str
    slug: str
    product_count: int


# ============ Constants ============

# Predefined categories with display names
CATEGORY_DISPLAY_NAMES = {
    "women": "Women",
    "men": "Men",
    "kids": "Kids",
    "accessories": "Accessories",
    "new-arrivals": "New Arrivals",
    "sale": "Sale",
    "other": "Other"
}


# ============ Endpoints ============

@router.get("/summary", response_model=List[CategorySummary])
async def get_categories_summary(db: Session = Depends(get_db)):
    """
    Get all categories with product counts.
    Categories are derived from the Product.category field.
    """
    # Query distinct categories with counts
    category_counts = db.query(
        Product.category,
        func.count(Product.id).label('count')
    ).group_by(Product.category).all()
    
    # Build response with proper display names
    categories = []
    
    for category, count in category_counts:
        if category:
            slug = category.lower().strip()
            display_name = CATEGORY_DISPLAY_NAMES.get(slug, category.title())
            
            categories.append(CategorySummary(
                id=None,
                name=display_name,
                slug=slug,
                product_count=count
            ))
    
    # Sort by product count (descending)
    categories.sort(key=lambda c: c.product_count, reverse=True)
    
    return categories


@router.get("/subcategories", response_model=List[CategorySummary])
async def get_subcategories_summary(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all subcategories with product counts.
    Optionally filter by parent category.
    """
    query = db.query(
        Product.sub_category,
        func.count(Product.id).label('count')
    )
    
    if category:
        query = query.filter(Product.category == category)
    
    subcategory_counts = query.filter(
        Product.sub_category.isnot(None),
        Product.sub_category != ""
    ).group_by(Product.sub_category).all()
    
    subcategories = []
    
    for sub_category, count in subcategory_counts:
        if sub_category:
            slug = sub_category.lower().strip()
            display_name = sub_category.title().replace("_", " ").replace("-", " ")
            
            subcategories.append(CategorySummary(
                id=None,
                name=display_name,
                slug=slug,
                product_count=count
            ))
    
    # Sort by product count (descending)
    subcategories.sort(key=lambda c: c.product_count, reverse=True)
    
    return subcategories


# ============ Category Creation ============

class CategoryCreate(BaseModel):
    name: str
    slug: str


class CategoryCreateResponse(BaseModel):
    id: Optional[int] = None
    name: str
    slug: str
    product_count: int = 0
    message: str


# Categories are now stored in the database via the Category model


@router.post("", response_model=CategoryCreateResponse)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new category and persist it in the database.
    """
    slug_lower = category.slug.lower().strip()
    
    # Check if category already exists in products
    existing_product = db.query(Product.category).filter(
        func.lower(Product.category) == slug_lower
    ).first()
    
    if existing_product:
        count = db.query(func.count(Product.id)).filter(
            func.lower(Product.category) == slug_lower
        ).scalar()
        
        return CategoryCreateResponse(
            id=None,
            name=category.name,
            slug=slug_lower,
            product_count=count or 0,
            message=f"Category '{category.name}' already exists with {count} products"
        )
    
    # Check if already exists in categories table
    existing_category = db.query(Category).filter(
        func.lower(Category.slug) == slug_lower
    ).first()
    
    if existing_category:
        return CategoryCreateResponse(
            id=existing_category.id,
            name=existing_category.name,
            slug=existing_category.slug,
            product_count=0,
            message=f"Category '{existing_category.name}' already exists"
        )
    
    # Create new category in database
    new_category = Category(
        name=category.name.strip(),
        slug=slug_lower
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    # Also add to the display names for future lookups
    CATEGORY_DISPLAY_NAMES[slug_lower] = category.name
    
    return CategoryCreateResponse(
        id=new_category.id,
        name=new_category.name,
        slug=new_category.slug,
        product_count=0,
        message=f"Category '{new_category.name}' created successfully"
    )


class CategoryDeleteResponse(BaseModel):
    success: bool
    slug: str
    message: str


@router.delete("/{slug}", response_model=CategoryDeleteResponse)
async def delete_category(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Delete a category by slug from the database.
    - If the category has products, return 400 with a clear message.
    - If not found, return 404.
    """
    slug_lower = slug.lower()
    
    # Check if category has products - block deletion if so
    product_count = db.query(func.count(Product.id)).filter(
        func.lower(Product.category) == slug_lower
    ).scalar()
    
    if product_count and product_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{slug}' - it still has {product_count} products. Please move or delete those products first."
        )
    
    # Find category in database
    category = db.query(Category).filter(
        func.lower(Category.slug) == slug_lower
    ).first()
    
    if category:
        category_name = category.name
        db.delete(category)
        db.commit()
        
        # Remove from display names if present
        if slug_lower in CATEGORY_DISPLAY_NAMES:
            del CATEGORY_DISPLAY_NAMES[slug_lower]
        
        return CategoryDeleteResponse(
            success=True,
            slug=slug_lower,
            message=f"Category '{category_name}' deleted successfully"
        )
    
    raise HTTPException(
        status_code=404,
        detail=f"Category '{slug}' not found"
    )

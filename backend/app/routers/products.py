from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, cast, String
from typing import List, Optional
from app.database import get_db
from app.models import Product, User, UserInteraction, CartItem, OrderItem, WishlistItem
from app.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.dependencies import get_current_user, get_current_admin_user
from app.data_cleanup import make_short_name, make_short_description, normalize_sub_category


router = APIRouter()


def enrich_product(product: Product) -> dict:
    """
    Convert Product model to dict with enriched clean display fields.
    """
    # Get base product data
    product_dict = {
        'id': product.id,
        'name': product.name,
        'price': product.price,
        'sale_price': product.sale_price,
        'category': product.category,
        'subcategory': product.sub_category,
        'images': product.images or [],
        'colors': product.colors or [],
        'sizes': product.sizes or [],
        'description': product.description,
        'featured': product.featured or False,
        'rating': product.rating or 0.0,
        'reviews': product.reviews or 0,
        'stock': product.stock or 0,  # Include stock for admin dashboard
        'created_at': product.created_at,
        'updated_at': product.updated_at,
        # Add computed clean fields
        'short_name': make_short_name(product.name),
        'short_description': make_short_description(product.description, product.name),
        'normalized_sub_category': normalize_sub_category(
            product.name, product.sub_category, product.category
        ),
    }
    return product_dict



@router.get("/", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),  # Increased limit to 10000 to show all products
    db: Session = Depends(get_db)
):
    """Get all products with optional filtering"""
    try:
        query = db.query(Product)
        
        if category:
            query = query.filter(Product.category == category)
        if featured is not None:
            query = query.filter(Product.featured == featured)
        
        # If no limit specified or limit is very high, get all products
        if limit >= 1000:
            products = query.offset(skip).all()
        else:
            products = query.offset(skip).limit(limit).all()
        
        # Enrich products with clean display fields
        return [enrich_product(p) for p in products]
    except Exception as e:
        # Return empty list if database error (e.g., tables don't exist)
        print(f"Error fetching products: {e}")
        return []



@router.get("/search", response_model=List[ProductResponse])
async def search_products(
    q: Optional[str] = Query(None, min_length=1, description="Search query for name/description"),
    category: Optional[str] = Query(None, description="Filter by category (women, men, accessories, kids)"),
    sub_category: Optional[str] = Query(None, description="Filter by sub-category (bags, shoes, etc.)"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    color: Optional[str] = Query(None, description="Filter by color"),
    size: Optional[str] = Query(None, description="Filter by size"),
    featured: Optional[bool] = Query(None, description="Filter by featured status"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return"),
    db: Session = Depends(get_db)
):
    """
    Full-text search for products with multiple filters.
    
    - **q**: Search query (searches in name and description)
    - **category**: Main category filter
    - **sub_category**: Sub-category filter
    - **min_price/max_price**: Price range filter
    - **color**: Color filter (searches in JSON colors array)
    - **size**: Size filter (searches in JSON sizes array)
    - **featured**: Featured products only
    """
    try:
        query = db.query(Product)
        
        # Text search in name, description, and sub_category
        if q:
            search_term = f"%{q.lower()}%"
            query = query.filter(
                or_(
                    func.lower(Product.name).like(search_term),
                    func.lower(Product.description).like(search_term),
                    func.lower(Product.sub_category).like(search_term)
                )
            )

        
        # Category filters
        if category:
            query = query.filter(func.lower(Product.category) == category.lower())
        if sub_category:
            query = query.filter(func.lower(Product.sub_category) == sub_category.lower())
        
        # Price range filter
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        if max_price is not None:
            query = query.filter(Product.price <= max_price)
        
        # Featured filter
        if featured is not None:
            query = query.filter(Product.featured == featured)
        
        # Get results
        products = query.limit(limit).all()
        
        # Post-filter for color and size (JSON fields)
        if color:
            color_lower = color.lower()
            products = [
                p for p in products
                if p.colors and any(color_lower in c.lower() for c in p.colors)
            ]
        
        if size:
            size_lower = size.lower()
            products = [
                p for p in products
                if p.sizes and any(size_lower == s.lower() for s in p.sizes)
            ]
        
        # Enrich products with clean display fields
        return [enrich_product(p) for p in products[:limit]]
        
    except Exception as e:
        print(f"Error searching products: {e}")
        return []


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get a single product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    # Return enriched product with clean display fields
    return enrich_product(product)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new product (Admin only) with auto-tagging"""
    # Check if product ID already exists
    if product.id:
        existing = db.query(Product).filter(Product.id == product.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this ID already exists"
            )
    
    # Generate ID if not provided
    product_id = product.id or f"PROD-{int(__import__('time').time() * 1000)}"
    
    # Auto-generate tags (fail-safe: if AI fails, continue with empty tags)
    style_tags = None
    occasion_tags = None
    try:
        from app.auto_tag_products import get_tags_from_ai, get_tags_rule_based
        tags = get_tags_from_ai(
            product.name,
            product.description or "",
            product.category,
            ""  # sub_category
        )
        style_tags = tags.get("style_tags", [])
        occasion_tags = tags.get("occasion_tags", [])
        print(f"✅ Auto-tagged new product: style={style_tags}, occasion={occasion_tags}")
    except Exception as e:
        print(f"⚠️ Auto-tagging failed (product will be saved anyway): {e}")
        # Use rule-based as fallback
        try:
            from app.auto_tag_products import get_tags_rule_based
            tags = get_tags_rule_based(product.name, product.category, "")
            style_tags = tags.get("style_tags", [])
            occasion_tags = tags.get("occasion_tags", [])
        except:
            pass
    
    import json
    new_product = Product(
        id=product_id,
        name=product.name,
        price=product.price,
        sale_price=product.sale_price,
        category=product.category,
        images=product.images,
        colors=product.colors,
        sizes=product.sizes,
        description=product.description,
        featured=product.featured,
        rating=product.rating,
        reviews=product.reviews,
        style_tags=json.dumps(style_tags) if style_tags else None,
        occasion_tags=json.dumps(occasion_tags) if occasion_tags else None
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    return enrich_product(new_product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a product (Admin only) - re-tags if name/category changed"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if name or category changed (triggers re-tagging)
    update_data = product_update.dict(exclude_unset=True)
    needs_retag = 'name' in update_data or 'category' in update_data
    
    # Update provided fields
    for field, value in update_data.items():
        setattr(product, field, value)
    
    # Auto re-tag if name/category changed (fail-safe)
    if needs_retag:
        try:
            import json
            from app.auto_tag_products import get_tags_from_ai, get_tags_rule_based
            tags = get_tags_from_ai(
                product.name,
                product.description or "",
                product.category,
                product.sub_category or ""
            )
            product.style_tags = json.dumps(tags.get("style_tags", []))
            product.occasion_tags = json.dumps(tags.get("occasion_tags", []))
            print(f"✅ Re-tagged product {product_id}")
        except Exception as e:
            print(f"⚠️ Re-tagging failed: {e}")
            # Try rule-based
            try:
                from app.auto_tag_products import get_tags_rule_based
                tags = get_tags_rule_based(product.name, product.category, product.sub_category or "")
                product.style_tags = json.dumps(tags.get("style_tags", []))
                product.occasion_tags = json.dumps(tags.get("occasion_tags", []))
            except:
                pass
    
    db.commit()
    db.refresh(product)
    
    return enrich_product(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a product (Admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Delete related records first to avoid foreign key constraint errors
    db.query(UserInteraction).filter(UserInteraction.product_id == product_id).delete()
    db.query(CartItem).filter(CartItem.product_id == product_id).delete()
    db.query(WishlistItem).filter(WishlistItem.product_id == product_id).delete()
    # Note: OrderItems are preserved for order history - they reference product_id but 
    # we keep them with a nullable product reference
    
    db.delete(product)
    db.commit()
    
    return None


@router.post("/{product_id}/regenerate-tags", response_model=ProductResponse)
async def regenerate_tags(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Manually regenerate style/occasion tags for a product (Admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    try:
        import json
        from app.auto_tag_products import get_tags_from_ai, get_tags_rule_based
        
        # Try AI tagging first
        tags = get_tags_from_ai(
            product.name,
            product.description or "",
            product.category,
            product.sub_category or ""
        )
        
        product.style_tags = json.dumps(tags.get("style_tags", []))
        product.occasion_tags = json.dumps(tags.get("occasion_tags", []))
        
        db.commit()
        db.refresh(product)
        
        print(f"✅ Regenerated tags for {product_id}: style={tags.get('style_tags')}, occasion={tags.get('occasion_tags')}")
        
        return enrich_product(product)
        
    except Exception as e:
        print(f"❌ Tag regeneration failed: {e}")
        # Try rule-based fallback
        try:
            import json
            from app.auto_tag_products import get_tags_rule_based
            tags = get_tags_rule_based(product.name, product.category, product.sub_category or "")
            product.style_tags = json.dumps(tags.get("style_tags", []))
            product.occasion_tags = json.dumps(tags.get("occasion_tags", []))
            db.commit()
            db.refresh(product)
            return enrich_product(product)
        except:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to regenerate tags"
            )



"""
Admin Inventory Router
Manages product inventory - list products with stock info and restock functionality
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Product


router = APIRouter()


# ============ Pydantic Models ============

class InventoryItem(BaseModel):
    id: str
    name: str
    sku: str
    stock: int
    status: str  # "in_stock", "low_stock", "out_of_stock"
    image: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryListResponse(BaseModel):
    items: List[InventoryItem]
    total: int
    page: int
    page_size: int


class RestockRequest(BaseModel):
    amount: int


class RestockResponse(BaseModel):
    id: str
    name: str
    sku: str
    stock: int
    status: str
    message: str


# ============ Helper Functions ============

def get_stock_status(stock: int) -> str:
    """Determine stock status based on quantity."""
    if stock <= 0:
        return "out_of_stock"
    elif stock <= 5:
        return "low_stock"
    else:
        return "in_stock"


def product_to_inventory_item(product: Product) -> InventoryItem:
    """Convert a Product model to an InventoryItem."""
    stock = product.stock or 0
    images = product.images or []
    
    return InventoryItem(
        id=product.id,
        name=product.name,
        sku=f"SKU-{product.id}",
        stock=stock,
        status=get_stock_status(stock),
        image=images[0] if images else None
    )


# ============ Endpoints ============

@router.get("", response_model=InventoryListResponse)
async def get_inventory(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by product name"),
    status: Optional[str] = Query(None, description="Filter by status: in_stock, low_stock, out_of_stock"),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of products with inventory information.
    """
    query = db.query(Product)
    
    # Apply search filter
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    
    try:
        # Get total count
        total = query.count()
        
        # Apply pagination (no ORDER BY to avoid Railway memory issues)
        offset = (page - 1) * page_size
        products = query.offset(offset).limit(page_size).all()
        
        # Convert to inventory items
        items = [product_to_inventory_item(p) for p in products]
        
        # Apply status filter after conversion (since status is computed)
        if status:
            items = [item for item in items if item.status == status]
            total = len(items)  # Adjust total for filtered results
        
        return InventoryListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        print(f"Inventory error: {e}")
        # Return empty but valid response on error
        return InventoryListResponse(
            items=[],
            total=0,
            page=page,
            page_size=page_size
        )


@router.post("/{product_id}/restock", response_model=RestockResponse)
async def restock_product(
    product_id: str,
    request: RestockRequest,
    db: Session = Depends(get_db)
):
    """
    Restock a product by adding to its current stock.
    """
    # Validate amount
    if request.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Restock amount must be greater than 0"
        )
    
    # Find the product
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product with ID '{product_id}' not found"
        )
    
    # Update stock
    current_stock = product.stock or 0
    new_stock = current_stock + request.amount
    product.stock = new_stock
    
    db.commit()
    db.refresh(product)
    
    return RestockResponse(
        id=product.id,
        name=product.name,
        sku=f"SKU-{product.id}",
        stock=new_stock,
        status=get_stock_status(new_stock),
        message=f"Successfully added {request.amount} units. New stock: {new_stock}"
    )


@router.get("/low-stock", response_model=List[InventoryItem])
async def get_low_stock_products(
    threshold: int = Query(5, ge=0, description="Stock threshold for low stock"),
    limit: int = Query(10, ge=1, le=50, description="Maximum items to return"),
    db: Session = Depends(get_db)
):
    """
    Get products with low stock (stock <= threshold).
    """
    try:
        products = db.query(Product).filter(
            Product.stock <= threshold
        ).limit(limit).all()
        return [product_to_inventory_item(p) for p in products]
    except Exception as e:
        print(f"Low stock error: {e}")
        return []

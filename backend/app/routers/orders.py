from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Order, OrderItem, User, Product
from app.schemas import OrderCreate, OrderResponse, OrderStatusUpdate, OrderItemResponse
from app.dependencies import get_current_user, get_current_admin_user

router = APIRouter()


@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status")
):
    """Get orders for current user (or all orders if admin)"""
    query = db.query(Order)
    
    # Non-admin users can only see their own orders
    if current_user.role != "admin":
        query = query.filter(Order.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    try:
        orders = query.limit(100).all()
    except Exception as e:
        print(f"Orders error: {e}")
        orders = []
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single order by ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Non-admin users can only see their own orders
    if current_user.role != "admin" and order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    
    return order


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order"""
    # Calculate total
    total = 0.0
    order_items_data = []
    
    for item in order_data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found"
            )
        
        item_total = item.price * item.quantity
        total += item_total
        
        order_items_data.append({
            "product": product,
            "item_data": item,
            "item_total": item_total
        })
    
    # Create order
    order_id = f"ORD-{int(datetime.now().timestamp() * 1000)}"
    new_order = Order(
        id=order_id,
        user_id=current_user.id,
        customer_name=order_data.customer_name,
        email=order_data.email,
        status="Pending",
        total=total,
        shipping_address=order_data.shipping_address,
        payment_method=order_data.payment_method
    )
    
    db.add(new_order)
    db.flush()  # Get the order ID
    
    # Create order items
    for item_info in order_items_data:
        product = item_info["product"]
        item_data = item_info["item_data"]
        
        order_item = OrderItem(
            order_id=order_id,
            product_id=item_data.product_id,
            name=item_data.name,
            quantity=item_data.quantity,
            price=item_data.price,
            size=item_data.size,
            color=item_data.color,
            image=product.images[0] if product.images else None
        )
        
        db.add(order_item)
    
    db.commit()
    db.refresh(new_order)
    
    return new_order


@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update order status (Admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    valid_statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    order.status = status_update.status
    db.commit()
    db.refresh(order)
    
    return order


from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user: UserResponse
    message: str
    token: str


# Product Schemas
class ProductBase(BaseModel):
    name: str
    price: float
    category: str
    subcategory: Optional[str] = None
    images: List[str]
    colors: List[str]
    sizes: List[str]
    description: Optional[str] = None
    featured: bool = False
    rating: float = 0.0
    reviews: int = 0


class ProductCreate(ProductBase):
    id: Optional[str] = None
    sale_price: Optional[float] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    images: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    sizes: Optional[List[str]] = None
    description: Optional[str] = None
    featured: Optional[bool] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None


class ProductResponse(ProductBase):
    id: str
    sale_price: Optional[float] = None
    stock: int = 0  # Include stock in API response
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Clean display fields (computed dynamically)
    short_name: Optional[str] = None
    short_description: Optional[str] = None
    normalized_sub_category: Optional[str] = None

    class Config:
        from_attributes = True



# Cart Schemas
class CartItemBase(BaseModel):
    product_id: str
    size: str
    color: str
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemResponse(CartItemBase):
    id: int
    user_id: int
    created_at: datetime
    product: ProductResponse

    class Config:
        from_attributes = True


# Order Schemas
class OrderItemBase(BaseModel):
    product_id: str
    name: str
    quantity: int
    price: float
    size: Optional[str] = None
    color: Optional[str] = None
    image: Optional[str] = None


class OrderCreate(BaseModel):
    customer_name: str
    email: EmailStr
    shipping_address: Optional[str] = None
    payment_method: Optional[str] = None
    items: List[OrderItemBase]


class OrderItemResponse(OrderItemBase):
    id: int
    order_id: str

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: str
    user_id: int
    customer_name: str
    email: str
    status: str
    total: float
    shipping_address: Optional[str] = None
    payment_method: Optional[str] = None
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str


# Wishlist Schemas
class WishlistItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: str
    created_at: datetime
    product: ProductResponse

    class Config:
        from_attributes = True


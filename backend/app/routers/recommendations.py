from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Product, User
from app.schemas import ProductResponse
from app.dependencies import get_current_user_optional
from app.recommendation_service import KNNRecommendationService


router = APIRouter()


# Request/Response schemas
class TrackInteractionRequest(BaseModel):
    product_id: str
    interaction_type: str  # 'view', 'click', 'add_to_cart', 'wishlist', 'purchase'
    session_id: Optional[str] = None


class TrackInteractionResponse(BaseModel):
    success: bool
    message: str


@router.post("/track", response_model=TrackInteractionResponse)
async def track_interaction(
    request: TrackInteractionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Track user interaction with a product.
    Works for both authenticated and anonymous users.
    """
    # Validate interaction type
    valid_types = ['view', 'click', 'add_to_cart', 'wishlist', 'purchase']
    if request.interaction_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid interaction type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == request.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Track interaction
    service = KNNRecommendationService(db)
    user_id = current_user.id if current_user else None
    
    try:
        service.track_interaction(
            product_id=request.product_id,
            interaction_type=request.interaction_type,
            user_id=user_id,
            session_id=request.session_id
        )
        
        return TrackInteractionResponse(
            success=True,
            message="Interaction tracked successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track interaction: {str(e)}"
        )


@router.get("/for-product/{product_id}", response_model=List[ProductResponse])
async def get_recommendations_for_product(
    product_id: str,
    limit: int = 6,
    db: Session = Depends(get_db)
):
    """
    Get KNN-based product recommendations for a specific product.
    Returns products similar to the given product.
    """
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get recommendations
    service = KNNRecommendationService(db)
    try:
        recommendations = service.get_similar_products_knn(
            target_product_id=product_id,
            n_recommendations=limit
        )
        return recommendations
    except Exception as e:
        # Return empty list on error instead of failing
        print(f"Error getting recommendations: {e}")
        return []


@router.get("/personalized", response_model=List[ProductResponse])
async def get_personalized_recommendations(
    session_id: Optional[str] = None,
    limit: int = 6,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get personalized recommendations based on user interaction history.
    Works for both authenticated and anonymous users.
    """
    service = KNNRecommendationService(db)
    user_id = current_user.id if current_user else None
    
    try:
        recommendations = service.get_personalized_recommendations(
            user_id=user_id,
            session_id=session_id,
            n_recommendations=limit
        )
        return recommendations
    except Exception as e:
        # Return trending products on error
        print(f"Error getting personalized recommendations: {e}")
        try:
            return service.get_trending_products(limit)
        except:
            return []


@router.get("/trending", response_model=List[ProductResponse])
async def get_trending_products(
    limit: int = 6,
    db: Session = Depends(get_db)
):
    """
    Get trending products based on recent interactions and ratings.
    """
    service = KNNRecommendationService(db)
    try:
        trending = service.get_trending_products(limit)
        return trending
    except Exception as e:
        print(f"Error getting trending products: {e}")
        # Fallback to simple query (avoid ORDER BY for Railway memory limits)
        return db.query(Product).limit(min(limit, 6)).all()


@router.get("/recently-viewed", response_model=List[ProductResponse])
async def get_recently_viewed(
    session_id: Optional[str] = None,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get recently viewed products for the current user.
    Returns unique products ordered by most recent view.
    """
    service = KNNRecommendationService(db)
    user_id = current_user.id if current_user else None
    
    try:
        products = service.get_recently_viewed(
            user_id=user_id,
            session_id=session_id,
            limit=limit
        )
        return products
    except Exception as e:
        print(f"Error getting recently viewed: {e}")
        return []


@router.get("/complete-look/{product_id}", response_model=List[ProductResponse])
async def get_complete_look(
    product_id: str,
    limit: int = 4,
    db: Session = Depends(get_db)
):
    """
    Get complementary products to complete a look.
    Suggests items that go well with the given product.
    """
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    service = KNNRecommendationService(db)
    try:
        complementary = service.get_complete_look(
            product_id=product_id,
            limit=limit
        )
        return complementary
    except Exception as e:
        print(f"Error getting complete look: {e}")
        return []


@router.get("/personalized-enhanced", response_model=List[ProductResponse])
async def get_personalized_enhanced(
    session_id: Optional[str] = None,
    limit: int = 6,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get enhanced personalized recommendations with weighted interaction scoring.
    Uses: purchase (5x) > add_to_cart (3x) > wishlist (2x) > click (1.5x) > view (1x)
    """
    service = KNNRecommendationService(db)
    user_id = current_user.id if current_user else None
    
    try:
        recommendations = service.get_weighted_personalized_recommendations(
            user_id=user_id,
            session_id=session_id,
            n_recommendations=limit
        )
        return recommendations
    except Exception as e:
        print(f"Error getting enhanced personalized recommendations: {e}")
        try:
            return service.get_trending_products(limit)
        except:
            return []

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Optional sklearn imports - fallback to simple distance calculation if not available
try:
    from sklearn.neighbors import NearestNeighbors
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    NearestNeighbors = None
    StandardScaler = None

from app.models import Product, UserInteraction, User


class KNNRecommendationService:
    """KNN-based product recommendation service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        
    def extract_product_features(self, product: Product) -> np.ndarray:
        """
        Extract numerical features from a product for KNN algorithm.
        Features: [category_encoded, price_normalized, rating, reviews_log, num_colors, num_sizes]
        """
        # Category encoding (simple hash-based encoding)
        category_encoded = hash(product.category) % 100
        
        # Price (will be normalized later)
        price = float(product.price)
        
        # Rating
        rating = float(product.rating)
        
        # Log of reviews (to reduce impact of outliers)
        reviews_log = np.log1p(float(product.reviews))
        
        # Number of colors and sizes
        num_colors = len(product.colors) if product.colors else 0
        num_sizes = len(product.sizes) if product.sizes else 0
        
        # Subcategory encoding
        subcategory_encoded = hash(product.sub_category) % 50 if product.sub_category else 0
        
        return np.array([
            category_encoded,
            price,
            rating,
            reviews_log,
            num_colors,
            num_sizes,
            subcategory_encoded
        ])
    
    def build_product_feature_matrix(self, products: List[Product]) -> tuple[np.ndarray, List[str]]:
        """Build feature matrix for all products"""
        features = []
        product_ids = []
        
        for product in products:
            features.append(self.extract_product_features(product))
            product_ids.append(product.id)
        
        feature_matrix = np.array(features)
        
        # Normalize features
        if len(feature_matrix) > 0 and self.scaler is not None:
            feature_matrix = self.scaler.fit_transform(feature_matrix)
        
        return feature_matrix, product_ids
    
    def get_similar_products_knn(
        self,
        target_product_id: str,
        n_recommendations: int = 6,
        exclude_same_product: bool = True
    ) -> List[Product]:
        """
        Get similar products using KNN algorithm
        """
        # Get all products
        all_products = self.db.query(Product).all()
        
        if len(all_products) < 2:
            return []
        
        # If sklearn is not available, use simple fallback
        if not SKLEARN_AVAILABLE:
            return self._simple_similar_products(target_product_id, n_recommendations, all_products)
        
        # Build feature matrix
        feature_matrix, product_ids = self.build_product_feature_matrix(all_products)
        
        # Find target product index
        try:
            target_idx = product_ids.index(target_product_id)
        except ValueError:
            return []
        
        # Fit KNN model
        n_neighbors = min(n_recommendations + 1, len(all_products))
        knn = NearestNeighbors(n_neighbors=n_neighbors, metric='euclidean')
        knn.fit(feature_matrix)
        
        # Find nearest neighbors
        distances, indices = knn.kneighbors([feature_matrix[target_idx]])
        
        # Get recommended products
        recommended_products = []
        for idx in indices[0]:
            if exclude_same_product and idx == target_idx:
                continue
            recommended_products.append(all_products[idx])
            if len(recommended_products) >= n_recommendations:
                break
        
        return recommended_products
    
    def _simple_similar_products(self, target_product_id: str, n: int, all_products: List[Product]) -> List[Product]:
        """Simple fallback for similar products without sklearn"""
        target = None
        for p in all_products:
            if p.id == target_product_id:
                target = p
                break
        if not target:
            return self.get_trending_products(n)
        
        # Find products in same category with similar price
        similar = [
            p for p in all_products
            if p.id != target_product_id and p.category == target.category
        ]
        similar.sort(key=lambda p: abs(float(p.price) - float(target.price)))
        return similar[:n] if similar else self.get_trending_products(n)
    
    def get_personalized_recommendations(
        self,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        n_recommendations: int = 6
    ) -> List[Product]:
        """
        Get personalized recommendations based on user interaction history
        """
        # Get user's recent interactions (last 30 days)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        query = self.db.query(UserInteraction).filter(
            UserInteraction.created_at >= cutoff_date
        )
        
        if user_id:
            query = query.filter(UserInteraction.user_id == user_id)
        elif session_id:
            query = query.filter(UserInteraction.session_id == session_id)
        else:
            # No user context, return trending products
            return self.get_trending_products(n_recommendations)
        
        interactions = query.order_by(desc(UserInteraction.created_at)).limit(20).all()
        
        if not interactions:
            return self.get_trending_products(n_recommendations)
        
        # Get products user interacted with
        interacted_product_ids = list(set([i.product_id for i in interactions]))
        interacted_products = self.db.query(Product).filter(
            Product.id.in_(interacted_product_ids)
        ).all()
        
        if not interacted_products:
            return self.get_trending_products(n_recommendations)
        
        # If sklearn not available, use simple fallback based on interacted categories
        if not SKLEARN_AVAILABLE:
            interacted_categories = set(p.category for p in interacted_products)
            all_products = self.db.query(Product).all()
            recommended = [
                p for p in all_products 
                if p.id not in interacted_product_ids and p.category in interacted_categories
            ]
            recommended.sort(key=lambda p: -float(p.rating))
            return recommended[:n_recommendations] if recommended else self.get_trending_products(n_recommendations)
        
        # Get all products
        all_products = self.db.query(Product).all()
        
        if len(all_products) < 2:
            return []
        
        # Build feature matrix
        feature_matrix, product_ids = self.build_product_feature_matrix(all_products)
        
        # Calculate average feature vector of interacted products
        interacted_features = []
        for product in interacted_products:
            try:
                idx = product_ids.index(product.id)
                interacted_features.append(feature_matrix[idx])
            except ValueError:
                continue
        
        if not interacted_features:
            return self.get_trending_products(n_recommendations)
        
        avg_feature_vector = np.mean(interacted_features, axis=0)
        
        # Find products similar to average preference
        n_neighbors = min(n_recommendations + len(interacted_product_ids), len(all_products))
        knn = NearestNeighbors(n_neighbors=n_neighbors, metric='euclidean')
        knn.fit(feature_matrix)
        
        distances, indices = knn.kneighbors([avg_feature_vector])
        
        # Get recommended products (exclude already interacted)
        recommended_products = []
        for idx in indices[0]:
            product = all_products[idx]
            if product.id not in interacted_product_ids:
                recommended_products.append(product)
                if len(recommended_products) >= n_recommendations:
                    break
        
        return recommended_products
    
    def get_trending_products(self, limit: int = 6) -> List[Product]:
        """Get trending products based on recent interactions and ratings"""
        # Get products with most interactions in last 7 days
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        
        # Subquery to count interactions per product
        interaction_counts = (
            self.db.query(
                UserInteraction.product_id,
                func.count(UserInteraction.id).label('interaction_count')
            )
            .filter(UserInteraction.created_at >= cutoff_date)
            .group_by(UserInteraction.product_id)
            .subquery()
        )
        
        # Get products with their interaction counts
        trending = (
            self.db.query(Product)
            .outerjoin(interaction_counts, Product.id == interaction_counts.c.product_id)
            .order_by(
                desc(func.coalesce(interaction_counts.c.interaction_count, 0)),
                desc(Product.rating),
                desc(Product.reviews)
            )
            .limit(limit)
            .all()
        )
        
        # If not enough trending products, fill with high-rated products
        if len(trending) < limit:
            additional = (
                self.db.query(Product)
                .filter(~Product.id.in_([p.id for p in trending]))
                .order_by(desc(Product.rating), desc(Product.reviews))
                .limit(limit - len(trending))
                .all()
            )
            trending.extend(additional)
        
        return trending
    
    def track_interaction(
        self,
        product_id: str,
        interaction_type: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> UserInteraction:
        """Track a user interaction with a product"""
        interaction = UserInteraction(
            user_id=user_id,
            session_id=session_id,
            product_id=product_id,
            interaction_type=interaction_type
        )
        
        self.db.add(interaction)
        self.db.commit()
        self.db.refresh(interaction)
        
        return interaction

    def get_recently_viewed(
        self,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        limit: int = 8
    ) -> List[Product]:
        """
        Get recently viewed products for a user.
        Returns unique products ordered by most recent view.
        """
        query = self.db.query(UserInteraction).filter(
            UserInteraction.interaction_type == 'view'
        )
        
        if user_id:
            query = query.filter(UserInteraction.user_id == user_id)
        elif session_id:
            query = query.filter(UserInteraction.session_id == session_id)
        else:
            return []
        
        # Get recent views ordered by time
        recent_views = query.order_by(desc(UserInteraction.created_at)).limit(50).all()
        
        if not recent_views:
            return []
        
        # Get unique product IDs in order of most recent
        seen_product_ids = []
        for interaction in recent_views:
            if interaction.product_id not in seen_product_ids:
                seen_product_ids.append(interaction.product_id)
            if len(seen_product_ids) >= limit:
                break
        
        # Fetch products
        products = self.db.query(Product).filter(
            Product.id.in_(seen_product_ids)
        ).all()
        
        # Reorder by original view order
        product_map = {p.id: p for p in products}
        ordered_products = [product_map[pid] for pid in seen_product_ids if pid in product_map]
        
        return ordered_products

    def get_complete_look(
        self,
        product_id: str,
        limit: int = 4
    ) -> List[Product]:
        """
        Get complementary products to complete a look.
        e.g., if viewing pants, suggest shirts, shoes, accessories
        """
        # Define complementary category mappings
        COMPLEMENTARY_CATEGORIES = {
            'women': {
                'dresses': ['accessories', 'shoes'],
                'tops': ['pants', 'skirts', 'accessories'],
                'pants': ['tops', 'shoes', 'accessories'],
                'skirts': ['tops', 'shoes', 'accessories'],
                'shoes': ['accessories'],
                'accessories': ['tops', 'dresses'],
            },
            'men': {
                'shirts': ['pants', 'shoes', 'accessories'],
                'pants': ['shirts', 'shoes', 'accessories'],
                't-shirts': ['pants', 'shoes'],
                'shoes': ['accessories'],
                'accessories': ['shirts', 'pants'],
            },
            'kids': {
                'tops': ['pants', 'shoes'],
                'pants': ['tops', 'shoes'],
                'dresses': ['shoes', 'accessories'],
            }
        }
        
        # Get target product
        target_product = self.db.query(Product).filter(Product.id == product_id).first()
        if not target_product:
            return self.get_trending_products(limit)
        
        category = target_product.category.lower() if target_product.category else ''
        subcategory = (target_product.sub_category or '').lower().replace(' ', '-').replace('_', '-')
        
        # Find complementary subcategories
        complementary_subs = []
        if category in COMPLEMENTARY_CATEGORIES:
            cat_map = COMPLEMENTARY_CATEGORIES[category]
            for key in cat_map:
                if key in subcategory:
                    complementary_subs = cat_map[key]
                    break
        
        # If no specific mapping, suggest from same category but different subcategory
        if not complementary_subs:
            query = self.db.query(Product).filter(
                Product.category == target_product.category,
                Product.id != product_id,
                Product.sub_category != target_product.sub_category
            ).order_by(desc(Product.rating)).limit(limit)
            return query.all()
        
        # Get products from complementary subcategories
        complementary_products = []
        for comp_sub in complementary_subs:
            products = self.db.query(Product).filter(
                Product.category == target_product.category,
                Product.id != product_id,
                func.lower(Product.sub_category).contains(comp_sub)
            ).order_by(desc(Product.rating)).limit(2).all()
            complementary_products.extend(products)
            if len(complementary_products) >= limit:
                break
        
        # If still need more, add from same category
        if len(complementary_products) < limit:
            additional = self.db.query(Product).filter(
                Product.category == target_product.category,
                Product.id != product_id,
                ~Product.id.in_([p.id for p in complementary_products])
            ).order_by(desc(Product.rating)).limit(limit - len(complementary_products)).all()
            complementary_products.extend(additional)
        
        return complementary_products[:limit]

    def get_weighted_personalized_recommendations(
        self,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        n_recommendations: int = 6
    ) -> List[Product]:
        """
        Enhanced personalized recommendations with weighted interaction scoring.
        Weights: purchase (5x) > add_to_cart (3x) > wishlist (2x) > click (1.5x) > view (1x)
        """
        INTERACTION_WEIGHTS = {
            'purchase': 5.0,
            'add_to_cart': 3.0,
            'wishlist': 2.0,
            'click': 1.5,
            'view': 1.0
        }
        
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        query = self.db.query(UserInteraction).filter(
            UserInteraction.created_at >= cutoff_date
        )
        
        if user_id:
            query = query.filter(UserInteraction.user_id == user_id)
        elif session_id:
            query = query.filter(UserInteraction.session_id == session_id)
        else:
            return self.get_trending_products(n_recommendations)
        
        interactions = query.all()
        
        if not interactions:
            return self.get_trending_products(n_recommendations)
        
        # Calculate weighted scores per product
        product_scores: Dict[str, float] = {}
        for interaction in interactions:
            weight = INTERACTION_WEIGHTS.get(interaction.interaction_type, 1.0)
            product_scores[interaction.product_id] = product_scores.get(interaction.product_id, 0) + weight
        
        # Get categories and price range from top interacted products
        top_product_ids = sorted(product_scores.keys(), key=lambda x: product_scores[x], reverse=True)[:5]
        top_products = self.db.query(Product).filter(Product.id.in_(top_product_ids)).all()
        
        if not top_products:
            return self.get_trending_products(n_recommendations)
        
        # Find preferred categories and price range
        preferred_categories = list(set(p.category for p in top_products))
        prices = [float(p.price) for p in top_products]
        min_price = min(prices) * 0.7
        max_price = max(prices) * 1.3
        
        # Get recommendations from preferred categories in similar price range
        recommended = self.db.query(Product).filter(
            Product.category.in_(preferred_categories),
            ~Product.id.in_(list(product_scores.keys())),
            Product.price >= min_price,
            Product.price <= max_price
        ).order_by(desc(Product.rating)).limit(n_recommendations).all()
        
        # If not enough, expand search
        if len(recommended) < n_recommendations:
            additional = self.db.query(Product).filter(
                Product.category.in_(preferred_categories),
                ~Product.id.in_(list(product_scores.keys()) + [p.id for p in recommended])
            ).order_by(desc(Product.rating)).limit(n_recommendations - len(recommended)).all()
            recommended.extend(additional)
        
        return recommended

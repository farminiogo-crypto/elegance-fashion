from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

from app.database import get_db
from app.models import User

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# HTTPBearer with auto_error=False to handle missing tokens gracefully
security = HTTPBearer(auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token with unique timestamp"""
    to_encode = data.copy()
    now = datetime.utcnow()
    
    # Add issued at timestamp to ensure token uniqueness (must be Unix timestamp)
    # Convert datetime to Unix timestamp (seconds since epoch)
    iat_timestamp = int(now.timestamp())
    to_encode.update({"iat": iat_timestamp})
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # Convert expiration to Unix timestamp
    exp_timestamp = int(expire.timestamp())
    to_encode.update({"exp": exp_timestamp})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    print(f"Created new token with iat={iat_timestamp}, exp={exp_timestamp}, user_id={data.get('sub')}")
    return encoded_jwt


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if credentials is None:
        print("❌ No Authorization header provided")
        raise credentials_exception
    
    try:
        token = credentials.credentials
        if not token:
            print("❌ Token validation error: Empty token received")
            raise credentials_exception
        
        print(f"🔍 Attempting to decode token (length: {len(token)}, first 30 chars: {token[:30]}...)")
        
        # Check token format (should have 3 parts for JWT)
        token_parts = token.split('.')
        if len(token_parts) != 3:
            print(f"❌ Invalid JWT format: expected 3 parts, got {len(token_parts)}")
            print(f"   Token parts: {token_parts}")
            raise credentials_exception
        
        # Decode token with options to see what's wrong
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            print(f"✅ Token decoded successfully. Payload keys: {list(payload.keys())}")
            print(f"   Payload sub: {payload.get('sub')}")
            print(f"   Payload exp: {payload.get('exp')}")
            print(f"   Payload iat: {payload.get('iat')}")
        except JWTError as jwt_err:
            print(f"❌ JWT decode error: {jwt_err}")
            print(f"   Token received (first 50 chars): {token[:50]}...")
            print(f"   Token length: {len(token)}")
            print(f"   Secret key used: {SECRET_KEY[:10]}...")
            raise credentials_exception
            
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            print(f"❌ Token validation error: No 'sub' claim in token payload.")
            print(f"   Payload keys: {list(payload.keys())}")
            print(f"   Full payload: {payload}")
            raise credentials_exception
            
        try:
            user_id = int(user_id_raw)
        except ValueError:
            print(f"❌ Token validation error: 'sub' claim is not a valid integer: {user_id_raw}")
            raise credentials_exception
        
        print(f"✅ Token validated successfully for user_id: {user_id}")
    except JWTError as e:
        print(f"❌ JWT decode error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"❌ Token validation error: {e}")
        import traceback
        traceback.print_exc()
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        print(f"❌ User not found in database for user_id: {user_id}")
        raise credentials_exception
    
    print(f"✅ User found: {user.email} (ID: {user.id})")
    return user
    
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user and verify admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    Used for endpoints that work for both authenticated and anonymous users.
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        if not token:
            return None
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        
        if user_id_raw is None:
            return None
        
        user_id = int(user_id_raw)
        user = db.query(User).filter(User.id == user_id).first()
        
        return user
    except (JWTError, ValueError, Exception):
        # Return None for any authentication errors
        return None


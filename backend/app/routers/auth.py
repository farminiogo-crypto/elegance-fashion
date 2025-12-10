from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, SignupRequest, AuthResponse, UserResponse
from app.dependencies import create_access_token, get_current_user

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """User login endpoint"""
    try:
        user = db.query(User).filter(User.email == credentials.email).first()
        
        if not user or not user.check_password(credentials.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "user": UserResponse.model_validate(user),
            "message": "Login successful",
            "token": access_token
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection error. Please ensure MySQL is running and database is initialized."
        )


@router.post("/admin/login", response_model=AuthResponse)
async def admin_login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not user.check_password(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "user": UserResponse.model_validate(user),
        "message": "Admin login successful",
        "token": access_token
    }


@router.post("/signup", response_model=AuthResponse)
async def signup(user_data: SignupRequest, db: Session = Depends(get_db)):
    """User registration endpoint"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        role="user"
    )
    new_user.set_password(user_data.password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return {
        "user": UserResponse.model_validate(new_user),
        "message": "Registration successful",
        "token": access_token
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return UserResponse.model_validate(current_user)


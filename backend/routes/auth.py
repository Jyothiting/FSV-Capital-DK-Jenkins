from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from database import get_db
from config import settings
from schemas.user import UserCreate, UserResponse, Token
from services.auth_service import create_user, verify_password, create_access_token, get_password_hash
from middleware.auth_middleware import get_current_active_user, RequireRole
from middleware.activity_logger import log_activity
from models import User, Role


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email:     Optional[EmailStr] = None
    password:  Optional[str] = None  # new password (plain); omit to keep current

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = create_user(db, user)
    return {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "role": db_user.role.name
    }

@router.post("/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and receive a JWT token."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.name}, expires_delta=access_token_expires
    )
    
    # Log the activity
    log_activity(db, user.id, "login", "User successfully logged in", request)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/assignees", response_model=List[UserResponse])
def list_assignees(
    _admin: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """List active users available for task assignment (admin only)."""
    users = (
        db.query(User)
        .join(Role)
        .filter(User.is_active.is_(True), Role.name == "user")
        .order_by(User.full_name, User.username)
        .all()
    )
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.name,
        }
        for u in users
    ]


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.name
    }


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: ProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Allow any authenticated user to update their own profile."""
    if payload.email and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = payload.email

    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    if payload.password:
        if len(payload.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        current_user.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(current_user)
    log_activity(db, current_user.id, "profile_update", "User updated their profile", request)
    return {
        "id":        current_user.id,
        "username":  current_user.username,
        "email":     current_user.email,
        "full_name": current_user.full_name,
        "role":      current_user.role.name,
    }

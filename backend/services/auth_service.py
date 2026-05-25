from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from config import settings
from models import User, Role
from schemas.user import UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_user(db: Session, user: UserCreate) -> User:
    # Check if role exists, if not create default roles
    role_obj = db.query(Role).filter(Role.name == user.role).first()
    if not role_obj:
        if user.role not in ["admin", "user"]:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        role_obj = Role(name=user.role, description=f"{user.role.capitalize()} role")
        db.add(role_obj)
        db.commit()
        db.refresh(role_obj)

    # Check if user exists
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role_id=role_obj.id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

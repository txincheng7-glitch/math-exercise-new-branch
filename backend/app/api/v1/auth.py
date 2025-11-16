from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ...core.security import create_access_token
from ...config import settings
from ...database import get_db
from ...services import UserService
from ...schemas.user import Token, AdminCreate

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    *,
    db: Session = Depends(get_db),
    user_in: AdminCreate
) -> Any:
    """用户注册"""
    user_service = UserService(db)
    
    # 检查邮箱是否已存在
    if user_service.get_by_email(email=user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 检查用户名是否已存在
    if user_service.get_by_username(username=user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # 根据角色创建用户
    if user_in.role == "student":
        return user_service.create_student(obj_in=user_in)
    elif user_in.role == "teacher":
        return user_service.create_teacher(obj_in=user_in)
    elif user_in.role == "parent":
        return user_service.create_parent(obj_in=user_in)
    elif user_in.role == "admin":
        return user_service.create_admin(obj_in=user_in)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user role"
        )

@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user_service = UserService(db)
    user = user_service.authenticate(
        email=form_data.username,  # OAuth2 uses username field for email
        password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            {"sub": user.id}, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
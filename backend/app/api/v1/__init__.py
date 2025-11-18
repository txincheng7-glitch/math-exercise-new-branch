from fastapi import APIRouter
from . import auth, users, exercises, admin, messages

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(messages.router, tags=["messages"])
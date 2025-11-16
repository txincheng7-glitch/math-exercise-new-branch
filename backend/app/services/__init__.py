from .user_service import UserService
from .exercise_service import ExerciseService
from .ai_service import AIService, AIServiceManager  # 添加AIServiceManager

__all__ = [
    "UserService", 
    "ExerciseService", 
    "AIService",
    "AIServiceManager"  # 添加到导出列表
]
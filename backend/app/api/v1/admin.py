from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User, Exercise, UserRole
from ..deps import check_admin
from sqlalchemy import func

router = APIRouter()

@router.get("/stats")
async def get_system_stats(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """获取系统统计信息（仅管理员）"""
    
    # 获取各类用户数量
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_teachers = db.query(User).filter(User.role == UserRole.TEACHER).count()
    total_parents = db.query(User).filter(User.role == UserRole.PARENT).count()
    
    # 获取练习统计
    exercises = db.query(Exercise)
    total_exercises = exercises.count()
    completed_exercises = exercises.filter(Exercise.completed_at.isnot(None)).count()
    
    # 计算平均分
    average_score = db.query(func.avg(Exercise.final_score))\
        .filter(Exercise.final_score.isnot(None))\
        .scalar() or 0.0
    
    return {
        "totalStudents": total_students,
        "totalTeachers": total_teachers,
        "totalParents": total_parents,
        "activeExercises": total_exercises - completed_exercises,
        "completedExercises": completed_exercises,
        "averageScore": round(average_score, 2)
    }
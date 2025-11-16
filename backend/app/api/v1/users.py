from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database import get_db
from ...services import UserService
from ...schemas import user as schemas
from ...schemas.stats import TeacherStats, ParentStats
from ...models import User, UserRole, Student
from ..deps import (
    get_current_active_user,
    check_teacher,
    check_parent,
    check_admin,
    check_teacher_or_admin,
    check_parent_or_admin
)

router = APIRouter()

@router.post("/students", response_model=schemas.UserResponse)
def create_student(
    *,
    db: Session = Depends(get_db),
    student_in: schemas.StudentCreate
) -> Any:
    """创建学生账号"""
    user_service = UserService(db)
    if user_service.get_by_email(email=student_in.email):
        raise HTTPException(
            status_code=400,
            detail="该邮箱已被注册"
        )
    return user_service.create_student(obj_in=student_in)

@router.post("/register/students", response_model=schemas.UserResponse, status_code=201)
async def register_student(
    *,
    db: Session = Depends(get_db),
    student_data: schemas.StudentCreate
) -> Any:
    """学生注册(公开端点)
    
    请求体示例:
    {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword",
        "profile": {
            "grade": "一年级",
            "class_name": "1班"
        }
    }
    """
    user_service = UserService(db)
    if user_service.get_by_email(email=student_data.email):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    if user_service.get_by_username(username=student_data.username):
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )
    
    return user_service.create_student(obj_in=student_data)

@router.post("/teachers", response_model=schemas.UserResponse)
def create_teacher(
    *,
    db: Session = Depends(get_db),
    teacher_in: schemas.TeacherCreate,
    current_user: User = Depends(check_admin)  # 只有管理员可以创建教师账号
) -> Any:
    """创建教师账号"""
    user_service = UserService(db)
    if user_service.get_by_email(email=teacher_in.email):
        raise HTTPException(
            status_code=400,
            detail="该邮箱已被注册"
        )
    return user_service.create_teacher(obj_in=teacher_in)

@router.post("/parents", response_model=schemas.UserResponse)
def create_parent(
    *,
    db: Session = Depends(get_db),
    parent_in: schemas.ParentCreate,
    current_user: User = Depends(check_admin)  # 只有管理员可以创建家长账号
) -> Any:
    """创建家长账号"""
    user_service = UserService(db)
    if user_service.get_by_email(email=parent_in.email):
        raise HTTPException(
            status_code=400,
            detail="该邮箱已被注册"
        )
    return user_service.create_parent(obj_in=parent_in)

@router.post("/admins", response_model=schemas.UserResponse)
def create_admin(
    *,
    db: Session = Depends(get_db),
    admin_in: schemas.AdminCreate,
    current_user: User = Depends(check_admin)
) -> Any:
    """创建管理员账号（仅超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="只有超级管理员可以创建管理员账号"
        )
    user_service = UserService(db)
    if user_service.get_by_email(email=admin_in.email):
        raise HTTPException(
            status_code=400,
            detail="该邮箱已被注册"
        )
    return user_service.create_admin(obj_in=admin_in)

@router.get("/me", response_model=schemas.UserResponse)
def read_user_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取当前用户信息"""
    response = {**current_user.__dict__}
    
    # 根据角色添加profile信息
    if current_user.role == UserRole.STUDENT and current_user.student:
        response["student_profile"] = schemas.StudentProfile(
            grade=current_user.student.grade,
            class_name=current_user.student.class_name
        )
    elif current_user.role == UserRole.TEACHER and current_user.teacher:
        response["teacher_profile"] = schemas.TeacherProfile(
            subjects=current_user.teacher.subjects
        )
        
    return response

@router.put("/me", response_model=schemas.UserResponse)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """更新当前用户信息"""
    user_service = UserService(db)
    
    # 如果要更新邮箱，检查新邮箱是否已被使用
    if user_in.email and user_in.email != current_user.email:
        if user_service.get_by_email(email=user_in.email):
            raise HTTPException(
                status_code=400,
                detail="该邮箱已被其他用户使用"
            )
    
    return user_service.update(db_obj=current_user, obj_in=user_in)

@router.get("/students", response_model=List[schemas.UserResponse])
def list_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_or_admin)
) -> Any:
    """获取学生列表（仅教师和管理员可访问）"""
    user_service = UserService(db)
    if current_user.role == UserRole.TEACHER:
        return user_service.get_teacher_students(current_user.teacher.id)
    return user_service.get_all_students()

@router.get("/teachers/{teacher_id}/students", response_model=List[schemas.UserResponse])
def get_teacher_students(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_or_admin)
) -> Any:
    """获取指定教师的学生列表"""
    if current_user.role == UserRole.TEACHER and current_user.teacher.id != teacher_id:
        raise HTTPException(
            status_code=403,
            detail="只能查看自己的学生列表"
        )
    user_service = UserService(db)
    return user_service.get_teacher_students(teacher_id)

@router.get("/parents/{parent_id}/students", response_model=List[schemas.UserResponse])
def get_parent_students(
    parent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_parent_or_admin)
) -> Any:
    """获取指定家长关联的学生列表"""
    if current_user.role == UserRole.PARENT and current_user.parent.id != parent_id:
        raise HTTPException(
            status_code=403,
            detail="只能查看自己关联的学生列表"
        )
    user_service = UserService(db)
    return user_service.get_parent_students(parent_id)

@router.post("/students/{student_id}/teacher/{teacher_id}")
def assign_teacher(
    student_id: int,
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """为学生分配教师（仅管理员可操作）"""
    user_service = UserService(db)
    if not user_service.assign_teacher(student_id, teacher_id):
        raise HTTPException(
            status_code=400,
            detail="分配失败，请检查学生和教师ID是否正确"
        )
    return {"success": True}

@router.post("/students/{student_id}/parent/{parent_id}")
def link_parent(
    student_id: int,
    parent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """关联学生和家长（仅管理员可操作）"""
    user_service = UserService(db)
    if not user_service.link_parent(student_id, parent_id):
        raise HTTPException(
            status_code=400,
            detail="关联失败，请检查学生和家长ID是否正确"
        )
    return {"success": True}

@router.get("/students/{student_id}/progress", response_model=schemas.StudentProgress)
def get_student_progress(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """获取学生学习进度
    教师可以查看自己的学生
    家长可以查看自己关联的学生
    管理员可以查看所有学生
    """
    # 允许前端传入 Student.id（角色表 id）或 User.id（用户表 id）两种形式，先尝试解析到真实的 Student.id
    # 以便后续权限校验和数据查询都能使用一致的学生角色 id
    student_obj = db.query(Student).filter(Student.id == student_id).first()
    if not student_obj:
        # 可能前端传入的是用户表的 user.id，尝试按 user_id 查找
        student_obj = db.query(Student).filter(Student.user_id == student_id).first()
    if not student_obj:
        raise HTTPException(status_code=404, detail="学生不存在")

    resolved_student_id = student_obj.id

    # 检查权限（基于解析后的 Student.id）
    if current_user.role == UserRole.STUDENT:
        if current_user.student.id != resolved_student_id:
            raise HTTPException(status_code=403, detail="只能查看自己的学习进度")
    elif current_user.role == UserRole.TEACHER:
        if resolved_student_id not in [s.id for s in current_user.teacher.students]:
            raise HTTPException(status_code=403, detail="只能查看自己的学生")
    elif current_user.role == UserRole.PARENT:
        if resolved_student_id not in [s.id for s in current_user.parent.students]:
            raise HTTPException(status_code=403, detail="只能查看自己关联的学生")

    user_service = UserService(db)
    return user_service.get_student_progress(resolved_student_id)

@router.get("/admins", response_model=List[schemas.UserResponse])
def list_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """获取管理员列表（仅超级管理员可访问）"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="只有超级管理员可以查看管理员列表"
        )
    user_service = UserService(db)
    return user_service.get_all_admins()

@router.get("/teachers", response_model=List[schemas.UserResponse])
async def get_teachers(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """获取所有教师列表（仅管理员）"""
    user_service = UserService(db)
    teachers = user_service.get_multi_by_role(role=UserRole.TEACHER)
    return teachers

@router.get("/parents", response_model=List[schemas.UserResponse])
async def get_parents(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """获取所有家长列表（仅管理员）"""
    user_service = UserService(db)
    parents = user_service.get_multi_by_role(role=UserRole.PARENT)
    return parents

@router.post("/{user_id}/activate", response_model=schemas.UserResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """激活用户账号（仅管理员）"""
    user_service = UserService(db)
    user = user_service.get(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="用户不存在"
        )
    return user_service.activate_user(user)

@router.post("/{user_id}/deactivate", response_model=schemas.UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> Any:
    """禁用用户账号（仅管理员）"""
    user_service = UserService(db)
    user = user_service.get(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="用户不存在"
        )
    return user_service.deactivate_user(user)

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin)
) -> dict:
    """删除用户（仅管理员）"""
    user_service = UserService(db)
    user = user_service.get(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="用户不存在"
        )
    if user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="不能删除超级管理员账号"
        )
    user_service.delete(user_id)
    return {"status": "success"}

@router.get("/me/students", response_model=List[schemas.UserResponse])
def get_my_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_parent)
) -> Any:
    """获取当前家长关联的学生列表"""
    user_service = UserService(db)
    return user_service.get_parent_students(current_user.parent.id)

@router.get("/me/teacher-students", response_model=List[schemas.UserResponse])
def get_my_teacher_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher)
) -> Any:
    """获取当前教师的学生列表"""
    user_service = UserService(db)
    return user_service.get_teacher_students(current_user.teacher.id)

@router.get("/me/teacher-stats", response_model=TeacherStats)
def get_teacher_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher)
) -> Any:
    """获取教师的学生统计数据"""
    user_service = UserService(db)
    return user_service.get_teacher_stats(current_user.teacher.id)

@router.get("/me/parent-stats", response_model=ParentStats)
def get_parent_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_parent)
) -> Any:
    """获取家长的孩子统计数据"""
    user_service = UserService(db)
    return user_service.get_parent_stats(current_user.parent.id)
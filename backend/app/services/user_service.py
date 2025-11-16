"""User service module"""
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from ..models import User, Student, Teacher, Parent, Admin, UserRole, Exercise
from ..schemas import (
    UserCreateBase, UserUpdate, StudentCreate, TeacherCreate,
    ParentCreate, AdminCreate, UserResponse
)
from .base import BaseService
from ..core.security import get_password_hash, verify_password
from fastapi import HTTPException
from sqlalchemy import func
from datetime import datetime, time


class UserService(BaseService[User, UserCreateBase, UserUpdate]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        """通过邮箱获取用户"""
        return self.db.query(User).filter(User.email == email).first()

    def get_by_username(self, username: str) -> Optional[User]:
        """通过用户名获取用户"""
        return self.db.query(User).filter(User.username == username).first()

    def authenticate(self, *, email: str, password: str) -> Optional[User]:
        """用户认证"""
        user = self.get_by_email(email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_student(self, *, obj_in: StudentCreate) -> User:
        """创建学生用户"""
        # 创建基础用户
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            role=UserRole.STUDENT
        )
        self.db.add(db_obj)
        self.db.flush()  # 获取user.id

        # 创建学生信息
        student = Student(
            user_id=db_obj.id,
            grade=obj_in.profile.grade,
            class_name=obj_in.profile.class_name
        )
        self.db.add(student)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def create_teacher(self, *, obj_in: TeacherCreate) -> User:
        """创建教师用户"""
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            role=UserRole.TEACHER
        )
        self.db.add(db_obj)
        self.db.flush()

        teacher = Teacher(
            user_id=db_obj.id,
            subjects=obj_in.profile.subjects
        )
        self.db.add(teacher)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def create_parent(self, *, obj_in: ParentCreate) -> User:
        """创建家长用户，并关联指定的学生

        Args:
            obj_in: 包含家长基本信息和要关联的学生邮箱列表

        Returns:
            创建的家长用户对象

        Raises:
            HTTPException: 当存在无效的学生邮箱或学生已有家长关联时
        """
        # 先检查是否有无效的学生邮箱
        invalid_emails = []
        existing_students = []
        for email in obj_in.student_emails:
            student_user = self.get_by_email(email)
            if not student_user or student_user.role != UserRole.STUDENT:
                invalid_emails.append(email)
            elif student_user.student and student_user.student.parent_id:
                # 学生已有家长关联
                existing_students.append(email)

        if invalid_emails:
            raise HTTPException(
                status_code=400,
                detail=f"以下邮箱不是有效的学生账号：{', '.join(invalid_emails)}"
            )
        
        if existing_students:
            raise HTTPException(
                status_code=400,
                detail=f"以下学生已有家长关联：{', '.join(existing_students)}"
            )

        # 创建家长用户
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            role=UserRole.PARENT
        )
        self.db.add(db_obj)
        self.db.flush()  # 确保获得user.id

        # 创建家长记录
        parent = Parent(user_id=db_obj.id)
        self.db.add(parent)
        self.db.flush()  # 确保获得parent.id

        # 处理学生关联
        for email in obj_in.student_emails:
            student_user = self.get_by_email(email)
            student = student_user.student
            student.parent_id = parent.id

        self.db.commit()
        self.db.refresh(db_obj)
        
        # 重新查询以获取完整的关联信息
        return self.get(db_obj.id)

    def create_admin(self, *, obj_in: AdminCreate) -> User:
        """创建管理员用户(仅限超级管理员使用)"""
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            role=UserRole.ADMIN,
            is_superuser=obj_in.is_superuser or False
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, *, db_obj: User, obj_in: UserUpdate) -> User:
        """更新用户信息"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # 处理密码更新
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password

        # 根据角色更新特定信息
        if db_obj.role == UserRole.STUDENT and hasattr(obj_in, 'profile'):
            profile = update_data.pop('profile', None)
            if profile and db_obj.student:
                for key, value in profile.items():
                    setattr(db_obj.student, key, value)

        return super().update(db_obj=db_obj, obj_in=UserUpdate(**update_data))

    def get_student_stats(self, student_id: int) -> Dict[str, Any]:
        """获取学生的练习统计信息"""
        stats = self.db.query(
            func.count(Exercise.id).label('total_exercises'),
            func.count(Exercise.completed_at).label('completed_exercises'),
            func.avg(Exercise.final_score).label('average_score'),
            func.sum(Exercise.total_time).label('total_time')
        ).filter(
            Exercise.student_id == student_id
        ).first()

        return {
            "total_exercises": stats[0] or 0,
            "completed_exercises": stats[1] or 0,
            "average_score": round(stats[2] or 0, 2),
            "total_time": stats[3] or 0
        }

    def get_teacher_students(self, teacher_id: int) -> List[User]:
        """获取教师的学生列表"""
        # 支持传入 Teacher.id 或 Teacher.user_id（即教师用户的 User.id）两种情形以提高兼容性
        teacher = self.db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            teacher = self.db.query(Teacher).filter(Teacher.user_id == teacher_id).first()
        if not teacher:
            return []
        return [student.user for student in teacher.students]

    def get_parent_students(self, parent_id: int) -> List[User]:
        """获取家长关联的学生列表"""
        # 支持传入 Parent.id 或者 Parent.user_id（即家长用户的 user id）两种情形以提高兼容性
        parent = self.db.query(Parent).filter(Parent.id == parent_id).first()
        if not parent:
            # 可能传入的是家长的 user.id（User.id），尝试按 Parent.user_id 查找
            parent = self.db.query(Parent).filter(Parent.user_id == parent_id).first()
        if not parent:
            return []
        return [student.user for student in parent.students]

    def assign_teacher(self, student_user_id: int, teacher_user_id: int) -> bool:
        """分配教师给学生"""
        # 根据用户ID查找对应的角色模型
        student_user = self.db.query(User).filter(User.id == student_user_id).first()
        teacher_user = self.db.query(User).filter(User.id == teacher_user_id).first()
        
        if not student_user or not teacher_user:
            return False
        
        student = student_user.student
        teacher = teacher_user.teacher
        
        if not student or not teacher:
            return False
            
        student.teacher_id = teacher.id
        self.db.commit()
        return True

    def link_parent(self, student_user_id: int, parent_user_id: int) -> bool:
        """关联学生和家长"""
        # 根据用户ID查找对应的角色模型
        student_user = self.db.query(User).filter(User.id == student_user_id).first()
        parent_user = self.db.query(User).filter(User.id == parent_user_id).first()
        
        if not student_user or not parent_user:
            return False
            
        student = student_user.student
        parent = parent_user.parent
        
        if not student or not parent:
            return False
            
        student.parent_id = parent.id
        self.db.commit()
        return True

    def get_all_students(self) -> List[User]:
        """获取所有学生（仅管理员使用）"""
        return self.db.query(User).filter(User.role == UserRole.STUDENT).all()

    def get_all_admins(self) -> List[User]:
        """获取所有管理员（仅超级管理员使用）"""
        return self.db.query(User).filter(User.role == UserRole.ADMIN).all()

    def get_student_progress(self, student_id: int) -> Dict[str, Any]:
        """获取学生的学习进度详情"""
        student = self.db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {}

        # 基础统计
        stats = self.get_student_stats(student_id)
        
        # 最近练习历史
        recent_exercises = self.db.query(Exercise).filter(
            Exercise.student_id == student_id,
            Exercise.completed_at.isnot(None)
        ).order_by(Exercise.completed_at.desc()).limit(10).all()

        # 按难度级别的统计
        difficulty_stats = {}
        for exercise in student.exercises:
            if exercise.completed_at:
                diff = exercise.difficulty.value
                if diff not in difficulty_stats:
                    difficulty_stats[diff] = {
                        "count": 0,
                        "total_score": 0,
                        "completed": 0
                    }
                difficulty_stats[diff]["count"] += 1
                if exercise.final_score:
                    difficulty_stats[diff]["total_score"] += exercise.final_score
                    difficulty_stats[diff]["completed"] += 1

        # 计算每个难度的平均分（使用不同的循环变量，避免覆盖上面的 stats）
        for diff_stats in difficulty_stats.values():
            if diff_stats["completed"] > 0:
                diff_stats["average_score"] = round(
                    diff_stats["total_score"] / diff_stats["completed"],
                    2,
                )
            else:
                diff_stats["average_score"] = 0.0

        return {
            **stats,
            "recent_exercises": [
                {
                    "id": ex.id,
                    "date": ex.completed_at.strftime("%Y-%m-%d %H:%M"),
                    "difficulty": ex.difficulty.value,
                    "score": ex.final_score,
                    "time_spent": ex.total_time
                }
                for ex in recent_exercises
            ],
            "difficulty_stats": difficulty_stats
        }

    def get_multi_by_role(self, role: UserRole) -> List[User]:
        """根据角色获取用户列表"""
        return self.db.query(User).filter(User.role == role).all()

    def activate_user(self, user: User) -> User:
        """激活用户账号"""
        user.is_active = True
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def deactivate_user(self, user: User) -> User:
        """禁用用户账号"""
        user.is_active = False
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, id: int) -> None:
        """删除用户（包括关联数据）"""
        user = self.get(id)
        if not user:
            return

        # 根据用户角色删除相应的配置信息
        if user.role == UserRole.STUDENT:
            student = self.db.query(Student).filter(Student.user_id == user.id).first()
            if student:
                self.db.delete(student)
        elif user.role == UserRole.TEACHER:
            teacher = self.db.query(Teacher).filter(Teacher.user_id == user.id).first()
            if teacher:
                self.db.delete(teacher)
        elif user.role == UserRole.PARENT:
            parent = self.db.query(Parent).filter(Parent.user_id == user.id).first()
            if parent:
                self.db.delete(parent)
        elif user.role == UserRole.ADMIN:
            admin = self.db.query(Admin).filter(Admin.user_id == user.id).first()
            if admin:
                self.db.delete(admin)
        
        # 删除用户
        self.db.delete(user)
        self.db.commit()

    def get_teacher_stats(self, teacher_id: int) -> dict:
        """获取教师的学生统计数据"""
        # 获取该教师的所有学生
        teacher = self.get_teacher_by_id(teacher_id)
        student_ids = [student.id for student in teacher.students]
        
        # 获取今天的开始和结束时间
        today_start = datetime.combine(datetime.today(), time.min)
        today_end = datetime.combine(datetime.today(), time.max)
        
        # 查询今日完成的练习数量
        exercises_today = (
            self.db.query(Exercise)
            .filter(
                Exercise.student_id.in_(student_ids),
                Exercise.completed_at.between(today_start, today_end)
            )
            .count()
        )
        
        # 计算平均正确率 (将分数转换为0-1之间的百分比)
        accuracy_result = (
            self.db.query(func.avg(Exercise.final_score))
            .filter(Exercise.student_id.in_(student_ids))
            .scalar()
        )
        average_accuracy = round((accuracy_result or 0) / 100, 2)
        
        # 获取最近活动
        recent_activities = (
            self.db.query(Exercise, User)
            .join(User, Exercise.student_id == User.id)
            .filter(Exercise.student_id.in_(student_ids))
            .order_by(Exercise.completed_at.desc())
            .limit(5)
            .all()
        )
        
        activities_list = []
        for exercise, student in recent_activities:
            activities_list.append({
                "id": exercise.id,
                "student_name": student.username,
                "score": exercise.final_score,
                "completed_at": exercise.completed_at,
                "type": "exercise"
            })
        
        return {
            "total_students": len(student_ids),
            "exercises_today": exercises_today,
            "average_accuracy": average_accuracy,
            "recent_activities": activities_list
        }

    def get_parent_stats(self, parent_id: int) -> dict:
        """获取家长的孩子统计数据"""
        # 获取该家长信息（兼容传入 Parent.id 或 User.id）
        parent = self.get_parent_by_id(parent_id)
        children = parent.students  # Student 列表

        # 获取今天的开始和结束时间
        today_start = datetime.combine(datetime.today(), time.min)
        today_end = datetime.combine(datetime.today(), time.max)

        # 初始化统计数据
        total_exercises_today = 0
        total_score_sum = 0.0  # 仅统计有分数的练习
        total_scored_exercises = 0
        children_stats = []

        # 统计每个孩子的数据
        for child in children:
            # 获取孩子今天的练习数（按完成时间）
            child_exercises_today = (
                self.db.query(Exercise)
                .filter(
                    Exercise.student_id == child.id,
                    Exercise.completed_at.between(today_start, today_end)
                )
                .count()
            )

            # 获取孩子的总体练习并计算分数
            child_exercises = (
                self.db.query(Exercise)
                .filter(Exercise.student_id == child.id)
                .all()
            )

            scores = [ex.final_score for ex in child_exercises if ex.final_score is not None]
            child_total_exercises = len(child_exercises)
            child_avg_score = round(sum(scores) / len(scores), 2) if len(scores) > 0 else 0.0

            children_stats.append({
                # 对前端友好：使用 User.id 作为标识，便于与用户对象映射
                "id": child.user.id,
                "name": child.user.username,
                "exercises_today": child_exercises_today,
                "total_exercises": child_total_exercises,
                "average_score": child_avg_score,
            })

            total_exercises_today += child_exercises_today
            total_score_sum += sum(scores)
            total_scored_exercises += len(scores)

        # 计算总体平均正确率（0-1 区间，与教师端保持一致）
        overall_avg_score = (total_score_sum / total_scored_exercises) if total_scored_exercises > 0 else 0.0
        average_accuracy = round(overall_avg_score / 100, 2)

        # 获取最近活动（联接 Student -> User 以获得用户名）
        student_ids = [child.id for child in children]
        recent_activities = (
            self.db.query(Exercise, User)
            .join(Student, Exercise.student_id == Student.id)
            .join(User, Student.user_id == User.id)
            .filter(Exercise.student_id.in_(student_ids))
            .order_by(Exercise.completed_at.desc())
            .limit(5)
            .all()
        )

        activities_list = []
        for exercise, student in recent_activities:
            activities_list.append({
                "id": exercise.id,
                "student_name": student.username,
                "score": exercise.final_score,
                "completed_at": exercise.completed_at,
                "type": "exercise",
            })

        return {
            "total_children": len(children),
            "total_exercises_today": total_exercises_today,
            "average_accuracy": average_accuracy,
            "children_stats": children_stats,
            "recent_activities": activities_list,
        }

    def get_teacher_by_id(self, teacher_id: int) -> Teacher:
        """根据ID获取教师"""
        return self.db.query(Teacher).filter(Teacher.id == teacher_id).first()

    def get_parent_by_id(self, parent_id: int) -> Parent:
        """根据ID获取家长（兼容 Parent.id 与 User.id 两种传参）"""
        parent = self.db.query(Parent).filter(Parent.id == parent_id).first()
        if not parent:
            parent = self.db.query(Parent).filter(Parent.user_id == parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="家长不存在")
        return parent
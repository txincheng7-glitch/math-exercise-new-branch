"""app/schemas/user.py
作用：定义用户相关的数据模型

包含：
1. 用户基础信息和更新模型
2. 不同角色（学生、教师、家长、管理员）的创建和配置模型
3. 用户认证相关的Token模型
"""

from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.user import UserRole


class UserBase(BaseModel):
    """用户基础模型
    
    包含用户的基本信息字段，所有用户类型共用的属性
    """
    email: EmailStr    # EmailStr是Pydantic提供的邮箱字段类型，会自动验证邮箱格式
    username: str      # 用户名

    @field_validator('username')
    def username_must_be_valid(cls, v):
        """验证用户名的长度
        
        Args:
            v: 用户名字符串
        """
        if len(v) < 3:
            raise ValueError('用户名至少需要3个字符')
        if len(v) > 20:
            raise ValueError('用户名不能超过20个字符')
        return v


class UserCreateBase(UserBase):
    """用户创建基础模型
    
    所有角色创建模型的基类，包含基本的创建字段
    """
    password: str

    @field_validator('password')
    def password_must_be_strong(cls, v):
        """验证密码长度
        
        Args:
            v: 密码字符串
        """
        if len(v) < 6:
            raise ValueError('密码至少需要6个字符')
        return v


class UserUpdate(BaseModel):
    """用户更新模型
    
    所有字段都是可选的，允许部分更新用户基本信息
    """
    email: Optional[EmailStr] = None      # 可选的邮箱更新
    username: Optional[str] = None        # 可选的用户名更新
    password: Optional[str] = None        # 可选的密码更新

    @field_validator('username')
    def username_must_be_valid(cls, v):
        """验证用户名长度（如果提供了用户名）
        
        Args:
            v: 用户名字符串，可能为None
        """
        if v is not None:
            if len(v) < 3:
                raise ValueError('用户名至少需要3个字符')
            if len(v) > 20:
                raise ValueError('用户名不能超过20个字符')
        return v

    @field_validator('password')
    def password_must_be_strong(cls, v):
        """验证密码长度（如果提供了密码）
        
        Args:
            v: 密码字符串，可能为None
        """
        if v is not None and len(v) < 6:
            raise ValueError('密码至少需要6个字符')
        return v


class UserInDB(UserBase):
    """数据库用户模型
    
    用于内部使用，包含数据库中的额外字段
    """
    id: int              # 用户ID
    is_active: bool      # 账户是否激活
    role: UserRole       # 用户角色
    created_at: datetime # 创建时间

    model_config = ConfigDict(from_attributes=True)


class StudentProfile(BaseModel):
    """学生个人配置模型
    
    定义学生特有的配置信息
    """
    grade: str        # 年级
    class_name: str   # 班级


class TeacherProfile(BaseModel):
    """教师个人配置模型
    
    定义教师特有的配置信息
    """
    subjects: List[str]  # 教授科目列表


class StudentCreate(UserCreateBase):
    """学生创建模型
    
    用于创建学生用户，包含基本信息、密码和学生特有配置
    """
    role: UserRole = UserRole.STUDENT    # 固定角色为学生
    profile: StudentProfile              # 学生配置信息


class TeacherCreate(UserCreateBase):
    """教师创建模型
    
    用于创建教师用户，包含基本信息、密码和教师特有配置
    """
    role: UserRole = UserRole.TEACHER    # 固定角色为教师
    profile: TeacherProfile             # 教师配置信息


class ParentCreate(UserCreateBase):
    """家长创建模型
    
    用于创建家长用户，包含基本信息、密码和关联的学生列表
    """
    role: UserRole = UserRole.PARENT     # 固定角色为家长
    student_emails: List[str]            # 关联的学生邮箱列表


class AdminCreate(UserCreateBase):
    """管理员创建模型
    
    用于创建管理员用户，包含基本信息、密码和特殊权限配置
    """
    role: UserRole = UserRole.ADMIN      # 固定角色为管理员
    is_superuser: bool = False           # 是否为超级管理员
    permissions: List[str] = []          # 特殊权限列表


class UserResponse(UserInDB):
    """用户响应模型
    
    用于向前端返回用户信息，包含基本信息和角色特有信息
    """
    student_profile: Optional[StudentProfile] = None  # 学生配置（仅当用户是学生时）
    teacher_profile: Optional[TeacherProfile] = None  # 教师配置（仅当用户是教师时）

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    """通用用户创建模型
    
    用于注册接口，根据role字段决定创建哪种用户
    """
    email: EmailStr
    username: str
    password: str
    role: UserRole = UserRole.STUDENT  # 默认角色为学生

    @field_validator('username')
    def username_must_be_valid(cls, v):
        if len(v) < 3:
            raise ValueError('用户名至少需要3个字符')
        if len(v) > 20:
            raise ValueError('用户名不能超过20个字符')
        return v

    @field_validator('password')
    def password_must_be_strong(cls, v):
        if len(v) < 6:
            raise ValueError('密码至少需要6个字符')
        return v


class Token(BaseModel):
    """JWT令牌模型
    
    用于用户认证的令牌响应
    """
    access_token: str           # 访问令牌
    token_type: str = "bearer"  # 令牌类型，固定为"bearer"


class TokenPayload(BaseModel):
    """令牌载荷模型
    
    定义JWT令牌中包含的数据
    """
    sub: str       # 主题（用户ID）
    exp: datetime  # 过期时间


class StudentProgress(BaseModel):
    """学生进度模型
    
    用于返回学生的学习进度和统计信息
    """
    # 基础统计
    total_exercises: int          # 练习总数
    completed_exercises: int      # 已完成练习数
    average_score: float         # 平均分数
    total_time: int              # 总用时（秒）

    # 最近练习记录
    recent_exercises: List[Dict[str, Any]] = []  # 最近的练习记录列表

    # 按难度级别的统计
    difficulty_stats: Dict[str, Dict[str, Any]] = {}  # 各难度级别的统计信息

    class Config:
        json_schema_extra = {
            "example": {
                "total_exercises": 50,
                "completed_exercises": 45,
                "average_score": 85.5,
                "total_time": 3600,
                "recent_exercises": [
                    {
                        "id": 1,
                        "date": "2025-05-05 14:30",
                        "difficulty": "简单",
                        "score": 90,
                        "time_spent": 300
                    }
                ],
                "difficulty_stats": {
                    "简单": {
                        "count": 20,
                        "completed": 18,
                        "average_score": 92.5
                    },
                    "中等": {
                        "count": 20,
                        "completed": 17,
                        "average_score": 85.0
                    },
                    "困难": {
                        "count": 10,
                        "completed": 10,
                        "average_score": 78.5
                    }
                }
            }
        }
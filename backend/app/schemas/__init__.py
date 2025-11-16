"""app/schemas/__init__.py
作用：导出所有模型类，方便其他模块导入

通过这个文件，其他模块可以直接从schemas包导入所需的模型，
而不需要关心具体的文件路径，例如：
from app.schemas import StudentCreate, ExerciseResponse

导出的模型包括：
1. 基础模型：用于继承的基类和混入类
2. 用户相关模型：
   - 基础用户模型和创建基类
   - 各角色专用模型（学生、教师、家长、管理员）
   - 角色配置模型（StudentProfile, TeacherProfile）
   - 统计和进度模型（StudentProgress）
   - 认证相关模型（Token）
3. 练习相关模型：
   - 题目模型
   - 练习模型
   - 统计和反馈模型
4. 通用模型：错误响应、分页参数等
"""

from .base import BaseResponse, TimestampMixin, IDMixin
from .user import (
    UserBase, UserCreateBase, UserUpdate, UserInDB, 
    UserResponse, Token, TokenPayload,
    TeacherCreate, ParentCreate, AdminCreate,
    StudentCreate, StudentProfile, TeacherProfile,
    StudentProgress
)
from .exercise import (
    QuestionBase, QuestionCreate, QuestionUpdate, QuestionResponse,
    ExerciseBase, ExerciseCreate, ExerciseUpdate, ExerciseResponse,
    ExerciseStats, ExerciseListResponse, ExerciseFeedbackRequest
)
from .common import ErrorResponse, PaginationParams, HealthCheck
from .stats import TeacherStats, ParentStats, ActivityBase, ChildStats

# __all__变量明确指定了可以从这个模块导入的名称
__all__ = [
    # 基础模型：提供基本功能的模型类
    "BaseResponse",
    "TimestampMixin",
    "IDMixin",
    
    # 用户相关模型
    ## 基础用户模型
    "UserBase",          # 用户基础字段
    "UserCreateBase",    # 用户创建基类
    "UserUpdate",        # 用户更新模型
    "UserInDB",          # 数据库用户模型
    "UserResponse",      # 用户响应模型
    ## 认证相关模型
    "Token",             # JWT令牌模型
    "TokenPayload",      # 令牌载荷模型
    ## 角色专用模型
    "TeacherCreate",     # 教师创建模型
    "ParentCreate",      # 家长创建模型
    "AdminCreate",       # 管理员创建模型
    "StudentCreate",     # 学生创建模型
    ## 角色配置模型
    "StudentProfile",    # 学生配置信息
    "TeacherProfile",    # 教师配置信息
    ## 统计和进度
    "StudentProgress",   # 学生学习进度模型
    
    # 练习相关模型
    ## 题目模型
    "QuestionBase",
    "QuestionCreate",
    "QuestionUpdate",
    "QuestionResponse",
    ## 练习模型
    "ExerciseBase",
    "ExerciseCreate",
    "ExerciseUpdate",
    "ExerciseResponse",
    ## 统计和反馈
    "ExerciseStats",
    "ExerciseListResponse",
    "ExerciseFeedbackRequest",
    
    # 通用工具模型
    "ErrorResponse",     # 错误响应模型
    "PaginationParams",  # 分页参数模型
    "HealthCheck",      # 健康检查模型

    # 新增统计模型
    "TeacherStats",     # 教师统计信息模型
    "ParentStats"       # 家长统计信息模型
]
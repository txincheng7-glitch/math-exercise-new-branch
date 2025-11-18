"""app/models/__init__.py
作用: 导出模型类，使其可以通过models包直接导入

此模块集中管理所有数据模型的导入和导出，便于其他模块统一引用。包含:
- 用户相关模型：
  * 基础模型：User（用户基础信息）
  * 角色模型：Student（学生）、Teacher（教师）、Parent（家长）、Admin（管理员）
  * 枚举类型：UserRole（用户角色）
- 练习相关模型：
  * Exercise（练习）、Question（题目）
  * 枚举类型：DifficultyLevel（难度等级）、OperatorType（运算符类型）
"""

from .user import User, Student, Teacher, Parent, Admin, UserRole  # 导入用户相关模型和角色枚举
from .exercise import Exercise, Question, DifficultyLevel, OperatorType  # 导入练习相关模型和枚举
from .message import (
  Conversation,
  ConversationParticipant,
  Message,
  MessageReceipt,
)  # 导入消息系统模型

# 定义此模块的公开接口
__all__ = [
    # 用户相关模型
    "User",              # 用户基础模型
    "Student",           # 学生模型（与User一对一关联）
    "Teacher",           # 教师模型（与User一对一关联）
    "Parent",            # 家长模型（与User一对一关联）
    "Admin",             # 管理员模型（与User一对一关联）
    "UserRole",          # 用户角色枚举（学生、教师、家长、管理员）
    
    # 练习相关模型
    "Exercise",          # 练习模型
    "Question",          # 题目模型
    "DifficultyLevel",   # 难度等级枚举（简单、中等、困难）
    "OperatorType"       # 运算符类型枚举（加、减、乘、除）
    ,
    # 消息相关模型
    "Conversation",
    "ConversationParticipant",
    "Message",
    "MessageReceipt"
]
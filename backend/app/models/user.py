"""app/models/user.py
作用：定义用户相关的数据模型

数据库关系说明：
1. User <-> Role模型（一对一）：
   每个User都有且仅有一个对应的角色模型（Student/Teacher/Parent/Admin）
   - 外键：Role模型.user_id -> User.id
   - 关系属性：
     * User.{role}: 用户对应的角色模型实例（如User.student）
     * Role模型.user: 角色对应的用户实例

2. Student <-> Teacher（多对一）：
   - 外键：Student.teacher_id -> Teacher.id
   - 关系属性：
     * Teacher.students: 教师关联的所有学生
     * Student.teacher: 学生的指导教师

3. Student <-> Parent（多对一）：
   - 外键：Student.parent_id -> Parent.id
   - 关系属性：
     * Parent.students: 家长关联的所有学生
     * Student.parent: 学生的家长

4. Student <-> Exercise（一对多）：
   - 外键：Exercise.student_id -> Student.id
   - 关系属性：
     * Student.exercises: 学生的所有练习
     * Exercise.student: 练习所属的学生
"""

from enum import Enum
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class UserRole(str, Enum):
    """
    用户角色的枚举类
    继承str使得枚举值可以直接序列化为字符串，便于数据库存储和API交互
    """
    STUDENT = "student"    # 学生用户
    TEACHER = "teacher"    # 教师用户
    PARENT = "parent"      # 家长用户
    ADMIN = "admin"        # 管理员用户


class User(Base):
    """
    用户基础模型：系统中所有用户的基础信息
    作为其他角色模型（学生、教师等）的主表，与它们形成一对一关系
    """
    __tablename__ = "users"  # 指定数据库表名

    # 用户的唯一标识符
    id = Column(Integer, primary_key=True, index=True)
    # 用户电子邮箱，要求唯一且建立索引以优化查询
    email = Column(String, unique=True, index=True)
    # 用户名，要求唯一且建立索引以优化查询
    username = Column(String, unique=True, index=True)
    # 密码的哈希值，仅存储加密后的密码，确保安全性
    hashed_password = Column(String)
    # 用户状态标志，用于控制账户的启用/禁用
    is_active = Column(Boolean, default=True)
    # 是否是超级管理员
    is_superuser = Column(Boolean, default=False)
    # 用户角色，使用枚举类型确保角色值的合法性
    role = Column(SQLEnum(UserRole))
    # 账户创建时间，自动记录用户注册时间
    created_at = Column(DateTime, default=datetime.utcnow)

    # 与其他角色模型的一对一关系
    # 每个用户根据其角色只能与一个具体的角色表建立关联
    student = relationship("Student", back_populates="user", uselist=False)
    teacher = relationship("Teacher", back_populates="user", uselist=False)
    parent = relationship("Parent", back_populates="user", uselist=False)
    admin = relationship("Admin", back_populates="user", uselist=False)


class Student(Base):
    """
    学生模型：存储学生特有的信息
    与User模型形成一对一关系，与练习形成一对多关系
    同时可以关联到一个教师和一个家长
    """
    __tablename__ = "students"  # 指定数据库表名

    # 学生记录的唯一标识符
    id = Column(Integer, primary_key=True, index=True)
    # 外键字段：关联到用户表，确保一对一关系
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    # 学生所在年级
    grade = Column(String)
    # 学生所在班级
    class_name = Column(String)
    # 记录创建时间
    created_at = Column(DateTime, default=datetime.utcnow)

    # 外键字段：关联到教师和家长表
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    parent_id = Column(Integer, ForeignKey("parents.id"))

    # 关联关系定义
    # 与User表的一对一关系
    user = relationship("User", back_populates="student")
    # 与Teacher表的多对一关系，多个学生可以对应一个教师
    teacher = relationship("Teacher", back_populates="students")
    # 与Parent表的多对一关系，多个学生可以对应一个家长
    parent = relationship("Parent", back_populates="students")
    # 与Exercise表的一对多关系，一个学生可以有多个练习
    exercises = relationship("Exercise", back_populates="student")


class Teacher(Base):
    """
    教师模型：存储教师特有的信息
    与User模型形成一对一关系，与Student形成一对多关系
    """
    __tablename__ = "teachers"  # 指定数据库表名

    # 教师记录的唯一标识符
    id = Column(Integer, primary_key=True, index=True)
    # 外键字段：关联到用户表，确保一对一关系
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    # 教授科目列表，使用JSON格式存储多个科目
    subjects = Column(JSON)
    # 记录创建时间
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关联关系定义
    # 与User表的一对一关系
    user = relationship("User", back_populates="teacher")
    # 与Student表的一对多关系，一个教师可以有多个学生
    students = relationship("Student", back_populates="teacher")
    # 移除classes关系
    # classes = relationship("Class", back_populates="teacher")


class Parent(Base):
    """
    家长模型：存储家长特有的信息
    与User模型形成一对一关系，与Student形成一对多关系
    """
    __tablename__ = "parents"  # 指定数据库表名

    # 家长记录的唯一标识符
    id = Column(Integer, primary_key=True, index=True)
    # 外键字段：关联到用户表，确保一对一关系
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    # 记录创建时间
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关联关系定义
    # 与User表的一对一关系
    user = relationship("User", back_populates="parent")
    # 与Student表的一对多关系，一个家长可以关联多个学生
    students = relationship("Student", back_populates="parent")


class Admin(Base):
    """
    管理员模型：存储管理员特有的信息
    与User模型形成一对一关系，包含特殊的权限配置
    """
    __tablename__ = "admins"  # 指定数据库表名

    # 管理员记录的唯一标识符
    id = Column(Integer, primary_key=True, index=True)
    # 外键字段：关联到用户表，确保一对一关系
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    # 特殊权限配置，使用JSON格式存储权限列表
    permissions = Column(JSON)
    # 记录创建时间
    created_at = Column(DateTime, default=datetime.utcnow)

    # 与User表的一对一关系
    user = relationship("User", back_populates="admin")
"""
文件名: app/models/exercise.py
作用: 定义练习系统的数据模型，包括练习和题目的数据结构

数据库关系说明：
1. Student <-> Exercise（一对多）：
   - 外键：Exercise.student_id -> Student.id
   - 关系属性：
     * Student.exercises: 学生的所有练习列表
     * Exercise.student: 练习所属的学生
   - 重构说明：原先是与User关联，现在直接与Student关联，使关系更加明确

2. Exercise <-> Question（一对多）：
   - 外键：Question.exercise_id -> Exercise.id
   - 关系属性：
     * Exercise.questions: 练习包含的所有题目列表
     * Question.exercise: 题目所属的练习

SQLAlchemy relationship说明：
1. 双向关系的行为：
   - Python对象级别：关系的两端会立即同步更新
     比如设置exercise.student = student时：
     * exercise.student指向student对象
     * student.exercises列表会包含exercise对象
   - 数据库级别：外键的更新要等到Session提交时才会同步
   - 设置关系的两种等效方式（以Student-Exercise为例）：
     * exercise.student = student
     * student.exercises.append(exercise)

2. back_populates参数：
   - 用于建立双向关系，指定对方模型中的对应属性名
   - 确保关系的两端保持同步
   - 使得可以从任意一端访问和操作关系
"""

# 导入SQLAlchemy的hybrid_property，用于创建可在Python和SQL中都能使用的混合属性
from sqlalchemy.ext.hybrid import hybrid_property
# 导入用于构建SQL表达式的工具
from sqlalchemy import case, cast, Float, func
# 导入SQLAlchemy的基本列类型和工具
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, 
    Enum as SQLEnum, JSON  # SQLEnum用于在数据库中存储枚举类型
)
# 导入ORM关系管理工具
from sqlalchemy.orm import relationship
# 导入datetime用于处理时间戳
from datetime import datetime
# 导入Base类，所有模型都继承自它
from ..database import Base
# 导入Enum用于创建枚举类型
from enum import Enum

class DifficultyLevel(str, Enum):
    """
    练习难度等级的枚举类
    继承str使得枚举值可以直接序列化为字符串
    """
    EASY = "简单"
    MEDIUM = "中等"
    HARD = "困难"

class OperatorType(str, Enum):
    """
    数学运算符的枚举类
    定义支持的运算符类型
    """
    ADDITION = "+"         # 加法运算符
    SUBTRACTION = "-"      # 减法运算符
    MULTIPLICATION = "*"   # 乘法运算符
    DIVISION = "/"        # 除法运算符

class Exercise(Base):
    """
    练习模型：代表一次完整的练习会话
    """
    __tablename__ = "exercises"  # 指定数据库表名

    # 练习的唯一标识符
    id = Column(Integer, primary_key=True, index=True)
    # 外键字段：关联到学生表，表明此练习属于哪个学生
    # 在数据库层面，外键字段在"多"的一方（即练习表），指向"一"的一方（即学生表）的id
    # 这确保了一个练习必须属于一个学生，而一个学生可以有多个练习
    # 重构说明：由原来关联user改为直接关联student，使关系更加明确
    student_id = Column(Integer, ForeignKey("students.id"))
    # 练习难度级别
    difficulty = Column(SQLEnum(DifficultyLevel))
    # 数值范围，存储为JSON格式：[最小值, 最大值]
    number_range = Column(JSON)
    # 使用的运算符列表，存储为JSON数组
    operator_types = Column(JSON)
    # 练习创建时间，默认为当前时间
    created_at = Column(DateTime, default=datetime.utcnow)
    # 练习完成时间，可为空
    completed_at = Column(DateTime, nullable=True)
    # 练习最终得分，可为空
    final_score = Column(Float, nullable=True)
    # 练习总用时（秒），可为空
    total_time = Column(Integer, nullable=True)
    # AI点评内容，可为空
    ai_feedback = Column(String, nullable=True)

    # 练习包含的所有题目列表，对应Question模型中的exercise属性
    questions = relationship("Question", back_populates="exercise")
    # 练习所属的学生，对应Student模型中的exercises属性
    # 通过这个关系可以直接访问学生的信息，如：exercise.student.grade
    student = relationship("Student", back_populates="exercises")

    def to_response(self) -> "ExerciseResponse":
        """转换为响应模型"""
        # 避免循环导入，在方法内部导入
        from ..schemas.exercise import ExerciseResponse
        # 使用pydantic的model_validate方法将SQLAlchemy模型转换为Pydantic模型
        return ExerciseResponse.model_validate(self)

class Question(Base):
    """
    题目模型：代表练习中的单个题目
    """
    __tablename__ = "questions"  # 指定数据库表名

    # 题目的唯一标识符
    id = Column(Integer, primary_key=True, index=True)
    # 外键字段：关联到练习表，表明此题目属于哪个练习
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    # 题目内容（如："1 + 2"）
    content = Column(String)
    # 题目的正确答案
    correct_answer = Column(Float)
    # 用户提交的答案，可为空
    user_answer = Column(Float, nullable=True)
    # 用户答题用时（秒），可为空
    time_spent = Column(Integer, nullable=True)
    # 题目使用的运算符，存储为JSON数组
    operator_types = Column(JSON)
    # 题目的算术表达式树结构，存储为JSON，可为空
    arithmetic_tree = Column(JSON, nullable=True)

    # 题目所属的练习，对应Exercise模型中的questions属性
    exercise = relationship("Exercise", back_populates="questions")
    
    @hybrid_property
    def is_correct(self) -> bool:
        """
        混合属性：判断答案是否正确（Python层面的实现）
        
        这个方法处理Python对象级别的计算，当我们直接访问question.is_correct时使用。
        在Python中可以直接使用if判断和abs()函数，写法自然且直观：
        - 先用if处理None值的情况
        - 再用abs()计算差值并比较
        
        而这种Python的写法无法直接转换为SQL表达式，所以需要用@is_correct.expression
        定义另一个专门用于SQL查询的实现。
        """
        if self.user_answer is None:
            return False
        return abs(self.correct_answer - self.user_answer) < 0.001

    @is_correct.expression
    def is_correct(cls):
        """
        混合属性：判断答案是否正确（SQL层面的实现）
        
        这个方法处理数据库查询层面的计算，在进行filter()等查询操作时使用。
        因为SQL的语法结构和Python完全不同，所以需要用SQLAlchemy提供的工具来构建等价的SQL表达式：
        - 用case()代替if判断
        - 用is_()代替is None判断
        - 用func.abs()代替abs()函数
        - 用cast()确保类型转换
        
        例如可以这样查询：
        session.query(Question).filter(Question.is_correct).all()
        """
        return case(
            # 如果用户答案为空，返回False
            (cls.user_answer.is_(None), False),
            # 否则检查答案是否在误差范围内
            else_=func.abs(
                cls.correct_answer - cast(cls.user_answer, Float)
            ) < 0.001
        )

    def to_response(self) -> "QuestionResponse":
        """
        辅助方法：将数据库模型转换为API响应模型
        避免直接在API层暴露数据库模型
        
        Returns:
            QuestionResponse: API响应格式的题目数据
            
        注：这里使用字符串形式的类型注解"QuestionResponse"而不是直接引用类，
        是因为在解释器执行到这行代码时QuestionResponse类还未被定义，
        使用字符串形式可以避免出现NameError
        """
        from ..schemas.exercise import QuestionResponse
        return QuestionResponse.model_validate(self)
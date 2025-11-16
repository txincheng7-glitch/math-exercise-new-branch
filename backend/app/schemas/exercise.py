"""app/schemas/exercise.py
作用：定义练习相关的数据模型

这个文件定义了所有与数学练习相关的Pydantic模型，包括：
1. 题目模型（基础、创建、更新、响应）
2. 练习模型（基础、创建、更新、响应）
3. 练习统计和列表响应模型

主要的数据流：
1. 创建练习：ExerciseCreate -> Exercise(DB) -> ExerciseResponse
2. 提交答案：QuestionUpdate -> Question(DB) -> QuestionResponse
3. 查询统计：Exercise(DB) + Question(DB) -> ExerciseStats
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
# BaseModel：Pydantic基础模型类
# Field：字段函数，用于定义字段的详细配置
# field_validator：字段验证装饰器
# ConfigDict：模型配置字典类型

from typing import List, Optional, Tuple
from datetime import datetime
from ..models.exercise import DifficultyLevel, OperatorType
# 导入枚举类型：
# - DifficultyLevel：难度等级（简单、中等、困难）
# - OperatorType：运算符类型（加、减、乘、除）

# ==== 题目相关模型 ====

class QuestionBase(BaseModel):
    """题目基础模型
    
    包含题目的基本信息，被其他题目相关模型继承
    """
    content: str                    # 题目内容，如："1 + 2"
    operator_types: List[OperatorType]  # 使用的运算符列表
    arithmetic_tree: Optional[dict] = None  # 算术表达式树，可选字段


class QuestionCreate(QuestionBase):
    """题目创建模型
    
    在基础模型基础上添加了正确答案字段
    """
    correct_answer: float  # 题目的正确答案


class QuestionUpdate(BaseModel):
    """题目更新模型
    
    用于提交用户答案时的请求体
    """
    # 字段的类型标注同时也是Pydantic的类型转换规则：
    # - 对于user_answer：字符串"12.34"或整数42都会被转换为float类型
    user_answer: float  # 用户提交的答案

    # - 对于time_spent：字符串"42"或浮点数42.0会被转换为int类型
    # - 注意：42.1这样的非整浮点数会导致验证错误
    # Field用于为字段提供额外的验证规则和元数据
    # - ...表示该字段必填
    # - gt=0表示值必须大于0
    # - description用于API文档说明
    time_spent: int = Field(
        ...,
        gt=0,
        description="答题用时（秒）"
    )


class QuestionResponse(QuestionBase):
    """题目响应模型
    
    用于向前端返回题目信息的完整模型
    """
    id: int                         # 题目ID
    exercise_id: int                # 所属练习的ID
    correct_answer: float           # 正确答案
    user_answer: Optional[float] = None   # 用户答案，可选
    time_spent: Optional[int] = None      # 答题用时，可选
    is_correct: Optional[bool] = None     # 是否正确，可选

    model_config = ConfigDict(from_attributes=True)

# ==== 练习相关模型 ====

class ExerciseBase(BaseModel):
    """练习基础模型
    
    定义练习的基本属性
    """
    difficulty: DifficultyLevel  # 难度等级
    number_range: Tuple[int, int] = Field(
        ...,
        description="数值范围[最小值, 最大值]"
    )
    operator_types: List[OperatorType]  # 允许使用的运算符

    # field_validator装饰器用于定义自定义的字段验证逻辑
    # 可以进行复杂的验证，并在验证失败时抛出ValueError
    @field_validator('number_range')
    def validate_number_range(cls, v):
        """验证数值范围的有效性
        
        Args:
            cls: 类引用，是Pydantic模型类本身（这里是ExerciseBase）
                 由Pydantic自动传入，用于访问类的属性和方法
            v: 要验证的字段值，这里是Tuple[int, int]类型
               即number_range字段的实际值，如(1, 100)
        
        Returns:
            验证通过时返回原值或修改后的值
        
        Raises:
            ValueError: 当验证失败时抛出，错误信息会被Pydantic捕获并处理
        """
        if len(v) != 2:
            raise ValueError('数值范围必须包含两个值[min, max]')
        if v[0] >= v[1]:
            raise ValueError('最小值必须小于最大值')
        return v

    @field_validator('operator_types')
    def validate_operator_types(cls, v):
        """验证运算符列表非空
        
        Args:
            cls: 类引用，是ExerciseBase类本身
            v: 要验证的字段值，这里是List[OperatorType]类型
               即operator_types字段的实际值，如["+", "-"]
        
        Returns:
            验证通过时返回运算符列表
        
        Raises:
            ValueError: 当运算符列表为空时抛出
        """
        if not v:
            raise ValueError('至少需要选择一种运算符')
        return v


class ExerciseCreate(ExerciseBase):
    """练习创建模型"""
    question_count: int = Field(
        ...,
        gt=0,           # 大于0
        le=100,         # 小于等于100
        description="题目数量"
    )


class ExerciseUpdate(BaseModel):
    """练习更新模型"""
    ai_feedback: Optional[str] = None  # AI点评内容


class ExerciseResponse(ExerciseBase):
    """练习响应模型
    
    完整的练习信息，包含所有题目
    
    数据流向：
    1. 数据库Exercise模型 -> ExerciseResponse
    2. ExerciseResponse -> JSON响应
    3. JSON -> 前端展示
    """
    id: int                         # 练习ID
    student_id: int                 # 学生ID，关联到Student模型
                                   # 重构：从user_id改为student_id，直接关联到学生
    created_at: datetime            # 创建时间
    completed_at: Optional[datetime] = None  # 完成时间
    final_score: Optional[float] = None      # 最终得分
    total_time: Optional[int] = None         # 总用时
    ai_feedback: Optional[str] = None        # AI点评
    questions: List[QuestionResponse]        # 题目列表

    # ConfigDict用于配置Pydantic模型的行为
    # from_attributes=True 允许直接从ORM模型（如SQLAlchemy模型）创建Pydantic模型
    # 转换过程：
    # 1. 当传入SQLAlchemy模型实例时，Pydantic会自动访问实例的属性（通过__dict__或getattr）
    # 2. 对于普通字段，直接复制值
    # 3. 对于relationship字段（如questions），递归地转换关联的模型
    # 4. 对于hybrid_property，会自动计算并包含在结果中
    # 5. 支持的转换示例：
    #    # 直接使用model_validate方法转换
    #    db_exercise = session.query(Exercise).first()
    #    response = ExerciseResponse.model_validate(db_exercise)
    #    
    #    # 在FastAPI路由中的使用：
    #    @router.post("/", response_model=schemas.ExerciseResponse)
    #    def create_exercise(...):
    #        exercise = exercise_service.create_exercise(...)
    #        return exercise  # FastAPI会自动进行：
    #                        # 1. Exercise模型 -> ExerciseResponse转换
    #                        # 2. ExerciseResponse -> JSON序列化
    #                        # 最终返回JSON格式的响应给客户端
    model_config = ConfigDict(from_attributes=True)


class ExerciseListResponse(BaseModel):
    """练习列表响应模型
    
    用于分页返回练习列表
    """
    exercises: List[ExerciseResponse]  # 练习列表
    total: int        # 总记录数
    page: int         # 当前页码
    page_size: int    # 每页大小


class ExerciseFeedbackRequest(BaseModel):
    """练习反馈请求模型"""
    exercise_id: int  # 练习ID
    feedback_type: str = Field(
        ...,
        description="反馈类型：'detailed'或'summary'"
    )


class ExerciseStats(BaseModel):
    """练习统计信息模型
    
    用于返回学生练习的统计数据，包括:
    1. 总体情况：练习数、完成数、平均分等
    2. 正确率统计：所有题目的正确率
    3. 历史记录：最近练习的得分记录
    
    数据流向：
    1. 从Exercise表统计基础数据
    2. 从Question表计算正确率
    3. 组合统计数据返回前端
    """
    total_exercises: int       # 练习总数
    completed_exercises: int   # 已完成练习数
    average_score: float      # 平均分数
    accuracy_rate: float      # 正确率（所有题目的正确数/总题目数）
    total_time: int          # 总用时（秒）
    score_history: List[dict] # 历史练习记录，格式：
                             # [{"date": "YYYY-MM-DD", "score": 85.5}, ...]


# ==== 错题本相关模型 ====

class WrongQuestion(BaseModel):
    """错题项（学生答错过的题目）"""
    id: int
    exercise_id: int
    content: str
    correct_answer: float
    user_answer: Optional[float] = None
    operator_types: List[OperatorType]
    difficulty: DifficultyLevel
    number_range: Tuple[int, int]
    created_at: datetime
    completed_at: Optional[datetime] = None

class WrongQuestionListResponse(BaseModel):
    items: List[WrongQuestion]
    total: int
    page: int
    page_size: int

class WrongStats(BaseModel):
    by_difficulty: dict
    by_operator: dict
    trend_14d: List[dict]  # [{"date": "YYYY-MM-DD", "count": n}]

class RepracticeFromWrongsRequest(BaseModel):
    """从错题创建新练习的请求体"""
    question_ids: List[int]
    shuffle: bool = True
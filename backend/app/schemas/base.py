"""app/schemas/base.py
作用：定义基础的Pydantic模型

这个文件定义了一些基础的数据模型类，它们会被其他模型继承，用于：
1. 提供通用的响应格式
2. 提供时间戳字段
3. 提供ID字段
"""

from pydantic import BaseModel
# BaseModel：Pydantic的基础模型类
# 所有Pydantic模型都要继承这个类
# 它提供了数据验证、序列化等功能

# BaseModel常用方法：

# 1. 模型实例化与数据验证
#    model = MyModel(**data)  # 创建模型实例，自动进行数据验证
#    - 如果数据无效，会抛出ValidationError异常
#    - 会自动转换数据类型（如字符串转数字）

# 2. 数据序列化
#    model.model_dump()       # 将模型转换为dict（Pydantic v2语法）
#    model.model_dump_json()  # 将模型转换为JSON字符串
#    model.dict()            # 将模型转换为dict（旧语法，不推荐）
#    model.json()            # 将模型转换为JSON字符串（旧语法，不推荐）

# 3. 数据更新
#    model.copy()            # 创建模型的副本
#    model.copy(update={"field": "new_value"})  # 创建更新后的副本

# 4. 模型配置
#    方法一：使用内部类Config（传统方式，向后兼容但不推荐）
#    class Config:
#        # 允许从ORM模型创建（如SQLAlchemy模型）
#        from_attributes = True 
#        # 允许额外字段（默认False）
#        extra = "allow"      
#        # 校验字段顺序（默认True）
#        validate_assignment = True
#
#    方法二：使用ConfigDict（Pydantic v2推荐用法）
#    model_config = ConfigDict(
#        # 允许从ORM模型创建
#        from_attributes=True,
#        # 允许额外字段，可选值：'allow'、'ignore'、'forbid'
#        extra='allow',
#        # 校验字段顺序
#        validate_assignment=True,
#        # 其他常用配置：
#        # 允许种群初始化
#        populate_by_name=True,
#        # 自动生成JSON schema
#        json_schema_extra={"examples": [...]},
#        # 字符串长度验证
#        str_strip_whitespace=True,
#        # 字符串大小写转换
#        str_to_lower=True,
#        str_to_upper=False
#    )

# 5. 字段验证装饰器
#    @field_validator("field_name")  # 字段级别的验证器
#    @model_validator               # 模型级别的验证器

# 6. 导出模式
#    MyModel.model_json_schema()   # 获取JSON Schema（新语法）
#    MyModel.schema()              # 获取JSON Schema（旧语法）

# 7. 类型转换与解析
#    MyModel.model_validate(obj)   # 从任意对象解析（新语法）
#    MyModel.parse_obj(obj)        # 从任意对象解析（旧语法）
#    MyModel.parse_raw(str)        # 从JSON/YAML字符串解析
#    MyModel.parse_file(path)      # 从文件解析

# 8. 别名支持
#    from pydantic import Field
#    class Model(BaseModel):
#        # 可以为字段定义别名，用于API交互
#        field: str = Field(alias="api_field_name")

# 9. 继承与组合
#    class Child(Parent):      # 继承父模型的所有字段
#    class Combined(ModelA, ModelB):  # 组合多个模型的字段

from datetime import datetime
# datetime：日期时间类型
# 用于处理时间戳字段

from typing import Optional
# Optional：类型提示，表示该字段可以是None
# 例如：Optional[str]表示字段可以是字符串或None


class BaseResponse(BaseModel):
    """基础响应模型
    
    所有API响应的基础格式，包含：
    - success: 表示操作是否成功
    - message: 响应信息
    
    示例：
    {
        "success": true,
        "message": "User created successfully"
    }
    """
    success: bool = True    # 操作是否成功，默认为True
    message: str = "Success"  # 响应信息，默认为"Success"


class TimestampMixin(BaseModel):
    """时间戳混入类
    
    为模型添加创建时间和更新时间字段
    
    这是一个Mixin类，用于：
    1. 追踪记录的创建和修改时间
    2. 可以被其他模型通过多重继承方式使用
    
    示例：
    class User(TimestampMixin, BaseModel):
        username: str
    """
    created_at: datetime           # 创建时间，必填字段
    updated_at: Optional[datetime] = None  # 更新时间，可选字段
    # 定义为Optional是因为：
    # 1. 新创建的记录还没有更新时间
    # 2. 不是所有模型都需要跟踪更新时间


class IDMixin(BaseModel):
    """ID混入类
    
    为模型添加ID字段
    
    这是一个Mixin类，用于：
    1. 提供通用的ID字段
    2. 可以被其他需要ID字段的模型继承
    
    示例：
    class UserResponse(IDMixin, BaseModel):
        username: str
    
    会生成如下格式的数据：
    {
        "id": 1,
        "username": "john"
    }
    """
    id: int  # 记录的唯一标识符
    # 通常是数据库的自增主键
    # 定义为int类型，确保ID始终是整数
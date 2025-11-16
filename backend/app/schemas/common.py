"""app/schemas/common.py
作用：定义通用的数据模型

这个文件定义了一些在整个应用中都会用到的通用数据模型，包括：
1. 错误响应格式
2. 分页参数
3. 健康检查响应
"""

from pydantic import BaseModel
# BaseModel：Pydantic基础模型类，提供数据验证功能

from typing import Optional, Any, List, Dict, Union
# 导入类型提示相关的类型：
# - Optional: 可选类型，表示字段可以是None
# - Any: 任意类型
# - List: 列表类型
# - Dict: 字典类型
# - Union: 联合类型，表示字段可以是多种类型中的一种


class ErrorResponse(BaseModel):
    """错误响应模型
    
    定义API错误时的统一响应格式
    
    示例：
    {
        "success": false,
        "error": "User not found",
        "error_code": "USER_404",
        "details": ["用户ID不存在"]
    }
    """
    success: bool = False  # 操作结果标志，错误响应中固定为False
    error: str            # 错误信息，简短的错误描述
    error_code: Optional[str] = None  # 错误代码，可选，用于前端错误处理
    details: Optional[Union[str, List[str], Dict[str, Any]]] = None  
    # 错误详情，可以是：
    # - 字符串：单条详细信息
    # - 字符串列表：多条错误信息
    # - 字典：结构化的错误信息


class PaginationParams(BaseModel):
    """分页参数模型
    
    用于处理列表数据的分页请求
    
    示例：
    {
        "page": 1,
        "page_size": 10,
        "order_by": "created_at",
        "order_desc": true
    }
    """
    page: int = 1        # 当前页码，默认第1页
    page_size: int = 10  # 每页数量，默认10条
    order_by: Optional[str] = None   # 排序字段，可选
    order_desc: bool = False         # 是否降序，默认False（升序）
    # order_desc为True时表示降序排序
    # 例如：order_by="created_at", order_desc=True
    # 表示按创建时间降序排序


class HealthCheck(BaseModel):
    """健康检查响应模型
    
    用于API的健康检查端点，返回系统状态信息
    
    示例：
    {
        "status": "ok",
        "version": "1.0.0",
        "database_status": "connected"
    }
    """
    status: str = "ok"      # 系统状态，默认为"ok"
    version: str           # API版本号
    database_status: str   # 数据库连接状态
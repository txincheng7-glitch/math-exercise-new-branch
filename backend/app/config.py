"""app/config.py
作用：管理应用程序的配置信息

这个文件主要完成两个任务：
1. 定义配置类，包含所有配置项
2. 创建全局配置对象，供其他模块使用

配置项包括：
- 项目信息（名称、版本等）
- API路径
- 安全设置（密钥、令牌等）
- 数据库连接
- AI服务设置
"""

from pydantic_settings import BaseSettings
# BaseSettings：继承自BaseModel的配置管理类，同样支持类型检查和验证功能，并额外提供：
# 1. 自动从环境变量加载值（优先级高于默认值）
# 2. 通过Config类支持：
#    - env_file：指定环境变量文件路径
#    - env_prefix：指定环境变量前缀
#    - secrets_dir：指定密钥目录
#    - case_sensitive：环境变量名称大小写敏感性

from typing import Optional
# Optional：类型提示，表示该字段可以是None
# 例如：Optional[str] 表示字段可以是字符串或None

from functools import lru_cache
# lru_cache：函数结果缓存装饰器
# 用于缓存get_settings()的返回值
# 避免重复创建Settings实例

import secrets
# secrets：用于生成密码学安全的随机值
# 这里用于生成默认的SECRET_KEY

import os
# os：操作系统接口模块
# 用于处理文件路径和环境变量

# 获取项目根目录路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# os.path.abspath(__file__)：获取当前文件的绝对路径
# 第一个dirname：获取app目录的路径
# 第二个dirname：获取项目根目录的路径

class Settings(BaseSettings):
    """应用程序配置类
    
    定义所有配置项及其默认值
    可以通过环境变量覆盖这些默认值
    """
    
    # 项目基本信息
    PROJECT_NAME: str = "Math Exercise API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"  # API前缀
    
    # 安全相关配置
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 生成32字节的随机密钥
    # 用于JWT令牌签名等需要密钥的场合
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # JWT令牌过期时间（分钟）
    
    # 数据库配置
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/math_exercise.db"
    # SQLite数据库文件路径
    # 格式：sqlite:///完整路径
    
    # AI服务配置
    OPENAI_API_KEY: Optional[str] = None
    # OpenAI API密钥
    # 可以通过环境变量设置：OPENAI_API_KEY=your_key

    class Config:
        """配置类的额外设置"""
        case_sensitive = True
        # 大小写敏感
        # 例如：DATABASE_URL和database_url被视为不同的配置项

@lru_cache()
def get_settings() -> Settings:
    """获取配置对象的工厂函数
    
    使用@lru_cache装饰器缓存返回值
    这样多次调用也只会创建一个Settings实例
    
    Returns:
        Settings: 配置对象实例
    """
    return Settings()

# 创建全局配置对象
settings = get_settings()
# 其他模块可以直接导入这个对象：
# from .config import settings
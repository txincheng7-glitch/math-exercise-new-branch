"""app/api/deps.py
作用：定义FastAPI的依赖项（dependencies）

这个文件主要实现了：
1. OAuth2认证机制
2. 获取当前用户的依赖函数
3. 用户认证和授权的相关功能
"""

from fastapi import Depends, HTTPException, status
# Depends：FastAPI的依赖注入系统
# 作用：
# 1. 在路由函数执行前自动执行依赖函数（如获取数据库连接）
# 2. 在多个路由间共享通用代码（如用户认证）
# 3. 自动处理资源的生命周期（如自动关闭数据库连接）
# 
# 使用方式：
# 1. 注入函数返回值：
#    @app.get("/items")
#    def get_items(db: Session = Depends(get_db)):
#        # db就是get_db()的返回值
#        return db.query(Item).all()
#
# 2. 注入可调用对象：
#    @app.get("/users/me")
#    def get_me(token: str = Depends(oauth2_scheme)):
#        # token是oauth2_scheme对象的__call__方法的返回值
#        return {"token": token}
#
# 3. 作为装饰器依赖：
#    @app.get("/admin", dependencies=[Depends(check_admin)])
#    def admin_route():
#        # check_admin会在路由执行前被调用，但其返回值不会传入函数
#        return {"message": "admin only"}
#
# 执行流程：
# 1. 请求到达后，FastAPI检查路由函数的参数
# 2. 对于使用Depends的参数：
#    - 如果是函数，直接调用该函数
#    - 如果是对象，调用其__call__方法
# 3. 将返回值作为参数传递给路由函数

# HTTPException：HTTP异常类，用于抛出HTTP错误
# status：HTTP状态码常量集合

from fastapi.security import OAuth2PasswordBearer
# OAuth2PasswordBearer是FastAPI提供的密码模式token提取器
# 主要功能：
# 1. 实现OAuth2密码模式的token提取（从请求头获取Bearer token）
# 2. 在Swagger UI中提供用户名密码的认证表单
# 3. 提供统一的token检查机制

from jose import jwt, JWTError
# JWT相关组件：
# - jwt：用于JWT令牌的编码和解码
# - JWTError：token验证失败异常

from sqlalchemy.orm import Session
# Session：SQLAlchemy会话类，用于数据库操作

from ..database import get_db
# 导入获取数据库会话的依赖函数

from ..core.security import ALGORITHM
# 导入JWT使用的加密算法常量

from ..config import settings
# 导入应用配置，包含密钥等敏感信息

from ..models import User
# 导入用户模型类

from ..schemas.user import TokenPayload
# 导入令牌负载的Pydantic模型

from typing import List
# 导入List类型，用于类型提示中的列表参数标注

from ..models.user import UserRole
# 导入用户角色枚举，用于角色基反问控制（RBAC）
# UserRole定义了系统中的所有用户类型（学生、教师、家长、管理员）

# 创建OAuth2密码模式的token提取器
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
    # tokenUrl参数说明：
    # - 在OpenAPI文档（Swagger UI）中用于：
    #   1. 生成"Authorize"认证按钮
    #   2. 显示用户名密码的登录表单
    #   3. 表单提交时向该URL发送POST请求获取token
    #   4. 获取到的token会自动添加到后续请求的Authorization头中
    # - 注意：这个URL必须指向一个能处理OAuth2PasswordRequestForm表单数据
    #   并返回token的POST接口（通常即应用的登录接口）
)
# OAuth2PasswordBearer是一个类，oauth2_scheme是其实例

# 工作方式：
# 1. 身份认证流程：
#    - 用户先通过用户名密码获取token
#    - 后续请求中需要在请求头中携带token："Authorization: Bearer <token>"
#    - oauth2_scheme会自动检查请求头格式是否正确
#    - 如果请求头不存在或格式不正确，返回401错误
# 
# 2. 在依赖注入系统中的角色：
#    - 作为可调用对象（通过__call__方法实现）
#    - 被Depends调用时自动执行token提取和检查
#    - 返回提取到的token字符串或抛出401异常

def get_current_user(
    db: Session = Depends(get_db),  # 注入数据库会话
    token: str = Depends(oauth2_scheme)  # 注入并检查token
) -> User:
    """获取当前登录用户的依赖函数
    
    这个函数用于：
    1. 从请求中获取并验证JWT token
    2. 解析token获取用户信息并验证是否过期
    3. 从数据库获取完整的用户信息
    
    Token验证过程：
    1. 首先验证token的签名是否有效
    2. 检查token是否过期（通过exp字段）
    3. 解析payload获取用户ID
    4. 根据用户ID查询数据库
    
    Args:
        db (Session): 数据库会话，由get_db依赖提供
        token (str): JWT token，由oauth2_scheme从请求头提取
    
    Returns:
        User: 当前登录的用户对象
    
    Raises:
        HTTPException: 返回401状态码，表示认证失败。可能的原因：
            - token无效或签名错误
            - token已过期
            - 用户不存在
    """
    # 定义认证失败时抛出的异常
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,  # 401状态码
        detail="Could not validate credentials",   # 错误详情
        headers={"WWW-Authenticate": "Bearer"},    # 认证方案头
    )
    
    try:
        # 添加调试日志
        print(f"Verifying token: {token}")
        
        # 解码和验证JWT token
        # python-jose会自动验证：
        # 1. token的签名是否正确
        # 2. exp(过期时间)是否已过期
        # 3. token的格式是否正确
        payload = jwt.decode(
            token,                   # 要解码的token
            settings.SECRET_KEY,     # 用于验证签名的密钥
            algorithms=[ALGORITHM]   # 使用的加密算法
        )
        print(f"Token payload: {payload}")
        
        # 将解码后的数据转换为TokenPayload对象
        # TokenPayload包含：
        # - sub: 用户ID
        # - exp: 过期时间戳
        token_data = TokenPayload(**payload)
        
        # 将字符串ID转换回整数
        user_id = int(token_data.sub)
        # 从数据库获取用户信息
        user = db.query(User).filter(User.id == user_id).first()
        
        # 如果用户不存在，抛出异常
        if not user:
            raise credentials_exception
            
        return user
        
    except JWTError as e:
        # token无效（包括过期、签名错误等所有JWT相关错误）
        print(f"Token verification failed: {str(e)}")
        raise credentials_exception
    except Exception as e:
        # 其他未预期的错误
        print(f"Unexpected error: {str(e)}")
        raise credentials_exception

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """验证用户是否处于活动状态的依赖函数
    
    这个函数用于：
    1. 验证用户账号是否被禁用
    2. 作为额外的授权检查层
    
    依赖注入示例：
    @app.get("/users/me")
    def read_users_me(user: User = Depends(get_current_active_user)):
        return user
    
    执行流程：
    1. FastAPI调用get_db()获取数据库会话
    2. FastAPI调用oauth2_scheme检查并提取token
    3. 执行get_current_user获取用户信息
    4. 执行本函数验证用户状态
    5. 将验证后的用户信息返回给路由函数

    Args:
        current_user (User): 当前用户，由get_current_user依赖提供
    
    Returns:
        User: 验证为活动状态的用户对象
    
    Raises:
        HTTPException: 当用户账号被禁用时抛出400错误
    """
    # 检查用户是否处于活动状态
    if not current_user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Inactive user"
        )
    return current_user

def check_roles(allowed_roles: List[UserRole]):
    async def role_checker(
        current_user: User = Depends(get_current_active_user)
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return role_checker

# 快捷方式
check_student = check_roles([UserRole.STUDENT])
check_teacher = check_roles([UserRole.TEACHER])
check_parent = check_roles([UserRole.PARENT])
check_admin = check_roles([UserRole.ADMIN])
check_parent_or_admin = check_roles([UserRole.PARENT, UserRole.ADMIN])
check_teacher_or_admin = check_roles([UserRole.TEACHER, UserRole.ADMIN])
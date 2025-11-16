"""app/database.py
作用：配置SQLAlchemy，创建数据库引擎和会话管理器

这个文件主要完成三个任务：
1. 创建数据库引擎（管理数据库连接）
2. 创建会话工厂（用于创建数据库会话）
3. 提供获取数据库会话的依赖函数

SQLAlchemy架构原理：
1. SQLAlchemy是一个ORM（对象关系映射）框架，主要分为两层：
   - Core层：负责SQL语句的生成和执行，提供数据库抽象
   - ORM层：负责对象映射，具体映射关系为：
     * Python类 ←→ 数据库表（Table）
     * 类属性 ←→ 表字段（Column，表的列）
     * 类实例 ←→ 表记录（Row，表的行）
     * 继承关系 ←→ 表继承
     * 引用关系 ←→ 外键关系（Foreign Key）

2. 核心组件：
   - Engine：数据库引擎，管理连接池并执行SQL
   - Session：会话，管理ORM对象的状态和事务
   - MetaData：管理表结构信息
   - Base：声明性基类，提供ORM映射功能

3. 工作流程：
   - 通过Engine建立数据库连接
   - 使用Session执行数据库操作
   - ORM数据同步：
     * 查询时：从数据库加载数据并创建对象，缓存到Session中
     * 修改时：追踪对象变更，提交时更新数据库
     * 关系处理：自动维护对象间的关联，同步外键关系
"""

from sqlalchemy import create_engine
# create_engine：创建数据库引擎的函数
# 数据库引擎是SQLAlchemy连接数据库的核心组件
# 它负责管理数据库连接池和处理数据库操作

from sqlalchemy.ext.declarative import declarative_base
# declarative_base：创建声明性基类的函数
# 这个基类会被所有的ORM模型继承
# 它提供了将Python类映射到数据库表的功能

from sqlalchemy.orm import sessionmaker, Session
# sessionmaker：一个工厂类，用于创建会话工厂（而不是直接创建Session实例）
# - 它返回一个配置好的会话工厂类
# - 这个工厂类才是用来创建Session实例的可调用对象
# - 它可以预配置Session的创建参数，确保一致性
# - 它支持继承，可以创建具有特定配置的自定义会话工厂
#
# Session：会话类的类型提示
# 会话(Session)是处理数据库操作的主要接口

"""Session工作原理：
1. 身份映射（Identity Map）：
   - 维护一个对象身份映射表
   - 确保同一条记录在Session中只有一个对象实例
   - 避免重复加载和数据不一致问题

2. 状态管理：
   - Transient：未关联到Session且未保存到数据库的新建对象
     * 刚创建但未调用add()的对象
   - Pending：已关联到Session但尚未保存到数据库的对象
     * 已调用add()但未commit()的对象
   - Persistent：已保存到数据库且正在被Session跟踪的对象
     * 对此状态对象的修改会被自动检测和同步
   - Detached：已从Session中分离的对象
     * 来自其他Session或被移出当前Session的对象
     * 需要重新add()才能被Session跟踪

3. 事务管理：
   - Session默认开启事务
   - commit()：提交事务，将更改保存到数据库
   - rollback()：回滚事务，撤销未提交的更改
   - flush()：将待定更改同步到数据库，但不提交事务
   - refresh()：从数据库重新加载对象数据
"""

from typing import Generator
# Generator：生成器类型的类型提示
# 用于标注get_db函数的返回类型

from .config import settings
# 导入配置模块中的设置
# 包含数据库URL等配置信息

# 创建SQLite数据库引擎
# Engine是SQLAlchemy的核心接口，它：
# 1. 维护数据库连接池（connection pool）
# 2. 提供数据库方言（dialect）支持
# 3. 处理数据库连接的生命周期
engine = create_engine(
    settings.DATABASE_URL,  # 数据库URL，从配置中获取
    connect_args={"check_same_thread": False}  # SQLite特有的设置
    # SQLite默认只允许创建它的线程访问数据库
    # 设置check_same_thread=False允许其他线程访问
    # 注意：这个设置只在SQLite中需要，其他数据库不需要
)
# Engine的主要功能：
# 1. 惰性连接：首次执行语句时才真正连接数据库
# 2. 连接池：复用数据库连接，避免频繁建立连接
# 3. 事务管理：支持事务的开启、提交和回滚
# 4. 原始SQL执行：可以直接执行SQL语句

# Engine在项目中的使用：
# 1. 创建数据库表：
#    Base.metadata.create_all(bind=engine)  # 在main.py中执行
#
# 2. 作为Session的创建基础：
#    SessionLocal = sessionmaker(bind=engine)  # 将引擎绑定到会话工厂
#
# 3. 可用于直接执行SQL（不常用，通常通过Session操作）：
#    with engine.connect() as conn:
#        conn.execute("SELECT * FROM users")
#
# 4. 处理数据库连接的底层细节：
#    - Session需要数据库连接时，会从engine的连接池获取
#    - 执行完毕后，连接会被归还到连接池而不是关闭
#    - 自动处理连接的超时、重连等问题

# 创建会话工厂
# SessionLocal = sessionmaker(...) 创建了一个会话工厂，而不是会话实例
# Session的生命周期：
# 1. 创建：调用SessionLocal()创建新会话
# 2. 使用：执行数据库操作（查询、更新等）
# 3. 提交/回滚：commit()或rollback()
# 4. 关闭：close()释放资源
SessionLocal = sessionmaker(
    autocommit=False,  # 不自动提交事务
    # 如果设为True，每个操作都会立即提交
    # 设为False可以让我们手动控制事务
    
    autoflush=False,   # 不自动刷新
    # 如果设为True，每个查询前都会自动刷新session
    # 设为False可以让我们手动控制刷新时机
    
    bind=engine        # 绑定到我们创建的引擎
    # 告诉会话工厂使用哪个数据库引擎
)

# 创建声明性基类
# declarative_base()创建了一个基类，它：
# 1. 充当所有模型类的元类（metaclass）
# 2. 自动维护所有继承它的类的注册表
# 3. 提供了表结构的声明性定义方式
Base = declarative_base()
# 这个基类会被所有的ORM模型继承，例如：
# class User(Base):
#     __tablename__ = 'users'
#     id = Column(Integer, primary_key=True)
#     name = Column(String)
#
# 它为模型类提供了：
# 1. __tablename__：声明数据库表名
# 2. __table__：关联的Table对象
# 3. metadata：表的元数据集合
# 4. columns：所有列的集合
# 5. relationships：所有关系的集合
# 
# 基类的作用：
# - 自动创建表结构
# - 提供表关系映射
# - 提供查询接口
# - 跟踪对象变更

def get_db() -> Generator[Session, None, None]:
    """创建数据库会话的依赖函数
    
    这是一个生成器函数，用于：
    1. 创建数据库会话
    2. 在请求处理完成后自动关闭会话
    3. 作为FastAPI的依赖项使用
    
    典型的Session操作：
    - 查询：db.query(Model).filter(...).all()
    - 创建：db.add(object)
    - 更新：直接修改对象属性
    - 删除：db.delete(object)
    - 提交：db.commit()
    - 回滚：db.rollback()
    
    使用方式：
    @app.get("/users/")
    def get_users(db: Session = Depends(get_db)):
        return db.query(User).all()
    
    注意事项：
    1. 每个请求应该使用独立的Session
    2. 使用完后必须关闭Session（通过finally确保）
    3. Session不是线程安全的，不能跨线程共享
    4. 长时间运行的程序应该及时关闭Session释放资源
    
    Returns:
        Generator[Session, None, None]: 数据库会话生成器
        - Session: 生成的类型
        - None: send()方法的参数类型（这里不使用）
        - None: return语句的类型（这里不使用）
    """
    db = SessionLocal()  # 创建新的数据库会话
    try:
        yield db  # 暂时返回会话给调用者使用
        # yield使这个函数成为生成器
        # FastAPI会在请求处理完成后自动恢复这个函数的执行
    finally:
        # finally确保无论如何都会关闭会话
        # 即使发生异常也会执行这个代码块
        db.close()  # 关闭数据库会话
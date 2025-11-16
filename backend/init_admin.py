"""
初始化脚本：创建超级管理员账号
使用方法: python init_admin.py
"""
from app.database import SessionLocal, engine, Base
from app.models import User, Admin
from app.core.security import get_password_hash
from app.models.user import UserRole
from datetime import datetime

def init_superadmin():
    db = SessionLocal()
    try:
        # 检查是否已存在超级管理员
        existing_admin = db.query(User).filter(
            User.role == UserRole.ADMIN,
            User.is_superuser == True
        ).first()
        
        if existing_admin:
            print("超级管理员已存在，无需初始化")
            return
        
        # 创建超级管理员账号
        admin = User(
            email="admin@example.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_superuser=True,
            is_active=True
        )
        
        db.add(admin)
        db.flush()
        
        # 创建管理员配置
        admin_profile = Admin(
            user_id=admin.id,
            permissions=["*"],  # 所有权限
            created_at=datetime.utcnow()
        )
        
        db.add(admin_profile)
        db.commit()
        
        print("超级管理员创建成功！")
        print("登录邮箱: admin@example.com")
        print("登录密码: admin123")
        
    except Exception as e:
        print(f"初始化失败：{str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # 确保数据库表已创建
    Base.metadata.create_all(bind=engine)
    init_superadmin()

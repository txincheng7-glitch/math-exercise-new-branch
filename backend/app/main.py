from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.v1 import api_router
from .database import engine, Base
from .models import (
    User, Student, Teacher, Parent, Admin,
    Exercise, Question,
    Conversation, ConversationParticipant, Message, MessageReceipt
)  # 确保消息相关表注册到元数据
from .services import AIServiceManager

# 创建数据库表（确保所有模型已导入后再执行）
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="数学练习系统API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 配置CORS（开发环境允许常见本地前端地址）
# 开发调试时短期允许任意来源（便于快速排查 CORS 问题）
# 注意：请仅在本地开发环境使用，生产环境请恢复为严格白名单
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix=settings.API_V1_STR)

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc)
        }
    )

# 健康检查端点
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=4
    )

ai_service_manager = AIServiceManager()

@app.on_event("startup")
async def startup_event():
    await ai_service_manager.start()

@app.on_event("shutdown")
async def shutdown_event():
    await ai_service_manager.stop()
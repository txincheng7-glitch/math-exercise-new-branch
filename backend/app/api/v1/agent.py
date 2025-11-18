from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ...database import get_db
from ...models import User
from ...services import AIService
from ...agents.agent_service import AgentService
from ..deps import get_current_active_user, check_student

router = APIRouter()


class ChatRequest(BaseModel):
    """对话请求"""
    message: str
    chat_history: Optional[List[dict]] = None
    bot_name: str = "chinchilla"


class ChatResponse(BaseModel):
    """对话响应"""
    response: str
    success: bool = True


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student),
    request: ChatRequest
) -> Any:
    """
    与智能体对话
    
    智能体可以：
    - 查询练习统计
    - 分析学习趋势
    - 获取练习详情
    - 提供学习建议
    """
    # 获取用户的Poe客户端
    ai_service = AIService.get_instance(current_user.student.id)
    
    if not ai_service.is_available():
        raise HTTPException(
            status_code=400,
            detail="AI服务未初始化，请先配置token"
        )
    
    # 创建智能体服务
    agent_service = AgentService(
        db=db,
        current_user=current_user,
        poe_client=ai_service.poe_client
    )
    
    # 初始化智能体
    success = await agent_service.initialize(bot_name=request.bot_name)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="智能体初始化失败"
        )
    
    # 执行对话
    try:
        response = await agent_service.chat(
            message=request.message,
            chat_history=request.chat_history
        )
        return ChatResponse(response=response)
    
    except Exception as e:
        # 打印完整错误堆栈便于调试
        # print_exc()输出到终端，format_exc()返回给前端
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"对话失败：{str(e)}\n\n堆栈信息：\n{traceback.format_exc()}"
        )


@router.post("/chat/stream")
async def chat_with_agent_stream(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student),
    request: ChatRequest
) -> Any:
    """
    与智能体流式对话
    """
    ai_service = AIService.get_instance(current_user.student.id)
    
    if not ai_service.is_available():
        raise HTTPException(
            status_code=400,
            detail="AI服务未初始化，请先配置token"
        )
    
    agent_service = AgentService(
        db=db,
        current_user=current_user,
        poe_client=ai_service.poe_client
    )
    
    success = await agent_service.initialize(bot_name=request.bot_name)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="智能体初始化失败"
        )
    
    async def generate():
        try:
            async for chunk in agent_service.chat_stream(
                message=request.message,
                chat_history=request.chat_history
            ):
                yield chunk
        except Exception as e:
            yield f"\n[错误: {str(e)}]"
    
    return StreamingResponse(
        generate(),
        media_type="text/plain"
    )


@router.post("/reset")
async def reset_agent(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """
    重置智能体会话
    
    开始一个新的对话会话
    """
    # 这里只需要返回成功，因为每次请求都会创建新的AgentService实例
    # 实际的会话重置在前端管理聊天历史即可
    return {"success": True, "message": "会话已重置"}
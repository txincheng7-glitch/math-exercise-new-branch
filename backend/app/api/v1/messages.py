"""app/api/v1/messages.py
消息系统路由 (v1)：一对一私信

端点：
GET    /messages/unread-count                 获取当前用户未读总数
GET    /conversations                         列出当前用户所有会话概要
GET    /conversations/{id}/messages           分页获取会话消息
POST   /messages/send                         发送消息（自动创建会话）
POST   /conversations/{id}/read               标记会话全部消息为已读

说明：
1. 学生↔学生禁止，其他角色组合按服务层校验
2. WebSocket 后续补充 /ws/messages（当前未实现）
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ..deps import get_current_active_user
from ...models import User
from ...services.message_service import MessageService
from ...schemas.message import (
    MessageCreate,
    MessageResponse,
    ConversationSummary,
    ConversationMessagesResponse,
    UnreadCountResponse,
    AvailableRecipientsResponse,
    AvailableRecipientCategory,
    AvailableRecipientUser,
)
from ...models import UserRole, Student, Teacher, Parent, Admin

router = APIRouter()

# WebSocket 连接管理器（简单内存版）
class MessageWSManager:
    def __init__(self):
        self.active: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        conns = self.active.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active.pop(user_id, None)

    async def push_message(self, user_id: int, message: dict):
        conns = self.active.get(user_id, [])
        data = {"type": "message", "payload": message}
        for ws in conns:
            await ws.send_json(data)

ws_manager = MessageWSManager()


@router.get("/messages/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MessageService(db)
    return UnreadCountResponse(unread_count=service.unread_total(current_user))


@router.get("/conversations", response_model=List[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MessageService(db)
    data = service.list_conversations(current_user)
    summaries: List[ConversationSummary] = []
    for conv, last_msg, unread in data:
        participant_ids = [p.user_id for p in conv.participants]
        users_map = []
        for pid in participant_ids:
            u = db.query(User).filter(User.id == pid).first()
            if u:
                users_map.append({"id": u.id, "username": u.username, "role": u.role.value if hasattr(u.role, 'value') else str(u.role)})
        summaries.append(
            ConversationSummary(
                id=conv.id,
                participant_user_ids=participant_ids,
                participant_users=users_map,
                last_message=(MessageResponse.model_validate(last_msg) if last_msg else None),
                unread_count=unread,
                created_at=conv.created_at,
            )
        )
    return summaries


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationMessagesResponse)
def list_messages(
    conversation_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MessageService(db)
    try:
        messages, total = service.list_messages(current_user, conversation_id, skip, limit)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    resp = [MessageResponse.model_validate(m) for m in messages]
    return ConversationMessagesResponse(
        conversation_id=conversation_id,
        messages=resp,
        total=total,
        has_more=skip + len(messages) < total,
    )


@router.post("/messages/send", response_model=MessageResponse)
async def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MessageService(db)
    recipient = db.query(User).filter(User.id == payload.recipient_user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="接收方不存在")
    try:
        msg = service.send_message(current_user, recipient, payload.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    msg_resp = MessageResponse.model_validate(msg)
    # 推送给接收者（发送者也推送便于多端同步）
    await ws_manager.push_message(recipient.id, msg_resp.model_dump())
    await ws_manager.push_message(current_user.id, msg_resp.model_dump())
    return msg_resp
@router.websocket("/ws/messages")
async def messages_ws(websocket: WebSocket):
    # 使用 token 查询参数进行认证
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    # 手动验证 token
    from jose import jwt, JWTError
    from ...config import settings
    from ...core.security import ALGORITHM
    from ...schemas.user import TokenPayload
    from sqlalchemy.orm import Session
    from ...database import SessionLocal

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
        user_id = int(token_data.sub)
    except JWTError:
        await websocket.close(code=4401)
        return

    # 验证用户存在
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4401)
            return
    finally:
        db.close()

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # 保持连接，忽略客户端发送的内容（后续可用于心跳或指令）
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)


@router.post("/conversations/{conversation_id}/read")
def mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MessageService(db)
    try:
        changed = service.mark_read(current_user, conversation_id)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return {"updated": changed}


@router.get("/messages/available-recipients", response_model=AvailableRecipientsResponse)
def available_recipients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    categories: list[AvailableRecipientCategory] = []
    # Helper builders
    def build_users(query):
        return [
            AvailableRecipientUser(
                id=u.id,
                username=u.username,
                role=u.role.value if hasattr(u.role, 'value') else str(u.role),
                relation_tags=[],
            ) for u in query
        ]

    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student and student.teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == student.teacher_id).first()
            if teacher:
                u = db.query(User).filter(User.id == teacher.user_id).first()
                if u:
                    categories.append(AvailableRecipientCategory(key="my_teacher", label="我的老师", users=build_users([u])))

    elif current_user.role == UserRole.PARENT:
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        teacher_users = []
        if parent:
            teacher_ids = {s.teacher_id for s in parent.students if s.teacher_id}
            if teacher_ids:
                teachers = db.query(Teacher).filter(Teacher.id.in_(list(teacher_ids))).all()
                for t in teachers:
                    u = db.query(User).filter(User.id == t.user_id).first()
                    if u:
                        teacher_users.append(u)
        if teacher_users:
            categories.append(AvailableRecipientCategory(key="child_teachers", label="孩子的教师", users=build_users(teacher_users)))
        # 管理员可选
        admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
        if admins:
            categories.append(AvailableRecipientCategory(key="admins", label="管理员", users=build_users(admins)))

    elif current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if teacher:
            # 学生
            student_users = []
            for s in teacher.students:
                u = db.query(User).filter(User.id == s.user_id).first()
                if u:
                    student_users.append(u)
            if student_users:
                categories.append(AvailableRecipientCategory(key="students", label="我的学生", users=build_users(student_users)))
            # 家长（去重）
            parent_ids = {s.parent_id for s in teacher.students if s.parent_id}
            parent_users = []
            if parent_ids:
                parents = db.query(Parent).filter(Parent.id.in_(list(parent_ids))).all()
                for p in parents:
                    u = db.query(User).filter(User.id == p.user_id).first()
                    if u:
                        parent_users.append(u)
            if parent_users:
                categories.append(AvailableRecipientCategory(key="student_parents", label="学生家长", users=build_users(parent_users)))
        admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
        if admins:
            categories.append(AvailableRecipientCategory(key="admins", label="管理员", users=build_users(admins)))

    elif current_user.role == UserRole.ADMIN:
        categories.append(AvailableRecipientCategory(key="teachers", label="教师", users=build_users(db.query(User).filter(User.role == UserRole.TEACHER).all())))
        categories.append(AvailableRecipientCategory(key="students", label="学生", users=build_users(db.query(User).filter(User.role == UserRole.STUDENT).all())))
        categories.append(AvailableRecipientCategory(key="parents", label="家长", users=build_users(db.query(User).filter(User.role == UserRole.PARENT).all())))
        categories.append(AvailableRecipientCategory(key="admins", label="管理员", users=build_users(db.query(User).filter(User.role == UserRole.ADMIN).all())))

    return AvailableRecipientsResponse(categories=categories)

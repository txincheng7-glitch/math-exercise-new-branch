"""app/schemas/message.py
消息系统（v1 一对一私信）相关的Pydantic数据模型。

范围：
1. 仅文本消息 content
2. 不支持附件 / 搜索关键字 / 引用回复（后续扩展）
3. 会话为一对一，两参与者ID列表
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime


class MessageCreate(BaseModel):
    recipient_user_id: int = Field(..., description="接收方用户ID")
    content: str = Field(..., min_length=1, max_length=1000, description="消息内容")


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationSummary(BaseModel):
    id: int
    participant_user_ids: List[int]
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    created_at: datetime
    # 新增：参与者基础信息（前端弹窗显示用户名）
    participant_users: Optional[List[dict]] = None  # {id, username, role}

    model_config = ConfigDict(from_attributes=True)


class ConversationMessagesResponse(BaseModel):
    conversation_id: int
    messages: List[MessageResponse]
    total: int
    has_more: bool


class UnreadCountResponse(BaseModel):
    unread_count: int


class AvailableRecipientUser(BaseModel):
    id: int
    username: str
    role: str
    relation_tags: List[str] = []


class AvailableRecipientCategory(BaseModel):
    key: str
    label: str
    users: List[AvailableRecipientUser]


class AvailableRecipientsResponse(BaseModel):
    categories: List[AvailableRecipientCategory]

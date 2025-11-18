"""app/models/message.py
作用：定义一对一私信消息系统的数据模型（v1）

当前范围：仅支持一对一对话（两名参与者），排除学生↔学生组合。
后续扩展（组对话 / 广播 / 附件 / 搜索）可在此基础上演进。

表结构：
1. Conversation               会话主表
2. ConversationParticipant    参与者表（v1 固定两条记录）
3. Message                    消息记录
4. MessageReceipt             消息已读回执（每条消息对每个参与者一条）

索引与访问模式：
1. ConversationParticipant(conversation_id, user_id) 唯一 + 过滤当前用户参与的会话
2. Message(conversation_id, created_at)              时间序查询分页
3. MessageReceipt(user_id, read_at IS NULL)          统计未读数量

读状态策略：
发送方的回执立即标记 read_at，另一方为 NULL，标记已读操作批量更新该用户的未读回执。
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from ..database import Base


class Conversation(Base):
    """会话模型：一对一对话容器"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    """会话参与者：记录用户加入会话的关系（v1固定两人）"""
    __tablename__ = "conversation_participants"
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    joined_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="participants")
    # 与User不建立反向关系，避免在已有User模型增加复杂度（可后续补充）


class Message(Base):
    """消息模型：具体的文本消息记录"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"))
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")


class MessageReceipt(Base):
    """消息回执：用于未读统计和已读标记"""
    __tablename__ = "message_receipts"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_receipt_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    read_at = Column(DateTime, nullable=True, index=True)

    message = relationship("Message", back_populates="receipts")

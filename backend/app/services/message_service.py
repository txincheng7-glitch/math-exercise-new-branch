"""app/services/message_service.py
消息系统服务层：封装会话与消息的核心业务逻辑（v1 一对一）。

职责：
1. 创建或获取一对一会话
2. 发送消息（生成回执）
3. 分页获取消息列表
4. 列出用户的所有会话概要（最近一条消息 + 未读计数）
5. 统计用户未读消息总数
6. 标记会话内所有未读为已读

权限：
通过 allowed_pairs 限制角色组合，排除 student-student。
"""

from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import (
    Conversation,
    ConversationParticipant,
    Message,
    MessageReceipt,
    User,
    UserRole,
    Student,
    Teacher,
    Parent,
    Admin,
)


class MessageService:
    def __init__(self, db: Session):
        self.db = db

    def _validate_pair(self, sender: User, recipient: User):
        # 禁止自发
        if sender.id == recipient.id:
            raise ValueError("不能向自己发送消息")
        # 管理员可以向任何人发送
        if sender.role == UserRole.ADMIN:
            return
        # 教师可以向学生/家长/管理员
        if sender.role == UserRole.TEACHER:
            if recipient.role == UserRole.ADMIN:
                return
            # 向学生：学生的teacher_id匹配
            if recipient.role == UserRole.STUDENT:
                student = self.db.query(Student).filter(Student.user_id == recipient.id).first()
                teacher = self.db.query(Teacher).filter(Teacher.user_id == sender.id).first()
                if student and teacher and student.teacher_id == teacher.id:
                    return
            # 向家长：家长的任一孩子归属该教师
            if recipient.role == UserRole.PARENT:
                parent = self.db.query(Parent).filter(Parent.user_id == recipient.id).first()
                teacher = self.db.query(Teacher).filter(Teacher.user_id == sender.id).first()
                if parent and teacher:
                    # 任意孩子的 teacher_id == teacher.id
                    child_match = any(s.teacher_id == teacher.id for s in parent.students)
                    if child_match:
                        return
            raise ValueError("不允许的角色通信组合或无关联关系")
        # 学生只能向自己的教师
        if sender.role == UserRole.STUDENT and recipient.role == UserRole.TEACHER:
            student = self.db.query(Student).filter(Student.user_id == sender.id).first()
            teacher = self.db.query(Teacher).filter(Teacher.user_id == recipient.id).first()
            if student and teacher and student.teacher_id == teacher.id:
                return
            raise ValueError("学生只能向自己的教师发送消息")
        # 家长只能向孩子的教师或管理员
        if sender.role == UserRole.PARENT:
            if recipient.role == UserRole.ADMIN:
                return
            if recipient.role == UserRole.TEACHER:
                parent = self.db.query(Parent).filter(Parent.user_id == sender.id).first()
                teacher = self.db.query(Teacher).filter(Teacher.user_id == recipient.id).first()
                if parent and teacher:
                    if any(s.teacher_id == teacher.id for s in parent.students):
                        return
                raise ValueError("家长只能向孩子的教师发送消息")
            raise ValueError("不允许的角色通信组合")
        # 其他组合不允许
        raise ValueError("不允许的角色通信组合")

    def get_or_create_conversation(self, user_a: User, user_b: User) -> Conversation:
        self._validate_pair(user_a, user_b)
        # 查找已有会话（两个参与者完全匹配）
        subq = self.db.query(ConversationParticipant.conversation_id).filter(
            ConversationParticipant.user_id == user_a.id
        ).subquery()

        conversation = (
            self.db.query(Conversation)
            .join(ConversationParticipant)
            .filter(
                Conversation.id.in_(subq),
                ConversationParticipant.user_id == user_b.id,
            )
            .first()
        )
        if conversation:
            return conversation
        # 创建新会话
        conversation = Conversation()
        self.db.add(conversation)
        self.db.flush()  # 先拿到conversation.id
        self.db.add_all([
            ConversationParticipant(conversation_id=conversation.id, user_id=user_a.id),
            ConversationParticipant(conversation_id=conversation.id, user_id=user_b.id),
        ])
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def send_message(self, sender: User, recipient: User, content: str) -> Message:
        if not content.strip():
            raise ValueError("消息内容不能为空")
        conversation = self.get_or_create_conversation(sender, recipient)
        msg = Message(conversation_id=conversation.id, sender_id=sender.id, content=content)
        self.db.add(msg)
        self.db.flush()
        # 创建回执：发送者已读，接收者未读
        self.db.add_all([
            MessageReceipt(message_id=msg.id, user_id=sender.id, read_at=datetime.utcnow()),
            MessageReceipt(message_id=msg.id, user_id=recipient.id, read_at=None),
        ])
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def list_conversations(self, user: User) -> List[Tuple[Conversation, Optional[Message], int]]:
        # 找到用户参与的会话
        conversations = (
            self.db.query(Conversation)
            .join(ConversationParticipant)
            .filter(ConversationParticipant.user_id == user.id)
            .order_by(Conversation.created_at.desc())
            .all()
        )
        results = []
        for conv in conversations:
            last_message = (
                self.db.query(Message)
                .filter(Message.conversation_id == conv.id)
                .order_by(Message.created_at.desc())
                .first()
            )
            unread_count = (
                self.db.query(func.count(MessageReceipt.id))
                .join(Message)
                .filter(
                    Message.conversation_id == conv.id,
                    MessageReceipt.user_id == user.id,
                    MessageReceipt.read_at.is_(None),
                )
                .scalar()
            ) or 0
            results.append((conv, last_message, unread_count))
        return results

    def list_messages(self, user: User, conversation_id: int, skip: int = 0, limit: int = 50) -> Tuple[List[Message], int]:
        # 验证参与者
        participant = (
            self.db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user.id,
            )
            .first()
        )
        if not participant:
            raise ValueError("无权限访问该会话")
        q = (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        total = q.count()
        messages = q.offset(skip).limit(limit).all()
        return messages, total

    def mark_read(self, user: User, conversation_id: int) -> int:
        # 找出未读回执
        receipts = (
            self.db.query(MessageReceipt)
            .join(Message)
            .filter(
                Message.conversation_id == conversation_id,
                MessageReceipt.user_id == user.id,
                MessageReceipt.read_at.is_(None),
            )
            .all()
        )
        now = datetime.utcnow()
        for r in receipts:
            r.read_at = now
        self.db.commit()
        return len(receipts)

    def unread_total(self, user: User) -> int:
        return (
            self.db.query(func.count(MessageReceipt.id))
            .filter(MessageReceipt.user_id == user.id, MessageReceipt.read_at.is_(None))
            .scalar()
        ) or 0

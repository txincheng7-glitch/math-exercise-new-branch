from datetime import datetime, timezone, timedelta
from typing import Optional

def get_utc_now() -> datetime:
    """获取当前UTC时间"""
    return datetime.now(timezone.utc)

def format_duration(seconds: int) -> str:
    """
    格式化持续时间
    例如：将 3665 秒转换为 "1小时1分钟5秒"
    """
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remaining_seconds = seconds % 60
    
    parts = []
    if hours > 0:
        parts.append(f"{hours}小时")
    if minutes > 0:
        parts.append(f"{minutes}分钟")
    if remaining_seconds > 0 or not parts:
        parts.append(f"{remaining_seconds}秒")
    
    return "".join(parts)

def is_same_day(dt1: datetime, dt2: datetime) -> bool:
    """检查两个日期是否是同一天"""
    return dt1.date() == dt2.date()
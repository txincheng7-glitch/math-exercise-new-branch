import re
from typing import Tuple

def validate_email(email: str) -> Tuple[bool, str]:
    """
    验证邮箱格式
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "邮箱格式不正确"
    return True, ""

def validate_username(username: str) -> Tuple[bool, str]:
    """
    验证用户名格式
    """
    if len(username) < 3:
        return False, "用户名长度不能小于3个字符"
    if len(username) > 20:
        return False, "用户名长度不能超过20个字符"
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "用户名只能包含字母、数字、下划线和连字符"
    return True, ""
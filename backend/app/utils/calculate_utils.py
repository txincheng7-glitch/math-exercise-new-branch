from decimal import Decimal, ROUND_HALF_UP
from typing import Union

def safe_divide(a: Union[int, float], b: Union[int, float]) -> float:
    """
    安全除法，避免除以零错误
    """
    try:
        if abs(b) < 0.0001:  # 避免除以接近零的数
            return 0.0
        return float(a) / float(b)
    except (ZeroDivisionError, TypeError):
        return 0.0

def round_number(number: Union[int, float], decimals: int = 2) -> float:
    """
    四舍五入到指定小数位
    """
    if not isinstance(number, (int, float)):
        return 0.0
    
    try:
        # 使用Decimal来确保精确的四舍五入
        return float(
            Decimal(str(number)).quantize(
                Decimal('0.' + '0' * decimals),
                rounding=ROUND_HALF_UP
            )
        )
    except:
        return 0.0
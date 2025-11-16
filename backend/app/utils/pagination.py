from typing import TypeVar, Generic, Sequence, Optional
from pydantic import BaseModel, ConfigDict
from math import ceil

T = TypeVar("T")

class PageInfo(BaseModel):
    current_page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool

class PaginatedResponse(BaseModel, Generic[T]):
    items: Sequence[T]
    page_info: PageInfo
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

def paginate(
    items: Sequence[T],
    page: int = 1,
    page_size: int = 10
) -> PaginatedResponse[T]:
    """
    通用分页函数
    """
    total_items = len(items)
    total_pages = ceil(total_items / page_size)
    
    # 确保页码在有效范围内
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    page_info = PageInfo(
        current_page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )
    
    return PaginatedResponse(
        items=items[start_idx:end_idx],
        page_info=page_info
    )
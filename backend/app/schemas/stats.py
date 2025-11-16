from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime

class ActivityBase(BaseModel):
    id: int
    student_name: str
    score: float
    completed_at: datetime
    type: str

class TeacherStats(BaseModel):
    total_students: int
    exercises_today: int
    average_accuracy: float
    recent_activities: List[ActivityBase]

    class Config:
        from_attributes = True

class ChildStats(BaseModel):
    id: int
    name: str
    exercises_today: int
    total_exercises: int
    average_score: float

class ParentStats(BaseModel):
    total_children: int
    total_exercises_today: int
    average_accuracy: float
    children_stats: List[ChildStats]
    recent_activities: List[ActivityBase]

    class Config:
        from_attributes = True

class TeacherStats(BaseModel):
    total_students: int
    exercises_today: int
    average_accuracy: float
    recent_activities: List[Dict]
    
    class Config:
        from_attributes = True

class ParentStats(BaseModel):
    total_children: int
    total_exercises_today: int
    average_accuracy: float
    children_stats: List[Dict]  # 每个孩子的单独统计
    recent_activities: List[Dict]

    class Config:
        from_attributes = True

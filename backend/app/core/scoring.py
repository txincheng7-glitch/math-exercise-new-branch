from abc import ABC, abstractmethod
from typing import List, Optional
from ..models.exercise import DifficultyLevel
from ..schemas.exercise import QuestionResponse


class ScoringStrategy(ABC):
    @abstractmethod
    def calculate_score(
        self,
        questions: List[QuestionResponse],
        difficulty: Optional[DifficultyLevel] = None
    ) -> float:
        pass


class BasicScoringStrategy(ScoringStrategy):
    def calculate_score(
        self,
        questions: List[QuestionResponse],
        difficulty: Optional[DifficultyLevel] = None
    ) -> float:
        if not questions:
            return 0.0
        
        correct_count = sum(1 for q in questions if q.is_correct)
        return round(correct_count / len(questions) * 100, 2)


class TimedScoringStrategy(ScoringStrategy):
    def __init__(self, time_weight: float = 0.3, accuracy_weight: float = 0.7):
        if not (0 < time_weight < 1 and 0 < accuracy_weight < 1):
            raise ValueError("权重必须在0到1之间")
        if abs(time_weight + accuracy_weight - 1) > 0.0001:
            raise ValueError("权重之和必须等于1")

        self.time_weight = time_weight
        self.accuracy_weight = accuracy_weight

    def calculate_score(
        self,
        questions: List[QuestionResponse],
        difficulty: Optional[DifficultyLevel] = None
    ) -> float:
        if not questions or not difficulty:
            return 0.0

        # 计算正确率分数
        correct_count = sum(1 for q in questions if q.is_correct)
        accuracy_score = correct_count / len(questions) * 100

        # 根据难度和题目数量计算基准时间（秒）
        base_times = {
            DifficultyLevel.EASY: 30,
            DifficultyLevel.MEDIUM: 45,
            DifficultyLevel.HARD: 60,
        }

        base_time_per_question = base_times[difficulty]
        total_base_time = base_time_per_question * len(questions)

        # 计算实际用时
        total_time = sum(q.time_spent or 0 for q in questions)

        # 计算时间分数
        if total_time <= total_base_time:
            time_score = 100
        else:
            overtime_ratio = (total_time - total_base_time) / total_base_time
            time_score = max(0, min(100, 100 - overtime_ratio * 50))

        # 计算总分
        final_score = (
            accuracy_score * self.accuracy_weight + 
            time_score * self.time_weight
        )

        return round(final_score, 2)


class DifficultyAdjustedScoringStrategy(ScoringStrategy):
    def calculate_score(
        self,
        questions: List[QuestionResponse],
        difficulty: Optional[DifficultyLevel] = None
    ) -> float:
        if not questions or not difficulty:
            return 0.0

        # 难度权重
        difficulty_weights = {
            DifficultyLevel.EASY: 1.0,
            DifficultyLevel.MEDIUM: 1.2,
            DifficultyLevel.HARD: 1.5,
        }

        # 基础分数
        basic_score = BasicScoringStrategy().calculate_score(questions)
        
        # 应用难度权重
        weighted_score = basic_score * difficulty_weights[difficulty]
        
        # 确保分数不超过100
        return round(min(100, weighted_score), 2)

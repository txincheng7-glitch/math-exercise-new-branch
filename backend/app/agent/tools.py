from typing import Optional, Dict, Any, List
from langchain.tools import BaseTool
from pydantic import Field
from sqlalchemy.orm import Session
from ..services import ExerciseService, UserService
from ..models import User


class GetExerciseStatsTool(BaseTool):
    """获取学生练习统计信息的工具"""
    
    name: str = "get_exercise_stats"
    description: str = """
    获取学生的练习统计信息，包括总练习数、完成数、平均分、正确率等。
    
    输入应该是一个空字符串（将使用当前登录用户的信息）。
    
    返回格式示例：
    {
        "total_exercises": 10,
        "completed_exercises": 8,
        "average_score": 85.5,
        "accuracy_rate": 0.78,
        "total_time": 3600
    }
    """
    
    db: Session = Field(exclude=True)
    current_user: User = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def _run(self, query: str = "") -> Dict[str, Any]:
        """同步执行"""
        service = ExerciseService(self.db)
        stats = service.get_student_exercise_stats(self.current_user.student.id)
        return stats
    
    async def _arun(self, query: str = "") -> Dict[str, Any]:
        """异步执行"""
        return self._run(query)


class GetRecentExercisesTool(BaseTool):
    """获取最近练习记录的工具"""
    
    name: str = "get_recent_exercises"
    description: str = """
    获取学生最近的练习记录列表。
    
    输入应该是要获取的练习数量（例如："5"表示获取最近5次练习）。
    如果不指定数量，默认获取最近10次。
    
    返回练习记录列表，每条记录包含：
    - 练习ID
    - 难度级别
    - 完成时间
    - 得分
    - 题目数量等信息
    """
    
    db: Session = Field(exclude=True)
    current_user: User = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def _run(self, query: str = "10") -> List[Dict[str, Any]]:
        """同步执行"""
        try:
            limit = int(query) if query else 10
        except ValueError:
            limit = 10
        
        service = ExerciseService(self.db)
        exercises, _ = service.get_student_exercises(
            student_id=self.current_user.student.id,
            skip=0,
            limit=limit
        )
        
        # 转换为简化的字典格式
        result = []
        for ex in exercises:
            result.append({
                "id": ex.id,
                "difficulty": ex.difficulty.value,
                "created_at": ex.created_at.isoformat(),
                "completed_at": ex.completed_at.isoformat() if ex.completed_at else None,
                "final_score": ex.final_score,
                "total_questions": len(ex.questions),
                "total_time": ex.total_time
            })
        
        return result
    
    async def _arun(self, query: str = "10") -> List[Dict[str, Any]]:
        """异步执行"""
        return self._run(query)


class GetExerciseDetailTool(BaseTool):
    """获取特定练习详情的工具"""
    
    name: str = "get_exercise_detail"
    description: str = """
    获取指定练习的详细信息，包括所有题目、答案、用时等。
    
    输入应该是练习ID（例如："123"）。
    
    返回该练习的完整信息，包括每道题的题目内容、正确答案、用户答案、是否正确等。
    """
    
    db: Session = Field(exclude=True)
    current_user: User = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def _run(self, query: str) -> Optional[Dict[str, Any]]:
        """同步执行"""
        try:
            exercise_id = int(query)
        except ValueError:
            return {"error": "Invalid exercise ID"}
        
        service = ExerciseService(self.db)
        
        # 验证权限
        if not service.verify_exercise_access(exercise_id, self.current_user.student.id):
            return {"error": "Access denied"}
        
        exercise = service.get_exercise_with_questions(exercise_id)
        if not exercise:
            return {"error": "Exercise not found"}
        
        # 获取统计信息
        stats = service.get_exercise_stats(exercise_id)
        
        # 构建返回数据
        questions_data = []
        for q in exercise.questions:
            questions_data.append({
                "id": q.id,
                "content": q.content,
                "correct_answer": q.correct_answer,
                "user_answer": q.user_answer,
                "is_correct": q.is_correct,
                "time_spent": q.time_spent
            })
        
        return {
            "id": exercise.id,
            "difficulty": exercise.difficulty.value,
            "created_at": exercise.created_at.isoformat(),
            "completed_at": exercise.completed_at.isoformat() if exercise.completed_at else None,
            "final_score": exercise.final_score,
            "questions": questions_data,
            "stats": stats
        }
    
    async def _arun(self, query: str) -> Optional[Dict[str, Any]]:
        """异步执行"""
        return self._run(query)


class AnalyzeLearningTrendTool(BaseTool):
    """分析学习趋势的工具"""
    
    name: str = "analyze_learning_trend"
    description: str = """
    分析学生的学习趋势，包括分数变化、正确率趋势、各难度表现等。
    
    输入应该是要分析的练习数量（例如："20"表示分析最近20次练习）。
    如果不指定，默认分析最近所有练习。
    
    返回趋势分析结果，包括：
    - 分数趋势（上升/下降/稳定）
    - 正确率变化
    - 各难度级别的表现
    - 改进建议
    """
    
    db: Session = Field(exclude=True)
    current_user: User = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def _run(self, query: str = "") -> Dict[str, Any]:
        """同步执行"""
        try:
            limit = int(query) if query else None
        except ValueError:
            limit = None
        
        service = ExerciseService(self.db)
        
        # 获取练习历史
        if limit:
            exercises, _ = service.get_student_exercises(
                student_id=self.current_user.student.id,
                skip=0,
                limit=limit
            )
        else:
            exercises, _ = service.get_student_exercises(
                student_id=self.current_user.student.id,
                skip=0,
                limit=1000  # 获取足够多的记录
            )
        
        # 只分析已完成的练习
        completed = [ex for ex in exercises if ex.completed_at and ex.final_score is not None]
        
        if not completed:
            return {"message": "没有足够的完成练习数据进行分析"}
        
        # 计算分数趋势
        scores = [ex.final_score for ex in completed]
        if len(scores) >= 2:
            recent_avg = sum(scores[:len(scores)//2]) / (len(scores)//2)
            early_avg = sum(scores[len(scores)//2:]) / (len(scores) - len(scores)//2)
            score_change = recent_avg - early_avg
            
            if score_change > 5:
                trend = "上升"
            elif score_change < -5:
                trend = "下降"
            else:
                trend = "稳定"
        else:
            trend = "数据不足"
            score_change = 0
        
        # 按难度统计
        difficulty_stats = {}
        for ex in completed:
            diff = ex.difficulty.value
            if diff not in difficulty_stats:
                difficulty_stats[diff] = {"count": 0, "total_score": 0}
            difficulty_stats[diff]["count"] += 1
            difficulty_stats[diff]["total_score"] += ex.final_score
        
        for diff in difficulty_stats:
            difficulty_stats[diff]["average"] = (
                difficulty_stats[diff]["total_score"] / difficulty_stats[diff]["count"]
            )
        
        return {
            "total_analyzed": len(completed),
            "score_trend": trend,
            "score_change": round(score_change, 2),
            "average_score": round(sum(scores) / len(scores), 2),
            "difficulty_performance": difficulty_stats,
            "suggestion": self._generate_suggestion(trend, difficulty_stats)
        }
    
    def _generate_suggestion(self, trend: str, difficulty_stats: Dict) -> str:
        """生成改进建议"""
        suggestions = []
        
        if trend == "下降":
            suggestions.append("最近的成绩有所下降，建议回顾错题，加强基础练习。")
        elif trend == "上升":
            suggestions.append("成绩持续进步，保持良好的学习状态！可以尝试更高难度的练习。")
        
        # 分析难度表现
        for diff, stats in difficulty_stats.items():
            if stats["average"] < 60:
                suggestions.append(f"{diff}难度的题目正确率较低，需要重点练习。")
        
        return " ".join(suggestions) if suggestions else "继续保持，稳步提升！"
    
    async def _arun(self, query: str = "") -> Dict[str, Any]:
        """异步执行"""
        return self._run(query)


# Poe API相关工具

class GetPoeAccountInfoTool(BaseTool):
    """获取Poe账户信息的工具"""
    
    name: str = "get_poe_account_info"
    description: str = """
    获取当前Poe账户的信息，包括订阅状态和积分余额。
    
    输入应该是空字符串。
    
    返回账户信息，包括：
    - 是否有活跃订阅
    - 当前积分余额
    """
    
    poe_client: Any = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    async def _arun(self, query: str = "") -> Dict[str, Any]:
        """异步执行"""
        if not self.poe_client:
            return {"error": "Poe client not initialized"}
        
        try:
            settings = await self.poe_client.get_settings()
            return {
                "subscription_active": settings.get("subscription", {}).get("isActive", False),
                "message_points": settings.get("messagePointInfo", {}).get("messagePointBalance", 0)
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _run(self, query: str = "") -> Dict[str, Any]:
        """同步执行（通过异步实现）"""
        import asyncio
        return asyncio.run(self._arun(query))


class ListPoeBotsTool(BaseTool):
    """列出可用Poe机器人的工具"""
    
    name: str = "list_poe_bots"
    description: str = """
    列出当前可用的Poe AI机器人列表。
    
    输入可以是数字（例如："10"表示列出10个机器人），或为空获取默认数量。
    
    返回机器人列表，每个机器人包含handle和displayName。
    """
    
    poe_client: Any = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    async def _arun(self, query: str = "25") -> List[Dict[str, str]]:
        """异步执行"""
        if not self.poe_client:
            return [{"error": "Poe client not initialized"}]
        
        try:
            count = int(query) if query else 25
            bots_data = await self.poe_client.get_available_bots(count=count)
            
            result = []
            for handle, data in bots_data.items():
                bot_info = data.get("bot", {})
                result.append({
                    "handle": bot_info.get("handle", ""),
                    "displayName": bot_info.get("displayName", "")
                })
            
            return result
        except Exception as e:
            return [{"error": str(e)}]
    
    def _run(self, query: str = "25") -> List[Dict[str, str]]:
        """同步执行"""
        import asyncio
        return asyncio.run(self._arun(query))
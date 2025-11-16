from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, case
from ..models import Exercise, Question, Student, DifficultyLevel
from ..schemas import exercise as schemas
from ..core.arithmetic_factory import QuestionGenerator
from ..core.scoring import TimedScoringStrategy, BasicScoringStrategy
from .base import BaseService


class ExerciseService(BaseService[Exercise, schemas.ExerciseCreate, schemas.ExerciseUpdate]):
    def __init__(self, db: Session):
        super().__init__(Exercise, db)
        self.basic_scoring = BasicScoringStrategy()
        self.timed_scoring = TimedScoringStrategy()

    def create_exercise(self, *, student_id: int, exercise_in: schemas.ExerciseCreate) -> Exercise:
        """创建新的练习"""
        # 验证学生是否存在
        student = self.db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError("Student not found")

        # 创建练习记录
        db_exercise = Exercise(
            student_id=student_id,
            difficulty=exercise_in.difficulty,
            number_range=exercise_in.number_range,
            operator_types=[op.value for op in exercise_in.operator_types]
        )
        self.db.add(db_exercise)
        self.db.flush()

        # 生成题目
        generator = QuestionGenerator(
            exercise_in.difficulty,
            exercise_in.number_range,
            exercise_in.operator_types
        )

        questions = []
        for _ in range(exercise_in.question_count):
            content, answer, operators, tree_json = generator.generate_question()
            db_question = Question(
                exercise_id=db_exercise.id,
                content=content,
                correct_answer=answer,
                operator_types=operators,
                arithmetic_tree=tree_json
            )
            questions.append(db_question)

        self.db.bulk_save_objects(questions)
        self.db.commit()
        self.db.refresh(db_exercise)
        return db_exercise

    def get_exercise_with_questions(self, exercise_id: int) -> Optional[Exercise]:
        """
        获取练习及其题目
        使用joinedload预加载questions关系，避免N+1查询问题
        
        Args:
            exercise_id (int): 练习ID
        
        Returns:
            Optional[Exercise]: 找到的练习对象，包含预加载的题目数据，未找到则返回None
        """
        return self.db.query(Exercise).options(
            joinedload(Exercise.questions)  # 预加载questions关系
        ).filter(Exercise.id == exercise_id).first()

    def submit_answer(
        self, 
        exercise_id: int, 
        question_id: int, 
        user_answer: float, 
        time_spent: int
    ) -> dict:
        """提交答案"""
        question = self.db.query(Question).filter(
            Question.exercise_id == exercise_id,
            Question.id == question_id
        ).first()

        if not question:
            raise ValueError("Question not found")

        question.user_answer = user_answer
        question.time_spent = time_spent
        
        # 直接使用is_correct属性
        is_correct = question.is_correct

        self.db.commit()

        return {
            "is_correct": is_correct,
            "correct_answer": question.correct_answer
        }

    def complete_exercise(self, exercise_id: int) -> float:
        """完成练习并计算得分"""
        exercise = self.get_exercise_with_questions(exercise_id)
        if not exercise:
            raise ValueError("Exercise not found")

        if exercise.completed_at:
            raise ValueError("Exercise already completed")

        # 使用to_response方法简化转换
        questions = [q.to_response() for q in exercise.questions]

        final_score = self.timed_scoring.calculate_score(
            questions=questions,
            difficulty=exercise.difficulty
        )

        exercise.completed_at = datetime.utcnow()
        exercise.final_score = final_score
        exercise.total_time = sum(q.time_spent or 0 for q in exercise.questions)

        self.db.commit()
        return final_score

    def get_student_exercises(
        self,
        student_id: int,
        skip: int = 0,
        limit: int = 10
    ) -> Tuple[List[Exercise], int]:
        """获取学生的练习列表"""
        query = self.db.query(Exercise).filter(Exercise.student_id == student_id)
        total = query.count()
        exercises = query.order_by(desc(Exercise.created_at)).offset(skip).limit(limit).all()
        return exercises, total

    def create_exercise_from_wrong_questions(self, *, student_id: int, question_ids: list[int], shuffle: bool = True) -> Exercise:
        """基于指定错题创建新的练习（将题目克隆到新练习中）"""
        if not question_ids:
            raise ValueError("No question ids provided")

        # 查询这些题目，确保属于该学生且是错题
        rows = (
            self.db.query(Question, Exercise)
            .join(Exercise, Question.exercise_id == Exercise.id)
            .filter(
                Exercise.student_id == student_id,
                Question.id.in_(question_ids),
                Question.user_answer.isnot(None),
                Question.is_correct == False,
            )
            .all()
        )
        if not rows:
            raise ValueError("No wrong questions found for current student")

        # 聚合生成新练习的元信息
        difficulties = {}
        op_set = set()
        min_v, max_v = None, None
        for q, ex in rows:
            difficulties[str(ex.difficulty.value if hasattr(ex.difficulty, 'value') else ex.difficulty)] = (
                difficulties.get(str(ex.difficulty.value if hasattr(ex.difficulty, 'value') else ex.difficulty), 0) + 1
            )
            for op in (q.operator_types or []):
                op_set.add(op)
            if ex.number_range:
                lo, hi = (ex.number_range if isinstance(ex.number_range, (list, tuple)) else (None, None))
                if lo is not None and hi is not None:
                    min_v = lo if min_v is None else min(min_v, lo)
                    max_v = hi if max_v is None else max(max_v, hi)

        # 选择最常见的难度，否则默认中等
        top_diff_str = sorted(difficulties.items(), key=lambda x: x[1], reverse=True)[0][0] if difficulties else DifficultyLevel.MEDIUM.value
        # 将字符串转回 DifficultyLevel
        try:
            top_diff = DifficultyLevel(top_diff_str)
        except Exception:
            top_diff = DifficultyLevel.MEDIUM

        nr = (min_v if min_v is not None else 1, max_v if max_v is not None else 100)
        operators = list(op_set) or ["+", "-"]

        # 创建新练习
        new_ex = Exercise(
            student_id=student_id,
            difficulty=top_diff,
            number_range=list(nr),
            operator_types=operators,
        )
        self.db.add(new_ex)
        self.db.flush()

        # 生成新题目（克隆原错题的题干与正确答案）
        import random
        seq = rows[:]
        if shuffle:
            random.shuffle(seq)
        for q, ex in seq:
            nq = Question(
                exercise_id=new_ex.id,
                content=q.content,
                correct_answer=q.correct_answer,
                operator_types=q.operator_types,
                arithmetic_tree=q.arithmetic_tree,
            )
            self.db.add(nq)

        self.db.commit()
        self.db.refresh(new_ex)
        return new_ex

    def get_student_wrong_questions(self, student_id: int, skip: int = 0, limit: int = 10):
        """获取学生的错题列表（分页）"""
        # 连接 Exercise 与 Question，过滤答错
        q = (
            self.db.query(Question, Exercise)
            .join(Exercise, Question.exercise_id == Exercise.id)
            .filter(
                Exercise.student_id == student_id,
                Question.user_answer.isnot(None),
                Question.is_correct == False,
            )
            .order_by(desc(Exercise.created_at))
        )
        total = q.count()
        rows = q.offset(skip).limit(limit).all()
        items = []
        for question, ex in rows:
            items.append({
                "id": question.id,
                "exercise_id": ex.id,
                "content": question.content,
                "correct_answer": question.correct_answer,
                "user_answer": question.user_answer,
                "operator_types": question.operator_types,
                "difficulty": ex.difficulty,
                "number_range": tuple(ex.number_range) if isinstance(ex.number_range, list) else ex.number_range,
                "created_at": ex.created_at,
                "completed_at": ex.completed_at,
            })
        return items, total

    def get_student_wrong_stats(self, student_id: int):
        """获取学生错题的聚合统计：按难度、按运算符、近14天趋势"""
        # 按难度统计
        by_difficulty = (
            self.db.query(Exercise.difficulty, func.count(Question.id))
            .join(Exercise, Question.exercise_id == Exercise.id)
            .filter(
                Exercise.student_id == student_id,
                Question.user_answer.isnot(None),
                Question.is_correct == False,
            )
            .group_by(Exercise.difficulty)
            .all()
        )
        difficulty_dict = {str(k.value if hasattr(k, 'value') else k): v for k, v in by_difficulty}

        # 按运算符统计（operator_types 为 JSON 数组，展开计数）
        # 简化实现：拉取近 1000 条错题，前端量一般可接受
        sample_q = (
            self.db.query(Question.operator_types)
            .join(Exercise, Question.exercise_id == Exercise.id)
            .filter(
                Exercise.student_id == student_id,
                Question.user_answer.isnot(None),
                Question.is_correct == False,
            )
            .limit(1000)
            .all()
        )
        operator_counter = {}
        for (ops,) in sample_q:
            if not ops:
                continue
            for op in ops:
                operator_counter[op] = operator_counter.get(op, 0) + 1

        # 近14天趋势（按练习创建日期统计错题数）
        from datetime import datetime, timedelta
        today = datetime.utcnow().date()
        start_date = today - timedelta(days=13)
        daily_counts = { (start_date + timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(14) }

        trend_rows = (
            self.db.query(func.date(Exercise.created_at), func.count(Question.id))
            .join(Exercise, Question.exercise_id == Exercise.id)
            .filter(
                Exercise.student_id == student_id,
                Question.user_answer.isnot(None),
                Question.is_correct == False,
                Exercise.created_at >= start_date,
            )
            .group_by(func.date(Exercise.created_at))
            .all()
        )
        for d, cnt in trend_rows:
            key = d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d)
            if key in daily_counts:
                daily_counts[key] = cnt

        trend = [{"date": k, "count": daily_counts[k]} for k in sorted(daily_counts.keys())]

        return {
            "by_difficulty": difficulty_dict,
            "by_operator": operator_counter,
            "trend_14d": trend,
        }

    def get_exercise_stats(self, exercise_id: int) -> dict:
        """获取练习的统计信息"""
        exercise = self.get_exercise_with_questions(exercise_id)
        if not exercise:
            raise ValueError("Exercise not found")

        total_questions = len(exercise.questions)
        answered_questions = sum(1 for q in exercise.questions if q.user_answer is not None)
        correct_answers = sum(1 for q in exercise.questions if q.is_correct)

        return {
            "total_questions": total_questions,
            "answered_questions": answered_questions,
            "correct_answers": correct_answers,
            "accuracy_rate": round(correct_answers / total_questions * 100, 2) if total_questions > 0 else 0,
            "completion_rate": round(answered_questions / total_questions * 100, 2) if total_questions > 0 else 0,
            "average_time": round(exercise.total_time / total_questions, 2) if exercise.total_time else 0
        }

    def get_student_exercise_stats(self, student_id: int) -> dict:
        """获取学生的练习统计信息"""
        # 基础统计
        base_stats = self.db.query(
            func.count(Exercise.id).label('total_exercises'),
            func.count(Exercise.completed_at).label('completed_exercises'),
            func.avg(Exercise.final_score).label('average_score'),
            func.sum(Exercise.total_time).label('total_time')
        ).filter(
            Exercise.student_id == student_id
        ).first()

        # 计算正确率
        questions_stats = self.db.query(
            func.count(Question.id).label('total_questions'),
            func.sum(case(
                (Question.is_correct == True, 1),
                else_=0
            )).label('correct_answers')
        ).join(Exercise).filter(
            Exercise.student_id == student_id
        ).first()

        total_questions = questions_stats[0] or 0
        correct_answers = questions_stats[1] or 0
        accuracy_rate = round(
            (correct_answers / total_questions * 100) if total_questions > 0 else 0, 
            2
        )

        # 获取最近的成绩历史
        score_history = self.db.query(
            Exercise.completed_at,
            Exercise.final_score
        ).filter(
            Exercise.student_id == student_id,
            Exercise.completed_at.isnot(None)
        ).order_by(desc(Exercise.completed_at)).limit(10).all()

        return {
            "total_exercises": base_stats[0] or 0,
            "completed_exercises": base_stats[1] or 0,
            "average_score": round(base_stats[2] or 0, 2),
            "total_time": base_stats[3] or 0,
            "accuracy_rate": accuracy_rate,  # 添加正确率
            "score_history": [
                {
                    "date": completed_at.strftime("%Y-%m-%d"),
                    "score": score
                }
                for completed_at, score in score_history
            ]
        }

    def verify_exercise_access(self, exercise_id: int, student_id: int) -> bool:
        """验证学生是否有权限访问该练习"""
        exercise = self.get_exercise_with_questions(exercise_id)
        return exercise is not None and exercise.student_id == student_id
    
    def save_feedback(self, exercise_id: int, feedback: str) -> bool:
        """保存练习的AI反馈"""
        try:
            exercise = self.get(exercise_id)
            if not exercise:
                return False
            exercise.ai_feedback = feedback
            self.db.commit()
            return True
        except Exception as e:
            print(f"保存反馈失败: {str(e)}")
            return False
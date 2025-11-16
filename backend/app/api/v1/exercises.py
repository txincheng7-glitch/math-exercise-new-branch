from fastapi import Body
import json
from ...schemas.exercise import ExerciseResponse
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...database import get_db
from ...services import ExerciseService, AIService
from ...schemas import exercise as schemas
from ...models import User, Exercise
from ..deps import check_student, check_teacher, check_parent, check_admin, check_teacher_or_admin
from app.database import SessionLocal  # 导入数据库引擎和会话工厂

router = APIRouter()

@router.post("/", response_model=schemas.ExerciseResponse)
def create_exercise(
    *,
    db: Session = Depends(get_db),
    exercise_in: schemas.ExerciseCreate,
    current_user: User = Depends(check_student)
) -> Any:
    """创建新练习"""
    exercise_service = ExerciseService(db)
    return exercise_service.create_exercise(
        student_id=current_user.student.id,
        exercise_in=exercise_in
    )

@router.get("/list", response_model=schemas.ExerciseListResponse)
async def list_exercises(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """获取练习列表"""
    exercise_service = ExerciseService(db)
    exercises, total = exercise_service.get_student_exercises(
        student_id=current_user.student.id,
        skip=skip,
        limit=limit
    )
    
    return {
        "exercises": [exercise.to_response() for exercise in exercises],
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit
    }

@router.get("/stats", response_model=schemas.ExerciseStats)
def get_exercise_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """获取练习统计信息"""
    exercise_service = ExerciseService(db)
    return exercise_service.get_student_exercise_stats(current_user.student.id)

@router.get("/wrong-questions", response_model=schemas.WrongQuestionListResponse)
def list_wrong_questions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """获取当前学生的错题列表（分页）"""
    exercise_service = ExerciseService(db)
    items, total = exercise_service.get_student_wrong_questions(
        student_id=current_user.student.id,
        skip=skip,
        limit=limit,
    )
    return {
        "items": items,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit,
    }

@router.get("/wrong-stats", response_model=schemas.WrongStats)
def get_wrong_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """获取当前学生的错题统计信息"""
    exercise_service = ExerciseService(db)
    return exercise_service.get_student_wrong_stats(current_user.student.id)

@router.post("/repractice/wrong-questions", response_model=schemas.ExerciseResponse)
def repractice_wrong_questions(
    req: schemas.RepracticeFromWrongsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """基于选中的错题创建新的练习（克隆题目内容）"""
    exercise_service = ExerciseService(db)
    try:
        new_ex = exercise_service.create_exercise_from_wrong_questions(
            student_id=current_user.student.id,
            question_ids=req.question_ids,
            shuffle=req.shuffle,
        )
        return new_ex
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ai/initialize")
def initialize_ai(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student),
    tokens: dict = Body(...),
) -> Any:
    """初始化AI服务"""
    ai_service = AIService.get_instance(current_user.student.id)
    success = ai_service.initialize_client(
        tokens.get("pb_token"),
        tokens.get("plat_token")
    )
    return {"success": success}

@router.get("/{exercise_id}", response_model=schemas.ExerciseResponse)
def get_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """获取练习详情"""
    exercise_service = ExerciseService(db)
    exercise = exercise_service.get_exercise_with_questions(exercise_id)
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
        
    # 验证是否是该学生的练习
    if exercise.student_id != current_user.student.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return exercise

@router.post("/{exercise_id}/complete")
def complete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """完成练习"""
    exercise_service = ExerciseService(db)
    exercise = exercise_service.get(exercise_id)
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
        
    # 验证是否是该学生的练习
    if exercise.student_id != current_user.student.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return {
        "final_score": exercise_service.complete_exercise(exercise_id)
    }

@router.get("/{exercise_id}/stats")
def get_exercise_detail_stats(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student)
) -> Any:
    """获取单次练习的统计信息"""
    exercise_service = ExerciseService(db)
    exercise = exercise_service.get(exercise_id)
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
        
    # 验证是否是该学生的练习
    if exercise.student_id != current_user.student.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return exercise_service.get_exercise_stats(exercise_id)

@router.get("/{exercise_id}/ai-feedback")
async def get_ai_feedback(
    exercise_id: int,
    feedback_type: str = Query("detailed", regex="^(detailed|summary)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student),
) -> Any:
    """获取AI反馈（流式响应）"""
    from fastapi.responses import StreamingResponse, JSONResponse
    
    exercise_service = ExerciseService(db)
    # 确保service方法使用joinedload
    exercise = exercise_service.get_exercise_with_questions(exercise_id)
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if exercise.student_id != current_user.student.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 获取用户专属的AI服务实例
    ai_service = AIService.get_instance(current_user.student.id)
    
    if not ai_service.is_available():
        return JSONResponse(
            status_code=400,
            content={"error": "AI服务未初始化，请先配置token"}
        )

    # 在生成器函数外准备数据
    complete_feedback = []  # 用于收集完整的反馈内容

    async def generate():
        try:
            # 确保在数据库会话中获取完整的练习数据

            # 假设我们不用joinedload
            # 当执行到这个生成器函数时，外部的请求已经结束
            # 数据库会话已经关闭，但我们还要访问exercise.questions
            exercise_response = ExerciseResponse.model_validate(exercise)
            # ExerciseResponse需要访问exercise.questions来序列化数据
            # 但此时会话已关闭，会抛出DetachedInstanceError

            for chunk in ai_service.generate_feedback_stream(
                exercise_response,
                feedback_type
            ):
                complete_feedback.append(chunk["chunk"])
                yield f"data: {json.dumps(chunk)}\n\n"

            # 在流式生成完成后，使用新的数据库会话保存反馈
            if complete_feedback:  # 只有在有反馈内容时才尝试保存
                with SessionLocal() as new_session:  # 创建新的数据库会话
                    service = ExerciseService(new_session)
                    service.save_feedback(
                        exercise_id,
                        "".join(complete_feedback)
                    )

        except Exception as e:
            print(f"生成反馈时出错: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.post("/{exercise_id}/ai-feedback/stop")
def stop_ai_feedback(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_student),
) -> Any:
    """停止AI反馈生成"""
    exercise_service = ExerciseService(db)
    exercise = exercise_service.get(exercise_id)
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if exercise.student_id != current_user.student.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    ai_service = AIService.get_instance(current_user.student.id)
    ai_service.stop_generation()
    return {"success": True}

@router.post("/{exercise_id}/questions/{question_id}/answer")
def submit_answer(
    exercise_id: int,
    question_id: int,
    *,
    db: Session = Depends(get_db),
    answer_in: schemas.QuestionUpdate,
    current_user: User = Depends(check_student)
) -> Any:
    """提交答案"""
    exercise_service = ExerciseService(db)
    exercise = exercise_service.get(exercise_id)
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
        
    # 验证是否是该学生的练习
    if exercise.student_id != current_user.student.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return exercise_service.submit_answer(
        exercise_id=exercise_id,
        question_id=question_id,
        user_answer=answer_in.user_answer,
        time_spent=answer_in.time_spent
    )

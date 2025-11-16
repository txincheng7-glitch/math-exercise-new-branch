"""
文件名: inspect_db.py
作用: 这是一个数据库检查工具，用于检查和记录数据库的结构和内容。
      它会生成一个带时间戳的日志文件，记录：
      1. 数据库中所有表的结构信息（表名、列、主键、外键等）
      2. 各个表中的实际数据内容
      3. 数据库整体统计信息（用户角色分布、练习完成情况等）
      日志文件保存在logs目录下，便于后续查看和分析。
"""

# 导入所需的标准库
import os  # 用于文件和目录操作
from datetime import datetime  # 用于处理日期和时间

# 导入SQLAlchemy相关组件
from sqlalchemy import inspect  # 用于检查数据库结构
from app.database import engine, SessionLocal  # 导入数据库引擎和会话工厂
from app.models import (  # 导入数据模型
    User, Student, Teacher, Parent, Admin,  # 用户及角色模型
    Exercise, Question, UserRole  # 练习相关模型和枚举
)

def write_database_info(file):
    """
    将数据库的结构信息写入指定文件
    
    包含以下信息：
    - 表名
    - 列信息（名称、类型、约束条件、默认值）
    - 主键信息
    - 外键关系
    
    Args:
        file: 要写入的文件对象
    """
    # 创建数据库检查器实例
    inspector = inspect(engine)
    
    # 写入表信息的标题
    file.write("\n=== 数据库中的表 ===\n")
    
    # 遍历所有表
    for table_name in inspector.get_table_names():
        # 写入表名
        file.write(f"\n表名: {table_name}\n")
        
        # 写入表的列信息，包含约束和默认值
        file.write("列信息:\n")
        for column in inspector.get_columns(table_name):
            file.write(f"  - {column['name']}: {column['type']}")
            if column.get('nullable') is False:
                file.write(" (NOT NULL)")
            if column.get('default') is not None:
                file.write(f" (DEFAULT: {column['default']})")
            file.write("\n")
            
        # 写入表的主键信息
        pk = inspector.get_pk_constraint(table_name)
        file.write(f"主键: {pk['constrained_columns']}\n")
        
        # 写入表的外键信息
        fks = inspector.get_foreign_keys(table_name)
        if fks:  # 如果存在外键
            file.write("外键:\n")
            for fk in fks:
                file.write(f"  - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}\n")

def write_table_data(file):
    """
    将表中的实际数据写入指定文件
    
    包含以下表的数据：
    - 用户表（基本信息、角色）
    - 角色表（学生、教师、家长、管理员）
    - 练习表（难度、范围、得分、时间）
    - 题目表（内容、答案、用时、正确性）
    
    Args:
        file: 要写入的文件对象
    """
    # 创建数据库会话
    db = SessionLocal()
    try:
        # 写入用户基础数据
        file.write("\n=== 用户基础数据 ===\n")
        users = db.query(User).all()
        for user in users:
            file.write(f"用户ID: {user.id}\n")
            file.write(f"邮箱: {user.email}\n")
            file.write(f"用户名: {user.username}\n")
            file.write(f"角色: {user.role.value}\n")
            file.write(f"是否活跃: {user.is_active}\n")
            file.write(f"创建时间: {user.created_at}\n")
            file.write("---\n")

        # 写入学生数据
        file.write("\n=== 学生数据 ===\n")
        students = db.query(Student).all()
        for student in students:
            file.write(f"学生ID: {student.id}\n")
            file.write(f"用户ID: {student.user_id}\n")
            file.write(f"年级: {student.grade}\n")
            file.write(f"班级: {student.class_name}\n")
            file.write(f"教师ID: {student.teacher_id}\n")
            file.write(f"家长ID: {student.parent_id}\n")
            file.write(f"创建时间: {student.created_at}\n")
            
            # 统计练习信息
            exercises = student.exercises
            completed = sum(1 for e in exercises if e.completed_at)
            file.write(f"练习总数: {len(exercises)}\n")
            file.write(f"已完成练习: {completed}\n")
            file.write("---\n")

        # 写入教师数据
        file.write("\n=== 教师数据 ===\n")
        teachers = db.query(Teacher).all()
        for teacher in teachers:
            file.write(f"教师ID: {teacher.id}\n")
            file.write(f"用户ID: {teacher.user_id}\n")
            file.write(f"教授科目: {teacher.subjects}\n")
            file.write(f"学生数量: {len(teacher.students)}\n")
            file.write(f"创建时间: {teacher.created_at}\n")
            file.write("---\n")

        # 写入家长数据
        file.write("\n=== 家长数据 ===\n")
        parents = db.query(Parent).all()
        for parent in parents:
            file.write(f"家长ID: {parent.id}\n")
            file.write(f"用户ID: {parent.user_id}\n")
            file.write(f"关联学生数: {len(parent.students)}\n")
            file.write(f"创建时间: {parent.created_at}\n")
            file.write("---\n")

        # 写入管理员数据
        file.write("\n=== 管理员数据 ===\n")
        admins = db.query(Admin).all()
        for admin in admins:
            file.write(f"管理员ID: {admin.id}\n")
            file.write(f"用户ID: {admin.user_id}\n")
            file.write(f"权限配置: {admin.permissions}\n")
            file.write(f"创建时间: {admin.created_at}\n")
            file.write("---\n")

        # 写入练习数据
        file.write("\n=== 练习数据 ===\n")
        exercises = db.query(Exercise).all()
        for exercise in exercises:
            file.write(f"练习ID: {exercise.id}\n")
            file.write(f"学生ID: {exercise.student_id}\n")  # 改为student_id
            file.write(f"难度: {exercise.difficulty.value}\n")
            file.write(f"数值范围: {exercise.number_range}\n")
            file.write(f"运算符: {exercise.operator_types}\n")
            file.write(f"得分: {exercise.final_score}\n")
            file.write(f"总用时: {exercise.total_time}秒\n")
            file.write(f"AI反馈: {exercise.ai_feedback}\n")
            file.write(f"创建时间: {exercise.created_at}\n")
            file.write(f"完成时间: {exercise.completed_at}\n")
            file.write("---\n")  # 分隔符

        # 写入题目表数据，包含答题详情
        file.write("\n=== 题目数据 ===\n")
        questions = db.query(Question).all()  # 查询所有题目
        for question in questions:
            file.write(f"题目ID: {question.id}\n")
            file.write(f"练习ID: {question.exercise_id}\n")
            file.write(f"内容: {question.content}\n")
            file.write(f"正确答案: {question.correct_answer}\n")
            file.write(f"用户答案: {question.user_answer}\n")
            file.write(f"用时: {question.time_spent}秒\n")
            file.write(f"运算符: {question.operator_types}\n")
            file.write(f"算术树: {'已生成' if question.arithmetic_tree else '未生成'}\n")
            file.write(f"是否正确: {question.is_correct}\n")
            file.write("---\n")  # 分隔符

    finally:
        # 确保会话被关闭
        db.close()

def write_statistics(file):
    """
    写入数据库的统计信息
    
    包含以下统计数据：
    - 用户总数及各角色分布
    - 各角色关联统计
    - 练习完成情况
    - 题目统计
    """
    # 创建数据库会话
    db = SessionLocal()
    try:
        file.write("\n=== 统计信息 ===\n")
        
        # 基础用户统计
        total_users = db.query(User).count()
        users_by_role = {}
        for role in UserRole:
            count = db.query(User).filter(User.role == role).count()
            users_by_role[role.value] = count
        
        file.write(f"总用户数: {total_users}\n")
        file.write("用户角色分布:\n")
        for role, count in users_by_role.items():
            file.write(f"  - {role}: {count}\n")
        
        # 角色关联统计
        file.write("\n角色关联统计:\n")
        # 教师-学生关系
        teachers = db.query(Teacher).all()
        total_teacher_student_links = sum(len(t.students) for t in teachers)
        file.write(f"教师-学生关联总数: {total_teacher_student_links}\n")
        # 家长-学生关系
        parents = db.query(Parent).all()
        total_parent_student_links = sum(len(p.students) for p in parents)
        file.write(f"家长-学生关联总数: {total_parent_student_links}\n")
        
        # 练习统计
        total_exercises = db.query(Exercise).count()
        completed_exercises = db.query(Exercise).filter(
            Exercise.completed_at.isnot(None)
        ).count()
        total_questions = db.query(Question).count()
        
        file.write(f"\n练习统计:\n")
        file.write(f"总练习数: {total_exercises}\n")
        file.write(f"已完成练习数: {completed_exercises}\n")
        file.write(f"总题目数: {total_questions}\n")
        
        # 计算正确率
        answered_questions = db.query(Question).filter(
            Question.user_answer.isnot(None)
        ).count()
        correct_questions = db.query(Question).filter(
            Question.is_correct == True
        ).count()
        accuracy_rate = (
            round(correct_questions / answered_questions * 100, 2)
            if answered_questions > 0 else 0
        )
        file.write(f"题目正确率: {accuracy_rate}%\n")
        
    finally:
        # 确保会话被关闭
        db.close()

if __name__ == "__main__":
    # 创建logs目录（如果不存在）
    os.makedirs('logs', exist_ok=True)
    
    # 生成带时间戳的文件名，格式：db_info_年月日_时分秒.txt
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'logs/db_info_{timestamp}.txt'
    
    # 打开文件并写入所有数据
    with open(filename, 'w', encoding='utf-8') as f:
        # 写入文件头部信息
        f.write(f"数据库检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 50 + "\n")  # 分隔线
        
        # 依次写入数据库结构、数据内容和统计信息
        write_database_info(f)
        write_table_data(f)
        write_statistics(f)
        
    # 输出成功信息
    print(f"数据库信息已写入文件: {filename}")
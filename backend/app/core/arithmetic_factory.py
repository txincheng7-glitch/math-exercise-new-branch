"""
具体题目工厂模块

本模块实现具体的题目生成工厂类，主要功能：
1. 继承QuestionFactory抽象类，实现实际的题目生成逻辑
2. 实现算术表达式树的构建
3. 生成随机且合理的算术题目

核心类：
- ArithmeticQuestionFactory：算术题目工厂，负责生成具体的算术题目
- QuestionGenerator：工厂类的包装器，提供更简单的接口来生成题目
"""

# 导入所需的库
import random
from typing import List, Tuple
from ..models.exercise import Question, DifficultyLevel, OperatorType
from .question_factory import QuestionFactory
from .arithmetic_tree import ArithmeticNode
import json

import logging

# 获取logger，只添加NullHandler，移除其他所有handler
logger = logging.getLogger(__name__)
# 清除所有已存在的handler
logger.handlers = []
# 添加NullHandler
logger.addHandler(logging.NullHandler())
# 不传播到父logger
logger.propagate = False

class ArithmeticQuestionFactory(QuestionFactory):
    """具体的算术题目生成工厂"""

    def create_question(self) -> Question:
        """创建一个新的算术题
        根据工厂的配置（难度、数值范围、运算符）生成一个完整的算术表达式题目
        """
        # 获取根据难度确定的操作数个数
        operand_count = self._get_operand_count()
        logger.debug(f"生成题目开始：操作数数量={operand_count}")
        # 用于存储所有未完成（需要继续处理）的节点
        incomplete_nodes = []

        # 随机选择初始运算符和生成合适的结果值
        initial_operator = self._get_random_operator()
        initial_result = self._get_suitable_result(initial_operator)
        
        logger.debug(f"初始操作符：{initial_operator}，目标结果：{initial_result}")
        
        if initial_result is None:
            logger.error(f"无法生成合适的初始结果：操作符={initial_operator}，数值范围=[{self.min_num}, {self.max_num}]")
            raise ValueError("无法生成合适的初始结果")

        # 创建算术树的根节点，使用初始结果值和运算符
        root_node = ArithmeticNode(operand=initial_result, operator=initial_operator)
        self.tree.root = root_node
        incomplete_nodes.append(root_node)

        count = 1  # 当前已处理的操作数计数
        operators = []  # 记录使用的运算符列表

        # 继续生成节点，直到达到所需的操作数个数
        while count < operand_count:
            # 从未完成节点列表中随机选择一个节点进行处理
            current_node = random.choice(incomplete_nodes)
            incomplete_nodes.remove(current_node)  # 移除已选择的节点
            operator = current_node.operator
            operand = current_node.operand

            logger.debug(f"处理节点：操作符={operator}，操作数={operand}")

            # 为当前节点创建左右子节点
            left_node = ArithmeticNode(0)
            right_node = ArithmeticNode(0)
            # 如果还需要继续添加操作数，则为新节点分配运算符
            left_node.operator = (
                self._get_random_operator() if count < operand_count - 1 else None
            )
            right_node.operator = (
                self._get_random_operator() if count < operand_count - 1 else None
            )

            # 初始化左右操作数为None
            left_num, right_num = None, None
            retry_count = 0  # 重试计数器
            max_retries = 10  # 最大重试次数

            # 尝试生成合适的操作数
            while (left_num is None or right_num is None) and retry_count < max_retries:
                left_num, right_num = self._generate_operands(operator, operand)
                logger.debug(f"尝试生成操作数：左={left_num}，右={right_num}，重试次数={retry_count}")
                
                if left_num is None or right_num is None:
                    # 如果生成失败，重新选择运算符再试
                    current_node.operator = self._get_random_operator()
                    operator = current_node.operator
                    logger.debug(f"更换操作符重试：新操作符={operator}")
                retry_count += 1

            # 如果达到最大重试次数仍然失败，抛出异常
            if retry_count >= max_retries:
                logger.error(f"无法生成合适的操作数：操作符={operator}，目标结果={operand}，" 
                           f"数值范围=[{self.min_num}, {self.max_num}]")
                raise ValueError("无法生成合适的操作数")

            operators.append(operator)  # 记录使用的运算符

            # 设置左右子节点的值
            left_node.operand = left_num
            right_node.operand = right_num
            current_node.set_left_node(left_node)
            current_node.set_right_node(right_node)

            # 如果还需要继续生成节点，将新生成的有运算符的节点加入待处理列表
            if count < operand_count - 1:
                if left_node.operator is not None:
                    incomplete_nodes.append(left_node)
                if right_node.operator is not None:
                    incomplete_nodes.append(right_node)

            count += 1  # 更新操作数计数

        logger.debug("清理未使用的运算符")
        def clean_unused_operators(node: ArithmeticNode):
            """递归清理未被使用的运算符（即叶子节点上的运算符）"""
            if not node:
                return
            # 如果是叶子节点（没有子节点），清除其运算符
            if not node.left_node and not node.right_node:
                node.operator = None
            # 递归处理子节点
            clean_unused_operators(node.left_node)
            clean_unused_operators(node.right_node)

        clean_unused_operators(self.tree.root)
        # 生成算术表达式字符串并计算结果
        arithmetic = self.tree.get_arithmetic()
        result = float(self.tree.calculate_result())
        logger.debug(f"生成题目完成：{arithmetic} = {result}")
        return Question(content=arithmetic, correct_answer=result, operator_types=operators)


class QuestionGenerator:
    """问题生成器，封装工厂的使用"""

    def __init__(
        self,
        difficulty: DifficultyLevel,
        number_range: tuple[int, int],
        operators: List[OperatorType],
    ):
        """初始化问题生成器

        Args:
            difficulty: 难度级别
            number_range: 数值范围的元组(最小值, 最大值)
            operators: 允许使用的运算符列表
        """
        # 创建具体的算术题工厂实例
        self.factory = ArithmeticQuestionFactory(difficulty, number_range, operators)

    def generate_question(self) -> Tuple[str, float, List[OperatorType], dict]:
        """生成一个新的题目
        
        Returns:
            Tuple[str, float, List[OperatorType], dict]: 
            依次为题目内容、答案、使用的运算符列表和算术树的JSON表示
        """
        question = self.factory.create_question()
        return (
            question.content,
            question.correct_answer,
            question.operator_types,
            json.loads(self.factory.tree.to_json())
        )
from typing import List, Tuple, Optional
import random
import json
from collections import deque
from ..models.exercise import DifficultyLevel, OperatorType
from .arithmetic_tree import ArithmeticTree, ArithmeticNode


class QuestionGenerator:
    def __init__(
        self,
        difficulty: DifficultyLevel,
        number_range: Tuple[int, int],
        operators: List[OperatorType]
    ):
        self.difficulty = difficulty
        self.min_num = number_range[0]
        self.max_num = number_range[1]
        self.operators = operators
        self.tree = ArithmeticTree()

    def _get_operand_count(self) -> int:
        """根据难度确定操作数个数"""
        counts = {
            DifficultyLevel.EASY: (2, 2),      # 固定2个操作数
            DifficultyLevel.MEDIUM: (2, 3),    # 2-3个操作数
            DifficultyLevel.HARD: (3, 4)       # 3-4个操作数
        }
        min_count, max_count = counts[self.difficulty]
        return random.randint(min_count, max_count)

    def _get_random_operator(self) -> OperatorType:
        """随机选择运算符"""
        return random.choice(self.operators)

    def _get_weighted_result(self, operator: OperatorType) -> float:
        """根据运算符类型获取加权随机的结果"""
        if operator == OperatorType.DIVISION:
            return self._get_division_result()
        return random.randint(self.min_num, self.max_num)

    def _get_division_result(self) -> float:
        """生成适合除法的结果"""
        potential_results = []
        weights = []
        
        for n in range(max(1, self.min_num), self.max_num + 1):
            # 跳过0和1
            if n in (0, 1, -1):
                continue
                
            # 计算有多少个数可以整除n
            divisors = sum(1 for i in range(self.min_num, self.max_num + 1)
                         if i != 0 and i != 1 and i != -1 and n % i == 0)
            
            if divisors > 0:
                potential_results.append(n)
                weights.append(divisors)

        if not potential_results:
            return random.randint(self.min_num, self.max_num)

        return random.choices(potential_results, weights=weights)[0]

    def _generate_operands(
        self, 
        operator: OperatorType, 
        result: float
    ) -> Tuple[Optional[float], Optional[float]]:
        """根据运算符和结果生成合适的操作数"""
        if operator == OperatorType.ADDITION:
            return self._generate_addition_operands(result)
        elif operator == OperatorType.SUBTRACTION:
            return self._generate_subtraction_operands(result)
        elif operator == OperatorType.MULTIPLICATION:
            return self._generate_multiplication_operands(result)
        elif operator == OperatorType.DIVISION:
            return self._generate_division_operands(result)
        return None, None

    def _generate_addition_operands(self, result: float) -> Tuple[float, float]:
        left = random.randint(
            max(self.min_num, int(result - self.max_num)),
            min(self.max_num, int(result - self.min_num))
        )
        right = result - left
        return left, right

    def _generate_subtraction_operands(self, result: float) -> Tuple[float, float]:
        right = random.randint(self.min_num, self.max_num)
        left = result + right
        if self.min_num <= left <= self.max_num:
            return left, right
        return None, None

    def _generate_multiplication_operands(self, result: float) -> Tuple[float, float]:
        if result == 0:
            return random.randint(self.min_num, self.max_num), 0
        
        factors = []
        for i in range(self.min_num, self.max_num + 1):
            if i != 0 and result % i == 0:
                quotient = result / i
                if self.min_num <= quotient <= self.max_num:
                    factors.append((i, quotient))
        
        if not factors:
            return None, None
        
        return random.choice(factors)

    def _generate_division_operands(self, result: float) -> Tuple[float, float]:
        potential_pairs = []
        
        for divisor in range(self.min_num, self.max_num + 1):
            if divisor == 0:
                continue
            
            dividend = result * divisor
            if self.min_num <= dividend <= self.max_num:
                potential_pairs.append((dividend, divisor))
        
        if not potential_pairs:
            return None, None
        
        return random.choice(potential_pairs)

    def generate_question(self) -> Tuple[str, float, List[OperatorType], dict]:
        """生成一个完整的题目"""
        operand_count = self._get_operand_count()

        # 初始节点
        initial_operator = self._get_random_operator()
        initial_result = self._get_weighted_result(initial_operator)

        self.tree.root = ArithmeticNode(
            operand=initial_result,
            operator=initial_operator
        )

        # 使用BFS构建算术树
        count = 1
        queue = deque([self.tree.root])
        operators_used = []

        while count < operand_count and queue:
            current_node = queue[0]
            operator = current_node.operator
            operand = current_node.operand

            left_operand, right_operand = self._generate_operands(operator, operand)
            
            if left_operand is None or right_operand is None:
                # 如果生成失败，尝试使用其他运算符
                retry_count = 3
                while retry_count > 0:
                    operator = self._get_random_operator()
                    current_node.operator = operator
                    left_operand, right_operand = self._generate_operands(
                        operator, operand
                    )
                    if left_operand is not None:
                        break
                    retry_count -= 1
                
                if left_operand is None:
                    # 如果多次重试后仍然失败，则终止此分支
                    queue.popleft()
                    continue

            queue.popleft()
            operators_used.append(operator)

            # 创建左右子节点
            left_node = ArithmeticNode(
                operand=left_operand,
                operator=self._get_random_operator() if count < operand_count - 1 else None
            )
            right_node = ArithmeticNode(
                operand=right_operand,
                operator=self._get_random_operator() if count < operand_count - 1 else None
            )

            current_node.set_left_node(left_node)
            current_node.set_right_node(right_node)

            if count < operand_count - 1:
                queue.extend([left_node, right_node])
            count += 1

        # 生成算式字符串
        arithmetic = self.tree.get_arithmetic()
        # 计算最终结果
        result = self.tree.calculate_result()
        # 获取树的JSON表示
        tree_json = json.loads(self.tree.to_json())

        return arithmetic, result, operators_used, tree_json
"""
题目生成工厂模块

本模块实现了题目生成的工厂模式，主要功能：
1. 定义题目生成的抽象工厂类
2. 提供题目生成所需的各种辅助方法
3. 处理数值范围、运算符选择、合数生成等底层逻辑

核心类：
- QuestionFactory：抽象工厂基类，定义题目生成的基本框架和通用方法
"""

from abc import ABC, abstractmethod
import random
import itertools
from typing import List, Tuple, Optional, Set
from ..models.exercise import Question, OperatorType, DifficultyLevel
from .arithmetic_tree import ArithmeticTree, ArithmeticNode


class QuestionFactory(ABC):
    """题目生成抽象工厂基类"""
    
    def __init__(
        self,
        difficulty: DifficultyLevel,
        number_range: tuple[int, int],
        operators: List[OperatorType],
    ):
        self.difficulty = difficulty
        self.min_num = number_range[0]
        self.max_num = number_range[1]
        self.operators = operators
        # 存储范围内的合数
        self.composite_numbers = self._get_composite_numbers()
        self.tree = ArithmeticTree()

    @abstractmethod
    def create_question(self) -> Question:
        """生成一个新的题目"""
        pass

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

    def _get_suitable_result(self, operator: OperatorType) -> Optional[int]:
        """根据运算符类型生成合适的结果值
        
        Args:
            operator: 运算符类型
            
        Returns:
            Optional[int]: 合适的结果值，如果无法生成则返回None
        """
        
        min_num, max_num = self.min_num, self.max_num  # 获取数值范围的上下限
        
        # 处理加法：考虑两个范围内的数相加的可能结果范围
        if operator == OperatorType.ADDITION:
            # 结果范围：[max(2*min_num, min_num), min(2*max_num, max_num)]
            # - 最小结果：两个最小值相加，但不小于允许的最小值
            # - 最大结果：两个最大值相加，但不大于允许的最大值
            result_min = max(2 * min_num, min_num)
            result_max = min(2 * max_num, max_num)
            
            # 确保范围有效（最小值不大于最大值）
            if result_min > result_max:
                return None
            return random.randint(result_min, result_max)
        
        # 处理减法：考虑两个范围内的数相减的可能结果范围    
        elif operator == OperatorType.SUBTRACTION:
            # 结果范围：[max(min_num-max_num, min_num), min(max_num-min_num, max_num)]
            # - 最小结果：最小值减最大值，但不小于允许的最小值
            # - 最大结果：最大值减最小值，但不大于允许的最大值
            result_min = max(min_num - max_num, min_num)
            result_max = min(max_num - min_num, max_num)
            
            if result_min > result_max:
                return None
            return random.randint(result_min, result_max)
        
        # 处理乘法：从预先计算好的合数集合中随机选择一个数
        elif operator == OperatorType.MULTIPLICATION:
            if not self.composite_numbers:  # 如果合数集合为空
                return None
            return random.choice(list(self.composite_numbers))
        
        # 处理除法：需要特别处理以确保结果是整数
        elif operator == OperatorType.DIVISION:
            from math import floor, ceil  # 导入向下取整和向上取整函数
            candidates = []

            # 情况1：范围全为非负数
            if min_num >= 0:
                # 对于每个可能的商n
                for n in range(max(2, min_num), floor(max_num / 2) + 1):
                    # 计算使得a÷b=n的可能的除数b的范围
                    lower = max(2, ceil(min_num / n))  # b的下限
                    upper = floor(max_num / n)         # b的上限
                    
                    if upper >= lower:  # 如果范围有效
                        count = upper - lower + 1      # 计算这个范围内整数的个数
                        candidates.extend([n] * count)  # 将n添加count次到候选列表

            # 情况2：范围全为非正数
            elif max_num <= 0:
                # 对于每个可能的商n
                for n in range(ceil(min_num / 2), min(-1, max_num + 1)):
                    # 计算使得a÷b=n的可能的除数b的范围
                    lower = max(2, ceil(max_num / n))  # b的下限
                    upper = floor(min_num / n)         # b的上限
                    
                    if upper >= lower:  # 如果范围有效
                        count = upper - lower + 1      # 计算这个范围内整数的个数
                        candidates.extend([n] * count)  # 将n添加count次到候选列表

            # 情况3：范围跨越0（包含正负数）
            else:
                # 遍历所有可能的商：包括正数范围和负数范围
                for n in itertools.chain(
                    range(2, floor(max_num / 2) + 1),        # 正数范围
                    range(ceil(min_num / 2), -1)             # 负数范围
                ):
                    # 对于任意n，计算可能的除数个数
                    count = 0
                    n_abs = abs(n)  # 商的绝对值
                    
                    # 处理max_num部分（正数部分）
                    upper_max = floor(abs(max_num) / n_abs)
                    if upper_max >= 2:
                        count += upper_max - 1  # 减1是因为从2开始
                        
                    # 处理min_num部分（负数部分）
                    upper_min = floor(abs(min_num) / n_abs)
                    if upper_min >= 2:
                        count += upper_min - 1
                        
                    if count > 0:
                        candidates.extend([n] * count)  # 将n添加count次到候选列表

            print(f"candidates: {candidates}")  # 打印候选商的列表（用于调试）

            # 如果没有找到合适的候选值
            if not candidates:
                return None

            # 从候选值中随机选择一个
            return random.choice(candidates)

        return None  # 对于未知的运算符返回None

    def _generate_operands(
        self, operator: OperatorType, result: int
    ) -> Tuple[Optional[int], Optional[int]]:
        """根据运算符和目标结果生成合适的操作数对
        
        Args:
            operator: 运算符类型
            result: 期望得到的运算结果
            
        Returns:
            Tuple[Optional[int], Optional[int]]: 操作数对(left, right)，
            如果无法生成合适的操作数则返回(None, None)
        """
        min_num, max_num = self.min_num, self.max_num  # 获取数值范围的上下限

        # 处理加法：a + b = result
        if operator == OperatorType.ADDITION:
            # 计算left可能的取值范围
            # left最小值 = max(result - max_num, min_num)
            #   - result - max_num：确保right不会超过max_num
            #   - min_num：left不能小于允许的最小值
            left_min = max(result - max_num, min_num)
            # left最大值 = min(result - min_num, max_num)
            #   - result - min_num：确保right不会小于min_num
            #   - max_num：left不能大于允许的最大值
            left_max = min(result - min_num, max_num)

            # 检查范围是否有效（最小值应该小于等于最大值）
            if left_min > left_max:
                return None, None

            # 在有效范围内随机选择left值
            left = random.randint(left_min, left_max)
            # 根据left计算对应的right值
            right = result - left
            return left, right

        # 处理减法：a - b = result
        elif operator == OperatorType.SUBTRACTION:
            # 计算left可能的取值范围
            # left最小值 = max(min_num, result + min_num)
            #   - min_num：left不能小于允许的最小值
            #   - result + min_num：确保right不会小于min_num
            left_min = max(min_num, result + min_num)
            # left最大值 = min(max_num, result + max_num)
            #   - max_num：left不能大于允许的最大值
            #   - result + max_num：确保right不会超过max_num
            left_max = min(max_num, result + max_num)

            # 检查范围是否有效
            if left_min > left_max:
                return None, None

            # 在有效范围内随机选择left值
            left = random.randint(left_min, left_max)
            # 根据left计算对应的right值
            right = left - result
            return left, right

        # 处理乘法：a * b = result
        elif operator == OperatorType.MULTIPLICATION:
            # 特殊处理：如果结果为0
            if result == 0:
                # 一个因数为0，另一个随机选择
                return random.randint(min_num, max_num), 0
                
            # 在[-|result|+1, |result|-1]范围内寻找因数，排除±1
            factors = []
            # 确定搜索范围的起止点
            search_start = max(-abs(result) + 1, min_num)
            search_end = min(abs(result) - 1, max_num)
            
            # 遍历可能的因数
            for i in range(search_start, search_end + 1):
                # 排除0和±1
                if i in {-1, 0, 1}:
                    continue
                # 检查i是否是result的因数，且对应的另一个因数在范围内
                if (result % i == 0 and 
                    min_num <= result // i <= max_num):
                    factors.append(i)
                    
            # 如果没有找到合适的因数
            if not factors:
                return None, None
                
            # 随机选择一个因数作为left
            left = random.choice(factors)
            return left, result // left

        # 处理除法：a ÷ b = result
        else:  # DIVISION
            from math import floor  # 导入数学函数：向下取整
            
            # 排除特殊情况：商为0或±1时不生成
            if result == 0 or abs(result) == 1:
                return None, None

            possible_divisors = []  # 存储可能的除数

            # 情况1：范围全为非负数
            if min_num >= 0:
                # 计算可能的最大除数
                max_divisor = floor(max_num / result)
                # 如果最大除数至少为2
                if max_divisor >= 2:
                    # 将所有可能的除数加入列表
                    possible_divisors.extend(range(2, max_divisor + 1))

            # 情况2：范围全为非正数
            elif max_num <= 0:
                # 全负数范围不可能满足要求
                return None, None

            # 情况3：范围跨越0（包含正负数）
            else:
                # 计算正负两部分的最大除数（不考虑符号）
                pos_max_divisor = floor(abs(max_num / result))
                neg_max_divisor = floor(abs(min_num / result))

                # 处理正数部分
                if pos_max_divisor >= 2:
                    if result > 0:
                        # 正商对应正除数
                        possible_divisors.extend(range(2, pos_max_divisor + 1))
                    else:
                        # 负商对应负除数
                        possible_divisors.extend(range(-pos_max_divisor, -1))

                # 处理负数部分
                if neg_max_divisor >= 2:
                    if result < 0:
                        # 负商对应正除数
                        possible_divisors.extend(range(2, neg_max_divisor + 1))
                    else:
                        # 正商对应负除数
                        possible_divisors.extend(range(-neg_max_divisor, -1))

            if not possible_divisors:  # 如果没有找到合适的除数
                return None, None

            # 随机选择一个除数
            right = random.choice(possible_divisors)
            # 计算被除数
            left = result * right

            # 验证被除数是否在允许范围内
            if min_num <= left <= max_num:
                return left, right

            return None, None

        return None, None  # 对于未知的运算符返回None

    def _sieve_of_eratosthenes(self, n: int) -> set[int]:
        """埃拉托斯特尼筛法，找出n以内的所有素数"""
        # 初始化标记数组，默认所有数都是素数
        is_prime = [True] * (n + 1)
        is_prime[0] = is_prime[1] = False

        # 从2开始遍历到sqrt(n)
        for i in range(2, int(n**0.5) + 1):
            if is_prime[i]:
                # 将i的所有倍数标记为非素数
                for j in range(i * i, n + 1, i):
                    is_prime[j] = False

        # 返回所有素数
        return {i for i in range(2, n + 1) if is_prime[i]}

    def _get_composite_numbers(self) -> set[int]:
        """获取数值范围内的所有合数"""
        min_num, max_num = self.min_num, self.max_num
        max_abs = max(abs(min_num), abs(max_num))
        primes = self._sieve_of_eratosthenes(max_abs)
        result = set()

        # 添加正数范围
        if max_num > 0:
            result.update(
                set(range(1 if min_num <= 0 else min_num, max_num + 1))
                - primes
                - {0, 1}
            )

        # 添加负数范围
        if min_num < 0:
            result.update(
                {
                    -x
                    for x in range(1 if max_num >= 0 else -max_num, -min_num + 1)
                    if x not in primes and x != 1
                }
            )

        # 如果范围包含0，添加0
        if min_num <= 0 <= max_num:
            result.add(0)

        return result
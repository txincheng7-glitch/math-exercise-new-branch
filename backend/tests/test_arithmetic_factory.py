"""
Logger层级结构：

root (有FileHandler和StreamHandler)
  ├── __main__ (测试程序的logger，传播到root)
  └── app
      └── core
          └── arithmetic_factory (有自己的handlers，propagate=False避免重复输出)

算术工厂的logger通过propagate=False阻止日志传播到root logger，这样：
1. 算术工厂的日志只由自己的handlers处理
2. 测试程序的日志通过传播到root logger来处理
3. 避免了日志重复输出
"""

import sys
import os

# 将backend目录添加到Python的模块搜索路径
# 这样可以直接导入app模块，而不用考虑测试文件的相对位置
# __file__: '.../backend/tests/test_arithmetic_factory.py'
# os.path.abspath(__file__): 获取当前文件的绝对路径
# os.path.dirname(...): 获取tests目录
# os.path.dirname(...): 获取backend目录
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.arithmetic_factory import ArithmeticQuestionFactory, QuestionGenerator
from app.models.exercise import DifficultyLevel, OperatorType
from typing import List, Tuple
import logging
from datetime import datetime


def setup_module_logger(
    module_name: str, level: int, handlers: List[logging.Handler]
) -> logging.Logger:
    """配置特定模块的logger

    Args:
        module_name: 模块名称（如'app.core.arithmetic_factory'）
        level: 日志级别
        handlers: 日志处理器列表

    Returns:
        配置好的logger实例
    """
    module_logger = logging.getLogger(module_name)
    module_logger.handlers = []  # 清除现有handlers
    module_logger.setLevel(level)
    for handler in handlers:
        module_logger.addHandler(handler)
    return module_logger


def setup_logging(level: int = logging.INFO) -> str:
    """设置日志配置，返回日志文件路径"""
    # 创建logs目录
    logs_dir = "logs"
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)

    # 生成日志文件路径
    log_file = os.path.join(
        logs_dir, f"arithmetic_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    )

    # 配置日志格式
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 设置根日志记录器
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # 清除可能存在的旧处理器
    root_logger.handlers = []

    # 添加文件处理器
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    # 添加控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # 配置arithmetic_factory的logger
    setup_module_logger(
        'app.core.arithmetic_factory',
        level,
        [file_handler, console_handler]
    )
    
    return log_file


def test_question_generation(
    difficulty: DifficultyLevel,
    number_range: Tuple[int, int],
    operators: List[OperatorType],
    attempts: int = 100,
) -> tuple[int, int]:
    """
    测试题目生成的可靠性
    返回：(成功次数, 失败次数)
    """
    logger = logging.getLogger(__name__)
    factory = ArithmeticQuestionFactory(difficulty, number_range, operators)
    success = 0
    failures = 0
    failure_cases = []

    logger.info("\n测试配置：")
    logger.info(f"难度：{difficulty}")
    logger.info(f"数值范围：{number_range}")
    logger.info(f"运算符：{[op.value for op in operators]}")
    logger.info(f"测试次数：{attempts}")
    logger.info("-" * 50)

    for i in range(attempts):
        try:
            question = factory.create_question()
            success += 1
            logger.debug(
                f"成功案例 {success}: {question.content} = {question.correct_answer}"
            )
        except ValueError as e:
            failures += 1
            failure_cases.append(str(e))
            logger.error(f"失败案例 {failures}: {str(e)}")

    logger.info("\n测试结果统计：")
    logger.info(f"总测试次数：{attempts}")
    logger.info(f"成功次数：{success}")
    logger.info(f"失败次数：{failures}")
    logger.info(f"成功率：{success/attempts*100:.2f}%")

    if failure_cases:
        logger.info("\n失败原因统计：")
        from collections import Counter

        for reason, count in Counter(failure_cases).items():
            logger.info(f"{reason}: {count}次")

    if success / attempts < 0.8:
        logger.warning(f"警告：成功率过低 ({success/attempts*100:.2f}%)")

    return success, failures


def main():
    """主测试函数"""
    # 设置日志级别（可以根据需要修改）
    log_file = setup_logging(logging.DEBUG)
    logger = logging.getLogger(__name__)

    logger.info(f"日志文件：{log_file}")
    logger.info("开始算术题目生成测试")

    test_cases = [
        # 基础测试：加法
        {
            "difficulty": DifficultyLevel.EASY,
            "number_range": (1, 100),
            "operators": [OperatorType.ADDITION],
        }
    ]

    total_success = 0
    total_failures = 0

    for i, case in enumerate(test_cases, 1):
        logger.info(f"\n{'='*70}")
        logger.info(f"测试用例 {i}")
        logger.info(f"{'='*70}")
        success, failures = test_question_generation(**case)
        total_success += success
        total_failures += failures

    logger.info("\n总体测试结果：")
    total_attempts = total_success + total_failures
    logger.info(f"总测试次数：{total_attempts}")
    logger.info(f"总成功次数：{total_success}")
    logger.info(f"总失败次数：{total_failures}")
    logger.info(f"总体成功率：{total_success/total_attempts*100:.2f}%")
    logger.info("测试完成")


if __name__ == "__main__":
    main()

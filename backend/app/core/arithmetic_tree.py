"""
本模块实现了算术表达式的树形表示：
1. ArithmeticNode: 表达式树的节点类
   - 存储操作数、运算符和树形结构
   - 每个节点的操作数是其子树计算的结果
2. ArithmeticTree: 表达式树类
   - 实现了表达式的存储和转换
   - 处理运算符优先级和括号
   - 通过中序遍历生成完整表达式

该模块为题目生成提供了核心的数据结构支持，
确保生成的表达式结构正确、运算符优先级恰当。
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any
import random
from ..models.exercise import OperatorType
import json


@dataclass
class ArithmeticNode:
    """算术表达式树的节点类

    每个节点存储：
    1. operand: 该节点代表的子树的计算结果
    2. operator: 用于计算当前节点的运算符（如果是非叶节点）
    3. left_node和right_node: 左右子节点
    4. parent_node: 父节点的引用，用于处理运算符优先级
    """

    operand: int  # 存储该节点的计算结果值
    operator: Optional[OperatorType] = None  # 当前节点的运算符，叶节点为None
    left_node: Optional["ArithmeticNode"] = None  # 左子节点
    right_node: Optional["ArithmeticNode"] = None  # 右子节点
    parent_node: Optional["ArithmeticNode"] = None  # 父节点引用

    def set_left_node(self, node: "ArithmeticNode"):
        """设置左子节点，同时建立父子关系"""
        node.parent_node = self  # 设置子节点的父节点引用
        self.left_node = node  # 设置当前节点的左子节点引用

    def set_right_node(self, node: "ArithmeticNode"):
        """设置右子节点，同时建立父子关系"""
        node.parent_node = self  # 设置子节点的父节点引用
        self.right_node = node  # 设置当前节点的右子节点引用

    def to_dict(self) -> Dict[str, Any]:
        """将节点转换为字典形式，用于JSON序列化"""
        result = {
            "operand": self.operand,
            "operator": self.operator.value if self.operator else None,
        }
        if self.left_node:
            result["left"] = self.left_node.to_dict()
        if self.right_node:
            result["right"] = self.right_node.to_dict()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ArithmeticNode":
        """从字典形式恢复节点"""
        node = cls(
            operand=data["operand"],
            operator=OperatorType(data["operator"]) if data.get("operator") else None
        )
        if "left" in data:
            node.set_left_node(cls.from_dict(data["left"]))
        if "right" in data:
            node.set_right_node(cls.from_dict(data["right"]))
        return node


class ArithmeticTree:
    """算术表达式树类

    特点：
    1. 每个节点存储的operand是该节点下子树的计算结果
    2. 非叶节点的operand是对其左右子节点operand进行operator运算的结果
    3. 叶节点直接存储输入的数值，没有operator
    """

    def __init__(self):
        """初始化空的表达式树"""
        self.root = None

    def is_empty(self):
        """判断树是否为空"""
        return self.root is None

    def get_arithmetic(self) -> str:
        """生成表示整个算术表达式的字符串，通过中序遍历实现"""
        return self._inorder(self.root)

    def _inorder(self, node: Optional[ArithmeticNode]) -> str:
        """递归进行中序遍历，生成带正确括号的表达式字符串

        算法：
        1. 对于叶节点，直接返回其操作数
        2. 对于非叶节点，递归处理左子树、当前运算符、右子树
        3. 根据运算符优先级规则添加必要的括号

        Args:
            node: 当前处理的节点

        Returns:
            表示当前子树对应算术表达式的字符串
        """
        # 空节点返回空字符串
        if node is None:
            return ""

        # 叶节点：如果是负数加括号，否则直接转字符串
        if node.left_node is None and node.right_node is None:
            return f"({node.operand})" if node.operand < 0 else str(node.operand)

        # 递归生成左子树表达式
        left = self._inorder(node.left_node)
        # 获取当前节点的运算符
        operator = node.operator.value if node.operator else ""
        # 递归生成右子树表达式
        right = self._inorder(node.right_node)

        # 根据运算符优先级和节点位置决定是否需要括号
        needs_parentheses = (
            node.parent_node is not None and 
            self._needs_parentheses(node.operator, node.parent_node.operator, node)
        )

        # 根据需要返回带括号或不带括号的表达式
        if needs_parentheses:
            return f"({left} {operator} {right})"
        return f"{left} {operator} {right}"

    def _needs_parentheses(
        self, 
        current_op: Optional[OperatorType], 
        parent_op: Optional[OperatorType],
        current_node: Optional[ArithmeticNode] = None
    ) -> bool:
        """判断是否需要括号
        
        括号添加规则：
        1. 当前运算符优先级低于父运算符时，需要括号
        例如：在 2 * (3 + 4) 中，+ 的优先级低于 *，需要括号
        
        2. 当前运算符和父运算符优先级相同时：
        - 如果当前节点是右子树，总是需要括号
            原因：虽然有些情况（如1 + 2 + 3）加不加括号结果一样，
            但考虑到：
            a) 运算语义更清晰（特别是对减法除法）
            b) 防止中间结果超出预设范围
            所以统一加括号更稳妥
            
        例如：
        - 加法：1 + (2 + 3) 而不是 1 + 2 + 3
        - 减法：1 - (2 - 3) 而不是 1 - 2 - 3
        - 乘法：2 * (3 * 4) 而不是 2 * 3 * 4
        - 除法：2 / (3 / 4) 而不是 2 / 3 / 4
        """
        if not current_op or not parent_op:
            return False

        # 定义运算符优先级
        priorities = {
            OperatorType.ADDITION: 1,
            OperatorType.SUBTRACTION: 1,
            OperatorType.MULTIPLICATION: 2,
            OperatorType.DIVISION: 2,
        }

        # 情况1：当前运算符优先级低于父运算符
        if priorities[current_op] < priorities[parent_op]:
            return True

        # 情况2：当前运算符和父运算符优先级相同且节点是右子树
        if (priorities[current_op] == priorities[parent_op] and 
            current_node and current_node.parent_node and 
            current_node == current_node.parent_node.right_node):
            return True

        return False

    def to_json(self) -> str:
        """将整个算术树转换为JSON字符串"""
        if not self.root:
            return "{}"
        return json.dumps(self.root.to_dict())

    @classmethod
    def from_json(cls, json_str: str) -> "ArithmeticTree":
        """从JSON字符串恢复算术树"""
        tree = cls()
        if json_str and json_str != "{}":
            data = json.loads(json_str)
            tree.root = ArithmeticNode.from_dict(data)
        return tree

    def calculate_result(self) -> float:
        """计算算术树的结果"""
        return self._calculate_node(self.root)

    def _calculate_node(self, node: Optional[ArithmeticNode]) -> float:
        """递归计算节点的值"""
        if not node:
            return 0.0

        # 如果是叶节点，直接返回操作数
        if not node.left_node and not node.right_node:
            return float(node.operand)

        # 递归计算左右子树的值
        left_value = self._calculate_node(node.left_node)
        right_value = self._calculate_node(node.right_node)

        # 根据运算符进行计算
        if node.operator == OperatorType.ADDITION:
            return left_value + right_value
        elif node.operator == OperatorType.SUBTRACTION:
            return left_value - right_value
        elif node.operator == OperatorType.MULTIPLICATION:
            return left_value * right_value
        elif node.operator == OperatorType.DIVISION:
            if abs(right_value) < 0.0001:  # 避免除以零
                raise ValueError("除数不能为零")
            return left_value / right_value
        else:
            raise ValueError(f"未知的运算符: {node.operator}")
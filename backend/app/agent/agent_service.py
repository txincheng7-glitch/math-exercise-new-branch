from typing import Optional, Dict, Any, List, AsyncIterator
from langchain.agents import AgentExecutor, create_react_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.orm import Session
from poe_api_wrapper import AsyncPoeApi

from ..core.poe_chat_model import PoeChatModel
from .tools import (
    GetExerciseStatsTool,
    GetRecentExercisesTool,
    GetExerciseDetailTool,
    AnalyzeLearningTrendTool,
    GetPoeAccountInfoTool,
    ListPoeBotsTool
)
from ..models import User


class AgentService:
    """智能体服务类"""
    
    def __init__(
        self,
        db: Session,
        current_user: User,
        poe_client: Optional[AsyncPoeApi] = None
    ):
        self.db = db
        self.current_user = current_user
        self.poe_client = poe_client
        self.chat_model: Optional[PoeChatModel] = None
        self.agent_executor: Optional[AgentExecutor] = None
    
    async def initialize(self, bot_name: str = "chinchilla") -> bool:
        """
        初始化智能体
        
        参数：
            bot_name: 使用的Poe机器人名称
            
        返回：
            是否初始化成功
        """
        if not self.poe_client:
            return False
        
        # 创建聊天模型
        self.chat_model = PoeChatModel(
            poe_client=self.poe_client,
            bot_name=bot_name
        )
        
        # 创建工具列表
        tools = [
            GetExerciseStatsTool(db=self.db, current_user=self.current_user),
            GetRecentExercisesTool(db=self.db, current_user=self.current_user),
            GetExerciseDetailTool(db=self.db, current_user=self.current_user),
            AnalyzeLearningTrendTool(db=self.db, current_user=self.current_user),
            GetPoeAccountInfoTool(poe_client=self.poe_client),
            ListPoeBotsTool(poe_client=self.poe_client)
        ]
        
        # 获取系统提示
        system_prompt = self._get_system_prompt()
        
        # 构建ReAct格式的提示模板
        # 使用f-string在创建时就嵌入system_prompt，避免LangChain运行时变量填充错误
        # 
        # 占位符处理：
        # - {variable} 单大括号：被Python的f-string处理
        # - {{variable}} 双大括号：f-string转义为{variable}，由LangChain运行时填充
        # - {{{{json}}}} 四大括号：f-string转义为{{json}}，LangChain再转义为{json}，最终输出为字面JSON格式
        #
        # 本模板中的tools、tool_names、input、agent_scratchpad使用双大括号，由LangChain填充
        template = f'''{system_prompt}

## 可用工具

{{tools}}

工具列表：{{tool_names}}

## 工作机制

你现在处于一个持续对话环境中。与传统的一问一答不同，这里的每次交互都建立在前序对话的基础上。

**完整流程说明：**

1. 用户提出问题后，系统会在"Question:"后面显示问题内容
2. 你思考需要什么信息，决定调用哪个工具
3. 你输出Thought、Action、Action Input后立即停止
4. 系统执行工具，将结果填入"Observation:"，并提示"Thought:"等待你继续
5. 你分析Observation中的数据，判断是否需要更多信息：
   - 需要 → 重复步骤2-4
   - 足够 → 输出Final Answer结束本轮对话

**核心循环图示：**
```
用户提问 → 你思考并调用工具 → 系统返回结果 → 你分析结果
         ↑                                            ↓
         └────────── 需要更多信息则重复 ───────────────┘
                           或
                    信息充足则给出最终答案
```

## 输出规范

你的每次输出必须严格遵循以下两种格式之一：

**格式A：调用工具**
```
Thought: 我需要什么信息，为什么需要
Action: 工具名称
Action Input: 工具参数
```

说明：
- `Thought:`：阐述你的分析思路，说明为何选择该工具
- `Action:`：指定工具名称，必须精确匹配{{tool_names}}列表中的某一项
- `Action Input:`：提供工具所需参数，采用字符串形式
  - 单个参数：直接写入参数值，如`"10"`或`""`（空串）
  - 多个参数：使用JSON格式，如`{{{{"param1": "value1", "param2": "value2"}}}}`
  - 详细要求请参照各工具说明

完成上述三行后**立即停止**。系统将执行操作并返回：
```
Observation: 工具返回的数据
Thought: 
```

**格式B：给出答案**
```
Thought: 我的最终判断和理由
Final Answer: 完整的用户回复
```

说明：
- `Thought:`：概述基于何种数据得出了哪些结论
- `Final Answer:`：撰写面向学生的完整答复，确保表达友好、逻辑清晰、建议可行

## 严格禁止的行为

1. ❌ 自己编造Observation内容
   - Observation只能由系统填充，你永远不要输出这个字段

2. ❌ 在一轮中调用多个工具
   - 一次只能有一个Action，看到结果后再决定下一步

3. ❌ 使用不存在的工具
   - Action必须精确匹配工具列表中的名称

4. ❌ 格式混乱
   - 同时出现Action和Final Answer是错误的
   - 必须先有Thought，再有Action或Final Answer

## 特别说明

系统会在每次Observation后自动输出`Thought: `，你可以直接接续思考内容，也可以重复该前缀（两种方式均可接受）

## 开始对话

Question: {{input}}
{{agent_scratchpad}}'''
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # 创建ReACT智能体
        agent = create_react_agent(
            llm=self.chat_model,
            tools=tools,
            prompt=prompt,
            stop_sequence=True
        )
        
        # 创建执行器
        # max_iterations: 限制推理轮数，避免过度消耗API积分
        # early_stopping_method: 达到上限时的处理方式，"force"表示直接停止并返回当前结果
        # return_intermediate_steps: 保留中间推理过程，便于调试和观察agent的思考链路
        # handle_parsing_errors: 自动处理格式解析错误，将错误信息作为Observation反馈给模型
        self.agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            max_iterations=10,
            early_stopping_method="force",
            handle_parsing_errors=True,
            return_intermediate_steps=True
        )
        
        return True
    
    def _get_system_prompt(self) -> str:
        """
        获取系统提示
        
        定义智能体的角色、职责和回答风格。这部分会作为每次对话的开头，
        在支持prompt caching的模型上会被缓存，因此保持稳定不变。
        """
        return """你是一个智能学习助手，专门帮助学生分析数学练习情况并提供学习建议。

你的职责是：
- 理解学生的问题和需求
- 通过调用工具获取必要的数据
- 基于数据提供专业、友好、可操作的建议
- 用鼓励的语气帮助学生认识进步、明确方向"""
    
    async def chat(
        self,
        message: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        与智能体对话
        
        参数：
            message: 用户消息
            chat_history: 聊天历史（可选）
            
        返回：
            智能体的回复
        """
        if not self.agent_executor:
            raise ValueError("Agent not initialized. Call initialize() first.")
        
        # 准备输入
        # 对于ReAct agent，通常不需要复杂的多轮对话历史管理，
        # 因为每次都是独立的推理过程，依赖工具返回的实时数据而非对话上下文
        agent_input = {"input": message}
        
        # 如果需要传递对话历史，可以将其格式化为纯文本附加到输入中
        # 这比使用结构化的消息列表更简单，且足够满足当前场景需求
        if chat_history:
            history_text = ""
            for msg in chat_history:
                role = "用户" if msg["role"] == "user" else "助手"
                history_text += f"{role}: {msg['content']}\n"
            if history_text:
                agent_input["input"] = f"{history_text}\n当前问题: {message}"
        
        # 执行智能体推理
        result = await self.agent_executor.ainvoke(agent_input)
        
        # 推理完成后重置对话状态，下次用户提问将创建新的Poe会话
        # 这样每个问题对应一个独立会话，便于调试，同时单次对话内部
        # 仍使用增量模式享受prompt caching收益
        if self.chat_model:
            self.chat_model.reset_conversation()
        
        return result["output"]
    
    async def chat_stream(
        self,
        message: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> AsyncIterator[str]:
        """
        流式对话（如果支持的话）
        
        参数：
            message: 用户消息
            chat_history: 聊天历史
            
        返回：
            异步迭代器，逐步返回响应文本
        """
        # 注意：LangChain的AgentExecutor目前对流式支持有限
        # 这里先实现一个简单版本，后续可以优化
        
        response = await self.chat(message, chat_history)
        
        # 模拟流式输出
        words = response.split()
        for i, word in enumerate(words):
            if i > 0:
                yield " "
            yield word
    
    def reset(self):
        """重置智能体会话"""
        if self.chat_model:
            self.chat_model.reset_conversation()
from typing import Any, List, Optional, AsyncIterator, Dict
from langchain_core.callbacks import AsyncCallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatResult, ChatGenerationChunk
import asyncio
from poe_api_wrapper import AsyncPoeApi


class PoeChatModel(BaseChatModel):
    """
    Poe API的LangChain聊天模型包装
    
    这个类将AsyncPoeApi封装成LangChain标准的聊天模型接口，
    使其可以与LangChain的Agent框架无缝集成。
    
    支持增量对话模式：在同一个Poe会话中连续发送消息，
    利用prompt caching减少tokens消耗。
    """
    
    # Poe客户端实例（用户级别）
    poe_client: Optional[AsyncPoeApi] = None
    # 使用的bot名称
    bot_name: str = "chinchilla"
    # 当前对话的chatCode（用于保持会话连续性）
    chat_code: Optional[str] = None
    # 当前对话的chatId
    chat_id: Optional[int] = None
    # 是否启用流式输出
    streaming: bool = False
    # 是否启用增量对话模式
    use_incremental: bool = True
    # 待处理的截断信息：(message_id, truncated_text)
    pending_truncation: Optional[tuple[int, str]] = None
    
    class Config:
        arbitrary_types_allowed = True
    
    @property
    def _llm_type(self) -> str:
        """返回模型类型标识"""
        return "poe"
    
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        """返回标识参数"""
        return {
            "bot_name": self.bot_name,
            "model_name": self.bot_name
        }
    
    def _extract_observation_part(self, full_prompt: str) -> Optional[str]:
        """
        提取Observation部分（增量内容）
        
        在ReAct推理循环中，每次调用都会在prompt末尾追加新的Observation。
        为了实现增量对话，我们只需要发送这个新增的Observation部分，
        而不是整个越来越长的prompt。
        
        返回：
            - 如果找到Observation，返回从"Observation:"到结尾的内容
            - 如果没有Observation，返回None（表示首轮推理）
        """
        last_obs_index = full_prompt.rfind("Observation:")
        if last_obs_index == -1:
            return None
        
        observation_part = full_prompt[last_obs_index:]
        
        print(f"\n{'='*50}")
        print(f"增量对话 - 提取Observation部分:")
        print(f"{observation_part}")
        print(f"{'='*50}\n")
        
        return observation_part
    
    async def _determine_message_and_chat(self, full_prompt: str) -> tuple[str, Optional[int], Optional[str]]:
        """
        确定要发送的消息内容和对话ID
        
        在增量对话模式下，如果上一轮遇到停止词需要截断，本轮发送前
        会先编辑上一轮的AI回复，同步服务端状态。由于上一轮通过特征
        检测等待到了消息流稳定，这里可以直接执行编辑而不会被覆盖。
        
        返回：
            (message_to_send, chat_id_to_use, chat_code_to_use)
        """
        if not self.use_incremental:
            # 禁用增量模式：每次都是新对话
            return full_prompt, None, None
        
        if not self.chat_id:
            # 首次调用：发送完整内容，创建新对话
            return full_prompt, None, None
        
        # 如果上一轮设置了待截断信息，先执行编辑
        if self.pending_truncation:
            ai_message_id, truncated_text = self.pending_truncation
            await self.poe_client.edit_message(
                message_id=ai_message_id,
                new_text=truncated_text
            )
            # 清除待处理标记
            self.pending_truncation = None
        
        # 后续调用：尝试提取Observation
        observation_part = self._extract_observation_part(full_prompt)
        if observation_part:
            # 有Observation：发送增量内容，复用对话
            return observation_part, self.chat_id, self.chat_code
        else:
            # 没有Observation（理论上不会出现）：发送完整内容，复用对话
            return full_prompt, self.chat_id, self.chat_code
    
    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """
        异步生成响应（委托给流式方法实现）
        
        LangChain的AgentExecutor优先调用_astream获取流式响应，
        但在某些场景下也会回退到_agenerate。为避免重复请求
        （同一个prompt被发送两次到Poe），这里直接复用_astream
        的实现，只是将流式chunks合并为完整响应返回。
        
        注意：停止序列的识别和截断已在_astream中处理完毕，
        这里收集到的就是经过过滤的最终内容。
        """
        full_response = ""
        
        # 通过_astream获取完整响应（已经处理过stop sequences）
        async for chunk in self._astream(messages, stop, run_manager, **kwargs):
            full_response += chunk.message.content
        
        message = AIMessage(content=full_response)
        return ChatResult(generations=[ChatGeneration(message=message)])
    
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        **kwargs: Any
    ) -> ChatResult:
        """同步生成响应（通过异步实现）"""
        return asyncio.run(self._agenerate(messages, stop, **kwargs))
    
    async def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        """
        异步流式生成响应
        
        执行流程：
        1. 判断发送内容（完整prompt或增量Observation）
        2. 向Poe API提交消息请求
        3. 逐块返回生成结果，同时监控停止序列的出现
        4. 遇到停止词时记录截断位置，继续接收直至完成
        5. 生成结束后保存截断信息，下轮发送前执行编辑操作
        
        停止序列处理机制：
        - Poe原生接口不支持stop参数，需在客户端实现截断
        - 采用事后编辑策略：先完整接收AI响应，再通过edit_message裁剪到停止词之前
        - 这避免了cancel_message的时机问题（停止词可能出现在消息末尾，此时生成已完成）
        - 为确保编辑时WebSocket推送已彻底结束，启用建议回复收集机制
        - 通过特征检测判断消息流是否稳定，避免编辑结果被后续推送覆盖
        
        注意事项：
        无需特殊处理state=complete的情况。send_message在收到完成信号后会
        yield最后一个chunk然后自然退出，内部的清理逻辑会正常执行。这里只需
        简单转发每个chunk，或在遇到停止词时记录截断信息等待后续编辑。
        """
        print(f"stop: {stop}")
        if not self.poe_client:
            raise ValueError("Poe client not initialized")
        
        full_prompt = messages[0].content if messages else ""
        message_to_send, use_chat_id, use_chat_code = await self._determine_message_and_chat(full_prompt)
        
        # 增量对话且未使用停止词时，添加短暂延迟确保缓存机制正常生效
        # 使用停止词时已经通过suggest_replies等待足够久，无需额外延迟
        if use_chat_id and not stop:
            await asyncio.sleep(0.5)
        
        # 只有在增量模式且需要处理停止词时，才启用建议回复收集
        # 这样可以通过特征检测确保消息流稳定，避免编辑操作被后续推送覆盖
        need_stable_completion = self.use_incremental and stop is not None and len(stop) > 0
        
        # 初始化停止词检测相关状态
        should_truncate = False  # 标记是否发现停止词需要截断
        truncate_position = -1  # 记录截断的字符位置
        ai_message_id = None  # AI消息的唯一标识，用于后续编辑
        accumulated_text = ""  # 累积的完整响应文本，用于定位停止词
        
        try:
            async for chunk in self.poe_client.send_message(
                bot=self.bot_name,
                message=message_to_send,
                chatId=use_chat_id,
                chatCode=use_chat_code,
                suggest_replies=need_stable_completion,
                timeout=30
            ):
                # 初次调用时记录会话标识，供后续增量对话使用
                if not self.chat_id:
                    self.chat_id = chunk.get("chatId")
                    self.chat_code = chunk.get("chatCode")
                
                # 记录AI消息ID，用于后续的编辑操作
                if ai_message_id is None:
                    ai_message_id = chunk.get("messageId")
                
                response_chunk = chunk.get("response", "")
                current_full_text = chunk.get("text", "")
                
                # 如果尚未确定需要截断，继续扫描停止序列
                if not should_truncate and stop and current_full_text:
                    found_stop = None
                    stop_position = -1
                    
                    # 定位首个出现的停止词位置
                    for stop_seq in stop:
                        pos = current_full_text.find(stop_seq)
                        if pos != -1 and (stop_position == -1 or pos < stop_position):
                            found_stop = stop_seq
                            stop_position = pos
                    
                    if found_stop:
                        # 发现停止词，记录截断位置但不立即中断
                        should_truncate = True
                        truncate_position = stop_position
                
                # 根据是否需要截断决定yield的内容
                if should_truncate:
                    # 需要截断：只yield到截断位置之前的新增部分
                    # accumulated_text记录了上一轮的完整内容
                    # 只输出从上轮结束位置到截断点之间的新增文本
                    print(f"truncate_position: {truncate_position}\nlen(accumulated_text): {len(accumulated_text)}")
                    if truncate_position > len(accumulated_text):
                        valid_chunk = current_full_text[len(accumulated_text):truncate_position]
                        if valid_chunk:
                            yield ChatGenerationChunk(message=AIMessageChunk(content=valid_chunk))
                    # 后续chunk不再yield，但继续接收直到完成
                else:
                    # 常规路径：转发当前数据块
                    if response_chunk:
                        yield ChatGenerationChunk(message=AIMessageChunk(content=response_chunk))
                
                # 更新文本累计值，为下一轮检测做准备
                accumulated_text = current_full_text
            
            # 生成完成后，如果需要截断，保存待处理信息
            # 实际编辑会在下一轮发送消息前执行，此时WebSocket推送已稳定
            if should_truncate and ai_message_id:
                truncated_text = accumulated_text[:truncate_position]
                self.pending_truncation = (ai_message_id, truncated_text)
        
        except Exception as e:
            raise RuntimeError(f"Failed to stream response: {str(e)}")
    
    def reset_conversation(self):
        """
        重置对话状态
        
        在完成一次完整的Agent推理后调用，为下次用户提问
        创建新的Poe会话。这样每个用户问题都对应一个独立的
        Poe对话，便于在网页端查看和调试。
        """
        self.chat_code = None
        self.chat_id = None
        self.pending_truncation = None  # 清除待处理的截断信息
        print("对话状态已重置，下次将创建新会话")
// src/components/agent/AgentInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

import { useChatHistory, ChatMessage } from '../../hooks/useChatHistory';
import { agent } from '../../api';

import ConversationSidebar from './ConversationSidebar';
import MessageActions from './MessageActions';
import TypingIndicator from './TypingIndicator';

interface Props {
  onClose: () => void;
}

const AgentInterface: React.FC<Props> = ({ onClose }) => {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    selectConversation,
    createNewConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    deleteMessage,
  } = useChatHistory();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ index: number; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // 可拖拽分栏：侧栏宽度（px）
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const dragRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 全局拖拽处理，避免鼠标移出当前容器后事件丢失
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const next = Math.min(400, Math.max(200, x));
      setSidebarWidth(next);
    };
    const onMouseUp = () => {
      if (!dragRef.current) return;
      dragRef.current = false;
      document.body.style.cursor = 'default';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    // 返回清理函数（组件卸载时确保清理）
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [activeConversation?.messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    addMessage(userMessage);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await agent.chat(
        { message: currentInput, chat_history: activeConversation?.messages },
        abortControllerRef.current.signal
      );
      addMessage({ role: 'assistant', content: response });
    } catch (error: any) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        const errorMessage = error.response?.data?.detail || error.message || '发生未知错误';
        addMessage({ role: 'assistant', content: `**出错了：** ${errorMessage}` });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 消息操作
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('已复制到剪贴板');
  };

  const handleStartEdit = (index: number, content: string) => {
    setEditingMessage({ index, content });
  };

  const handleConfirmEdit = () => {
    if (editingMessage) {
      updateMessage(editingMessage.index, editingMessage.content);
      setEditingMessage(null);
    }
  };


  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 pointer-events-none">
      {/* 背景淡化层，可选，若不需要可删除下一行 */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="relative w-[880px] max-w-[100%] md:max-w-[90vw] h-[80vh] max-h-[720px] bg-white rounded-3xl shadow-2xl flex flex-row overflow-hidden border border-gray-200 select-none pointer-events-auto"
        ref={containerRef}
      >
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={selectConversation}
        onCreate={createNewConversation}
        onDelete={deleteConversation}
        widthPx={sidebarWidth}
      />
      {/* 分隔条（拖拽改变侧栏宽度） */}
      <div
        role="separator"
        aria-orientation="vertical"
        title="拖拽调整侧栏宽度"
        onMouseDown={() => {
          dragRef.current = true;
          document.body.style.cursor = 'col-resize';
          // 在按下时绑定全局监听，确保拖拽连续
          const onMouseMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left;
            const next = Math.min(400, Math.max(200, x));
            setSidebarWidth(next);
          };
          const onMouseUp = () => {
            dragRef.current = false;
            document.body.style.cursor = 'default';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
        className="w-1.5 bg-gray-200 hover:bg-gray-300 cursor-col-resize"
        onDoubleClick={() => setSidebarWidth(256)}
      />
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-gray-800">AI学习助手</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100/50">
          {activeConversation ? (
            <div className="space-y-6">
              {activeConversation.messages.map((msg: ChatMessage, index: number) => (
                <div key={index} className="group relative">
                  {editingMessage?.index === index ? (
                    // 编辑状态
                    <div className="flex w-full">
                      <div className="relative w-full">
                        <textarea
                          value={editingMessage?.content || ''}
                          onChange={(e) => setEditingMessage((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
                          className="w-full p-3 pr-36 border rounded-xl resize-y min-h-[90px] max-h-48 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-inner text-sm"
                          placeholder="正在编辑消息..."
                        />
                        <div className="absolute bottom-3 right-3 flex gap-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow border border-gray-200">
                          <button
                            onClick={handleConfirmEdit}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 transition-colors shadow-sm"
                          >保留</button>
                          <button
                            onClick={() => setEditingMessage(null)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200 transition-colors"
                          >取消</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 显示状态
                    <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                      {/* 外层分组：根据角色决定操作按钮在气泡前(用户)或后(AI) */}
                      <div className="flex items-start gap-2 group">
                        {msg.role === 'user' && (
                          <MessageActions
                            isUser
                            onCopy={() => handleCopy(msg.content)}
                            onEdit={() => handleStartEdit(index, msg.content)}
                            onDelete={() => deleteMessage(index)}
                            className="self-start opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity mt-0.5"
                          />
                        )}
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-xl ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-800 border'
                          }`}
                          aria-label="聊天消息"
                        >
                          <article className="prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-ol:my-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </article>
                        </div>
                        {msg.role !== 'user' && (
                          <MessageActions
                            isUser={false}
                            onCopy={() => handleCopy(msg.content)}
                            onEdit={() => handleStartEdit(index, msg.content)}
                            onDelete={() => deleteMessage(index)}
                            className="self-start opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity mt-0.5"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-xl border">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
                选择或创建一个新对话开始吧！
            </div>
          )}
        </div>

        {/* Input */}
        <footer className="p-4 border-t bg-white">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="问问我你的学习情况吧..."
              className="w-full p-3 pr-12 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={1}
              disabled={!activeConversationId}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !activeConversationId}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-500 text-white disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
      </div>
      </motion.div>
    </div>
  );
};

export default AgentInterface;

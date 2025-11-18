import React from 'react';
import { useMessageContext } from '../../contexts/MessageContext';

export const ConversationsSidebar: React.FC = () => {
  const { conversations, activeConversationId, selectConversation, unreadTotal, openNewMessage } = useMessageContext();
  return (
    <div className="w-64 border-r h-full flex flex-col">
      <div className="p-3 font-semibold border-b flex justify-between items-center">
        <span>私信 ({unreadTotal} 未读)</span>
        <button onClick={openNewMessage} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">新消息</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map(c => {
          const otherId = c.participant_user_ids.find(id => id !== activeConversationId); // 简化: 直接显示ID
          return (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition ${c.id === activeConversationId ? 'bg-gray-200' : ''}`}
            >
              <div className="flex justify-between">
                <span className="text-sm">会话 {c.id}</span>
                {c.unread_count > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-2">{c.unread_count}</span>}
              </div>
              {c.last_message && <div className="text-xs text-gray-500 truncate">{c.last_message.content}</div>}
            </button>
          );
        })}
        {conversations.length === 0 && <div className="p-3 text-sm text-gray-500">暂无会话</div>}
      </div>
    </div>
  );
};

// src/components/agent/ConversationSidebar.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Conversation } from '../../hooks/useChatHistory';

interface Props {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  widthPx?: number; // 由父组件控制宽度，实现可拖拽分栏
}

const ConversationSidebar: React.FC<Props> = ({
  conversations,
  activeConversationId,
  onSelect,
  onCreate,
  onDelete,
  widthPx = 256,
}) => {
  return (
    <div className="bg-gray-50 border-r flex flex-col h-full" style={{ width: widthPx }}>
      <div className="p-2">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <span>新的对话</span>
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence>
          {conversations.map(convo => (
            <motion.div
              key={convo.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm ${
                activeConversationId === convo.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => onSelect(convo.id)}
            >
              <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate flex-1">{convo.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(convo.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConversationSidebar;

// src/components/agent/MessageActions.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Edit, Trash2 } from 'lucide-react';

interface Props {
  isUser: boolean;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  className?: string; // 允许父级自定义定位
}

const MessageActions: React.FC<Props> = ({ isUser, onCopy, onEdit, onDelete, className = '' }) => {
  return (
    <motion.div
      // 不再由 framer-motion 强制设置 opacity，交给父级的 Tailwind group-hover 控制
      initial={false}
      className={`flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm px-1.5 py-1 transition-opacity ${className}`}
    >
      <button
        onClick={onCopy}
        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        title="复制"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      {isUser && onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="编辑"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={onDelete}
        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
        title="删除"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

export default MessageActions;

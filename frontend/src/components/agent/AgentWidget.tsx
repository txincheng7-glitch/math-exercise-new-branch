// src/components/agent/AgentWidget.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare } from 'lucide-react';
// 路径已更新
import AgentInterface from './AgentInterface';

const AgentWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          {isOpen ? <MessageSquare /> : <Sparkles />}
        </motion.button>
      </div>

      <AnimatePresence>
        {/* 组件名已更新 */}
        {isOpen && <AgentInterface onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  );
};

export default AgentWidget;

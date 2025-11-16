// src/components/AIControl.tsx
import type { FC } from 'react';
import { Switch } from '@headlessui/react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIControlProps {
  enabled: boolean;
  loading?: boolean;
  onToggle: () => void;
}

const AIControl: FC<AIControlProps> = ({ enabled, loading = false, onToggle }) => {
  return (
    <div className="flex items-center gap-2">
      <span className={`
        text-sm font-medium transition-colors duration-300
        ${enabled ? 'text-blue-500' : 'text-gray-500'}
        ${loading ? 'opacity-70' : ''}
      `}>
        {loading ? '正在初始化AI...' : (enabled ? 'AI点评已启用' : 'AI点评')}
      </span>

      <Switch
        checked={enabled}
        onChange={onToggle}
        disabled={loading}
        className={`
          relative inline-flex h-8 w-14 items-center rounded-full
          transition-colors duration-300 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${loading ? 'cursor-wait' : 'cursor-pointer'}
          ${enabled ? 'bg-blue-500' : 'bg-gray-200'}
          ${loading ? 'opacity-70' : ''}
        `}
      >
        <span
          className={`
            absolute left-1
            flex h-6 w-6 items-center justify-center
            rounded-full bg-white
            transition-transform duration-300
            ${enabled ? 'translate-x-6' : 'translate-x-0'}
          `}
        >
          {loading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          ) : (
            <Sparkles
              className={`w-3 h-3 transition-colors duration-300 ${
                enabled ? 'text-blue-500' : 'text-gray-400'
              }`}
            />
          )}
        </span>
      </Switch>
    </div>
  );
};

export default AIControl;
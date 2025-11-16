import type { FC } from 'react';
import { Dialog } from '@headlessui/react';
import { XIcon, KeyIcon, SaveIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedPanel = motion.div;

interface AISettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tokens: { pb_token: string; plat_token: string }) => Promise<void>;
  buttonRef: React.RefObject<HTMLDivElement | null>;
}

const AISettingsDialog: FC<AISettingsDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  buttonRef 
}) => {
  const [pbToken, setPbToken] = useState('0dPL9p66HeK2FZUORwP8YQ%3D%3D');
  const [platToken, setPlatToken] = useState('39WqZnPmcEx9IL82sNbiwQYl2Od0dGWnx%2F%2BnmxjBzQ%3D%3D');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 新增：内部可见性状态
  const [isVisible, setIsVisible] = useState(false);
  
  // 在isOpen改变时更新内部状态
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const getOriginRect = () => {
    if (!buttonRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dialogX = viewportWidth / 2;
    const dialogY = viewportHeight / 2;
    const originX = rect.left + rect.width / 2 - dialogX;
    const originY = rect.top + rect.height / 2 - dialogY;
    return { x: originX, y: originY };
  };

  // 新增：处理关闭请求
  const handleClose = () => {
    // if (isAnimating) return; // 如果正在动画中，忽略关闭请求
    setIsVisible(false); // 触发退出动画
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        pb_token: pbToken,
        plat_token: platToken,
      });
      handleClose(); // 使用新的关闭处理函数
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <AnimatePresence
        onExitComplete={() => {
          // 动画完成后才真正关闭对话框
          onClose();
        }}
      >
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30"
              aria-hidden="true"
            />
            
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md mx-auto">
                <AnimatedPanel
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: getOriginRect().x,
                    y: getOriginRect().y,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                    x: getOriginRect().x,
                    y: getOriginRect().y,
                    transition: { duration: 0.2 }
                  }}
                  transition={{
                    type: "spring",
                    duration: 0.4,
                    bounce: 0.2
                  }}
                  onAnimationStart={() => setIsAnimating(true)}
                  onAnimationComplete={() => setIsAnimating(false)}
                  className="w-full transform overflow-hidden rounded-xl bg-white p-6 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-medium text-gray-900">
                      AI点评设置
                    </Dialog.Title>
                    <button
                      // 使用新的关闭处理函数
                      onClick={handleClose}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        p-b Token
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <KeyIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={pbToken}
                          onChange={(e) => setPbToken(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            placeholder-gray-400 text-sm"
                          placeholder="输入p-b token"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        p-lat Token
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <KeyIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={platToken}
                          onChange={(e) => setPlatToken(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            placeholder-gray-400 text-sm"
                          placeholder="输入p-lat token"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        // 使用新的关闭处理函数
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 
                          rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                          focus:ring-blue-500"
                        disabled={isSubmitting}
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        // 动画过程中禁用按钮
                        disabled={isSubmitting || isAnimating}
                        className={`
                          inline-flex items-center px-4 py-2 text-sm font-medium text-white 
                          bg-blue-600 border border-transparent rounded-md 
                          ${(isSubmitting || isAnimating)
                            ? 'opacity-70 cursor-not-allowed' 
                            : 'hover:bg-blue-700'
                          }
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                        `}
                      >
                        {isSubmitting ? (
                          <>
                            <svg 
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                              xmlns="http://www.w3.org/2000/svg" 
                              fill="none" 
                              viewBox="0 0 24 24"
                            >
                              <circle 
                                className="opacity-25" 
                                cx="12" 
                                cy="12" 
                                r="10" 
                                stroke="currentColor" 
                                strokeWidth="4"
                              />
                              <path 
                                className="opacity-75" 
                                fill="currentColor" 
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            初始化中...
                          </>
                        ) : (
                          <>
                            <SaveIcon className="h-4 w-4 mr-1.5" />
                            确定
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </AnimatedPanel>
              </Dialog.Panel>
            </div>
          </>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default AISettingsDialog;
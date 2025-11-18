// src/components/agent/TypingIndicator.tsx
import { motion } from 'framer-motion';

const TypingIndicator = () => {
  const dotVariants = {
    initial: { y: 0 },
    animate: {
      y: -5,
      transition: {
        duration: 0.4,
        repeat: Infinity,
        repeatType: 'reverse' as const,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.div
      className="flex items-center space-x-1 p-2"
      transition={{ staggerChildren: 0.1 }}
    >
      <motion.div
        className="w-2 h-2 bg-gray-400 rounded-full"
        variants={dotVariants}
        initial="initial"
        animate="animate"
      />
      <motion.div
        className="w-2 h-2 bg-gray-400 rounded-full"
        variants={dotVariants}
        initial="initial"
        animate="animate"
        style={{ animationDelay: '0.1s' }}
      />
      <motion.div
        className="w-2 h-2 bg-gray-400 rounded-full"
        variants={dotVariants}
        initial="initial"
        animate="animate"
        style={{ animationDelay: '0.2s' }}
      />
    </motion.div>
  );
};

export default TypingIndicator;

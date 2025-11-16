// src/hooks/usePreventScroll.ts
import { useEffect } from 'react';

export const usePreventScroll = () => {
  useEffect(() => {
    // 获取当前滚动位置
    const scrollPosition = window.scrollY;
    
    // 添加样式到body
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';

    // 清理函数
    return () => {
      // 移除样式
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // 恢复滚动位置
      window.scrollTo(0, scrollPosition);
    };
  }, []);
};
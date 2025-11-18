import React, { useState } from 'react';
import { useMessageContext } from '../../contexts/MessageContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const ConversationWindow: React.FC = () => {
  const { messages, activeConversationId, loadingMessages, send } = useMessageContext();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [recipientId, setRecipientId] = useState<number | ''>('');

  const handleSend = async () => {
    const content = text.trim();
    if (!content) {
      toast.error('消息内容不能为空');
      return;
    }
    const rid = recipientId === '' ? undefined : recipientId;
    if (!activeConversationId && !rid) {
      toast.error('请输入接收方用户ID');
      return;
    }
    if (rid && user && rid === user.id) {
      toast.error('不能给自己发送消息');
      return;
    }
    try {
      if (rid) {
        await send(rid, content);
      } else {
        // 已有会话：目前简化不支持无需recipientId直接发送新会话
        toast.error('当前逻辑需提供接收方ID');
        return;
      }
      setText('');
    } catch (e: any) {
      toast.error(e?.message || '发送失败');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
        {loadingMessages && <div className="text-sm text-gray-500">加载中...</div>}
        {messages.map(m => (
          <div key={m.id} className="text-sm">
            <span className="font-mono text-xs text-gray-400">#{m.id}</span> {m.content}
          </div>
        ))}
        {messages.length === 0 && !loadingMessages && <div className="text-sm text-gray-500">暂无消息</div>}
      </div>
      <div className="p-3 border-t flex space-x-2">
        {!activeConversationId && (
          <input
            type="number"
            placeholder="接收方用户ID"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value ? parseInt(e.target.value, 10) : '')}
            className="border px-2 py-1 text-sm w-32"
          />
        )}
        <input
          type="text"
          placeholder="输入消息..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border flex-1 px-2 py-1 text-sm"
        />
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-1 text-sm rounded">发送</button>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { fetchConversations, fetchConversationMessages, markConversationRead, fetchAvailableRecipients, sendMessage } from '../../api/messages';
import { ConversationSummary, Message, AvailableRecipientCategory } from '../../api/types';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MessagesPopover: React.FC<Props> = ({ open, onClose }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [availableCats, setAvailableCats] = useState<AvailableRecipientCategory[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [composeCatKey, setComposeCatKey] = useState<string | null>(null);
  const [composeRecipient, setComposeRecipient] = useState<number | null>(null);
  const [composeContent, setComposeContent] = useState('');
  const [sending, setSending] = useState(false);
  const [userMap, setUserMap] = useState<Record<number, { username: string; role: string }>>({});

  useEffect(() => {
    if (open) {
      loadConversations();
    }
  }, [open]);

  async function loadConversations(): Promise<ConversationSummary[] | void> {
    setLoadingConv(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
      // 构建 userMap 供消息区域快速查用户名，避免每次 render 重新遍历
      const map: Record<number, { username: string; role: string }> = {};
      data.forEach(c => {
        (c.participant_users || []).forEach(u => {
          if (u.id !== undefined) {
            map[u.id] = { username: u.username, role: u.role };
          }
        });
      });
      setUserMap(map);
      // 默认选中第一条（仅在尚未选中任何会话时）
      if (!activeId && data.length) {
        setActiveId(data[0].id);
        await loadMessages(data[0].id, true);
      }
      return data;
    } catch (e: any) {
      toast.error(e?.message || '加载会话失败');
    } finally {
      setLoadingConv(false);
    }
  }

  async function loadMessages(id: number, markRead: boolean = false) {
    setLoadingMsg(true);
    try {
      const resp = await fetchConversationMessages(id, 0, 100);
      setMessages(resp.messages);
      if (markRead) {
        await markConversationRead(id);
        // 本地更新未读计数，不再整表刷新，避免闪烁
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
      }
    } catch (e: any) {
      toast.error(e?.message || '加载消息失败');
    } finally {
      setLoadingMsg(false);
    }
  }

  async function selectConversation(id: number) {
    if (activeId === id && !loadingMsg) return; // 已选中且不在加载，无需重复
    setActiveId(id);
    await loadMessages(id, true);
  }

  async function openCompose() {
    setShowCompose(true);
    setComposeRecipient(null);
    setComposeContent('');
    try {
      const res = await fetchAvailableRecipients();
      setAvailableCats(res.categories);
      if (res.categories.length) setComposeCatKey(res.categories[0].key);
    } catch {
      toast.error('获取可选收件人失败');
    }
  }

  async function handleSend() {
    if (!composeRecipient) {
      toast.error('请选择收件人');
      return;
    }
    const content = composeContent.trim();
    if (!content) {
      toast.error('消息内容不能为空');
      return;
    }
    setSending(true);
    try {
      await sendMessage(composeRecipient, content);
      toast.success('发送成功');
      setShowCompose(false);
      const data = await loadConversations();
      if (data) {
        const target = data.find(c => c.participant_user_ids.includes(composeRecipient));
        if (target) {
          setActiveId(target.id);
          await loadMessages(target.id, true);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '发送失败');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-[480px] bg-white border rounded shadow-lg text-sm z-50 flex flex-col">
      <div className="flex justify-between items-center px-3 py-2 border-b">
        <span className="font-medium">消息</span>
        <div className="flex gap-2">
          <button onClick={openCompose} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">新消息</button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xs">关闭</button>
        </div>
      </div>
      <div className="flex h-80">
        <div className="w-40 border-r overflow-y-auto">
          {loadingConv && <div className="p-2 text-xs text-gray-500">加载中...</div>}
          {!loadingConv && conversations.map(c => {
            const label = c.participant_users?.[0]?.username || `会话${c.id}`;
            return (
              <button key={c.id} onClick={() => selectConversation(c.id)} className={`block w-full text-left px-2 py-2 border-b hover:bg-gray-100 ${c.id === activeId ? 'bg-gray-200' : ''}`}>
                <div className="flex justify-between">
                  <span className="truncate max-w-[90px]">{label}</span>
                  {c.unread_count > 0 && <span className="bg-red-500 text-white rounded-full px-2 text-[10px]">{c.unread_count}</span>}
                </div>
                {c.last_message && <div className="text-[10px] text-gray-500 truncate">{c.last_message.content}</div>}
              </button>
            );
          })}
          {!loadingConv && conversations.length === 0 && <div className="p-2 text-xs text-gray-500">暂无会话</div>}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingMsg && <div className="text-xs text-gray-500">加载中...</div>}
            {!loadingMsg && messages.map(m => {
              const senderName = userMap[m.sender_id]?.username || `用户${m.sender_id}`;
              return (
                <div key={m.id} className="border rounded px-2 py-1">
                  <div className="text-[10px] text-gray-500">{senderName}</div>
                  <div>{m.content}</div>
                  <div className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              );
            })}
            {!loadingMsg && messages.length === 0 && <div className="text-xs text-gray-500">暂无消息</div>}
          </div>
        </div>
      </div>
      {showCompose && (
        <div className="border-t p-3 bg-gray-50">
          <div className="flex gap-2">
            <div className="w-32">
              <select value={composeCatKey || ''} onChange={(e) => setComposeCatKey(e.target.value)} className="border w-full text-xs px-1 py-1">
                {availableCats.map(cat => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <select value={composeRecipient || ''} onChange={(e) => setComposeRecipient(e.target.value ? parseInt(e.target.value, 10) : null)} className="border w-full text-xs px-1 py-1">
                <option value="">选择收件人</option>
                {availableCats.find(c => c.key === composeCatKey)?.users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
          <textarea rows={3} value={composeContent} onChange={(e) => setComposeContent(e.target.value)} placeholder="输入消息内容..." className="w-full border mt-2 px-2 py-1 text-xs resize-none" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowCompose(false)} className="border px-2 py-1 text-xs rounded">取消</button>
            <button disabled={sending} onClick={handleSend} className="bg-blue-600 text-white px-3 py-1 text-xs rounded disabled:opacity-50">发送</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPopover;

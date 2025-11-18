import React, { useEffect, useState } from 'react';
import { fetchConversations, fetchConversationMessages, markConversationRead, fetchAvailableRecipients, sendMessage } from '../../api/messages';
import { ConversationSummary, Message, AvailableRecipientCategory } from '../../api/types';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MessagesPopover: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function loadConversations(): Promise<ConversationSummary[] | void> {
    setLoadingConv(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
      const map: Record<number, { username: string; role: string }> = {};
      data.forEach(c => {
        (c.participant_users || []).forEach(u => {
          if (u.id !== undefined) {
            map[u.id] = { username: u.username, role: u.role };
          }
        });
      });
      setUserMap(map);
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
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
      }
    } catch (e: any) {
      toast.error(e?.message || '加载消息失败');
    } finally {
      setLoadingMsg(false);
    }
  }

  async function selectConversation(id: number) {
    if (activeId === id && !loadingMsg) return;
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-[92vw] max-w-4xl h-[78vh] md:h-[72vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">消息中心</span>
            <span className="text-xs opacity-80">{conversations.length} 个会话</span>
          </div>
          <div className="flex gap-2">
            <button onClick={openCompose} className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition border border-white/20">新消息</button>
            <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg bg白/10 hover:bg白/20 transition border border-white/20">关闭</button>
          </div>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="w-72 border-r bg-gray-50/60 h-full flex flex-col">
            <div className="px-4 py-3 border-b text-sm text-gray-600">会话列表</div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingConv && <div className="p-2 text-xs text-gray-500">加载中...</div>}
              {!loadingConv && conversations.map(c => {
                const otherUser = (c.participant_users || []).find(u => u.id !== user?.id) || (c.participant_users || [])[0];
                const label = otherUser?.username || `会话${c.id}`;
                const avatar = label?.[0] || '用';
                const active = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 transition flex items-start gap-3 ${active ? 'ring-2 ring-indigo-500 border-indigo-200' : 'border-gray-200'}`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">{avatar}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate max-w-[140px]">{label}</span>
                        {c.unread_count > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-600 text-white min-w-[18px] leading-none">{c.unread_count > 99 ? '99+' : c.unread_count}</span>
                        )}
                      </div>
                      {c.last_message && <div className="text-xs text-gray-500 truncate mt-0.5">{c.last_message.content}</div>}
                    </div>
                  </button>
                );
              })}
              {!loadingConv && conversations.length === 0 && <div className="p-2 text-xs text-gray-500">暂无会话</div>}
            </div>
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {loadingMsg && <div className="text-xs text-gray-500">加载中...</div>}
              {!loadingMsg && messages.map(m => {
                const senderName = userMap[m.sender_id]?.username || `用户${m.sender_id}`;
                const isMine = user?.id === m.sender_id;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      <div className={`text-[10px] ${isMine ? 'text-indigo-200' : 'text-gray-500'}`}>{senderName}</div>
                      <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={`mt-1 text-[10px] ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
              {!loadingMsg && messages.length === 0 && <div className="text-xs text-gray-500">暂无消息</div>}
            </div>
            {showCompose && (
              <div className="border-t p-3 bg-gray-50">
                <div className="flex gap-2 items-center">
                  <div className="w-40">
                    <select value={composeCatKey || ''} onChange={(e) => setComposeCatKey(e.target.value)} className="border w-full text-xs px-2 py-2 rounded-md bg-white">
                      {availableCats.map(cat => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <select value={composeRecipient || ''} onChange={(e) => setComposeRecipient(e.target.value ? parseInt(e.target.value, 10) : null)} className="border w-full text-xs px-2 py-2 rounded-md bg-white">
                      <option value="">选择收件人</option>
                      {availableCats.find(c => c.key === composeCatKey)?.users.map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea rows={3} value={composeContent} onChange={(e) => setComposeContent(e.target.value)} placeholder="输入消息内容..." className="w-full border mt-2 px-3 py-2 text-sm rounded-md bg-white resize-none" />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setShowCompose(false)} className="px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50">取消</button>
                  <button disabled={sending} onClick={handleSend} className="px-4 py-1.5 text-sm rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-50">发送</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPopover;

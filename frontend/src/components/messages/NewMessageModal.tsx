import React, { useEffect, useMemo, useState } from 'react';
import { fetchAvailableRecipients, sendMessage } from '../../api/messages';
import { AvailableRecipientCategory, AvailableRecipientUser } from '../../api/types';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSent: (recipientId: number) => void;
}

const NewMessageModal: React.FC<Props> = ({ open, onClose, onSent }) => {
  const [categories, setCategories] = useState<AvailableRecipientCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<AvailableRecipientUser | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchAvailableRecipients()
        .then((res) => {
          setCategories(res.categories);
          if (res.categories.length) setActiveCategoryKey(res.categories[0].key);
        })
        .catch(() => toast.error('获取收件人失败'))
        .finally(() => setLoading(false));
    } else {
      setCategories([]);
      setActiveCategoryKey(null);
      setSelected(null);
      setContent('');
      setSearch('');
    }
  }, [open]);

  const activeCategory = useMemo(() => categories.find(c => c.key === activeCategoryKey), [categories, activeCategoryKey]);

  const filteredUsers = useMemo(() => {
    if (!activeCategory) return [];
    return activeCategory.users.filter(u =>
      u.username.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeCategory, search]);

  async function handleSend() {
    if (!selected) {
      toast.error('请选择收件人');
      return;
    }
    const msg = content.trim();
    if (!msg) {
      toast.error('消息内容不能为空');
      return;
    }
    setSending(true);
    try {
      await sendMessage(selected.id, msg);
      toast.success('发送成功');
      onSent(selected.id);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || '发送失败');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[640px] max-h-[80vh] rounded shadow flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h2 className="font-semibold text-sm">新消息</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">关闭</button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-40 border-r flex flex-col">
            {loading && <div className="p-2 text-xs text-gray-500">加载中...</div>}
            {!loading && categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategoryKey(cat.key)}
                className={`text-left px-3 py-2 text-xs border-b hover:bg-gray-100 ${activeCategoryKey === cat.key ? 'bg-gray-200 font-medium' : ''}`}
              >{cat.label}</button>
            ))}
            {!loading && categories.length === 0 && <div className="p-2 text-xs text-gray-500">无可用收件人</div>}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="p-2 border-b flex gap-2 items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索用户名或角色..."
                className="border px-2 py-1 text-xs flex-1"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={`w-full text-left px-2 py-1 rounded text-xs border hover:bg-indigo-50 ${selected?.id === u.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                >
                  <span className="font-medium">{u.username}</span> <span className="text-gray-500">({u.role})</span>
                </button>
              ))}
              {!loading && filteredUsers.length === 0 && <div className="text-xs text-gray-500">无匹配用户</div>}
            </div>
            <div className="border-t p-3 space-y-2">
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入消息内容..."
                className="w-full border px-2 py-1 text-sm resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-1 text-sm border rounded">取消</button>
                <button onClick={handleSend} disabled={sending} className="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-50">发送</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewMessageModal;

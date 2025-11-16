import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { users } from '../../../api/index';
import type { User } from '../../../api/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onAssign: (teacherId: number) => Promise<void>;
};

const PAGE_SIZE = 8;

const AssignTeacherDialog: React.FC<Props> = ({ open, onClose, onAssign }) => {
  const { data: teachers = [], isLoading } = useQuery<User[]>({ queryKey: ['teachers-list'], queryFn: users.getTeachers, enabled: open });
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setQuery('');
      setPage(1);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => (t.username || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q));
  }, [teachers, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white rounded shadow-lg z-10 w-full max-w-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">批量分配教师</h3>
          <button onClick={onClose} className="text-gray-500">关闭</button>
        </div>

        <div className="mb-3">
          <input
            placeholder="搜索教师姓名或邮箱"
            className="w-full border rounded px-3 py-2"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">选择教师</label>
          {isLoading ? (
            <div className="text-sm text-gray-500">加载中…</div>
          ) : (
            <div className="space-y-2">
              {pageItems.map((t) => (
                <label key={t.id} className="flex items-center gap-2 border rounded p-2">
                  <input type="radio" name="teacher" checked={selected === t.id} onChange={() => setSelected(t.id)} />
                  <div>
                    <div className="font-medium">{t.username}</div>
                    <div className="text-xs text-gray-500">{t.email}</div>
                  </div>
                </label>
              ))}

              {filtered.length === 0 && <div className="text-sm text-gray-500">未找到教师</div>}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">第 {page} / {totalPages} 页</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">取消</button>
          <button
            onClick={async () => {
              if (!selected) return;
              await onAssign(selected);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
            disabled={!selected}
          >
            确定分配
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTeacherDialog;

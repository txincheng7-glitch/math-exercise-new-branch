import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { users } from '../../api/index';
import type { User } from '../../api/types';
import StudentModal from './components/StudentModal';
import AssignTeacherDialog from './components/AssignTeacherDialog';
import toast from 'react-hot-toast';

const StudentManagement: React.FC = () => {
  const { data: students = [], isLoading, error } = useQuery<User[]>({ queryKey: ['teacher','students'], queryFn: users.getTeacherStudents });
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const queryClient = useQueryClient();

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const gradeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.student_profile?.grade) set.add(s.student_profile.grade);
    }
    return Array.from(set);
  }, [students]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.student_profile?.class_name) set.add(s.student_profile.class_name);
    }
    return Array.from(set);
  }, [students]);

  const filtered = useMemo(() => {
    let list = students;
    if (qDebounced) {
      const lower = qDebounced.toLowerCase();
      list = list.filter((s) => s.username.toLowerCase().includes(lower) || s.email.toLowerCase().includes(lower));
    }
    if (gradeFilter) {
      list = list.filter((s) => s.student_profile?.grade === gradeFilter);
    }
    if (classFilter) {
      list = list.filter((s) => s.student_profile?.class_name === classFilter);
    }
    return list;
  }, [students, qDebounced, gradeFilter, classFilter]);

  const [selected, setSelected] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleOpen = (s: User) => {
    setSelected(s);
    setOpen(true);
  };
  
  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (filtered || []).slice(start, start + pageSize);
  }, [filtered, page]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    const ids = (paged || []).map((s) => s.id);
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds([]);

  const handleBulkAssign = async (teacherId: number) => {
    if (selectedIds.length === 0) return;
    await toast.promise(
      Promise.all(selectedIds.map((sid) => users.assignTeacher(sid, teacherId))),
      {
        loading: '分配中…',
        success: '分配成功',
        error: '分配失败',
      }
    );
    setBulkOpen(false);
    clearSelection();
    // 刷新教师学生列表
    queryClient.invalidateQueries({ queryKey: ['teacher','students'] });
  };

  const handleExportSelected = () => {
    const rows = (filtered || []).filter((s) => selectedIds.includes(s.id));
    if (rows.length === 0) {
      toast('请选择要导出的学生');
      return;
    }
    const header = ['id', 'username', 'email', 'grade', 'class_name'];
    const csv = [header.join(',')]
      .concat(rows.map((r) => [r.id, r.username, r.email, r.student_profile?.grade ?? '', r.student_profile?.class_name ?? ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">学生管理</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="搜索学生姓名或邮箱（支持模糊匹配）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="border rounded px-3 py-2" value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setPage(1);} }>
          <option value="">全部年级</option>
          {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="border rounded px-3 py-2" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1);} }>
          <option value="">全部班级</option>
          {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="border rounded px-3 py-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1);} }>
          <option value={10}>每页 10 条</option>
          <option value={20}>每页 20 条</option>
          <option value={50}>每页 50 条</option>
        </select>
      </div>

      {isLoading ? (
        <div>加载中…</div>
      ) : error ? (
        <div className="text-red-600">无法加载学生列表</div>
      ) : (
        <div className="bg-white shadow rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) selectAllVisible(); else clearSelection();
                  }} checked={paged.length > 0 && paged.every(s => selectedIds.includes(s.id))} />
                </th>
                <th className="px-4 py-2 text-left">姓名</th>
                <th className="px-4 py-2 text-left">邮箱</th>
                <th className="px-4 py-2 text-left">班级</th>
                <th className="px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                  </td>
                  <td className="px-4 py-2">{s.username}</td>
                  <td className="px-4 py-2">{s.email}</td>
                  <td className="px-4 py-2">{s.student_profile?.grade ?? '-'} {s.student_profile?.class_name ?? ''}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleOpen(s)} className="text-blue-600 hover:underline">查看</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button onClick={selectAllVisible} className="px-3 py-2 border rounded">全选可见</button>
        <button onClick={() => setBulkOpen(true)} disabled={selectedIds.length === 0} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">批量分配教师</button>
        <button onClick={handleExportSelected} disabled={selectedIds.length === 0} className="px-3 py-2 border rounded disabled:opacity-50">导出选中</button>
        <div className="text-sm text-gray-600">已选 {selectedIds.length} 个</div>
      </div>

      <AssignTeacherDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onAssign={handleBulkAssign} />

      <div className="mt-4 flex items-center gap-3">
        <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</button>
        <span className="text-sm text-gray-600">第 {page} / {totalPages} 页</span>
        <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>下一页</button>
      </div>
      <StudentModal student={selected} open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default StudentManagement;

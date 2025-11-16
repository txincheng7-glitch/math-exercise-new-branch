import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exercises } from '../../api';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#6366F1', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#A78BFA', '#22C55E'];

const pageSize = 10;

const WrongBook: React.FC = () => {
  const [page, setPage] = useState(1);
  const skip = (page - 1) * pageSize;
  const navigate = useNavigate();

  const { data: listResp, isLoading: loadingList } = useQuery({
    queryKey: ['wrong-questions', page],
    queryFn: () => exercises.getWrongQuestions({ skip, limit: pageSize }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['wrong-stats'],
    queryFn: () => exercises.getWrongStats(),
    staleTime: 60_000,
  });

  const items = listResp?.items || [];
  const total = listResp?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const allSelectedIds = useMemo(() => Object.keys(selected).filter(k => selected[Number(k)]).map(Number), [selected]);
  const toggleOne = (id: number) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const togglePageAll = () => {
    const anyUnselected = items.some((q: any) => !selected[q.id]);
    const next: Record<number, boolean> = { ...selected };
    items.forEach((q: any) => { next[q.id] = anyUnselected; });
    setSelected(next);
  };

  const diffPieData = useMemo(() => {
    if (!stats?.by_difficulty) return [] as { name: string; value: number }[];
    return Object.entries(stats.by_difficulty).map(([k, v]: any) => ({ name: k, value: v as number }));
  }, [stats]);

  const opBarData = useMemo(() => {
    if (!stats?.by_operator) return [] as { operator: string; 错题数: number }[];
    return Object.entries(stats.by_operator)
      .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
      .map(([op, cnt]: any) => ({ operator: op, 错题数: cnt as number }));
  }, [stats]);

  const trendData = useMemo(() => {
    return (stats?.trend_14d || []).map((d: any) => ({ date: d.date, 数量: d.count }));
  }, [stats]);

  const recommend = useMemo(() => {
    // 基于当前页估算推荐参数：使用出现最多的难度与合并后的运算符集合，数值范围取众数或合并
    const byDiff: Record<string, number> = {};
    const opSet = new Set<string>();
    const ranges: Array<[number, number]> = [];
    items.forEach((q: any) => {
      byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
      (q.operator_types || []).forEach((op: string) => opSet.add(op));
      if (q.number_range) {
        ranges.push([q.number_range[0], q.number_range[1]]);
      }
    });
    const topDiff = Object.entries(byDiff).sort((a, b) => b[1] - a[1])[0]?.[0] || '中等';
    const ops = Array.from(opSet);
    const range = ranges.length
      ? [
          Math.min(...ranges.map((r) => r[0])),
          Math.max(...ranges.map((r) => r[1])),
        ]
      : [1, 100];
    return { difficulty: topDiff, operator_types: ops, number_range: range as [number, number] };
  }, [items]);

  const handleRepractice = async () => {
    // 使用推荐参数创建一套练习（默认为10题）
    const res = await exercises.create({
      difficulty: recommend.difficulty,
      number_range: recommend.number_range,
      operator_types: recommend.operator_types,
      question_count: 10,
    });
    navigate(`/student/exercise/${res.id}`);
  };

  const handleRepracticeSelected = async () => {
    if (allSelectedIds.length === 0) return;
    const res = await exercises.repracticeFromWrongQuestions(allSelectedIds, true);
    navigate(`/student/exercise/${res.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">错题本</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleRepracticeSelected} disabled={allSelectedIds.length===0} className="px-4 py-2 bg-rose-600 text-white rounded disabled:opacity-50 hover:bg-rose-700">
            练选中题（{allSelectedIds.length}）
          </button>
          <button onClick={handleRepractice} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            再练一套（10题）
          </button>
        </div>
      </div>

      {/* 统计区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">错题难度分布</div>
          <div style={{ width: '100%', height: 240 }}>
            {diffPieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={diffPieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} label>
                    {diffPieData.map((entry, idx) => (
                      <Cell key={`diff-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={24} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-500">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">错题运算符分布</div>
          <div style={{ width: '100%', height: 240 }}>
            {opBarData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opBarData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="operator" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="错题数" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-500">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">近14天错题趋势</div>
          <div style={{ width: '100%', height: 240 }}>
            {(trendData || []).length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="数量" stroke="#EF4444" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-500">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      {/* 列表区 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-3">错题列表（第 {page} / {totalPages} 页，共 {total} 题）</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2">
                  <input type="checkbox" onChange={togglePageAll} checked={items.length>0 && items.every((q:any)=>selected[q.id])} />
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题目</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">我的答案</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">正确答案</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">难度</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">运算符</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingList ? (
                <tr><td className="px-4 py-10 text-center text-gray-500" colSpan={6}>加载中...</td></tr>
              ) : (
                items.map((q: any) => (
                  <tr key={q.id}>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={!!selected[q.id]} onChange={() => toggleOne(q.id)} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{q.completed_at ? new Date(q.completed_at).toLocaleString() : new Date(q.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{q.content}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{q.user_answer ?? '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{q.correct_answer}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{q.difficulty}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{(q.operator_types || []).join(' ')}</td>
                    <td className="px-4 py-2 text-right">
                      <button className="text-indigo-600 hover:underline text-sm" onClick={async ()=>{
                        const res = await exercises.repracticeFromWrongQuestions([q.id], false);
                        navigate(`/student/exercise/${res.id}`);
                      }}>重做此题</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end space-x-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
        </div>
      </div>
    </div>
  );
};

export default WrongBook;

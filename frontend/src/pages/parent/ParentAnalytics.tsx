import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { users } from '../../api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#6366F1', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#A78BFA', '#22C55E'];

const ParentAnalytics: React.FC = () => {
  // 家长汇总统计（只拉这个端点，避免多请求）
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['parent-stats'],
    queryFn: users.getParentStats,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const childrenStats = stats?.children_stats || [];

  // 子女平均分柱状图数据
  const avgScoreData = useMemo(() => {
    return childrenStats.map((c: any) => ({ name: c.name || `学生${c.id}`, 平均分: Number(c.average_score || 0) }));
  }, [childrenStats]);

  // 子女总练习柱状图数据
  const totalExercisesData = useMemo(() => {
    return childrenStats.map((c: any) => ({ name: c.name || `学生${c.id}`, 练习总数: Number(c.total_exercises || 0) }));
  }, [childrenStats]);

  // 今日练习占比饼图
  const todayPieData = useMemo(() => {
    const data = childrenStats
      .map((c: any) => ({ name: c.name || `学生${c.id}`, value: Number(c.exercises_today || 0) }))
      .filter((d: any) => d.value > 0);
    return data;
  }, [childrenStats]);

  if (isLoading) {
    return <div className="bg-white shadow rounded-lg p-6">加载中...</div>;
  }
  if (isError || !stats) {
    return <div className="bg-white shadow rounded-lg p-6 text-red-500">无法加载家长统计数据，请稍后重试。</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">练习可视化</h1>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm text-gray-500">关联学生</div>
          <div className="text-3xl font-semibold text-gray-900 mt-1">{stats.total_children || 0}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm text-gray-500">今日完成</div>
          <div className="text-3xl font-semibold text-gray-900 mt-1">{stats.total_exercises_today || 0}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm text-gray-500">平均正确率</div>
          <div className="text-3xl font-semibold text-gray-900 mt-1">{Math.round((stats.average_accuracy || 0) * 100)}%</div>
        </div>
      </div>

      {/* 子女平均分对比 */}
      <div className="bg-white shadow rounded-lg p-5">
        <div className="text-sm text-gray-500 mb-2">子女平均分对比</div>
        <div style={{ width: '100%', height: 300 }}>
          {avgScoreData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgScoreData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="平均分" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">暂无数据</div>
          )}
        </div>
      </div>

      {/* 子女练习总数对比 */}
      <div className="bg-white shadow rounded-lg p-5">
        <div className="text-sm text-gray-500 mb-2">子女练习总数</div>
        <div style={{ width: '100%', height: 300 }}>
          {totalExercisesData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalExercisesData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="练习总数" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">暂无数据</div>
          )}
        </div>
      </div>

      {/* 今日练习占比 */}
      <div className="bg-white shadow rounded-lg p-5">
        <div className="text-sm text-gray-500 mb-2">今日练习占比</div>
        <div style={{ width: '100%', height: 260 }}>
          {todayPieData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={todayPieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label>
                  {todayPieData.map((entry: any, idx: number) => (
                    <Cell key={`today-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={24} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">暂无今日练习</div>
          )}
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-white shadow rounded-lg p-5">
        <div className="text-sm text-gray-500 mb-3">最近活动</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分数</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(stats.recent_activities || []).map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{a.student_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{a.score ?? '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{a.completed_at ? new Date(a.completed_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParentAnalytics;

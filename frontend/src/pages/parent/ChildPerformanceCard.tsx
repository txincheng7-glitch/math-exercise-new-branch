import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import type { User } from '../../api/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface ChildSummary {
  id: number;
  name?: string;
  total_exercises?: number;
  average_score?: number;
  exercises_today?: number;
}

interface Props {
  student: User;
  // 可选的汇总信息，若存在则使用汇总信息并跳过逐学生详细进度请求（用于前端回退）
  summary?: ChildSummary | null;
}

// Softer, modern palette for charts
const COLORS = ['#6366F1', '#06B6D4', '#F59E0B', '#10B981', '#EF4444'];

const ChildPerformanceCard: React.FC<Props> = ({ student, summary = null }) => {
  // Hook must be called unconditionally. 如果外部提供了 summary，则通过 enabled=false 跳过实际请求。
  const { data: progress, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['student-progress', student.id],
    queryFn: () => adminAPI.getStudentProgress(student.id),
    enabled: !summary,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000, // 5 分钟后才真正回收，提升切换时的瞬时体验
  });

  // 如果外部提供了 summary（来自 /me/parent-stats），则直接用汇总数据显示，避免对每个学生请求进度（用于前端回退）
  if (summary) {
    return (
      <div className="bg-white shadow-md rounded-lg p-5 hover:shadow-lg transition-shadow duration-150">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">学生</div>
            <div className="text-xl font-semibold text-gray-900">{student.username}</div>
            <div className="text-sm text-gray-400">{student.student_profile?.grade} {student.student_profile?.class_name}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">平均得分</div>
            <div className="text-2xl font-bold text-indigo-600">{(summary.average_score ?? 0).toFixed(1)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 items-center">
          <div>
            <div className="text-sm text-gray-500">练习总数</div>
            <div className="text-lg font-medium text-gray-900">{summary.total_exercises ?? 0}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">今日</div>
            <div className="text-lg font-medium text-gray-900">{summary.exercises_today ?? 0}</div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button className="text-sm text-indigo-600 hover:underline">查看详细</button>
        </div>
      </div>
    );
  }

  // 优先展示加载状态（初次加载或后台刷新中），错误状态单独处理
  if (!summary && (isLoading || isFetching)) {
    return (
      <div className="bg-white shadow rounded-lg p-4 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!summary && (isError || !progress)) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <div className="text-sm text-red-500">无法加载学生数据：{(error as any)?.message || '未知错误'}</div>
      </div>
    );
  }

  // Prepare line chart data: recent_exercises -> {date, score}
  const lineData = (progress?.recent_exercises || [])
    .slice()
    .reverse()
    .map((ex) => ({
      date: new Date(ex.date).toLocaleDateString(),
      score: ex.score,
    }));

  // Prepare pie data from difficulty_stats (counts)
  const pieData = Object.entries(progress?.difficulty_stats || {}).map(([k, v]) => ({
    name: k,
    value: v.count || 0,
  }));

  return (
    <div className="bg-white shadow-md rounded-lg p-5 hover:shadow-lg transition-shadow duration-150">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">学生</div>
          <div className="text-xl font-semibold text-gray-900">{student.username}</div>
          <div className="text-sm text-gray-400">{student.student_profile?.grade} {student.student_profile?.class_name}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">平均得分</div>
          <div className="text-2xl font-bold text-indigo-600">{(progress?.average_score || 0).toFixed(1)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 items-center">
        <div style={{ width: '100%', height: 170 }}>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <defs>
                  <linearGradient id={`grad-${student.id}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <Line type="monotone" dataKey="score" stroke={`url(#grad-${student.id})`} strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">暂无最近练习数据</div>
          )}
        </div>

        <div style={{ width: '100%', height: 170 }}>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={pieData} cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={2} label>
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={24} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">暂无难度分布</div>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 flex justify-between items-center">
        <div>
          练习总数: <span className="font-medium text-gray-900">{progress?.total_exercises ?? 0}</span>
          <span className="mx-2">|</span>
          已完成: <span className="font-medium text-gray-900">{progress?.completed_exercises ?? 0}</span>
        </div>
        <div className="text-sm text-gray-500">最近更新: <span className="font-medium text-gray-900">{progress?.recent_exercises?.[0]?.date ?? '-'}</span></div>
      </div>
    </div>
  );
};

export default React.memo(ChildPerformanceCard);

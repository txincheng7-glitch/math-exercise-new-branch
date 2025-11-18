import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI, SystemStats } from '../../../api/admin';
import type { User } from '../../../api/types';
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
  BarChart,
  Bar,
} from 'recharts';

interface Props {
  active?: boolean; // 仅当可视化面板激活时才拉取数据
}

const COLORS = ['#6366F1', '#06B6D4', '#F59E0B', '#10B981', '#EF4444'];

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dateKey = (s?: string) => {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return formatDate(d);
};

const rangeDays = (days: number) => {
  const arr: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    arr.push(formatDate(d));
  }
  return arr;
};

const AnalyticsPanel: React.FC<Props> = ({ active = true }) => {
  // 时间范围：7/14/30 天
  const [windowDays, setWindowDays] = useState<number>(14);

  // 基础统计（用户数、练习数）
  const { data: stats } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: adminAPI.getSystemStats,
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });

  // 用户列表（用于趋势和分布）
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ['admin-students'],
    queryFn: adminAPI.getStudents,
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });
  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ['admin-teachers'],
    queryFn: adminAPI.getTeachers,
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });
  const { data: parents = [] } = useQuery<User[]>({
    queryKey: ['admin-parents'],
    queryFn: adminAPI.getParents,
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });

  // 角色分布饼图数据
  const rolePieData = useMemo(() => {
    if (!stats) return [] as { name: string; value: number }[];
    return [
      { name: '学生', value: stats.totalStudents },
      { name: '教师', value: stats.totalTeachers },
      { name: '家长', value: stats.totalParents },
    ];
  }, [stats]);

  // 练习完成环形图（使用 admin/stats 的聚合）
  const exerciseDonutData = useMemo(() => {
    if (!stats) return [] as { name: string; value: number }[];
    return [
      { name: '进行中', value: stats.activeExercises },
      { name: '已完成', value: stats.completedExercises },
    ];
  }, [stats]);

  // 最近 N 天的每日注册趋势（学生/教师/家长）
  const registrationsTrend = useMemo(() => {
    const days = rangeDays(windowDays);
    const init = days.map((d) => ({ date: d, 学生: 0, 教师: 0, 家长: 0 }));
    const map: Record<string, { date: string; 学生: number; 教师: number; 家长: number }> = {};
    init.forEach((row) => { map[row.date] = row; });

    const bump = (list: User[], label: '学生'|'教师'|'家长') => {
      list.forEach((u) => {
        const k = dateKey(u.created_at);
        if (k && map[k]) map[k][label] += 1;
      });
    };

    bump(students, '学生');
    bump(teachers, '教师');
    bump(parents, '家长');

    return days.map((d) => map[d]);
  }, [students, teachers, parents, windowDays]);

  // 学生年级分布（柱状图）
  const gradeBarData = useMemo(() => {
    const counter: Record<string, number> = {};
    students.forEach((s) => {
      const g = s.student_profile?.grade || '未填写';
      counter[g] = (counter[g] || 0) + 1;
    });
    // 转换为 recharts 数据
    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([grade, count]) => ({ grade, 学生数: count }));
  }, [students]);
  const isSingleGrade = gradeBarData.length === 1;
  const isFewGrades = gradeBarData.length > 1 && gradeBarData.length <= 3;
  const BAR_SIZE = 28;
  const SINGLE_PADDING = 72;

  return (
    <div className="space-y-6">
      {/* 控制条 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">数据可视化</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">时间范围</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
          >
            <option value={7}>近 7 天</option>
            <option value={14}>近 14 天</option>
            <option value={30}>近 30 天</option>
          </select>
        </div>
      </div>

      {/* 上层：角色分布 + 练习完成 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">用户角色分布</div>
          <div style={{ width: '100%', height: 260 }}>
            {rolePieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={rolePieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label>
                    {rolePieData.map((entry, idx) => (
                      <Cell key={`role-${idx}`} fill={COLORS[idx % COLORS.length]} />
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
          <div className="text-sm text-gray-500 mb-2">练习完成情况</div>
          <div style={{ width: '100%', height: 260 }}>
            {exerciseDonutData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={exerciseDonutData} cx="50%" cy="50%" outerRadius={80} innerRadius={48} paddingAngle={2} label>
                    {exerciseDonutData.map((entry, idx) => (
                      <Cell key={`ex-${idx}`} fill={COLORS[idx % COLORS.length]} />
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
      </div>

      {/* 下层：注册趋势 + 年级分布 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">用户注册趋势（按日）</div>
          <div style={{ width: '100%', height: 280 }}>
            {registrationsTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={registrationsTrend} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <defs>
                    <linearGradient id="grad-students" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="grad-teachers" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#67E8F9" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="grad-parents" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#FDE68A" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="学生" stroke="url(#grad-students)" strokeWidth={3} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="教师" stroke="url(#grad-teachers)" strokeWidth={3} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="家长" stroke="url(#grad-parents)" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-500">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">学生年级分布（Top 12）</div>
          <div style={{ width: '100%', height: 280 }}>
            {gradeBarData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gradeBarData}
                  margin={{ top: 10, right: 20, bottom: 10, left: -10 }}
                  barCategoryGap={isSingleGrade || isFewGrades ? '30%' : '20%'}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="grade"
                    tick={{ fontSize: 12 }}
                    tickMargin={6}
                    padding={isSingleGrade ? { left: SINGLE_PADDING, right: SINGLE_PADDING } : isFewGrades ? { left: 36, right: 36 } : { left: 0, right: 0 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="学生数" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={BAR_SIZE} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-500">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;

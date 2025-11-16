import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import teacherAPI, { TeacherStats } from '../../api/teacher';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import ClassStatsCard from './components/ClassStatsCard';
import ScoresTrendChart from './components/ScoresTrendChart';

const TeacherDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<TeacherStats>({ queryKey: ['teacher','stats'], queryFn: teacherAPI.getTeacherStats });
  const [range, setRange] = useState<number>(14); // 7/14/30 天本地过滤

  /**
   * 将 recent_activities 聚合为每日平均分的趋势数据
   * 当后端暂未提供 score_history 或为空时作为回退逻辑使用
   * 格式统一为: { date: YYYY-MM-DD, score: number }
   */
  const aggregateActivitiesToHistory = (activities: TeacherStats['recent_activities']): Array<{ date: string; score: number }> => {
    if (!activities || !activities.length) return [];
    const map: Record<string, { sum: number; count: number }> = {};
    for (const a of activities) {
      // completed_at 可能含有时间部分，截取日期部分，兼容 ISO / 其他格式（先用 Date 解析再转 ISO）
      const rawDate = a.completed_at ? new Date(a.completed_at) : null;
      if (!rawDate || isNaN(rawDate.getTime())) continue; // 无法解析则跳过
      const dateKey = rawDate.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map[dateKey]) map[dateKey] = { sum: 0, count: 0 };
      map[dateKey].sum += a.score;
      map[dateKey].count += 1;
    }
    return Object.entries(map)
      .map(([date, v]) => ({ date, score: Math.round(v.sum / v.count) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  /**
   * 原始趋势数据：优先使用后端给的 score_history；若为空则使用 recent_activities 聚合回退
   */
  const rawScoreHistory = useMemo(() => {
    const history = stats?.score_history && stats.score_history.length ? stats.score_history : aggregateActivitiesToHistory(stats?.recent_activities);
    return history || [];
  }, [stats?.score_history, stats?.recent_activities]);

  /**
   * 最终用于图表的过滤后趋势数据（按选择的时间范围）
   */
  const filteredScoreHistory = useMemo(() => {
    if (!rawScoreHistory.length) return [] as { date: string; score: number }[];
    const now = new Date();
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    return rawScoreHistory.filter((h) => {
      const d = new Date(h.date);
      return d >= cutoff && d <= now;
    });
  }, [rawScoreHistory, range]);

  /**
   * 难度分布回退：后端尚未在 teacher-stats 中提供 difficulty_stats
   * 时，前端通过逐个学生进度聚合生成。需要多请求，班级较大时可能影响加载时间。
   */
  const {
    data: aggregatedDifficulty,
    isLoading: loadingAggregatedDifficulty,
    error: aggError,
  } = useQuery({
    queryKey: ['teacher','stats','difficulty','aggregated'],
    queryFn: teacherAPI.getAggregatedDifficultyStats,
    enabled: !stats?.difficulty_stats || Object.keys(stats.difficulty_stats).length === 0, // 只有后端缺数据才触发
    staleTime: 1000 * 60, // 1 分钟内不重复拉取
  });

  // 最终用于展示和导出的难度数据：优先后端，缺失则使用聚合结果
  const finalDifficultyStats = useMemo(() => {
    if (stats?.difficulty_stats && Object.keys(stats.difficulty_stats).length > 0) return stats.difficulty_stats;
    return aggregatedDifficulty || {};
  }, [stats?.difficulty_stats, aggregatedDifficulty]);

  // CSV 导出工具
  const exportCsv = (rows: Array<Record<string, any>>, filename: string) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')]
      .concat(
        rows.map((r) =>
          headers
            .map((k) => {
              const val = r[k] ?? '';
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(',')
        )
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="p-6">加载中…</div>;
  if (error) return <div className="p-6 text-red-600">无法加载统计数据</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">教师仪表盘</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            <option value={7}>最近 7 天</option>
            <option value={14}>最近 14 天</option>
            <option value={30}>最近 30 天</option>
          </select>
          <button
            disabled={!filteredScoreHistory.length}
            onClick={() => exportCsv(filteredScoreHistory, `score_history_${range}d.csv`)}
            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded disabled:opacity-40"
          >
            导出趋势CSV
          </button>
          <button
            disabled={!finalDifficultyStats || Object.keys(finalDifficultyStats).length === 0}
            onClick={() => {
              if (!finalDifficultyStats || Object.keys(finalDifficultyStats).length === 0) return;
              const rows = Object.entries(finalDifficultyStats).map(([name, obj]: any) => ({ name, count: obj.count, completed: obj.completed, average_score: obj.average_score }));
              exportCsv(rows, `difficulty_stats.csv`);
            }}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded disabled:opacity-40"
          >
            导出难度CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ClassStatsCard title="学生总数" value={stats?.total_students ?? '-'} loading={isLoading} />
        <ClassStatsCard title="今日完成" value={stats?.exercises_today ?? '-'} loading={isLoading} />
        <ClassStatsCard title="平均正确率" value={stats ? `${stats.average_accuracy}%` : '-'} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-2">成绩趋势</h2>
          {/* 当后端原始 score_history 缺失而使用回退数据时给予轻量提示 */}
          {(!stats?.score_history || !stats.score_history.length) && rawScoreHistory.length > 0 && (
            <div className="mb-2 text-xs text-gray-500">使用最近活动聚合的回退数据（每日平均分）</div>
          )}
          <ScoresTrendChart data={filteredScoreHistory} />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-2">最近活动</h2>
          {stats?.recent_activities?.length ? (
            <ul className="space-y-2">
              {stats.recent_activities.map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span>{a.student_name}</span>
                  <span className="text-gray-600">{a.score} 分</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">暂无近期活动</div>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-2">难度分布</h2>
          {/* 加载状态与错误提示（仅在需要聚合时显示） */}
          {loadingAggregatedDifficulty && (!stats?.difficulty_stats || Object.keys(stats.difficulty_stats).length === 0) && (
            <div className="text-sm text-gray-500">正在根据学生进度聚合数据…</div>
          )}
          {aggError && (!stats?.difficulty_stats || Object.keys(stats.difficulty_stats).length === 0) && (
            <div className="text-sm text-red-500">难度分布聚合失败，稍后重试。</div>
          )}
          {finalDifficultyStats && Object.keys(finalDifficultyStats).length > 0 ? (
            <>
              {(!stats?.difficulty_stats || Object.keys(stats.difficulty_stats).length === 0) && (
                <div className="mb-1 text-xs text-gray-500">使用前端汇总的回退数据（多请求聚合）</div>
              )}
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={Object.entries(finalDifficultyStats).map(([k,v]: any) => ({ name: k, value: v.count }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {Object.entries(finalDifficultyStats).map(([k], idx) => (
                        <Cell key={k} fill={["#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6"][idx % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            !loadingAggregatedDifficulty && <div className="text-sm text-gray-500">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;


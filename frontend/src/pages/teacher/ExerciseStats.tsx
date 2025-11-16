import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exercises } from '../../api/index';
import type { ExerciseStats } from '../../api/types';
import teacherAPI from '../../api/teacher';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../api/types';
import ScoresTrendChart from './components/ScoresTrendChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const ExerciseStatsPage: React.FC = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<number>(14); // 7/14/30 天过滤（用于趋势与近期练习类可视化）
  const [heatmapMode, setHeatmapMode] = useState<'hour'|'segment'>('segment'); // segment: 分段(4h一组) hour: 24小时

  /**
   * 学生端：直接使用 /exercises/stats
   * 教师端：调用前端聚合回退 teacherAPI.getTeacherExerciseStatsAggregated
   * 其他角色：暂时同教师端策略（或展示提示）。
   */
  const isStudent = user?.role === UserRole.STUDENT;

  const {
    data,
    isLoading,
    error,
  } = useQuery<ExerciseStats>({
    queryKey: isStudent ? ['exercises','stats','student'] : ['exercises','stats','teacher-aggregated'],
    queryFn: isStudent ? exercises.getStats : (teacherAPI.getTeacherExerciseStatsAggregated as any),
  });

  // 教师端获取难度分布（整体，不受时间范围限制）
  const { data: difficultyStats, isLoading: loadingDiff } = useQuery({
    queryKey: ['exercises','stats','teacher-aggregated','difficulty'],
    queryFn: teacherAPI.getAggregatedDifficultyStats,
    enabled: !isStudent,
    staleTime: 60_000,
  });

  // 教师端获取最近练习（用于直方图/热力图等，随后按range过滤）
  const { data: recentAll, isLoading: loadingRecent } = useQuery<Array<{ date: string; score: number; difficulty?: string }>>({
    queryKey: ['exercises','stats','teacher-aggregated','recent'],
    queryFn: teacherAPI.getAggregatedRecentExercises,
    enabled: !isStudent,
    staleTime: 60_000,
  });

  // 趋势数据过滤（学生端/教师端通用）
  const filteredTrend = useMemo(() => {
    const list = data?.score_history || [];
    if (!list.length) return [] as { date: string; score: number }[];
    const now = new Date();
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    return list.filter((d) => {
      const dd = new Date(d.date);
      return dd >= cutoff && dd <= now;
    });
  }, [data?.score_history, range]);

  // 过滤最近练习（教师端可视化使用）
  const filteredRecent = useMemo<Array<{ date: string; score: number; difficulty?: string }>>(() => {
    if (isStudent) return [] as Array<{ date: string; score: number; difficulty?: string }>;
    const list = recentAll && Array.isArray(recentAll) ? recentAll : [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    return list.filter((r) => {
      const dd = new Date(r.date);
      return dd >= cutoff && dd <= now;
    });
  }, [isStudent, recentAll, range]);

  // 构建分数直方图（0-59, 60-69, 70-79, 80-89, 90-100）
  const scoreHistogram = useMemo(() => {
    const buckets = [
      { label: '0-59', min: 0, max: 59, count: 0 },
      { label: '60-69', min: 60, max: 69, count: 0 },
      { label: '70-79', min: 70, max: 79, count: 0 },
      { label: '80-89', min: 80, max: 89, count: 0 },
      { label: '90-100', min: 90, max: 100, count: 0 },
    ];
    for (const r of filteredRecent) {
      const s = typeof r.score === 'number' ? r.score : Number(r.score || 0);
      for (const b of buckets) {
        if (s >= b.min && s <= b.max) { b.count++; break; }
      }
    }
    return buckets;
  }, [filteredRecent]);

  // 构建简单热力图数据（星期 x 小时 -> 次数），用 CSS 网格渲染
  /**
   * 热力图数据构建
   * hour 模式：7 x 24
   * segment 模式：7 x 6 (每 4 小时一段，便于紧凑显示)
   */
  const heatmapData = useMemo(() => {
    if (!filteredRecent.length) return { grid: [], max: 0, cols: 0, labels: [] as string[] };
    if (heatmapMode === 'hour') {
      const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      for (const r of filteredRecent) {
        const d = new Date(r.date);
        if (isNaN(d.getTime())) continue;
        grid[d.getDay()][d.getHours()] += 1;
      }
      let max = 0;
      grid.forEach(row => row.forEach(v => { if (v > max) max = v; }));
      return { grid, max, cols: 24, labels: Array.from({ length: 24 }, (_, h) => String(h)) };
    } else {
      // segment 模式：0-3,4-7,8-11,12-15,16-19,20-23
      const segments = [
        { label: '0-3', hours: [0,1,2,3] },
        { label: '4-7', hours: [4,5,6,7] },
        { label: '8-11', hours: [8,9,10,11] },
        { label: '12-15', hours: [12,13,14,15] },
        { label: '16-19', hours: [16,17,18,19] },
        { label: '20-23', hours: [20,21,22,23] },
      ];
      const grid: number[][] = Array.from({ length: 7 }, () => Array(segments.length).fill(0));
      for (const r of filteredRecent) {
        const d = new Date(r.date);
        if (isNaN(d.getTime())) continue;
        const dow = d.getDay();
        const hour = d.getHours();
        const segIdx = segments.findIndex(s => s.hours.includes(hour));
        if (segIdx >= 0) grid[dow][segIdx] += 1;
      }
      let max = 0;
      grid.forEach(row => row.forEach(v => { if (v > max) max = v; }));
      return { grid, max, cols: segments.length, labels: segments.map(s => s.label) };
    }
  }, [filteredRecent, heatmapMode]);

  if (isLoading) return <div className="p-6">加载中…</div>;
  if (error) return (
    <div className="p-6 text-red-600">
      无法加载练习统计
      {!isStudent && (
        <div className="text-sm text-gray-500 mt-1">教师端已启用前端聚合回退。如仍失败，请稍后重试。</div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">练习统计</h1>
      {!isStudent && (
        <div className="mb-3 text-xs text-gray-500">当前为教师端视图：数据来自各学生进度的前端聚合</div>
      )}

      {/* 时间范围选择器（主要影响趋势与近期练习类可视化） */}
      <div className="mb-4 flex items-center gap-3">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
        >
          <option value={7}>最近7天</option>
          <option value={14}>最近14天</option>
          <option value={30}>最近30天</option>
        </select>
        {!isStudent && (loadingRecent || loadingDiff) && (
          <span className="text-xs text-gray-500">加载聚合数据中…</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">总练习数</div>
          <div className="text-2xl font-bold">{data?.total_exercises ?? '-'}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">已完成练习</div>
          <div className="text-2xl font-bold">{data?.completed_exercises ?? '-'}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">平均分</div>
          <div className="text-2xl font-bold">{data?.average_score ?? '-'}</div>
        </div>
      </div>

      {/* 成绩趋势折线图（按所选范围过滤） */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-medium mb-2">分数趋势</h2>
        <ScoresTrendChart data={filteredTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 难度分布（教师端：聚合，不随范围变化；学生端暂不提供） */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-2">难度分布</h2>
          {!isStudent && difficultyStats && Object.keys(difficultyStats).length > 0 ? (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={Object.entries(difficultyStats).map(([k, v]: any) => ({ name: k, value: v.count }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {Object.keys(difficultyStats).map((k, idx) => (
                      <Cell key={k} fill={["#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6"][idx % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-gray-500">{isStudent ? '学生端暂不提供难度分布' : '暂无数据'}</div>
          )}
        </div>

        {/* 分数直方图（教师端，按范围过滤 recent_exercises） */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-2">分数分布（直方图）</h2>
          {!isStudent ? (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={scoreHistogram} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-gray-500">学生端暂不提供直方图</div>
          )}
        </div>

        {/* 活动热力图（教师端，按范围过滤 recent_exercises） */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-2">活动热力图（周x时）</h2>
          {!isStudent ? (
            <>
              {/* 模式切换 */}
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="text-gray-500">模式:</span>
                <button
                  className={`px-2 py-0.5 rounded border text-xs ${heatmapMode==='segment'?'bg-indigo-600 text-white':'bg-white'}`}
                  onClick={() => setHeatmapMode('segment')}
                >分段</button>
                <button
                  className={`px-2 py-0.5 rounded border text-xs ${heatmapMode==='hour'?'bg-indigo-600 text-white':'bg-white'}`}
                  onClick={() => setHeatmapMode('hour')}
                >24小时</button>
                <span className="ml-auto text-gray-400">活动次数: 深色=更多</span>
              </div>
              {heatmapData.max > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th className="text-xs font-medium text-gray-500 p-1 w-10">星期</th>
                        {heatmapData.labels.map(l => (
                          <th key={l} className="text-xs font-medium text-gray-500 p-1">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.grid.map((row, dow) => (
                        <tr key={dow}>
                          <td className="text-xs text-gray-600 p-1">{['日','一','二','三','四','五','六'][dow]}</td>
                          {row.map((val, colIdx) => {
                            const ratio = heatmapData.max ? val / heatmapData.max : 0;
                            const bg = `rgba(99,102,241,${ratio===0?0.05:0.2+ratio*0.7})`;
                            return (
                              <td
                                key={colIdx}
                                title={`星期${['日','一','二','三','四','五','六'][dow]} ${heatmapData.labels[colIdx]} 时段 - 次数 ${val}`}
                                className="p-1"
                              >
                                <div className="w-full h-6 rounded" style={{ backgroundColor: bg }} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* 图例 */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span>图例:</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 6 }).map((_, i) => {
                        const r = (i+1)/6;
                        const c = `rgba(99,102,241,${0.2 + r*0.7})`;
                        return <div key={i} className="w-6 h-4 rounded" style={{ backgroundColor: c }} />;
                      })}
                    </div>
                    <span>少 → 多</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">暂无活动数据</div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500">学生端暂不提供热力图</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseStatsPage;

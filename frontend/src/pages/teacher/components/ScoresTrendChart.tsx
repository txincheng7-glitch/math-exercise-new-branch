import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  data: Array<{ date: string; score: number }>;
  loading?: boolean;
}

const ScoresTrendChart: React.FC<Props> = ({ data, loading }) => {
  if (loading) return <div className="h-48 flex items-center justify-center">加载中...</div>;
  if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-500">暂无数据</div>;

  // 将日期标准化为 YYYY-MM-DD，避免不同来源（后端/回退聚合）格式不一致导致的 X 轴混乱
  const formatted = data.map((d) => {
    const parsed = new Date(d.date);
    const safe = isNaN(parsed.getTime()) ? d.date.replace(/T.*$/, '') : parsed.toISOString().slice(0, 10);
    return { ...d, date: safe };
  });

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: any) => [`${value}`, '分数']} />
          <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoresTrendChart;

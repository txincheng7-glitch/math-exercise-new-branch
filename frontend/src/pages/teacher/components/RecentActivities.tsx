import React from 'react';

interface Props {
  items: Array<{ id: number; student_name: string; score: number; completed_at: string }>;
  loading?: boolean;
}

const RecentActivities: React.FC<Props> = ({ items, loading }) => {
  if (loading) return <div className="h-40 flex items-center justify-center">加载中...</div>;
  if (!items || items.length === 0) return <div className="h-40 flex items-center justify-center text-gray-500">暂无活动</div>;

  return (
    <ul className="divide-y divide-gray-200 max-h-56 overflow-auto">
      {items.map((it) => (
        <li key={it.id} className="py-2">
          <div className="flex justify-between">
            <div>
              <div className="text-sm font-medium">{it.student_name}</div>
              <div className="text-xs text-gray-500">练习 #{it.id}</div>
            </div>
            <div className="text-sm text-gray-700">{it.score}</div>
          </div>
          <div className="text-xs text-gray-400">{new Date(it.completed_at).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
};

export default RecentActivities;

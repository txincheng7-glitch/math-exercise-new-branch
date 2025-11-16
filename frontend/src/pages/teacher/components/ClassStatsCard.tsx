import React from 'react';

interface Props {
  title: string;
  value: string | number;
  loading?: boolean;
}

const ClassStatsCard: React.FC<Props> = ({ title, value, loading }) => {
  return (
    <div className="bg-white p-4 rounded shadow-md">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-bold">{loading ? '...' : value}</div>
    </div>
  );
};

export default ClassStatsCard;

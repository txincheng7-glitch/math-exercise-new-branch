import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  suffix?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon: Icon,
  trend,
  suffix = ''
}) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {value}{suffix}
                </div>
                {trend !== undefined && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    trend >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend >= 0 ? (
                      <ArrowUpIcon className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="sr-only">
                      {trend >= 0 ? '增加' : '减少'}
                    </span>
                    {Math.abs(trend)}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;

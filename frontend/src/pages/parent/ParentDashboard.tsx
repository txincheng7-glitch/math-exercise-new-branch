import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from '../../api/types';
import { users } from '../../api';
import ChildPerformanceCard from './ChildPerformanceCard';

const ParentDashboard = () => {
    // 并行获取关联学生和家长汇总统计（避免对每个学生单独请求进度）
    const { data: children = [], isLoading: loadingChildren } = useQuery<User[], Error>({
      queryKey: ['parent-children'],
      queryFn: users.getParentStudents,
      staleTime: 60_000, // 1分钟内不重复请求，提高返回访问速度
    });

    const { data: parentStats, isLoading: loadingStats } = useQuery<any, Error>({
      queryKey: ['parent-stats'],
      queryFn: users.getParentStats,
      staleTime: 30_000, // 缓存统计 30 秒
      retry: 1, // 避免后端异常时长时间重试导致页面卡住
      refetchOnWindowFocus: false,
    });

    const isLoading = loadingChildren || loadingStats;

    // 预计算 children 与 parentStats 之间的映射，避免渲染循环内多次查找
    const statsMap = useMemo(() => {
      const map: Record<number, any> = {};
      parentStats?.children_stats?.forEach((c: any) => { map[c.id] = c; });
      return map;
    }, [parentStats]);

    if (isLoading) {
      return <div>Loading...</div>;
    }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">家长主页</h1>
      
  <div className="grid grid-cols-1 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-sm font-medium text-gray-500">关联学生</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {children?.length || 0}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">孩子成绩概览</h2>
        {children?.length ? (
          <div className="grid grid-cols-1 gap-6">
            {children.map((child: User) => (
              <ChildPerformanceCard key={child.id} student={child} summary={statsMap[child.id] || null} />
            ))}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500">暂未关联学生</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
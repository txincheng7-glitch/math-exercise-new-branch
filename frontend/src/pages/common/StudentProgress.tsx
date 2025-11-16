import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';

const StudentProgress = () => {
  const { studentId } = useParams<{ studentId: string }>();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['student-progress', studentId],
    queryFn: () => adminAPI.getStudentProgress(Number(studentId)),
    enabled: !!studentId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">未找到学生数据</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">学习进度详情</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">练习总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{progress.total_exercises}</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">已完成练习</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{progress.completed_exercises}</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">平均分数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{progress.average_score.toFixed(1)}</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">总用时（分钟）</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{Math.round(progress.total_time / 60)}</dd>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">最近练习记录</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {progress.recent_exercises.map((exercise) => (
              <li key={exercise.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600">练习 #{exercise.id}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      完成时间: {new Date(exercise.date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      难度: {exercise.difficulty}
                    </div>
                    <div className="text-sm text-gray-500">
                      得分: {exercise.score}
                    </div>
                    <div className="text-sm text-gray-500">
                      用时: {Math.round(exercise.time_spent / 60)}分钟
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">按难度统计</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Object.entries(progress.difficulty_stats).map(([difficulty, stats]) => (
                <div key={difficulty} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900">{difficulty}</h3>
                  <dl className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">题目数</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{stats.count}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">已完成</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{stats.completed}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">平均分</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{stats.average_score.toFixed(1)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;

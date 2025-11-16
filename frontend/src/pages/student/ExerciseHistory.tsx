import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { exercises } from '../../api';

const ExerciseHistory = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['exercises', page],
    queryFn: () => exercises.getList({
      page: page - 1,  // 后端是从0开始计数
      limit: pageSize
    })
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 计算总页数
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  // 生成页码数组
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5; // 最多显示5个页码

    if (totalPages <= maxPagesToShow) {
      // 如果总页数小于等于5，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 计算需要显示的页码范围
      let startPage = Math.max(1, page - 2);
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      // 调整以确保显示5个页码
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      // 添加页码
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // 添加省略号
      if (startPage > 1) {
        pages.unshift('...');
        pages.unshift(1);
      }
      if (endPage < totalPages) {
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">练习历史</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium">已完成的练习</h2>
        </div>
        
        {/* 练习列表 */}
        <div className="border-t border-gray-200">
          {data?.exercises.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              还没有完成任何练习
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {data?.exercises.map((exercise) => (
                <li key={exercise.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        练习 #{exercise.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        难度：{exercise.difficulty}
                      </p>
                      <p className="text-sm text-gray-500">
                        完成时间: {new Date(exercise.completed_at!).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-500">
                        得分: {exercise.final_score}
                      </div>
                      <Link
                        to={`/student/result/${exercise.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        查看详情
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 分页控制 */}
        {data && data.total > pageSize && (
          <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              {/* 移动端分页 */}
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md 
                    ${page === 1 || isFetching
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                  className={`relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md
                    ${page === totalPages || isFetching
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  下一页
                </button>
              </div>

              {/* 桌面端分页 */}
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    显示第{' '}
                    <span className="font-medium">
                      {(page - 1) * pageSize + 1}
                    </span>
                    {' '}到{' '}
                    <span className="font-medium">
                      {Math.min(page * pageSize, data.total)}
                    </span>
                    {' '}条，共{' '}
                    <span className="font-medium">{data.total}</span>
                    {' '}条
                  </p>
                </div>
                
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    {/* 上一页按钮 */}
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isFetching}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium
                        ${page === 1 || isFetching
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      <span className="sr-only">上一页</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* 页码按钮 */}
                    {getPageNumbers().map((pageNum, index) => (
                      <button
                        key={index}
                        onClick={() => typeof pageNum === 'number' ? setPage(pageNum) : null}
                        disabled={isFetching}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                          ${typeof pageNum !== 'number'
                            ? 'bg-white text-gray-700'
                            : pageNum === page
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    {/* 下一页按钮 */}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || isFetching}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium
                        ${page === totalPages || isFetching
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      <span className="sr-only">下一页</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseHistory;
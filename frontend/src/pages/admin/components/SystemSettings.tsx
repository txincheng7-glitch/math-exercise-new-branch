import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';

const SystemSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-center">
            <CogIcon className="h-6 w-6 text-gray-400" />
            <h2 className="ml-3 text-lg font-medium text-gray-900">系统设置</h2>
          </div>

          <div className="mt-6 space-y-6">
            {/* 练习配置 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-900">练习配置</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="maxExercises" className="block text-sm font-medium text-gray-700">
                    每日最大练习数量
                  </label>
                  <input
                    type="number"
                    name="maxExercises"
                    id="maxExercises"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    defaultValue={50}
                  />
                </div>

                <div>
                  <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">
                    答题时间限制（分钟）
                  </label>
                  <input
                    type="number"
                    name="timeLimit"
                    id="timeLimit"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    defaultValue={30}
                  />
                </div>
              </div>
            </div>

            {/* AI点评配置 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-900">AI点评配置</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="aiToken" className="block text-sm font-medium text-gray-700">
                    POE API Token
                  </label>
                  <input
                    type="password"
                    name="aiToken"
                    id="aiToken"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="请输入POE API Token"
                  />
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="enableAI"
                      name="enableAI"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="enableAI" className="font-medium text-gray-700">
                      启用AI点评
                    </label>
                    <p className="text-gray-500">开启后系统将自动对学生的答题进行智能点评</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 数据备份 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-900">数据备份</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="backupInterval" className="block text-sm font-medium text-gray-700">
                    自动备份间隔（天）
                  </label>
                  <input
                    type="number"
                    name="backupInterval"
                    id="backupInterval"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    defaultValue={7}
                  />
                </div>

                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  立即备份
                </button>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

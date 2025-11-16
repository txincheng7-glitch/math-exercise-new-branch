import React from 'react';
import { 
  UsersIcon, 
  PencilIcon, 
  TrashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface Admin {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  admin_profile?: {
    permissions: string[];
  };
}

interface AdminsListProps {
  admins: Admin[];
}

const AdminsList: React.FC<AdminsListProps> = ({ admins }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">管理员列表</h2>
            <p className="mt-2 text-sm text-gray-700">
              系统中所有的管理员账号及其权限信息
            </p>
          </div>
        </div>
        
        <div className="mt-6 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      管理员信息
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      权限
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              {admin.is_superuser ? (
                                <ShieldCheckIcon className="h-6 w-6 text-indigo-600" />
                              ) : (
                                <UsersIcon className="h-6 w-6 text-gray-500" />
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-900">
                                {admin.username}
                              </span>
                              {admin.is_superuser && (
                                <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                                  超级管理员
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {admin.admin_profile?.permissions.join(', ') || '标准权限'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        {!admin.is_superuser && (
                          <>
                            <button
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              onClick={() => {/* TODO: Handle edit */}}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => {/* TODO: Handle delete */}}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminsList;

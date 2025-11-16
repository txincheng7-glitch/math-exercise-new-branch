import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { User } from '../../../api/types';
import { Dialog } from '@headlessui/react';

const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const queryClient = useQueryClient();

  // 获取所有用户数据
  const { data: students = [] } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => adminAPI.getStudents()
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => adminAPI.getTeachers()
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['admin-parents'],
    queryFn: () => adminAPI.getParents()
  });

  // 合并所有用户数据
  const allUsers = [...students, ...teachers, ...parents];

  // 用户状态切换mutation
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, activate }: { userId: number; activate: boolean }) => {
      if (activate) {
        await adminAPI.activateUser(userId);
      } else {
        await adminAPI.deactivateUser(userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-parents'] });
    }
  });

  // 删除用户mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      try {
        const response = await adminAPI.deleteUser(userId);
        return response.status === 'success';
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-parents'] });
      alert('用户已成功删除');
    },
    onError: (error: any) => {
      console.error('Delete user error:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('删除用户失败，请重试');
      }
    }
  });

  // 过滤用户
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // 处理用户删除
  const handleDeleteUser = async (userId: number) => {
    try {
      const user = allUsers.find(u => u.id === userId);
      if (!user) {
        alert('未找到用户信息');
        return;
      }

      if (user.is_superuser) {
        alert('不能删除超级管理员账号');
        return;
      }

      const confirmMessage = `确定要删除用户 "${user.username}" 吗？\n\n` +
        `用户类型：${user.role}\n` +
        `邮箱：${user.email}\n\n` +
        '此操作不可恢复。';

      if (window.confirm(confirmMessage)) {
        await deleteUserMutation.mutateAsync(userId);
      }
    } catch (error) {
      console.error('Delete user handler error:', error);
    }
  };

  // 显示用户详情
  const handleShowUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h2 className="text-xl font-semibold text-gray-900">用户管理</h2>
              <p className="mt-2 text-sm text-gray-700">
                管理所有系统用户，包括学生、教师和家长账号
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户..."
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">所有角色</option>
                <option value="student">学生</option>
                <option value="teacher">教师</option>
                <option value="parent">家长</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        角色
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <UserGroupIcon className="h-6 w-6 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.username}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? '活跃' : '禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleShowUserDetails(user)}
                            className="text-indigo-600 hover:text-indigo-900 mx-2"
                            title="查看详情"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => toggleUserMutation.mutate({
                              userId: user.id,
                              activate: !user.is_active
                            })}
                            className={`${
                              user.is_active
                                ? 'text-yellow-600 hover:text-yellow-900'
                                : 'text-green-600 hover:text-green-900'
                            } mx-2`}
                            title={user.is_active ? '禁用账号' : '启用账号'}
                          >
                            {user.is_active ? (
                              <LockClosedIcon className="h-5 w-5" />
                            ) : (
                              <LockOpenIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 mx-2"
                            title="删除用户"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
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

      {/* 用户详情弹窗 */}
      <Dialog
        open={showUserDetails}
        onClose={() => setShowUserDetails(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
              用户详情
            </Dialog.Title>

            {selectedUser && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">用户名</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedUser.username}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">邮箱</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedUser.email}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">角色</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedUser.role}</div>
                </div>

                {selectedUser.student_profile && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">年级</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedUser.student_profile.grade}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">班级</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedUser.student_profile.class_name}</div>
                    </div>
                  </>
                )}

                {selectedUser.teacher_profile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">教授科目</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedUser.teacher_profile.subjects.join(', ')}
                    </div>
                  </div>
                )}

                {selectedUser.admin_profile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">管理员权限</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedUser.admin_profile.is_superuser ? '超级管理员' : '普通管理员'}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    onClick={() => setShowUserDetails(false)}
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default UserManagement;

import React from 'react';
import { Link } from 'react-router-dom';
import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { UserIcon, BellIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../api/types';

const Navbar = () => {
  const { user, logout } = useAuth();

  // 根据用户角色获取导航项
  const getNavigationItems = () => {
    if (!user) return [];

    switch (user.role) {
      case UserRole.STUDENT:
        return [
          { name: '创建练习', href: '/student/create-exercise' },
          { name: '练习历史', href: '/student/exercise-history' },
          { name: '我的成绩', href: '/student/my-scores' },
          { name: '错题本', href: '/student/wrong-book' },
        ];
      case UserRole.TEACHER:
        return [
          { name: '教师主页', href: '/teacher/dashboard' },
          { name: '学生管理', href: '/teacher/students' },
          { name: '练习统计', href: '/teacher/statistics' },
        ];
      case UserRole.PARENT:
        return [
          { name: '家长主页', href: '/parent/dashboard' },
          { name: '孩子列表', href: '/parent/students' },
          { name: '数据可视化', href: '/parent/analytics' },
        ];
      case UserRole.ADMIN:
        return [
          { name: '系统主页', href: '/admin/dashboard?tab=overview' },
          { name: '用户管理', href: '/admin/dashboard?tab=users' },
          { name: '系统设置', href: '/admin/dashboard?tab=settings' },
        ];
      default:
        return [];
    }
  };

  const navigation = getNavigationItems();

  return (
    <Disclosure as="nav" className="bg-white shadow">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-xl font-bold text-indigo-600">
                    数学练习系统
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {/* 通知按钮 */}
                <button
                  type="button"
                  className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="sr-only">查看通知</span>
                  <BellIcon className="h-6 w-6" aria-hidden="true" />
                </button>

                {/* 用户菜单 */}
                <Menu as="div" className="ml-3 relative">
                  <Menu.Button className="bg-white rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <span className="sr-only">打开用户菜单</span>
                    <UserIcon className="h-8 w-8 rounded-full text-gray-400" />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <Menu.Item>
                        {({ active }) => (
                          <div className="px-4 py-2 text-sm text-gray-700">
                            {user?.username}
                          </div>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } block px-4 py-2 text-sm text-gray-700`}
                          >
                            个人资料
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={logout}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                          >
                            退出登录
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        </>
      )}
    </Disclosure>
  );
};

export default Navbar;
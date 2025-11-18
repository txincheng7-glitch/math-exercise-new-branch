import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { UserIcon, BellIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { fetchUnreadCount, connectMessageSocket } from '../../api/messages';
import MessagesPopover from '../messages/MessagesPopover';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../api/types';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [showMessages, setShowMessages] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

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
  const location = useLocation();

  // 初始与轮询获取未读数量 + WebSocket实时刷新
  useEffect(() => {
    let interval: NodeJS.Timer;
    const loadUnread = async () => {
      try {
        const data = await fetchUnreadCount();
        setUnreadCount(data.unread_count);
      } catch (err) {
        // 可添加toast，这里保持静默
        console.error('获取未读消息失败', err);
      }
    };
    loadUnread();
    interval = setInterval(loadUnread, 30000);
    wsRef.current = connectMessageSocket(() => {
      // 收到任何新消息时刷新未读
      loadUnread();
    });
    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // 关闭弹窗后刷新未读（用户可能已阅读）
  useEffect(() => {
    if (!showMessages) {
      (async () => {
        try {
          const data = await fetchUnreadCount();
          setUnreadCount(data.unread_count);
        } catch (err) {
          console.error('刷新未读失败', err);
        }
      })();
    }
  }, [showMessages]);

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
                <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
                  {navigation.map((item) => {
                    // 精准高亮：
                    // - 若导航项包含查询参数，则要求 pathname 完全相等且该查询参数匹配
                    // - 否则使用 startsWith 以适配子路由
                    let isActive = false;
                    try {
                      const hrefUrl = new URL(item.href, window.location.origin);
                      if (hrefUrl.search) {
                        if (location.pathname === hrefUrl.pathname) {
                          const current = new URLSearchParams(location.search);
                          let match = true;
                          hrefUrl.searchParams.forEach((v, k) => {
                            if (current.get(k) !== v) match = false;
                          });
                          isActive = match;
                        }
                      } else {
                        isActive = location.pathname.startsWith(hrefUrl.pathname);
                      }
                    } catch {
                      const hrefPath = item.href.split('?')[0];
                      isActive = location.pathname.startsWith(hrefPath);
                    }
                    const base = 'inline-flex items-center px-2 pt-1 pb-1 text-sm font-medium border-b-2 transition-colors duration-150';
                    const activeCls = 'text-indigo-600 border-indigo-600';
                    const inactiveCls = 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300';
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`${base} ${isActive ? activeCls : inactiveCls}`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center relative">
                {/* 消息弹窗触发按钮 */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMessages((v) => !v)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 relative"
                  >
                    <span className="sr-only">查看消息</span>
                    <EnvelopeIcon className="h-6 w-6" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-600 text-white min-w-[18px] leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showMessages && (
                    <div className="absolute right-0 z-50">
                      <MessagesPopover open={showMessages} onClose={() => setShowMessages(false)} />
                    </div>
                  )}
                </div>

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
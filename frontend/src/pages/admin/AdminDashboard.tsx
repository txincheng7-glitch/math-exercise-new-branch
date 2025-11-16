import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import { exercises } from '../../api/index';
import { Admin, User, UserRole } from '../../api/types';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon, 
  ChartBarIcon, 
  CogIcon,
  AcademicCapIcon,
  UserIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import StatsCard from './components/StatsCard';
import TeachersList from './components/TeachersList';
import ParentsList from './components/ParentsList';
import AdminsList from './components/AdminsList';
import UserManagement from './components/UserManagement';
import SystemSettings from './components/SystemSettings';
import CreateTeacherForm from './components/CreateTeacherForm';
import CreateParentForm from './components/CreateParentForm';
import CreateAdminForm from './components/CreateAdminForm';
import UserRelationships from './components/UserRelationships';
import AnalyticsPanel from './components/AnalyticsPanel';
import CollapsibleCard from './components/CollapsibleCard';

interface SystemStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  activeExercises: number;
  completedExercises: number;
  averageScore: number;
}

const VALID_TABS = new Set(['overview','analytics','users','teachers','parents','admins','relationships','settings']);

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 从 URL ?tab= 读取初始 tab
  const initialTab = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const t = sp.get('tab') || 'overview';
    return VALID_TABS.has(t) ? t : 'overview';
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // 当地址栏 ?tab 变化时，同步内部状态
  useEffect(() => {
    if (activeTab !== initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 切换 Tab 时，同时更新 URL，支持深链接与顶部导航跳转
  const switchTab = (key: string) => {
    const next = VALID_TABS.has(key) ? key : 'overview';
    setActiveTab(next);
    const sp = new URLSearchParams(location.search);
    sp.set('tab', next);
    navigate({ pathname: location.pathname, search: `?${sp.toString()}` }, { replace: true });
  };
  
  const { data: stats } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.getSystemStats()
  });

  // 获取最近的一批练习（用于计算趋势）。限制数量以防数据过大。
  const { data: recentExercisesResp } = useQuery({
    queryKey: ['admin-recent-exercises'],
    queryFn: () => exercises.getList({ limit: 1000 }),
    // 按需加载：仅在概览页激活并且基础 stats 已加载时才请求
    enabled: activeTab === 'overview' && !!stats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const recentExercises = recentExercisesResp?.exercises || [];

  const { data: teachers } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => adminAPI.getTeachers()
  });

  const { data: parents } = useQuery({
    queryKey: ['admin-parents'],
    queryFn: () => adminAPI.getParents()
  });
  // 获取所有学生（可选备用），但我们将优先使用按 parent 的接口来获取家长学生关系
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ['admin-students'],
    queryFn: () => adminAPI.getStudents(),
  });

  // 为每个家长并行请求其关联学生（因为 /parents 不返回内联学生信息）
  const [enrichedParents, setEnrichedParents] = React.useState<User[] | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!parents) return;
      console.log('AdminDashboard: parents fetched', parents);
      try {
        const results = await Promise.all(
          parents.map(async (p: User) => {
            try {
              // 首先尝试使用父对象的 id（通常为 User.id）调用后端获取学生
              let kids = [] as User[];
              try {
                kids = await adminAPI.getParentStudents(p.id);
              } catch (e) {
                // ignore and try fallback
              }

              // 如果没有结果，尝试使用可能存在的 parent 记录 id
              if ((!kids || kids.length === 0) && (p as any).parent?.id) {
                try {
                  kids = await adminAPI.getParentStudents((p as any).parent.id);
                } catch (e) {
                  // ignore
                }
              }

              // 如果仍然没有结果，尝试使用父对象的 parent_profile.student_emails 与学生列表匹配（前端已请求所有学生）
              if ((!kids || kids.length === 0) && (p as any).parent_profile?.student_emails && students && students.length) {
                const emails: string[] = (p as any).parent_profile.student_emails || [];
                const matched = students.filter(s => emails.includes(s.email || ''));
                return {
                  ...p,
                  students: matched.map(s => ({ id: s.id, username: s.username }))
                } as any;
              }

              const mapped = (kids || []).map(k => ({ id: k.id, username: k.username }));
              console.log(`AdminDashboard: parent ${p.id} kids fetched`, mapped, 'fallback parent id:', (p as any).parent?.id, 'parent_profile:', (p as any).parent_profile);
              return {
                ...p,
                students: mapped
              } as any;
            } catch (e) {
              // 如果某个请求失败，返回原始 parent（不阻塞其它请求）
              return { ...p, students: [] } as any;
            }
          })
        );
        if (mounted) setEnrichedParents(results as unknown as User[]);
      } catch (e) {
        if (mounted) setEnrichedParents(parents as unknown as User[]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [parents, students]);

  // 计算趋势 helper：比较最近 windowDays 天与之前同长度时间段的新条目数量（基于 created_at）
  const computeTrend = (items: any[] | undefined, dateKey = 'created_at', windowDays = 7): number | undefined => {
    if (!items || items.length === 0) return undefined;
    const now = new Date();
    const endRecent = now;
    const startRecent = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const startPrev = new Date(startRecent.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const endPrev = startRecent;

    const countInRange = (arr: any[], start: Date, end: Date) =>
      arr.reduce((acc, it) => {
        const d = it?.[dateKey] ? new Date(it[dateKey]) : null;
        if (!d || Number.isNaN(d.getTime())) return acc;
        return acc + (d >= start && d < end ? 1 : 0);
      }, 0);

    const recentCount = countInRange(items, startRecent, endRecent);
    const prevCount = countInRange(items, startPrev, endPrev);

    if (prevCount === 0) {
      if (recentCount === 0) return 0;
      return 100; // 从 0 增长到有值，显示 100%
    }
    const pct = Math.round(((recentCount - prevCount) / prevCount) * 100);
    return pct;
  };

  // 基于已获取的数据计算各项趋势（仅在概览页时计算）
  const studentTrend = activeTab === 'overview' ? computeTrend(students, 'created_at', 7) : undefined;
  const teacherTrend = activeTab === 'overview' ? computeTrend(teachers || [], 'created_at', 7) : undefined;
  const parentTrend = activeTab === 'overview' ? computeTrend(parents || [], 'created_at', 7) : undefined;
  // 对于活跃练习，使用 recentExercises 的 created_at 进行比较
  const exerciseTrend = activeTab === 'overview' ? computeTrend(recentExercises, 'created_at', 7) : undefined;

  const { data: admins = [] } = useQuery<Admin[]>({
    queryKey: ['admin-admins'],
    queryFn: async () => {
      const users = await adminAPI.getAdmins();
      return users.map(user => ({
        ...user,
        role: UserRole.ADMIN,
        is_superuser: user.admin_profile?.is_superuser || false,
        admin_profile: {
          permissions: user.admin_profile?.permissions || [],
          is_superuser: user.admin_profile?.is_superuser || false
        }
      })) as Admin[];
    }
  });

  const navigationItems = [
    { name: '概览', icon: ChartBarIcon, key: 'overview' },
    { name: '数据可视化', icon: ChartBarIcon, key: 'analytics' },
    { name: '用户管理', icon: UserGroupIcon, key: 'users' },
    { name: '教师管理', icon: AcademicCapIcon, key: 'teachers' },
    { name: '家长管理', icon: UserIcon, key: 'parents' },
    { name: '管理员', icon: UsersIcon, key: 'admins' },
    { name: '用户关系', icon: UsersIcon, key: 'relationships' },
    { name: '系统设置', icon: CogIcon, key: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">管理员控制台</h1>
        
        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-8">
          <nav className="space-x-4">
            {navigationItems.map(item => (
              <button
                key={item.key}
                onClick={() => switchTab(item.key)}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                  ${activeTab === item.key 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <item.icon className="h-5 w-5 mr-2" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Dashboard */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard
              title="总学生数"
              value={stats.totalStudents}
              icon={UserGroupIcon}
              trend={studentTrend}
            />
            <StatsCard
              title="总教师数"
              value={stats.totalTeachers}
              icon={AcademicCapIcon}
              trend={teacherTrend}
            />
            <StatsCard
              title="总家长数"
              value={stats.totalParents}
              icon={UserIcon}
              trend={parentTrend}
            />
            <StatsCard
              title="活跃练习"
              value={stats.activeExercises}
              icon={ChartBarIcon}
              trend={exerciseTrend}
            />
            <StatsCard
              title="已完成练习"
              value={stats.completedExercises}
              icon={ChartBarIcon}
            />
            <StatsCard
              title="平均分数"
              value={stats.averageScore.toFixed(1)}
              icon={ChartBarIcon}
              suffix="%"
            />
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <AnalyticsPanel active={activeTab === 'analytics'} />
        )}

        {/* Teachers Management */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <CollapsibleCard title="创建教师" description="点击展开创建新的教师账号。">
                <CreateTeacherForm />
              </CollapsibleCard>
              <CollapsibleCard title="教师列表" description="查看系统中所有教师及其信息，点击展开列表。" defaultOpen>
                <TeachersList teachers={teachers || []} />
              </CollapsibleCard>
            </div>
          </div>
        )}

        {/* Parents Management */}
        {activeTab === 'parents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <CollapsibleCard title="创建家长" description="点击展开创建新的家长账号。">
                <CreateParentForm />
              </CollapsibleCard>
              <CollapsibleCard title="家长列表" description="查看系统中所有家长及其关联学生，点击展开列表。" defaultOpen>
                <ParentsList parents={(enrichedParents || (parents || [])) as any} />
              </CollapsibleCard>
            </div>
          </div>
        )}

        {/* Admins Management */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            <CreateAdminForm />
            <AdminsList admins={admins || []} />
          </div>
        )}

        {/* User Management */}
        {activeTab === 'users' && (
          <UserManagement />
        )}

        {/* User Relationships */}
        {activeTab === 'relationships' && (
          <UserRelationships />
        )}

        {/* System Settings */}
        {activeTab === 'settings' && (
          <SystemSettings />
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;

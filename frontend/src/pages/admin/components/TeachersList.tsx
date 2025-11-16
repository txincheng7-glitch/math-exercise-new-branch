import React, { useEffect, useState } from 'react';
import { 
  AcademicCapIcon, 
  PencilIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';

interface Teacher {
  id: number;
  username: string;
  email: string;
  teacher_profile?: {
    subjects: string[];
  };
}

interface TeachersListProps {
  teachers: Teacher[];
}

const TeachersList: React.FC<TeachersListProps> = ({ teachers }) => {
  const [counts, setCounts] = useState<Record<number, number | null>>({});

  useEffect(() => {
    let mounted = true;
    if (!teachers || teachers.length === 0) {
      setCounts({});
      return;
    }

    // 初始化为 loading (null)，然后并行获取每个教师的学生数
    const ids = teachers.map(t => t.id);
    const initial: Record<number, number | null> = {};
    ids.forEach(id => { initial[id] = null; });
    setCounts(initial);

    (async () => {
      try {
        const results = await Promise.all(
          ids.map(id =>
            // 动态导入 API 避免循环依赖或路径问题
            import('../../../api/admin').then(m => m.adminAPI.getTeacherStudents(id))
              .then(list => list.length)
              .catch(() => 0)
          )
        );
        if (!mounted) return;
        const map: Record<number, number> = {};
        ids.forEach((id, idx) => { map[id] = results[idx]; });
        setCounts(map);
      } catch (e) {
        // on error, set zeros
        if (!mounted) return;
        const zeros: Record<number, number> = {};
        ids.forEach(id => { zeros[id] = 0; });
        setCounts(zeros);
      }
    })();

    return () => { mounted = false; };
  }, [teachers]);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">教师列表</h2>
            <p className="mt-2 text-sm text-gray-700">
              系统中所有注册的教师账号及其基本信息
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
                      教师信息
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      教授科目
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      学生数量
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <AcademicCapIcon className="h-6 w-6 text-gray-500" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">
                              {teacher.username}
                            </div>
                            <div className="text-gray-500">{teacher.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {teacher.teacher_profile?.subjects.join(', ') || '未设置'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {counts[teacher.id] === null
                          ? '加载中'
                          : typeof counts[teacher.id] === 'number'
                            ? counts[teacher.id]
                            : '--'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
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

export default TeachersList;

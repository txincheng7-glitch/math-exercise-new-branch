import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { users } from '../../api';
import { User } from '../../api/types';
import { Link } from 'react-router-dom';

const TeacherStudents = () => {
  const { data: students = [], isLoading } = useQuery<User[]>({
    queryKey: ['teacher-students'],
    queryFn: users.getTeacherStudents
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">我的学生</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {students.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="text-lg font-medium text-indigo-600">{student.username}</div>
                      <span className="ml-2 text-sm text-gray-500">({student.email})</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {student.student_profile?.grade} {student.student_profile?.class_name}
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      to={`/teacher/students/${student.id}/progress`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      查看进度
                    </Link>
                    <Link
                      to={`/teacher/students/${student.id}/exercises`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      练习记录
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">暂无关联学生</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudents;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin';
// types were removed because they are not used in this component

const UserRelationships: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedParent, setSelectedParent] = useState<number | null>(null);

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

  // 分配教师mutation
  const assignTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !selectedTeacher) return;
      await adminAPI.assignTeacher(selectedStudent, selectedTeacher);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      alert('教师分配成功！');
      setSelectedStudent(null);
      setSelectedTeacher(null);
    },
    onError: () => {
      alert('教师分配失败，请重试！');
    }
  });

  // 关联家长mutation
  const linkParentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !selectedParent) return;
      await adminAPI.linkParent(selectedStudent, selectedParent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      alert('家长关联成功！');
      setSelectedStudent(null);
      setSelectedParent(null);
    },
    onError: () => {
      alert('家长关联失败，请重试！');
    }
  });

  return (
    <div className="space-y-6 bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900">用户关系管理</h2>

      {/* 分配教师部分 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">分配教师</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择学生
            </label>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(Number(e.target.value))}
            >
              <option value="">请选择学生</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.username} ({student.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择教师
            </label>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedTeacher || ''}
              onChange={(e) => setSelectedTeacher(Number(e.target.value))}
            >
              <option value="">请选择教师</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.username} ({teacher.email})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => assignTeacherMutation.mutate()}
            disabled={!selectedStudent || !selectedTeacher}
          >
            分配教师
          </button>
        </div>
      </div>

      {/* 关联家长部分 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">关联家长</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择学生
            </label>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(Number(e.target.value))}
            >
              <option value="">请选择学生</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.username} ({student.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择家长
            </label>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedParent || ''}
              onChange={(e) => setSelectedParent(Number(e.target.value))}
            >
              <option value="">请选择家长</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.username} ({parent.email})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => linkParentMutation.mutate()}
            disabled={!selectedStudent || !selectedParent}
          >
            关联家长
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserRelationships;

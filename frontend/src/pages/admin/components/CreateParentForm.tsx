import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin';
import { UserRole } from '../../../api/types';

interface ParentCreateData {
  email: string;
  username: string;
  password: string;
  role: UserRole;
  student_emails: string[];
}

const CreateParentForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    student_emails: [] as string[]
  });
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const parentData: ParentCreateData = {
        ...formData,
        role: UserRole.PARENT
      };
      return adminAPI.createParent(parentData);
    },
    onSuccess: () => {
      setSuccess(true);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['admin-parents'] });
      // Reset form
      setFormData({
        email: '',
        username: '',
        password: '',
        student_emails: []
      });
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || '创建失败');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addStudentEmail = () => {
    if (studentEmailInput && !formData.student_emails.includes(studentEmailInput)) {
      setFormData(prev => ({
        ...prev,
        student_emails: [...prev.student_emails, studentEmailInput]
      }));
      setStudentEmailInput('');
    }
  };

  const removeStudentEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      student_emails: prev.student_emails.filter(e => e !== email)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium">创建家长账号</h2>
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        {success && (
          <div className="mt极客时间-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            家长账号创建成功
            
          </div>
        )}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus极客时间:border-indigo-500"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.username}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              关联学生邮箱
            </label>
            <div className="mt-1 flex">
              <input
                type="email"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={studentEmailInput}
                onChange={(e) => setStudentEmailInput(e.target.value)}
                placeholder="输入学生邮箱"
              />
              <button
                type="button"
                className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={addStudentEmail}
              >
                添加
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.student_emails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {email}
                  <button
                    type="button"
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => removeStudentEmail(email)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {mutation.isPending ? '创建中...' : '创建家长账号'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateParentForm;

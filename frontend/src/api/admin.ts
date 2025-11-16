import { api } from './index';
import { User, UserRole } from './types';

// 添加缺失的类型定义
export interface TeacherCreateData {
  email: string;
  username: string;
  password: string;
  role: UserRole;
  profile: {
    subjects: string[];
  };
}

export interface ParentCreateData {
  email: string;
  username: string;
  password: string;
  role: UserRole;
  student_emails: string[];
}
export interface StudentProgress {
  total_exercises: number;
  completed_exercises: number;
  average_score: number;
  total_time: number;
  recent_exercises: Array<{
    id: number;
    date: string;
    difficulty: string;
    score: number;
    time_spent: number;
  }>;
  difficulty_stats: {
    [key: string]: {
      count: number;
      completed: number;
      average_score: number;
    };
  };
}

export interface SystemStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  activeExercises: number;
  completedExercises: number;
  averageScore: number;
}

export interface AdminCreateData {
  email: string;
  username: string;
  password: string;
  is_superuser: boolean;
  permissions: string[];
  role: string;
}

interface AdminCreateResponse extends User {
  is_superuser: boolean;
  admin_profile: {
    permissions: string[];
    is_superuser: boolean;
  };
}

export const adminAPI = {
  // 用户管理
  getStudents: (): Promise<User[]> =>
    api.get<User[]>('/users/students')
      .then(res => res.data),
      
  createTeacher: (data: TeacherCreateData): Promise<User> =>
    api.post<User>('/users/teachers', data)
      .then(res => res.data),

  createParent: (data: ParentCreateData): Promise<User> =>
    api.post<User>('/users/parents', data)
      .then(res => res.data),
  
  getTeachers: (): Promise<User[]> =>
    api.get<User[]>('/users/teachers')
      .then(res => res.data),
  
  getParents: (): Promise<User[]> =>
    api.get<User[]>('/users/parents')
      .then(res => res.data),

  // 获取指定家长关联的学生列表
  getParentStudents: (parentId: number): Promise<User[]> =>
    api.get<User[]>(`/users/parents/${parentId}/students`).then(res => res.data),

  // 获取指定教师的学生列表
  getTeacherStudents: (teacherId: number): Promise<User[]> =>
    api.get<User[]>(`/users/teachers/${teacherId}/students`).then(res => res.data),
  
  getAdmins: (): Promise<User[]> =>
    api.get<User[]>('/users/admins')
      .then(res => res.data),
  
  // 用户关系管理
  assignTeacher: (studentId: number, teacherId: number): Promise<{ status: string }> => 
    api.post(`/users/students/${studentId}/teacher/${teacherId}`)
      .then(res => res.data),
  
  linkParent: (studentId: number, parentId: number): Promise<{ status: string }> => 
    api.post(`/users/students/${studentId}/parent/${parentId}`)
      .then(res => res.data),
  
  // 学生进度
  getStudentProgress: (studentId: number): Promise<StudentProgress> => 
    api.get<StudentProgress>(`/users/students/${studentId}/progress`)
      .then(res => res.data),
  
  // 用户状态管理
  activateUser: (userId: number) => 
    api.post(`/users/${userId}/activate`)
      .then(res => res.data),
  
  deactivateUser: (userId: number) => 
    api.post(`/users/${userId}/deactivate`)
      .then(res => res.data),

  deleteUser: async (userId: number): Promise<{ status: string }> => {
    try {
        const response = await api.delete(`/users/${userId}`);
      if (!response.data) {
        throw new Error('服务器响应异常');
      }
      if (response.data.status !== 'success') {
        throw new Error(response.data.detail || '删除失败');
      }
      return response.data;
    } catch (error: any) {
      // Network or CORS error
      if (error.message === 'Network Error') {
        throw new Error('网络连接错误，请检查服务器是否正常运行');
      }
      // HTTP error responses
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('用户不存在');
        } else if (error.response.status === 403) {
          throw new Error('不能删除超级管理员账号');
        } else if (error.response.data?.detail) {
          throw new Error(error.response.data.detail);
        } else if (error.response.status === 500) {
          throw new Error('服务器内部错误，请联系管理员');
        }
      }
      console.error('Delete user error:', error);
      throw new Error('删除用户时发生错误，请重试');
    }
  },

  // 系统统计
  getSystemStats: (): Promise<SystemStats> => 
    api.get<SystemStats>('/admin/stats')
      .then(res => res.data),
  
  // 创建管理员
  createAdmin: (data: AdminCreateData): Promise<AdminCreateResponse> => 
    api.post<AdminCreateResponse>('/users/admins', data)
      .then(res => res.data),
};

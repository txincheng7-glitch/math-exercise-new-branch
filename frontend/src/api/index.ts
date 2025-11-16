import axios, { AxiosError } from 'axios';
import { LoginResponse, User, UserRole } from './types';
import { ExerciseListResponse, ExerciseStats, WrongQuestionListResponse, WrongStats } from './types';

const BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器添加token（避免在生产环境输出日志影响性能）
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // 确保token格式正确
    config.headers.Authorization = `Bearer ${token}`;
    // 调试输出（如需排查再开启）
    // if (process.env.NODE_ENV !== 'production') {
    //   console.log('Request headers:', config.headers);
    // }
  }
  return config;
});

// 响应拦截器处理错误
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // token过期或无效，清除token并跳转到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  
    getCurrentUser: async (): Promise<User> => {
      const response = await api.get('/users/me');
      return response.data;
    },
  };
  
  export const users = {
    createStudent: async (data: {
      email: string;
      username: string;
      password: string;
      profile: {
        grade: string;
        class_name: string;
      };
    }) => {
      const response = await api.post('/users', {
        ...data,
        role: UserRole.STUDENT,
      });
      return response.data;
    },
  
    createTeacher: async (data: {
      email: string;
      username: string;
      password: string;
      profile: {
        subjects: string[];
      };
    }) => {
      const response = await api.post('/users/teachers', {
        ...data,
        role: UserRole.TEACHER
      });
      return response.data;
    },
  
    createParent: async (data: {
      email: string;
      username: string;
      password: string;
      student_emails: string[];
    }) => {
      const response = await api.post('/users/parents', data);
      return response.data;
    },

    registerStudent: async (data: {
      email: string;
      username: string;
      password: string;
      profile: {
        grade: string;
        class_name: string;
      };
    }) => {
      const requestData = {
        email: data.email,
        username: data.username,
        password: data.password,
        profile: data.profile,
        role: UserRole.STUDENT
      };
      const response = await api.post('/users/register/students', requestData);
      return response.data;
    },
  
    getTeacherStudents: async () => {
      const response = await api.get('/users/me/teacher-students');
      return response.data;
    },
  
    getParentStudents: async () => {
      const response = await api.get('/users/me/students');
      return response.data;
    },

    getParentStats: async () => {
      const response = await api.get('/users/me/parent-stats');
      return response.data;
    },

    getTeachers: async () => {
      const response = await api.get('/users/teachers');
      return response.data;
    },

    getParents: async () => {
      const response = await api.get('/users/parents');
      return response.data;
    },

    assignTeacher: async (studentId: number, teacherId: number) => {
      const response = await api.post(`/users/students/${studentId}/teacher/${teacherId}`);
      return response.data;
    },

    linkParent: async (studentId: number, parentId: number) => {
      const response = await api.post(`/users/students/${studentId}/parent/${parentId}`);
      return response.data;
    },

    createAdmin: async (data: {
      email: string;
      username: string;
      password: string;
      is_superuser?: boolean;
      permissions?: string[];
    }) => {
      const response = await api.post('/users/admins', data);
      return response.data;
    },

    getAdmins: async (): Promise<User[]> => {
      const response = await api.get('/users/admins');
      return response.data;
    },
  };

export const exercises = {
  create: async (data: any) => {
    const response = await api.post('/exercises', data);
    return response.data;
  },
  
  // 接收练习ID和可选的AbortSignal参数
  getExercise: async (id: number, signal?: AbortSignal) => {
    // 发送GET请求到服务器
    // 将signal包含在请求配置中，使请求可以被取消
    const response = await api.get(`/exercises/${id}`, { signal });
    // 返回响应中的数据部分
    return response.data;
  },
  
  submitAnswer: async (exerciseId: number, questionId: number, data: any) => {
    const response = await api.post(
      `/exercises/${exerciseId}/questions/${questionId}/answer`,
      data
    );
    return response.data;
  },
  
  complete: async (id: number) => {
    const response = await api.post(`/exercises/${id}/complete`);
    return response.data;
  },

  getList: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ExerciseListResponse> => {
    const response = await api.get('/exercises/list', { 
      params: {
        skip: params?.page ? params.page * (params.limit || 10) : 0,  // 将page转换为skip
        limit: params?.limit || 10
      }
    });
    return response.data;
  },

  getStats: async (): Promise<ExerciseStats> => {
    const response = await api.get('/exercises/stats');
    return response.data;
  },

  getWrongQuestions: async (params: { skip?: number; limit?: number }): Promise<WrongQuestionListResponse> => {
    const response = await api.get('/exercises/wrong-questions', { params });
    return response.data;
  },

  getWrongStats: async (): Promise<WrongStats> => {
    const response = await api.get('/exercises/wrong-stats');
    return response.data;
  },

  repracticeFromWrongQuestions: async (questionIds: number[], shuffle: boolean = true) => {
    const response = await api.post('/exercises/repractice/wrong-questions', {
      question_ids: questionIds,
      shuffle,
    });
    return response.data;
  },
};

export default api;

export const ai = {
  initialize: async (tokens: { pb_token: string; plat_token: string }) => {
    const response = await api.post('/exercises/ai/initialize', tokens);
    return response.data;
  },

  getFeedback: async (
    exerciseId: number,
    feedbackType: 'detailed' | 'summary' = 'detailed',
    onChunk: (chunk: string) => void,
    onError: (error: any) => void
  ) => {
    try {
      const response = await fetch(
        `${BASE_URL}/exercises/${exerciseId}/ai-feedback?feedback_type=${feedbackType}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // 检查响应状态
      if (!response.ok) {
          // 尝试解析错误响应并抛出 Error 对象（保留原始响应信息）
          const errorData = await response.json();
          const err: any = new Error(errorData?.message || 'AI feedback request failed');
          err.response = { status: response.status, data: errorData };
          throw err;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              onError(data.error);
              return;
            }
            if (data.status === 'stopped') {
              return;
            }
            if (data.chunk) {
              onChunk(data.chunk);
            }
          }
        }
      }
    } catch (error) {
      onError(error);
    }
  },

  stopFeedback: async (exerciseId: number) => {
    const response = await api.post(`/exercises/${exerciseId}/ai-feedback/stop`);
    return response.data;
  },
};

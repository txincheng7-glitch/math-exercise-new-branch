import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../api';
import { User, UserRole } from '../api/types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// 根据角色获取默认路由
export const getDefaultRoute = (role?: UserRole): string => {
    switch (role) {
      case UserRole.STUDENT:
        return '/student/create-exercise';  // 更新路径
      case UserRole.TEACHER:
        return '/teacher/dashboard';
      case UserRole.PARENT:
        return '/parent/dashboard';
      case UserRole.ADMIN:
        return '/admin/dashboard';
      default:
        return '/login';
    }
  };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // 检查并加载用户信息
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = await auth.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to get user data:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await auth.login(email, password);
      localStorage.setItem('token', response.access_token);
      
      // 获取用户信息
      const userData = await auth.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);

      // 根据角色重定向到不同的首页
      const from = (location.state as any)?.from?.pathname || getDefaultRoute(userData.role);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  // 检查用户是否具有特定角色
  const isRole = (roles: UserRole | UserRole[]) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  if (isLoading) {
    return <div>Loading...</div>; // 可以替换为更好的加载动画
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
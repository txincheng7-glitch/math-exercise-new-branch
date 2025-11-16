import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../../api/types';
import { useAuth, getDefaultRoute } from '../../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // 如果指定了角色但用户没有权限，重定向到对应的首页
    const defaultRoute = getDefaultRoute(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};

// 角色相关的路由组件
export const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute roles={[UserRole.STUDENT]}>{children}</ProtectedRoute>
);

export const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute roles={[UserRole.TEACHER]}>{children}</ProtectedRoute>
);

export const ParentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute roles={[UserRole.PARENT]}>{children}</ProtectedRoute>
);

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute roles={[UserRole.ADMIN]}>{children}</ProtectedRoute>
);

export default ProtectedRoute;
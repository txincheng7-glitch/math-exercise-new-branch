import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth, getDefaultRoute } from './contexts/AuthContext';
import ProtectedRoute, { 
  StudentRoute, 
  TeacherRoute, 
  ParentRoute, 
  AdminRoute 
} from './components/auth/ProtectedRoute';  // 添加 ProtectedRoute

// 页面组件
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import CreateExercise from './pages/student/CreateExercise';
import Exercise from './pages/student/Exercise';

import Profile from './pages/Profile';
import ExerciseHistory from './pages/student/ExerciseHistory';
import MyScores from './pages/student/MyScores';
import ExerciseResult from './pages/student/ExerciseResult';  // 添加导入
import WrongBook from './pages/student/WrongBook';
import MarkdownTest from './pages/MarkdownTest';
// 教师页面
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherStudents from './pages/teacher/TeacherStudents';
import ExerciseStatsPage from './pages/teacher/ExerciseStats';

// 家长页面
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentStudents from './pages/parent/ParentStudents';
import ParentAnalytics from './pages/parent/ParentAnalytics';

// 管理员页面
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentProgress from './pages/common/StudentProgress';
import MessagesPage from './pages/Messages';
// 已移除 Agent 相关功能

const queryClient = new QueryClient();

// 创建一个重定向组件
const DefaultRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
};

// Agent 挂件已移除

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
        <Toaster position="top-right" />
          <Routes>
            {/* 公共路由 */}
            <Route path="/login" element={<Login />} />

            {/* 需要认证的路由 */}
            <Route element={<Layout />}>
              {/* 根路径重定向 */}
              <Route index element={<DefaultRedirect />} />

              {/* 学生路由 */}
              <Route path="student">
                <Route
                  path="create-exercise"
                  element={
                    <StudentRoute>
                      <CreateExercise />
                    </StudentRoute>
                  }
                />
                <Route
                  path="exercise-history"
                  element={
                    <StudentRoute>
                      <ExerciseHistory />
                    </StudentRoute>
                  }
                />
                <Route
                  path="my-scores"
                  element={
                    <StudentRoute>
                      <MyScores />
                    </StudentRoute>
                  }
                />
                <Route
                  path="wrong-book"
                  element={
                    <StudentRoute>
                      <WrongBook />
                    </StudentRoute>
                  }
                />
                <Route
                  path="exercise/:id"
                  element={
                    <StudentRoute>
                      <Exercise />
                    </StudentRoute>
                  }
                />
                <Route
                  path="result/:id"
                  element={
                    <StudentRoute>
                      <ExerciseResult />
                    </StudentRoute>
                  }
                />
              </Route>

              {/* 教师路由 */}
              <Route path="teacher">
                <Route
                  path="dashboard"
                  element={
                    <TeacherRoute>
                      <TeacherDashboard />
                    </TeacherRoute>
                  }
                />
                <Route
                  path="students"
                  element={
                    <TeacherRoute>
                      <TeacherStudents />
                    </TeacherRoute>
                  }
                />
                <Route
                  path="statistics"
                  element={
                    <TeacherRoute>
                      <ExerciseStatsPage />
                    </TeacherRoute>
                  }
                />
                <Route
                  path="students/:studentId/progress"
                  element={
                    <TeacherRoute>
                      <StudentProgress />
                    </TeacherRoute>
                  }
                />
              </Route>

              {/* 家长路由 */}
              <Route path="parent">
                <Route
                  path="dashboard"
                  element={
                    <ParentRoute>
                      <ParentDashboard />
                    </ParentRoute>
                  }
                />
                <Route
                  path="students"
                  element={
                    <ParentRoute>
                      <ParentStudents />
                    </ParentRoute>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <ParentRoute>
                      <ParentAnalytics />
                    </ParentRoute>
                  }
                />
                <Route
                  path="students/:studentId/progress"
                  element={
                    <ParentRoute>
                      <StudentProgress />
                    </ParentRoute>
                  }
                />
              </Route>

              {/* 管理员路由 */}
              <Route path="admin">
                <Route
                  path="dashboard"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* 个人资料路由 */}
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/markdown-test" element={<MarkdownTest />} />
              {/* 通配符路由重定向 */}
              <Route path="*" element={<DefaultRedirect />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
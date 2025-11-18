export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  PARENT = 'parent',
  ADMIN = 'admin',
}

// 角色特定的配置
export interface StudentProfile {
  grade: string;
  class_name: string;
}

export interface TeacherProfile {
  subjects: string[];
}

export interface AdminProfile {
  is_superuser: boolean;
  permissions: string[];
}

export interface BaseUser {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  role: UserRole;
  created_at?: string;
}

export interface User extends BaseUser {
  is_superuser?: boolean;
  // 只有当 role 为对应值时，这些 profile 才会存在
  student_profile?: StudentProfile;
  teacher_profile?: TeacherProfile;
  parent_profile?: {
    student_ids?: number[];
    student_emails?: string[];
  };
  admin_profile?: AdminProfile;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
  is_superuser: boolean;
  admin_profile: AdminProfile;
}

// 通用的题目/练习类型
export interface Question {
  id: number;
  exercise_id: number;
  content: string;
  // 答案可能是数字或字符串（例如分数、表达式），放宽类型更稳健
  correct_answer: string | number;
  user_answer?: string | number;
  time_spent?: number;
  operator_types: string[];
  arithmetic_tree?: any;
  is_correct?: boolean;
}

export interface Exercise {
  id: number;
  user_id: number;
  difficulty: string;
  number_range: [number, number];
  operator_types: string[];
  created_at: string;
  completed_at?: string;
  final_score?: number;
  total_time?: number;
  ai_feedback?: string;
  questions: Question[];
}

export interface ExerciseListResponse {
  total: number;
  exercises: Exercise[];
  page: number;
  page_size: number;
}

export interface ExerciseStats {
  total_exercises: number;
  completed_exercises: number;
  average_score: number;
  accuracy_rate?: number;
  score_history: Array<{
    date: string;
    score: number;
  }>;
}

// 错题本类型
export interface WrongQuestion {
  id: number;
  exercise_id: number;
  content: string;
  correct_answer: number;
  user_answer?: number;
  operator_types: string[];
  difficulty: string; // 与后端 DifficultyLevel 字符串值一致
  number_range: [number, number];
  created_at: string;
  completed_at?: string;
}

export interface WrongQuestionListResponse {
  items: WrongQuestion[];
  total: number;
  page: number;
  page_size: number;
}

export interface WrongStats {
  by_difficulty: Record<string, number>;
  by_operator: Record<string, number>;
  trend_14d: Array<{ date: string; count: number }>; 
}

// 消息系统类型（v1 一对一私信）
export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

export interface ConversationSummary {
  id: number;
  participant_user_ids: number[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  participant_users?: { id: number; username: string; role: string }[];
}

export interface ConversationMessagesResponse {
  conversation_id: number;
  messages: Message[];
  total: number;
  has_more: boolean;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// 可选收件人
export interface AvailableRecipientUser {
  id: number;
  username: string;
  role: string;
  relation_tags?: string[];
}

export interface AvailableRecipientCategory {
  key: string;
  label: string;
  users: AvailableRecipientUser[];
}

export interface AvailableRecipientsResponse {
  categories: AvailableRecipientCategory[];
}

// 学生进度（教师或家长查看）
export interface StudentProgress {
  total_exercises: number;
  completed_exercises: number;
  total_time?: number;
  average_score?: number;
  accuracy_rate?: number;
  difficulty_stats?: Record<string, { count: number; completed: number; average_score: number }>;
  score_history?: Array<{ date: string; score: number }>;
  recent_exercises?: Array<{ id: number; date: string; score: number; difficulty?: string }>;
}

// 教师/家长界面共享的活动项
export interface Activity {
  id: number;
  student_name: string;
  score: number;
  completed_at: string;
  type: string;
}

export interface AdminCreate {
  email: string;
  username: string;
  password: string;
  is_superuser?: boolean;
  permissions?: string[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  success: boolean;
  user: User;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  error_code?: string;
  details?: string | string[] | Record<string, any>;
}
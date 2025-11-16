import { api } from './index';
import type { User, StudentProgress } from './types';

export interface TeacherStats {
  total_students: number;
  exercises_today: number;
  average_accuracy: number;
  recent_activities?: Array<{ id: number; student_name: string; score: number; completed_at: string }>;
  score_history?: Array<{ date: string; score: number }>;
  difficulty_stats?: Record<string, { count: number; completed: number; average_score: number }>;
}

export const teacherAPI = {
  getTeacherStats: async (): Promise<TeacherStats> => {
    const res = await api.get('/users/me/teacher-stats');
    return res.data;
  },

  getTeacherStudents: async (): Promise<User[]> => {
    const res = await api.get('/users/me/teacher-students');
    return res.data;
  },

  getStudentProgress: async (studentId: number): Promise<StudentProgress> => {
    const res = await api.get(`/users/students/${studentId}/progress`);
    return res.data as StudentProgress;
  },

  /**
   * 前端聚合：当教师统计中缺少 difficulty_stats 时，
   * 通过“我的学生”列表逐个获取学生进度并汇总难度分布。
   * 注意：为降低后端改动，我们在前端完成多请求聚合；班级很大时会有一定开销。
   */
  getAggregatedDifficultyStats: async (): Promise<Record<string, { count: number; completed: number; average_score: number }>> => {
    // 获取教师的学生列表
    const studentsRes = await api.get('/users/me/teacher-students');
    const students = studentsRes.data as User[];
    if (!students || students.length === 0) return {};

    // 逐个拉取学生进度（使用 Promise.allSettled，避免个别失败导致整体失败）
    const results = await Promise.allSettled(
      students.map((s) => api.get(`/users/students/${s.id}/progress`))
    );

    // 临时聚合表：累计 count / completed / totalScore（便于最终求均分）
    const temp: Record<string, { count: number; completed: number; totalScore: number }> = {};

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const prog = r.value.data as StudentProgress;
      const ds = prog?.difficulty_stats || {};
      for (const [diff, stat] of Object.entries(ds)) {
        if (!temp[diff]) temp[diff] = { count: 0, completed: 0, totalScore: 0 };
        temp[diff].count += stat.count || 0;
        temp[diff].completed += stat.completed || 0;
        // 通过 average_score * completed 近似恢复总分
        if (stat.completed && stat.average_score != null) {
          temp[diff].totalScore += (stat.average_score || 0) * stat.completed;
        }
      }
    }

    // 生成最终结果：平均分 = totalScore / completed（保留两位小数）
    const out: Record<string, { count: number; completed: number; average_score: number }> = {};
    for (const [diff, v] of Object.entries(temp)) {
      out[diff] = {
        count: v.count,
        completed: v.completed,
        average_score: v.completed > 0 ? Math.round((v.totalScore / v.completed) * 100) / 100 : 0,
      };
    }
    return out;
  },

  /**
   * 教师端聚合练习统计（前端回退方案）：
   * - 汇总所有学生的练习数、已完成数、平均分、正确率、分数历史（按日平均）。
   * - 返回结构尽量兼容 ExerciseStats，便于复用前端页面。
   */
  getTeacherExerciseStatsAggregated: async (): Promise<{
    total_exercises: number;
    completed_exercises: number;
    average_score: number;
    accuracy_rate?: number;
    score_history: Array<{ date: string; score: number }>;
  }> => {
    const studentsRes = await api.get('/users/me/teacher-students');
    const students = studentsRes.data as User[];
    if (!students || students.length === 0) {
      return {
        total_exercises: 0,
        completed_exercises: 0,
        average_score: 0,
        accuracy_rate: 0,
        score_history: [],
      };
    }

    const results = await Promise.allSettled(
      students.map((s) => api.get(`/users/students/${s.id}/progress`))
    );

    let totalExercises = 0;
    let completedExercises = 0;
    let weightedScoreSum = 0; // 用 average_score * completed_exercises 进行加权
    let weightedAccuracySum = 0; // 用 accuracy_rate * completed_exercises 进行加权
    let weight = 0; // Σ completed_exercises

    // 按日期聚合分数历史
    const historyMap: Record<string, { sum: number; count: number }> = {};

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const prog = r.value.data as StudentProgress;
      totalExercises += prog?.total_exercises || 0;
      completedExercises += prog?.completed_exercises || 0;

      const comp = prog?.completed_exercises || 0;
      if (comp > 0) {
        if (typeof prog?.average_score === 'number') {
          weightedScoreSum += prog.average_score * comp;
        }
        if (typeof prog?.accuracy_rate === 'number') {
          weightedAccuracySum += prog.accuracy_rate * comp;
        }
        weight += comp;
      }

      // 聚合 score_history（日期 -> 平均分）
      for (const item of prog?.score_history || []) {
        const parsed = new Date(item.date);
        const dateKey = isNaN(parsed.getTime()) ? String(item.date).replace(/T.*$/, '') : parsed.toISOString().slice(0, 10);
        if (!historyMap[dateKey]) historyMap[dateKey] = { sum: 0, count: 0 };
        historyMap[dateKey].sum += item.score || 0;
        historyMap[dateKey].count += 1;
      }
    }

    const average_score = weight > 0 ? Math.round((weightedScoreSum / weight) * 100) / 100 : 0;
    const accuracy_rate = weight > 0 ? Math.round((weightedAccuracySum / weight) * 100) / 100 : 0;

    const score_history = Object.entries(historyMap)
      .map(([date, v]) => ({ date, score: Math.round((v.sum / v.count) * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // 只保留最近 30 条，避免过长

    return {
      total_exercises: totalExercises,
      completed_exercises: completedExercises,
      average_score,
      accuracy_rate,
      score_history,
    };
  },

  /**
   * 获取所有学生 recent_exercises 聚合（用于教师端可视化）
   */
  getAggregatedRecentExercises: async (): Promise<Array<{ date: string; score: number; difficulty?: string }>> => {
    const studentsRes = await api.get('/users/me/teacher-students');
    const students = studentsRes.data as User[];
    if (!students || students.length === 0) return [];
    const results = await Promise.allSettled(
      students.map((s) => api.get(`/users/students/${s.id}/progress`))
    );
    const out: Array<{ date: string; score: number; difficulty?: string }> = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const prog = r.value.data as StudentProgress;
      for (const ex of prog?.recent_exercises || []) {
        out.push({ date: ex.date, score: ex.score, difficulty: ex.difficulty });
      }
    }
    return out;
  },
};

export default teacherAPI;


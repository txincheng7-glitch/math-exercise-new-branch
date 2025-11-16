import { api } from './index';
import { Activity } from './types';

export interface ChildStats {
  id: number;
  name: string;
  exercises_today: number;
  total_exercises: number;
  average_score: number;
}

export interface ParentStats {
  total_children: number;
  total_exercises_today: number;
  average_accuracy: number;
  children_stats: Array<ChildStats>;
  recent_activities: Array<Activity>;
}

export const getParentStats = (): Promise<ParentStats> =>
  api.get<ParentStats>('/users/me/parent-stats').then(res => res.data);

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { User, StudentProgress } from '../../../api/types';
import teacherAPI from '../../../api/teacher';
import ScoresTrendChart from './ScoresTrendChart';

type Props = {
  student: User | null;
  open: boolean;
  onClose: () => void;
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="p-3 bg-gray-50 rounded border">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

const StudentModal: React.FC<Props> = ({ student, open, onClose }) => {
  if (!open || !student) return null;

  const { data: progress, isLoading, error } = useQuery<StudentProgress>({
    queryKey: ['student','progress', student.id],
    queryFn: () => teacherAPI.getStudentProgress(student.id),
    enabled: !!student?.id && open,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white rounded shadow-lg z-10 w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">学生详情</h3>
          <button onClick={onClose} className="text-gray-500">关闭</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">姓名</div>
            <div className="font-semibold">{student.username}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">邮箱</div>
            <div className="font-semibold">{student.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">班级</div>
            <div className="font-semibold">{student.student_profile?.grade ?? '-'} {student.student_profile?.class_name ?? ''}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">创建时间</div>
            <div className="font-semibold">{student.created_at ?? '-'}</div>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-500">加载中…</div>
          ) : error ? (
            <div className="text-sm text-red-600">无法加载进度信息</div>
          ) : progress ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Stat label="练习总数" value={progress.total_exercises ?? '-'} />
                <Stat label="已完成" value={progress.completed_exercises ?? '-'} />
                <Stat label="平均分" value={progress.average_score ?? '-'} />
                <Stat label="正确率" value={progress.accuracy_rate != null ? `${progress.accuracy_rate}%` : '-'} />
              </div>

              <div className="bg-white rounded border p-3">
                <div className="text-sm font-medium mb-2">分数趋势</div>
                <ScoresTrendChart data={progress.score_history ?? []} />
              </div>

              <div className="bg-white rounded border p-3">
                <div className="text-sm font-medium mb-2">最近练习</div>
                {progress.recent_exercises && progress.recent_exercises.length > 0 ? (
                  <ul className="text-sm divide-y">
                    {progress.recent_exercises.slice(0, 8).map((e) => (
                      <li key={e.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">{e.date?.replace(/T.*/,'') || '-'}</span>
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-100 border">{e.difficulty ?? '—'}</span>
                        </div>
                        <span className="font-medium">{e.score}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">暂无最近练习</div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium mb-2">难度分布</div>
                {progress.difficulty_stats ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(progress.difficulty_stats).map(([k, v]) => (
                      <span key={k} className="text-xs bg-gray-100 px-2 py-1 rounded border">
                        {k}: {v.count}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">暂无难度数据</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">暂无进度数据</div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">分配教师</button>
          <button className="px-4 py-2 border rounded">导出记录</button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600">关闭</button>
        </div>
      </div>
    </div>
  );
};

export default StudentModal;

import React, { useState } from 'react';
import type { User } from '../../../api/types';
import StudentModal from './StudentModal';

interface Props {
  student: User;
}

const StudentPerformanceRow: React.FC<Props> = ({ student }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-3 bg-gray-50 rounded flex items-center justify-between">
      <div>
        <div className="font-medium">{student.username}</div>
        <div className="text-sm text-gray-500">{student.student_profile?.grade} {student.student_profile?.class_name}</div>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-sm text-indigo-600" onClick={() => setOpen(true)}>查看</button>
      </div>

  <StudentModal student={student} open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default StudentPerformanceRow;

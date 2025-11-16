import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exercises } from '../../api';

const CreateExercise = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    difficulty: '简单',  // 改为中文
    number_range: [1, 100],
    operator_types: ['+'],  // 改为运算符符号
    question_count: 5
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.operator_types.length === 0) {
      setError('请至少选择一种运算符');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const exercise = await exercises.create(formData);
      navigate(`/student/exercise/${exercise.id}`);  // 添加/student前缀
    } catch (err: any) {
      setError(
        err.response?.data?.detail?.[0]?.msg || 
        err.response?.data?.detail || 
        err.message || 
        '创建练习失败，请重试'
      );
      setIsLoading(false);
    }
  };

  const operatorLabels: Record<string, string> = {
    '+': '加法 (+)',
    '-': '减法 (-)',
    '*': '乘法 (×)',
    '/': '除法 (÷)'
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">创建练习</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            难度
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
            className="w-full p-2 border rounded shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="简单">简单</option>
            <option value="中等">中等</option>
            <option value="困难">困难</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            运算符
          </label>
          <div className="space-y-2">
            {Object.entries(operatorLabels).map(([op, label]) => (
              <label key={op} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.operator_types.includes(op)}
                  onChange={(e) => {
                    const newOperators = e.target.checked
                      ? [...formData.operator_types, op]
                      : formData.operator_types.filter(x => x !== op);
                    setFormData({...formData, operator_types: newOperators});
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            题目数量
          </label>
          <input
            type="number"
            value={formData.question_count}
            onChange={(e) => setFormData({...formData, question_count: Math.max(1, Math.min(20, parseInt(e.target.value) || 0))})}
            min="1"
            max="20"
            className="w-full p-2 border rounded shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          {isLoading ? '创建中...' : '创建练习'}
        </button>
      </form>
    </div>
  );
};

export default CreateExercise;
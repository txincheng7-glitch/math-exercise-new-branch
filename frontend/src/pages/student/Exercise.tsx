import React, { useState, useEffect, useRef } from 'react';  // 添加useRef
import { useParams, useNavigate } from 'react-router-dom';
import { exercises, ai } from '../../api';
import AISettingsDialog from '../../components/AISettingsDialog';
import AIControl from '../../components/AIControl';
import toast from 'react-hot-toast';

const Exercise = () => {
  const aiButtonRef = useRef<HTMLDivElement>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  
  // AI相关状态
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    const loadExercise = async () => {
      try {
        const data = await exercises.getExercise(parseInt(id!));
        setExercise(data);
        setStartTime(Date.now());
      } catch (error) {
        console.error('Failed to load exercise:', error);
      }
    };
    loadExercise();
  }, [id]);

  const handleSubmitAnswer = async () => {
    if (!exercise || !answer) return;
  
    const question = exercise.questions[currentQuestionIndex];
    const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));  // 确保至少为1秒
  
    try {
      await exercises.submitAnswer(exercise.id, question.id, {
        user_answer: parseFloat(answer),
        time_spent: timeSpent
      });
  
      if (currentQuestionIndex < exercise.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnswer('');
        setStartTime(Date.now());
      } else {
        // 完成练习
        await exercises.complete(exercise.id);
        navigate(`/student/result/${exercise.id}`, {
          state: { shouldGenerateAI: isAIEnabled }
        });
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  // AI相关函数
  const handleAIToggle = () => {
    if (!isAIEnabled) {
      setIsSettingsOpen(true);
    } else {
      setIsAIEnabled(false);
    }
  };

  const handleSettingsSubmit = async (tokens: { pb_token: string; plat_token: string }) => {
    setIsAILoading(true);
    try {
      const result = await ai.initialize(tokens);
      if (result.success) {
        setIsAIEnabled(true);
        // 不需要在这里设置setIsSettingsOpen(false)了，因为对话框会自动关闭
        return; // 成功时返回
      } else {
        throw new Error('AI服务初始化失败');
      }
    } catch (error) {
      console.error('Failed to initialize AI:', error);
      toast.error('AI服务初始化失败，请稍后重试');
      throw error; // 抛出错误，这样对话框不会关闭
    } finally {
      setIsAILoading(false);
    }
  };

  if (!exercise) return <div>Loading...</div>;

  const currentQuestion = exercise.questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* AI控制按钮 */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold">
          题目 {currentQuestionIndex + 1} / {exercise.questions.length}
        </div>
        <div ref={aiButtonRef}>  {/* 在这里添加ref */}
          <AIControl
            enabled={isAIEnabled}
            loading={isAILoading}
            onToggle={handleAIToggle}
          />
        </div>
      </div>

      {/* 题目内容 */}
      <div className="mb-6">
        <div className="text-xl mt-4">{currentQuestion.content} = ?</div>
      </div>

      {/* 答题区域 */}
      <div className="space-y-4">
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="请输入答案"
        />

        <button
          onClick={handleSubmitAnswer}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          提交答案
        </button>
      </div>

      {/* AI设置对话框 */}
      <AISettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSubmit={handleSettingsSubmit}
        buttonRef={aiButtonRef}
      />
    </div>
  );
};

export default Exercise;
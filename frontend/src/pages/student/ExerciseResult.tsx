import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';  // 添加useLocation
import { exercises, ai } from '../../api';
import AIFeedbackPreview from '../../components/AIFeedbackPreview';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Question {
  id: number;
  content: string;
  correct_answer: number;
  user_answer: number | null;
  time_spent: number | null;
  is_correct: boolean;
}

interface Exercise {
  id: number;
  difficulty: string;
  final_score: number;
  total_time: number;
  questions: Question[];
  ai_feedback: string | null;
}

const ExerciseResult = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();  // 获取location
  const navigate = useNavigate();

  // 从location.state中获取AI启用状态
  const shouldGenerateAI = location.state?.shouldGenerateAI;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  // 将error重命名为更具体的名称
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [aiFeedbackError, setAiFeedbackError] = useState<string | null>(null);
  const [aiFeedback, setAIFeedback] = useState<string>('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const getFeedback = useCallback(async (exerciseId: number) => {
    if (isGeneratingFeedback) return;
    
    setIsGeneratingFeedback(true);
    setAiFeedbackError(null);  // 清除之前的AI反馈错误
    let feedback = '';

    try {
      await ai.getFeedback(
        exerciseId,
        'detailed',
        (chunk) => {
          feedback += chunk;
          setAIFeedback(feedback);
        },
        (error) => {
          console.log('Error occurred:', error); // 添加调试日志
          const errorMessage = error.response?.data?.error || error.message || '获取AI反馈失败';
          setAiFeedbackError(errorMessage);  // 使用aiFeedbackError
        }
      );
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [isGeneratingFeedback]);

  // 加载练习数据和处理AI反馈
  useEffect(() => {
    // 每次effect执行都会创建新的controller
    const abortController = new AbortController();

    const loadExercise = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // 发送请求时带上signal
        const data = await exercises.getExercise(parseInt(id), abortController.signal);
        
        // 如果请求被取消了（说明这是第一次的请求），直接返回
        if (abortController.signal.aborted) return;
        
        // 只有未被取消的请求（第二次的请求）才会更新状态
        setExercise(data);
        
        if (data.ai_feedback) {
          setAIFeedback(data.ai_feedback);
        } else if (shouldGenerateAI) {
          getFeedback(parseInt(id));
        }
      } catch (error) {
        // 被取消的请求会抛出AbortError，我们不处理它
        if (!abortController.signal.aborted) {  // 只在非取消的情况下设置错误
          setLoadingError('加载练习结果失败');
          console.error('Failed to load exercise:', error);
        }
      } finally {
        if (!abortController.signal.aborted) {  // 只在非取消的情况下设置loading状态
          setLoading(false);
        }
      }
    };

    loadExercise();

    // 清理函数：当effect重新执行前，会先调用这个函数
    return () => {
      // 取消当前的请求
      abortController.abort();
    };
  }, [id, shouldGenerateAI, getFeedback]);

  // 判断是否需要显示"生成AI点评"按钮
  // 只有当没有正在生成、没有现有反馈、没有错误、且不是自动生成模式时才显示
  const shouldShowGenerateButton = !isGeneratingFeedback && 
                                 !aiFeedback && 
                                 !shouldGenerateAI;
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 只有在加载失败时显示错误页面
  if (loadingError || !exercise) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          {loadingError || '练习不存在'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 总体成绩 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-2xl font-bold mb-4">练习完成！</h1>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded">
            <div className="text-sm text-gray-600">最终得分</div>
            <div className="text-3xl font-bold text-blue-600">
              {exercise.final_score}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded">
            <div className="text-sm text-gray-600">总用时</div>
            <div className="text-3xl font-bold text-green-600">
              {exercise.total_time}秒
            </div>
          </div>
        </div>
      </div>

      {/* 答题详情 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">答题详情</h2>
        <div className="space-y-4">
          {exercise.questions.map((question, index) => (
            <div
              key={question.id}
              className={`p-4 rounded-lg ${
                question.is_correct ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">题目 {index + 1}</div>
                <div className="text-sm text-gray-500">
                  用时：{question.time_spent}秒
                </div>
              </div>
              <div className="mb-2">{question.content} = ?</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  你的答案：
                  <span className={question.is_correct ? 'text-green-600' : 'text-red-600'}>
                    {question.user_answer}
                  </span>
                </div>
                <div>
                  正确答案：
                  <span className="text-blue-600">{question.correct_answer}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI点评部分 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">AI点评</h2>
          {aiFeedback && (
            <button
              onClick={() => setShowAIFeedback(true)}
              className="text-blue-500 hover:text-blue-700"
            >
              查看完整评价
            </button>
          )}
        </div>
        
        {isGeneratingFeedback && !aiFeedback ? (
          // 只在生成中且还没有任何内容时显示加载动画
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>正在生成AI点评...</span>
          </div>
        ) : aiFeedback ? (
          // 使用ReactMarkdown来渲染内容
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {aiFeedback}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <p className="mb-4">暂无AI点评</p>
            {shouldShowGenerateButton && (
              <>
                <button
                  onClick={() => getFeedback(parseInt(id!))}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg
                    hover:bg-blue-600 transition-colors duration-200"
                >
                  <MessageSquarePlus className="w-5 h-5 mr-2" />
                  生成AI点评
                </button>
                {aiFeedbackError && (
                  <div className="mt-4 text-center">
                    <p className="text-red-500 mb-2">{aiFeedbackError}</p>
                    {aiFeedbackError === "AI服务未初始化，请先配置token" && (
                      <p className="text-gray-500 text-sm">
                        提示：创建新练习时可以通过右上角的AI开关配置并启用AI服务
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={() => navigate('/student/create-exercise')}  // 修改这里
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          再来一组
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          返回首页
        </button>
      </div>

      {/* AI反馈预览对话框 */}
      {showAIFeedback && aiFeedback && (
        <AIFeedbackPreview
          content={aiFeedback}
          onClose={() => setShowAIFeedback(false)}
        />
      )}
    </div>
  );
};

export default ExerciseResult;
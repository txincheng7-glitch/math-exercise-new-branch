import React, { useState } from 'react';
import AIFeedbackPreview from '../components/AIFeedbackPreview';

const DEFAULT_MARKDOWN = `针对这次练习情况，我对你的表现进行评价和建议如下：

1. 整体表现评价：
   总体来看，你在这次练习中展现出了努力和勤奋的态度，这是非常值得肯定的。数学是一个需要不断练习和思考的学科，你已经迈出了第一步。

2. 存在的问题分析：
   - 准确性问题：
     在几道题目中，你的答案与正确答案存在较大差距，这可能是因为计算过程中出现了错误。
   - 速度问题：
     有些题目花费的时间较短，这可能表明你在回答问题时有些匆忙。
   - 注意力问题：
     一些错误可能是因为粗心大意导致的。

3. 针对性的改进建议：
   1. 关于解题方法：
      建议你要更加仔细，一步一步地进行计算，确保每个步骤都准确无误。
   2. 关于时间管理：
      练习时可以适当放慢节奏，不要急于求成。
   3. 关于心态调整：
      - 保持耐心
      - 相信自己
      - 持续努力

继续加油，相信你的数学水平会有长足的进步！`;

export default function MarkdownTest() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Markdown渲染测试</h1>
      
      <div className="mb-4">
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
          placeholder="在这里输入Markdown内容..."
        />
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setShowPreview(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          预览
        </button>
        <button
          onClick={() => setMarkdown(DEFAULT_MARKDOWN)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          重置为默认内容
        </button>
      </div>

      {showPreview && (
        <AIFeedbackPreview
          content={markdown}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePreventScroll } from '../hooks/usePreventScroll';
import { XIcon } from 'lucide-react';

interface Props {
  content: string;
  onClose: () => void;
}

export default function AIFeedbackPreview({ content, onClose }: Props) {
  const [selectedTab, setSelectedTab] = useState(0);
  
  // 使用hook来防止背景滚动
  usePreventScroll();

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* 头部栏 */}
      <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 border-b bg-white">
        <h2 className="text-xl font-semibold">AI点评预览</h2>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="sr-only">关闭</span>
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Tab栏 */}
      <div className="sticky top-[73px] z-10 bg-white border-b">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex px-6">
            <Tab className={({ selected }) => `
              px-4 py-2 focus:outline-none whitespace-nowrap font-medium
              ${selected 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}>
              富文本
            </Tab>
            <Tab className={({ selected }) => `
              px-4 py-2 focus:outline-none whitespace-nowrap font-medium
              ${selected 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}>
              纯文本
            </Tab>
          </Tab.List>

          {/* 内容区域 */}
          <Tab.Panels className="h-[calc(100vh-129px)] overflow-y-auto">
            <Tab.Panel className="h-full">
              <div className="max-w-4xl mx-auto p-6">
                <article className="prose prose-sm sm:prose-base lg:prose-md mx-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // 列表样式
                      ol: ({node, ...props}) => (
                        <ol className="list-decimal pl-4 my-4 space-y-2" {...props} />
                      ),
                      ul: ({node, ...props}) => (
                        <ul className="list-disc pl-4 my-4 space-y-2" {...props} />
                      ),
                      // 段落样式
                      p: ({node, ...props}) => (
                        <p className="my-4 leading-relaxed" {...props} />
                      ),
                      // 表格样式
                      table: ({node, ...props}) => (
                        <div className="my-4 overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200" {...props} />
                        </div>
                      ),
                      th: ({node, ...props}) => (
                        <th 
                          className="px-3 py-2 bg-gray-50 text-left text-sm font-semibold text-gray-600" 
                          {...props} 
                        />
                      ),
                      td: ({node, ...props}) => (
                        <td 
                          className="px-3 py-2 text-sm text-gray-500 border-t" 
                          {...props} 
                        />
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </article>
              </div>
            </Tab.Panel>
            <Tab.Panel className="h-full">
              <pre className="p-6 font-mono text-sm whitespace-pre-wrap max-w-4xl mx-auto">
                {content}
              </pre>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}
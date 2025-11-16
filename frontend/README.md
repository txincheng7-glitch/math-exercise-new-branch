# Math Exercise Frontend

基于React + TypeScript的数学练习系统前端界面。

## 技术栈

- React 19
- TypeScript 4.9+
- TailwindCSS 3.4
- React Router 7
- React Query
- Headless UI
- Hero Icons

## 项目结构

```
frontend/
├── src/
│   ├── api/              # API调用封装
│   ├── components/       # 可复用组件
│   ├── contexts/         # React上下文
│   ├── pages/           # 页面组件
│   ├── App.tsx          # 应用入口
│   └── index.tsx        # 渲染入口
│
├── public/              # 静态资源
├── package.json         # 项目配置
├── tailwind.config.js   # Tailwind配置
└── README.md           # 说明文档
```

## 环境要求

- Node.js 20.x.x
- npm 10.x.x

## 安装

```bash
# 安装依赖
npm install
```

## 运行

```bash
# 开发模式
npm start

# 构建生产版本
npm run build
```

## 开发指南

1. 添加新页面
   - 在`src/pages/`下创建页面组件
   - 在`src/App.tsx`中添加路由配置

2. 添加新组件
   - 在`src/components/`下创建组件
   - 使用TypeScript类型定义接口

3. 添加新API调用
   - 在`src/api/index.ts`中添加API封装
   - 使用React Query进行状态管理

4. 样式开发
   - 使用TailwindCSS工具类
   - 遵循响应式设计原则

## 目录说明

### `/src/api`
API调用封装，包含所有与后端通信的函数。

### `/src/components`
可复用的React组件：
- `AISettingsDialog.tsx`: AI设置对话框
- `AIFeedbackPreview.tsx`: AI反馈预览

### `/src/contexts`
React上下文：
- `AuthContext.tsx`: 身份验证上下文

### `/src/pages`
页面级组件：
- `Login.tsx`: 登录页面
- `CreateExercise.tsx`: 创建练习页面
- `Exercise.tsx`: 练习页面

## 功能特点

1. 用户认证
   - JWT token管理
   - 登录状态持久化
   - 路由保护

2. 练习功能
   - 动态题目生成
   - 实时答案验证
   - 练习进度保存

3. AI点评
   - 实时反馈
   - Markdown渲染
   - 流式响应处理

## 注意事项

- 确保后端服务运行在正确的端口（默认8000）
- AI功能需要正确配置POE API Token
- 开发时建议使用React Developer Tools
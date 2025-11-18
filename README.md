# Math Exercise Generator

一个基于FastAPI + React的在线数学练习系统，支持加减乘除四则运算，提供灵活的题目生成策略和评分机制。

## 功能特点

- 支持加减乘除四则运算题目生成
- 灵活的难度设置和数字范围控制
- 多种评分策略（计时得分、准确率得分等）
- 工厂模式实现题目生成
- 策略模式实现灵活的评分机制
- 观察者模式实现练习状态监控
- 前后端分离架构
- JWT身份验证
- AI点评功能（需要配置POE API Token）

## 项目结构

```
math_exercise/
├── backend/              # FastAPI后端
│   ├── app/             # 后端应用代码
│   ├── requirements.txt # Python依赖
│   └── README.md        # 后端说明文档
│
├── frontend/            # React前端
│   ├── src/            # 前端源代码
│   ├── package.json    # Node.js依赖
│   └── README.md       # 前端说明文档
│
└── README.md           # 项目说明文档
```

## 环境要求

- Python 3.11+
- Node.js 20.x.x
- Windows/Linux/macOS

## 快速开始

1. 克隆仓库
   ```bash
   git clone https://github.com/jishux2/math-exercise.git
   cd math-exercise
   ```

2. 启动后端服务
   ```bash
   cd backend
   
   # 创建虚拟环境
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # 或
   venv\Scripts\activate     # Windows
   
   # 安装依赖
   pip install -r requirements.txt
   
   # 安装AI服务依赖（可选）
   python install_poe.py
   
   # 启动服务
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   ```

3. 启动前端服务
   ```bash
   cd frontend
   
   # 安装依赖
   npm install
   
   # 启动开发服务器
   npm start
   ```

4. 访问应用
   - 打开浏览器访问：http://localhost:3000
   - API文档：http://localhost:8000/docs

## 开发说明

- 后端API开发：参见[backend/README.md](backend/README.md)
- 前端开发：参见[frontend/README.md](frontend/README.md)

## License

MIT
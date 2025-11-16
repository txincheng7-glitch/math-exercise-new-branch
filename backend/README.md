# Math Exercise Backend

基于FastAPI的数学练习系统后端服务。

## 技术栈

- FastAPI：Web框架
- SQLAlchemy：ORM
- Pydantic：数据验证
- JWT：身份验证
- SQLite：数据库

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI应用主入口
│   ├── config.py                  # 配置文件
│   ├── database.py                # 数据库配置
│   │
│   ├── api/                       # API路由层
│   │   ├── deps.py               # 依赖项（认证等）
│   │   └── v1/                   # API v1版本
│   │
│   ├── core/                      # 核心业务逻辑
│   │   ├── arithmetic_tree.py    # 算术树实现
│   │   ├── question_factory.py   # 题目生成器
│   │   └── scoring.py            # 评分策略
│   │
│   ├── models/                    # SQLAlchemy模型
│   ├── schemas/                   # Pydantic模型
│   ├── services/                  # 服务层
│   └── utils/                     # 工具函数
│
├── requirements.txt               # Python依赖
└── README.md                     # 说明文档
```

## 环境要求

- Python 3.11+
- 支持asyncio的Python环境

## 安装

1. 创建虚拟环境
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # 或
   venv\Scripts\activate     # Windows
   ```

2. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

3. 安装AI服务依赖（可选）
   ```bash
   python install_poe.py
   ```
   
   > 注意：AI点评功能需要代理支持
   > - 默认配置支持v2rayN（端口10809）
   > - 如果使用clash，需要手动修改`poe_api_wrapper`依赖中的以下文件中的端口设置：
   >   - `poe_api_wrapper/__init__.py`
   >   - `poe_api_wrapper/proxies.py`

## 运行

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API文档

启动服务后访问：
- Swagger UI：http://localhost:8000/docs
- ReDoc：http://localhost:8000/redoc

## 关键设计模式

1. 工厂模式：题目生成
   - `QuestionFactory`：抽象工厂接口
   - `ArithmeticQuestionFactory`：具体工厂实现

2. 策略模式：评分系统
   - `ScoringStrategy`：评分策略接口
   - `BasicScoringStrategy`：基础评分策略
   - `TimedScoringStrategy`：计时评分策略

3. 观察者模式：练习状态监控
   - 通过WebSocket实时通知前端练习状态变化

## 开发指南

1. 添加新API
   - 在`app/api/v1/`下创建新的路由文件
   - 在`app/api/v1/__init__.py`中注册路由

2. 添加新模型
   - 在`app/models/`下创建SQLAlchemy模型
   - 在`app/schemas/`下创建对应的Pydantic模型

3. 添加新服务
   - 在`app/services/`下创建新的服务类
   - 遵循依赖注入原则

4. 运行测试
   ```bash
   pytest
   ```

## 注意事项

- AI点评功能需要正确配置POE API Token
- 默认使用SQLite数据库，可以根据需要更换为其他数据库
- 开发环境建议启用调试模式：`--reload`
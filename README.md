# A_stock_Analysis (A股股票分析应用)

这是一个专为中国A股市场设计的股票数据分析应用。它能够追踪历史价格，并提供如 MACD 和 RSI 等技术指标分析，帮助用户更好地理解市场趋势。

## 项目介绍

本项目是一个全栈 Web 应用，集成了实时数据获取、本地数据库存储以及可视化图表展示。用户可以查看 A 股上市公司的基本信息、历史 K 线数据，并利用技术指标进行辅助决策。

## 项目目录

```text
├── .env.example          # 环境变量示例文件
├── index.html            # 前端入口 HTML
├── metadata.json         # 项目元数据
├── package.json          # 项目依赖和脚本配置
├── server.ts             # 后端 Express 服务器入口
├── stocks.db             # SQLite 数据库文件
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 构建配置
├── src/
│   ├── main.tsx          # 前端 React 入口
│   ├── App.tsx           # React 主组件
│   ├── index.css         # 全局样式 (Tailwind CSS)
│   └── server/           # 后端逻辑目录
│       ├── config.ts     # 后端配置 (API 接口等)
│       ├── database.ts   # 数据库初始化
│       ├── models.ts     # 数据模型定义
│       ├── crud.ts       # 数据库增删改查操作
│       ├── services.ts   # 外部 API 服务对接 (新浪财经等)
│       └── routers/      # API 路由处理
│           └── stocks.ts # 股票相关接口
```
```text
-- demo_db_shenji.stock_prices definition

CREATE TABLE `stock_prices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stock_id` int NOT NULL,
  `date` varchar(20) NOT NULL,
  `open` double NOT NULL,
  `high` double NOT NULL,
  `low` double NOT NULL,
  `close` double NOT NULL,
  `volume` bigint NOT NULL,
  `amount` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_id` (`stock_id`,`date`),
  CONSTRAINT `stock_prices_ibfk_1` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- demo_db_shenji.stocks definition

CREATE TABLE `stocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `symbol` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sector` varchar(255) DEFAULT NULL,
  `industry` varchar(255) DEFAULT NULL,
  `exchange` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `symbol` (`symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=12919 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```
## 技术实现

### 前端

- **React 19**: 构建响应式用户界面。
- **Tailwind CSS**: 现代化的实用优先 CSS 框架，用于快速 UI 开发。
- **Recharts**: 用于展示股票价格走势和技术指标的图表库。
- **Lucide React**: 提供美观的图标库。
- **Motion**: 用于实现平滑的动画过渡效果。

### 后端 (Python 版)

- **FastAPI**: 高性能的 Python Web 框架。
- **SQLAlchemy**: 强大的 ORM 框架。
- **Pandas & NumPy**: 用于高效的技术指标计算。
- **UV**: 极速的 Python 包管理和项目管理工具。
- **Requests**: 用于抓取股票数据。

### AI 集成

- **Google Gemini API**: 预留接口，可用于后续实现 AI 驱动的股票预测或研报总结。

## 核心功能

1. **股票列表同步**: 从新浪财经同步 A 股全量股票列表。
2. **历史 K 线追踪**: 获取并存储个股的历史日线数据。
3. **技术指标计算**: 自动计算 MACD、RSI 等常用技术指标。
4. **可视化展示**: 清晰的 K 线图和指标走势图。
5. **多交易所支持**: 支持上证 (SH)、深证 (SZ) 以及北证 (BJ) 交易所。

## 快速开始

### 1. 安装依赖

#### Node.js 依赖 (前端及 Node 后端)

```bash
npm install

如果有异常
# Delete everything (PowerShell way)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Clear the cache to ensure fresh binaries are downloaded
npm cache clean --force

# Install the specific Windows binary for Tailwind's engine
npm install @tailwindcss/oxide-win32-x64-msvc --save-dev

# Now install everything else
npm install
```

#### Python 依赖 (Python 后端)

使用 `uv` 安装：

```bash
# 如果没有安装 uv，请先安装: https://github.com/astral-sh/uv
uv sync

# PowerShell
$env:PYTHONUTF8=1
# DOS环境
set PYTHONUTF8=1

# 清空缓存
uv cache clean
# 安装依赖
uv sync
uv sync --no-cache
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写必要的配置：

```bash
cp .env.example .env
```

### 3. 启动开发服务器

#### 启动 Node.js 后端 (默认)

```bash
npm run dev
```

#### 启动 Python 后端

```bash
uv run uvicorn python_design.main:app --reload --port 3000



```

应用将运行在 `http://localhost:3000`。

## 部署步骤

### 本地构建

1. 执行构建命令：

   ```bash
   npm run build
   ```

2. 构建产物将生成在 `dist` 目录中。

### 生产环境运行

确保已安装生产依赖，并使用以下命令启动：

```bash
NODE_ENV=production npm start
```

## 环境变量

| 变量名 | 描述 | 是否必填 |
| --- | --- | --- |
| `GEMINI_API_KEY` | Google Gemini AI 的 API 密钥 | 可选 (用于 AI 功能) |

---
*注意：本项目仅供学习和研究使用，不构成任何投资建议。*

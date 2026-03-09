# StoryForge AI

面向 faceless YouTube 频道的 AI 全流程内容生产工具。

输入主题 -> AI 生成脚本 -> 自动分镜 -> 批量生成 Prompt -> 图片/视频批量提交 -> 审核确认 -> 导出素材包。

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript
- **样式**: Tailwind CSS v4
- **数据库**: PostgreSQL + Prisma
- **AI 接口**: ToAPIs (OpenAI 兼容网关)
- **存储**: 本地 `public/generated/`（可扩展到 S3/R2）

## 快速启动

### 前置条件

- Node.js >= 20
- Docker（用于本地 PostgreSQL）
- `base-server-conf` 已启动 (`make run`)

### 步骤

```bash
# 1. 创建数据库（首次）
docker exec local_postgres psql -U postgres -c "CREATE DATABASE storyforge"

# 2. 安装依赖
npm install

# 3. 复制环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 TOAPIS_KEY（可选，不填则用 mock 模式）

# 4. 同步数据库 schema
make db-push

# 5. 启动开发服务器
make dev
```

打开 http://localhost:3000，使用默认账号 `admin@storyforge.local` / `storyforge` 登录。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:123456@localhost:5432/storyforge` |
| `TOAPIS_KEY` | ToAPIs API Key（留空走 mock） | 空 |
| `TOAPIS_BASE_URL` | ToAPIs 端点 | `https://toapis.com/v1` |
| `ADMIN_EMAIL` | 管理员邮箱 | `admin@storyforge.local` |
| `ADMIN_PASSWORD` | 管理员密码 | `storyforge` |

## 核心流程

1. **新建项目** - 输入主题、选频道预设、配风格标签
2. **生成脚本** - AI 根据主题产出带时间戳的旁白
3. **生成分镜** - AI 拆分脚本为 6-10 个镜头卡片
4. **生成 Prompt** - 为每个镜头生成图像/视频生成提示词
5. **配置参数** - 选模型、比例、时长（每个镜头可单独覆盖）
6. **批量生成** - 提交到 ToAPIs，自动轮询状态并回存素材
7. **审核导出** - 确认素材、导出 ZIP/CSV/TXT

## 支持的模型

**图像**: `gpt-4o-image`, `gemini-3-pro-image`, `seedream-5.0`

**视频**: `sora-2`, `sora-2-pro`, `veo3.1-fast`, `veo3.1-quality`, `kling-2-6`

## 常用命令

```bash
make dev          # 启动开发服务器
make build        # 生产构建
make db-push      # 同步 Prisma schema 到数据库
make db-studio    # 打开 Prisma Studio 查看数据
make lint         # 运行 ESLint
```

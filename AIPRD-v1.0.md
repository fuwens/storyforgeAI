# AI 视频创作平台 · 完整 PRD v1.0

> 面向 Faceless YouTube 创作者的 AI 全流程内容生产平台
> 文档日期：2026-03-08 | 作者：小龙虾 🦞

---

## 一、产品概述

### 1.1 产品定位

**一句话**：输入主题，AI 帮你完成脚本→分镜→提示词→批量生成素材的全流程创作平台。

**目标用户**：Faceless YouTube 频道创作者（知识类/感悟类/故事类）

**核心价值**：把原本需要 2-4 小时的内容生产流程，压缩到 15-30 分钟。

### 1.2 产品名称建议

- **StoryForge AI**
- **SceneAI**
- **FrameAI**

### 1.3 技术依赖

- **AI 能力**：ToAPIs（https://toapis.com）
  - 文本：Claude / GPT-4o（脚本、分镜、提示词生成）
  - 图像：`gpt-4o-image` / `gemini-3-pro-image` / `seedream-5.0`
  - 视频：`sora-2` / `sora-2-pro` / `veo3.1-fast` / `veo3.1-quality` / `kling-2-6`
- **应用架构**：Next.js 全栈（App Router）+ Prisma + PostgreSQL
- **文件存储**：S3/R2，用于持久化保存 ToAPIs 返回的短期 URL 资源
- **任务处理**：统一任务状态机（图片/视频都按异步任务处理）

---

## 二、用户流程设计

### 2.1 主流程（核心 7 步）

```
[1] 新建项目
    输入：视频主题/想法（1-3句话）
    设置：目标时长 / 语言 / 内容风格
        ↓
[2] AI 生成脚本
    输出：完整旁白文案（含时间节点）
    操作：编辑 / 重新生成 / 局部修改
        ↓
[3] AI 自动分镜
    输出：N 个镜头卡片（镜头描述 + 时长 + 情绪）
    操作：拖拽排序 / 删除 / 新增镜头
        ↓
[4] AI 生成提示词
    输出：每个镜头的英文 Image/Video Prompt
    操作：编辑单个 Prompt / 批量重新生成
        ↓
[5] 配置生成参数
    选择：图像模型 or 视频模型（每个镜头可单独选）
    设置：尺寸 / 时长（视频）/ 风格参数
        ↓
[6] 批量提交生成任务
    系统：统一提交所有镜头到 ToAPIs
    展示：任务进度看板（实时轮询）
        ↓
[7] 审核 & 替换 & 导出
    展示：每个镜头的生成结果
    操作：满意确认 / 重新生成 / 手动上传替换 / 导出素材
```

---

## 三、详细功能说明

### 3.1 项目管理

**项目列表页（/dashboard）**
- 卡片式展示所有项目
- 每张卡片：项目名称 / 封面图 / 状态 / 创建时间 / 镜头数
- 支持：新建 / 删除 / 复制 / 归档项目
- 项目状态：草稿 / 生成中 / 已完成 / 已归档

---

### 3.2 Step 1：主题输入（/project/new）

**表单字段**
- 主题输入框（必填）：placeholder「你想创作什么？例如：为什么聪明的人往往更孤独」
- 视频时长：30s / 60s / 90s / 3min / 5min
- 内容语言：English / 中文
- 风格标签（多选）：电影感 / 极简 / 唯美 / 暗色调 / 明亮温暖 / 知识科普 / 人生感悟 / 励志 / 故事叙述
- 目标平台：YouTube / TikTok / Instagram Reels

---

### 3.3 Step 2：脚本生成与编辑

**AI System Prompt**
```
你是一位专业的 YouTube Faceless 视频脚本写手。
根据用户提供的主题，写一篇适合配音朗读的视频脚本。

要求：
1. 前3秒必须有强钩子（引发好奇/共鸣/震惊）
2. 语言风格：{style_tags}
3. 目标时长：{duration}，每分钟约130-150词（英文）/ 200字（中文）
4. 每段加上时间戳标注 [00:00-00:05]
5. 语言：{language}
6. 结尾有 Call to Action

主题：{topic}
```

**页面功能**
- 富文本编辑器（显示带时间戳的脚本）
- 重新生成 / 调整风格后重生成
- 字数统计 + 预估时长

---

### 3.4 Step 3：AI 自动分镜

**AI System Prompt**
```
根据以下视频脚本，拆分成若干独立镜头。
每个镜头输出 JSON 数组：
[
  {
    "sequence": 1,
    "duration": 5,
    "narration": "对应旁白文字",
    "scene_description": "场景描述（中文）",
    "emotion": "情绪基调（平静/紧张/温暖/悲伤/震撼）",
    "shot_type": "镜头类型（全景/中景/特写/航拍/延时）"
  }
]
脚本：{script}
```

**页面功能**
- 镜头卡片网格（横向滚动）
- 卡片内容：编号 / 场景描述 / 旁白 / 情绪标签 / 时长
- 支持拖拽排序、删除、新增空白镜头
- 可手动编辑场景描述

---

### 3.5 Step 4：提示词生成与编辑

**AI System Prompt**
```
根据以下镜头描述，生成适合 AI 图像/视频生成的英文提示词。

镜头描述：{scene_description}
情绪：{emotion}
镜头类型：{shot_type}
整体风格：{style_tags}

输出 JSON：
{
  "image_prompt": "详细的图像生成提示词，含风格/光线/构图/主体描述",
  "video_prompt": "视频生成提示词，含运动描述",
  "negative_prompt": "需要避免的元素"
}

注意：
- 英文输出
- 使用专业摄影/电影术语
- 避免出现文字、人脸特写（Faceless 内容要求）
```

**页面功能**
- 每个镜头卡片展开显示三个提示词框（可编辑）
- 单个镜头重新生成
- 批量重新生成所有提示词

---

### 3.6 Step 5：生成配置

**全局设置**
- 生成类型：图像 / 视频
- 默认模型选择（图像/视频分别选）
- 图像宽高比：1:1 / 2:3 / 3:2
- 视频宽高比：16:9 / 9:16 / 1:1（按模型能力展示）
- 视频时长：按模型可选项展示（例如 Kling 5s/10s、Veo3 固定 8s、Sora2 10s/15s）
- 结果回存策略：生成成功后立即下载并保存到平台自己的对象存储

**模型列表（图像）**
- `gpt-4o-image`：支持文生图 / 图生图 / 图像编辑，异步任务
- `gemini-3-pro-image`：高质量图像生成，异步任务
- `seedream-5.0`：高质量图像生成，异步任务

**模型列表（视频）**
- `sora-2` / `sora-2-pro`：高质量，支持 10s/15s/25s（按型号）
- `veo3.1-fast` / `veo3.1-quality`：高质量，固定 8 秒
- `kling-2-6`：支持 5s/10s、标准/专业模式、图生视频

**每个镜头可单独覆盖**
- 覆盖生成类型（图像/视频）
- 覆盖模型选择
- 覆盖模型专属参数（例如 Kling 的 `mode` / `audio`，Veo3 的 `metadata.resolution`）

**底部显示**：预估费用 + 「开始批量生成」按钮

---

### 3.7 Step 6：任务进度看板

**功能**
- 总进度条：X/N 完成
- 每个镜头卡片实时状态：`queued` / `in_progress` / `completed` / `failed`
- 完成的卡片显示缩略图
- 失败显示错误原因 + 重试按钮
- 图片任务每 3 秒轮询，视频任务每 10 秒轮询
- 局部完成可立即进入审核
- 成功后立即回存到对象存储，不能长期依赖 ToAPIs 返回 URL

---

### 3.8 Step 7：结果审核 & 导出

**审核功能**
- 按分镜顺序排列
- 每个镜头：左侧旁白文字，右侧生成结果预览
- 操作：确认✅ / 重新生成🔄 / 本地上传替换📁 / 全屏预览👁️

**导出选项**
- 📦 素材包（ZIP）：所有已确认的图像/视频
- 📄 脚本文档（TXT/DOCX）：完整旁白 + 时间轴
- 🎬 分镜表（CSV）：镜头列表 + 描述 + Prompt 记录

---

## 四、数据库设计

### 4.1 完整建表 SQL

```sql
-- 用户表
CREATE TABLE users (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname      VARCHAR(100),
    avatar_url    VARCHAR(500),
    toapis_key    VARCHAR(500),              -- 加密存储用户自己的 ToAPIs Key
    plan          ENUM('free','pro','team') DEFAULT 'free',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE projects (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    topic           TEXT NOT NULL,
    language        ENUM('en','zh') DEFAULT 'en',
    target_duration INT DEFAULT 60,          -- 秒
    style_tags      JSON,                    -- ["cinematic","dark","melancholy"]
    target_platform ENUM('youtube','tiktok','instagram') DEFAULT 'youtube',
    status          ENUM('draft','generating','completed','archived') DEFAULT 'draft',
    cover_url       VARCHAR(500),
    script          LONGTEXT,                -- 完整脚本
    current_step    TINYINT DEFAULT 1,       -- 当前步骤 1-7
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 镜头表
CREATE TABLE shots (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id        BIGINT NOT NULL,
    sequence          INT NOT NULL,           -- 排序序号
    duration          INT DEFAULT 5,          -- 建议时长（秒）
    narration         TEXT,                   -- 对应旁白
    scene_description TEXT,                   -- 场景描述（中文）
    emotion           VARCHAR(50),            -- 情绪基调
    shot_type         VARCHAR(50),            -- 镜头类型
    image_prompt      TEXT,                   -- 图像提示词
    video_prompt      TEXT,                   -- 视频提示词
    negative_prompt   TEXT,                   -- 负面提示词
    gen_type          ENUM('image','video') DEFAULT 'image',
    gen_model         VARCHAR(100),           -- 使用的模型
    gen_params        JSON,                   -- 额外参数
    status            ENUM('pending','approved') DEFAULT 'pending',
    final_asset_id    BIGINT,                 -- 最终确认的素材 ID
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 生成任务表
CREATE TABLE generation_tasks (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    shot_id         BIGINT NOT NULL,
    project_id      BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    task_type       ENUM('image','video') NOT NULL,
    model           VARCHAR(100) NOT NULL,
    prompt          TEXT NOT NULL,
    negative_prompt TEXT,
    params          JSON,
    toapis_task_id  VARCHAR(255),             -- ToAPIs 返回的任务 ID（视频异步用）
    status          ENUM('pending','processing','completed','failed') DEFAULT 'pending',
    result_url      VARCHAR(1000),            -- 生成结果 URL
    thumbnail_url   VARCHAR(1000),            -- 缩略图
    error_message   TEXT,
    started_at      DATETIME,
    completed_at    DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shot_id) REFERENCES shots(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 素材表（每个镜头可能有多次生成结果）
CREATE TABLE shot_assets (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    shot_id     BIGINT NOT NULL,
    task_id     BIGINT NOT NULL,
    asset_type  ENUM('image','video') NOT NULL,
    url         VARCHAR(1000) NOT NULL,
    thumbnail   VARCHAR(1000),
    file_size   BIGINT,
    width       INT,
    height      INT,
    duration    FLOAT,                        -- 视频时长（秒）
    is_approved BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shot_id) REFERENCES shots(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES generation_tasks(id) ON DELETE CASCADE
);

-- 导出记录
CREATE TABLE exports (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id   BIGINT NOT NULL,
    user_id      BIGINT NOT NULL,
    export_type  ENUM('assets_zip','script','storyboard','all') NOT NULL,
    status       ENUM('pending','processing','completed','failed') DEFAULT 'pending',
    download_url VARCHAR(1000),
    file_size    BIGINT,
    expires_at   DATETIME,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_shots_project_id ON shots(project_id);
CREATE INDEX idx_shots_sequence ON shots(project_id, sequence);
CREATE INDEX idx_gen_tasks_shot_id ON generation_tasks(shot_id);
CREATE INDEX idx_gen_tasks_status ON generation_tasks(status);
CREATE INDEX idx_gen_tasks_toapis_id ON generation_tasks(toapis_task_id);
CREATE INDEX idx_assets_shot_id ON shot_assets(shot_id);
```

### 4.2 任务与素材设计补充

- `generation_tasks` 必须保存：
  - `provider_task_id`
  - `provider`
  - `model`
  - `request_payload`
  - `status`
  - `error_message`
  - `expires_at`
- `assets` 必须保存：
  - `source_url`（ToAPIs 原始返回地址）
  - `storage_url`（平台自己的持久化地址）
  - `mime_type`
  - `approved`
  - `shot_id`
- `shots` 是全流程主表，串起旁白、Prompt、生成配置、任务和结果素材

---

## 五、API 接口设计

### 5.1 认证

```
POST /api/v1/auth/register    # 注册
POST /api/v1/auth/login       # 登录（返回 JWT）
POST /api/v1/auth/logout      # 登出
```

### 5.2 项目

```
GET    /api/v1/projects              # 项目列表
POST   /api/v1/projects              # 新建项目
GET    /api/v1/projects/:id          # 项目详情（含 shots）
PUT    /api/v1/projects/:id          # 更新项目基本信息
DELETE /api/v1/projects/:id          # 删除项目
```

### 5.3 AI 生成（流式返回）

```
POST /api/v1/projects/:id/generate-script      # 生成脚本（SSE 流式）
POST /api/v1/projects/:id/generate-storyboard  # 生成分镜
POST /api/v1/projects/:id/generate-prompts     # 批量生成所有提示词
POST /api/v1/shots/:id/generate-prompt         # 单个镜头重新生成提示词
```

### 5.4 镜头管理

```
GET    /api/v1/projects/:id/shots            # 获取所有镜头
POST   /api/v1/projects/:id/shots            # 新增镜头
PUT    /api/v1/shots/:id                     # 更新镜头
DELETE /api/v1/shots/:id                     # 删除镜头
PUT    /api/v1/projects/:id/shots/reorder    # 批量重排序
```

### 5.5 生成任务

```
POST /api/v1/projects/:id/tasks/batch-submit  # 批量提交生成任务
POST /api/v1/shots/:id/tasks/submit           # 单个镜头提交任务
GET  /api/v1/projects/:id/tasks               # 获取所有任务状态（轮询用）
POST /api/v1/tasks/:id/retry                  # 失败任务重试
```

批量提交请求体示例：
```json
{
  "shot_ids": [1, 2, 3],
  "global_gen_type": "image",
  "global_model": "gpt-4o-image",
  "global_params": {
    "size": "1792x1024"
  }
}
```

### 5.6 审核 & 导出

```
PUT  /api/v1/assets/:id/approve     # 确认使用某素材
POST /api/v1/projects/:id/export    # 触发导出打包
GET  /api/v1/exports/:id            # 获取导出状态
```

---

## 六、前端组件树

```
src/
├── pages/
│   ├── Dashboard.tsx              # 项目列表
│   ├── ProjectWorkspace.tsx       # 创作工作台主容器
│   └── steps/
│       ├── Step1Topic.tsx         # 主题输入
│       ├── Step2Script.tsx        # 脚本编辑
│       ├── Step3Storyboard.tsx    # 分镜看板
│       ├── Step4Prompts.tsx       # 提示词编辑
│       ├── Step5Config.tsx        # 生成配置
│       ├── Step6Tasks.tsx         # 任务进度
│       └── Step7Review.tsx        # 审核导出
├── components/
│   ├── ShotCard.tsx               # 镜头卡片（可拖拽）
│   ├── ModelSelector.tsx          # 模型选择器
│   ├── TaskCard.tsx               # 任务状态卡片
│   ├── AssetPreview.tsx           # 图/视频预览
│   ├── StepNav.tsx                # 步骤进度条
│   └── StreamingText.tsx          # 流式文字输出组件
├── stores/
│   ├── projectStore.ts            # 项目状态（Zustand）
│   ├── taskStore.ts               # 任务状态 + 轮询逻辑
│   └── authStore.ts               # 用户认证
├── hooks/
│   ├── usePolling.ts              # 轮询 Hook
│   └── useStreamingText.ts        # SSE 流式文字 Hook
├── api/
│   ├── projects.ts
│   ├── shots.ts
│   ├── tasks.ts
│   └── ai.ts
└── lib/
    └── toapis.ts                  # ToAPIs SDK 封装（前端直连或后端中转）
```

---

## 七、ToAPIs 集成代码示例

### 7.1 图像生成（异步任务）

```typescript
// 图像任务提交 - 返回 task_id
async function submitImageTask(params: {
  model: 'gpt-4o-image' | 'seedream-5.0' | 'gemini-3-pro-image'
  prompt: string
  negative_prompt?: string
  size?: '1:1' | '2:3' | '3:2'
}) {
  const res = await fetch('https://toapis.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TOAPIS_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      size: params.size || '1:1',
      n: 1
    })
  })

  const data = await res.json()
  return data.id
}

// 查询图像任务状态
async function getImageTaskStatus(taskId: string) {
  const res = await fetch(`https://toapis.com/v1/images/generations/${taskId}`, {
    headers: { 'Authorization': `Bearer ${process.env.TOAPIS_KEY}` }
  })
  return res.json()
}
```

### 7.2 视频生成（异步任务）

```typescript
// 提交视频任务 - 返回 task_id
async function submitVideoTask(params: {
  model: 'sora-2' | 'sora-2-pro' | 'veo3.1-fast' | 'veo3.1-quality' | 'kling-2-6'
  prompt: string
  duration?: number
  aspect_ratio?: string
}) {
  const res = await fetch('https://toapis.com/v1/videos/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TOAPIS_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      duration: params.duration || 5,
      aspect_ratio: params.aspect_ratio || '16:9'
    })
  })
  const data = await res.json()
  return data.id  // toapis_task_id
}

// 查询视频任务状态
async function getVideoTaskStatus(taskId: string) {
  const res = await fetch(`https://toapis.com/v1/videos/generations/${taskId}`, {
    headers: { 'Authorization': `Bearer ${process.env.TOAPIS_KEY}` }
  })
  const data = await res.json()
  // status: 'queued' | 'in_progress' | 'completed' | 'failed'
  // result.data[0].url: 完成后的视频 URL（24 小时内有效）
  return data
}
```

### 7.3 脚本生成（流式 SSE）

```typescript
// 流式生成脚本
async function generateScript(params: {
  topic: string
  duration: number
  language: string
  styleTags: string[]
}, onChunk: (text: string) => void) {
  const client = new OpenAI({
    baseURL: 'https://toapis.com/v1',
    apiKey: process.env.TOAPIS_KEY
  })

  const stream = await client.chat.completions.create({
    model: 'claude-sonnet-4-5',
    stream: true,
    messages: [
      {
        role: 'system',
        content: buildScriptSystemPrompt(params)
      },
      {
        role: 'user',
        content: `主题：${params.topic}`
      }
    ]
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) onChunk(text)
  }
}
```

### 7.4 后端轮询任务状态与资产回存

```typescript
// Worker - 轮询图像/视频任务，并在成功后立刻回存到对象存储
generationQueue.process(async (job) => {
  const { taskId, providerTaskId, mediaType } = job.data

  while (true) {
    const status = mediaType === 'image'
      ? await getImageTaskStatus(providerTaskId)
      : await getVideoTaskStatus(providerTaskId)

    if (status.status === 'completed') {
      const sourceUrl = status.result.data[0].url
      const storageUrl = await persistRemoteAsset(sourceUrl)

      await db.generationTasks.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          result_url: sourceUrl,
          storage_url: storageUrl,
          expires_at: new Date(status.expires_at * 1000),
          completed_at: new Date()
        }
      })
      break
    }

    if (status.status === 'failed') {
      await db.generationTasks.update({
        where: { id: taskId },
        data: { status: 'failed', error_message: status.error?.message || 'Generation failed' }
      })
      break
    }

    // 图片更快，视频更慢
    await sleep(mediaType === 'image' ? 3000 : 10000)
  }
})
```

---

## 八、开发计划（用 Cursor 的节奏）

### Sprint 1（第1-2天）：项目脚手架 + 基础页面

- [ ] 初始化 Next.js 项目（App Router + TypeScript）
- [ ] 基础布局与路由
- [ ] 项目列表页（Dashboard）
- [ ] 新建项目表单（Step 1）
- [ ] 数据库建模（Prisma + PostgreSQL）
- [ ] 单用户登录 API

### Sprint 2（第3-4天）：AI 核心流程

- [ ] Step 2：脚本生成（SSE 流式展示）
- [ ] Step 3：分镜生成 + 卡片展示 + 拖拽排序
- [ ] Step 4：提示词生成 + 编辑

### Sprint 3（第5-6天）：生成任务

- [ ] Step 5：模型配置页面
- [ ] 图像生成任务提交 + 轮询
- [ ] 视频生成任务提交 + 轮询
- [ ] Step 6：任务进度看板

### Sprint 4（第7-8天）：审核 & 导出

- [ ] Step 7：结果审核页面
- [ ] 重新生成单个镜头
- [ ] ZIP 导出功能
- [ ] 脚本/分镜表导出

---

## 九、给 Cursor 的初始化指令

在 Cursor 中新建项目后，可以用以下 Prompt 开始：

```
帮我初始化一个 AI 视频创作平台项目。

技术栈：
- 前端：React 18 + TypeScript + Vite + Ant Design 5 + Zustand + React Router 6
- 后端：Node.js + Express + TypeScript + Prisma + MySQL
- API 调用：OpenAI SDK（baseURL 指向 https://toapis.com/v1）

请先创建项目结构，包括：
1. 前端 src/ 目录结构（按照 PRD 中的组件树）
2. 后端 server/ 目录结构
3. Prisma schema（按照 PRD 中的数据库设计）
4. 基础路由配置
5. ToAPIs 客户端封装（支持图像同步生成 + 视频异步任务）

ToAPIs API Key 从环境变量 TOAPIS_KEY 读取
ToAPIs Base URL: https://toapis.com/v1
```

---

*PRD v1.0 | 2026-03-08 | 小龙虾 🦞*

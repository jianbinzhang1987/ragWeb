# RAG Knowledge Hub - 智能知识库问答系统

一个基于 Vue3 的现代化 RAG（检索增强生成）聊天应用，用于与 ragflow-java-backend 进行交互，实现基于知识库的文件上传、解析与智能问答功能。

## ✨ 特性

- 🎨 **现代化设计** - 采用独特的视觉设计，避免千篇一律的 AI 界面
- 💬 **智能对话** - 支持 Markdown 渲染、引用来源展示
- 📁 **文件管理** - 支持拖拽上传、多种文件格式解析
- 🔄 **实时状态** - 文件解析进度、AI 回复加载状态
- 📚 **知识库切换** - 多知识库管理，灵活切换
- 🎯 **类型安全** - 完整的 TypeScript 支持

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 生产构建

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 📦 项目结构

```
rag-chat-web/
├── src/
│   ├── api/                 # API 服务层
│   │   └── index.ts        # API 接口定义
│   ├── components/          # Vue 组件
│   │   ├── AppHeader.vue   # 顶部导航栏
│   │   ├── ChatArea.vue    # 聊天区域
│   │   └── KnowledgePanel.vue  # 知识库管理面板
│   ├── types/              # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/              # 工具函数
│   │   └── format.ts       # 格式化工具
│   ├── App.vue             # 主应用组件
│   ├── main.ts             # 应用入口
│   └── style.css           # 全局样式
├── index.html              # HTML 模板
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目配置
```

## 🎨 设计特色

### 视觉风格
- **字体系统**: 使用 Outfit 作为主字体，JetBrains Mono 作为代码字体
- **配色方案**: 深邃蓝紫渐变主题色 + 多层次灰白背景系统
- **动画效果**: 流畅的消息滑入、按钮悬停、状态过渡动画
- **现代布局**: 卡片化设计、圆角处理、阴影层次

### 交互设计
- 消息实时滚动到底部
- 引用来源可折叠展开
- 文件拖拽上传
- 输入框自适应高度
- 状态实时更新

## 🔧 技术栈

- **框架**: Vue 3.4+ (Composition API)
- **UI 库**: Element Plus 2.5+
- **构建工具**: Vite 5.0+
- **语言**: TypeScript 5.3+
- **HTTP 客户端**: Axios 1.6+
- **Markdown 渲染**: markdown-it 14.0+
- **代码高亮**: highlight.js 11.9+

## 📡 API 集成

应用通过以下接口与后端交互：

### 知识库管理
- `GET /api/knowledge-bases` - 获取知识库列表
- `POST /api/knowledge-bases/{id}/files` - 上传文件
- `GET /api/knowledge-bases/{id}/files` - 获取文件列表

### 文件处理
- `POST /api/files/{id}/parse` - 触发文件解析
- `GET /api/files/{id}/status` - 查询解析状态

### 聊天问答
- `POST /api/chat` - 发送消息并获取 AI 回复

## 🎯 核心功能

### 1. 知识库选择
- 页面加载时自动获取知识库列表
- 支持下拉选择切换知识库
- 切换时提示确认以保护当前会话

### 2. 文件上传
- 支持拖拽上传和点击选择
- 支持多文件同时上传
- 文件格式验证（PDF、DOCX、TXT、MD）
- 文件大小限制（50MB）
- 上传进度反馈

### 3. 文件管理
- 文件列表展示（名称、大小、状态、时间）
- 状态标识：已上传、解析中、已就绪、解析失败
- 手动触发解析
- 解析失败可重新解析
- 实时状态轮询更新

### 4. 智能对话
- 用户消息与 AI 回复区分展示
- Markdown 格式渲染
- 代码语法高亮
- 引用来源展示（可折叠）
- 消息时间戳
- 自动滚动到最新消息

### 5. 输入交互
- 支持 Enter 发送消息
- Shift+Enter 换行
- 输入框自适应高度
- 未选择知识库时禁止发送
- 无可用文件时提示

## 🔐 数据类型

```typescript
// 知识库
interface KnowledgeBase {
  id: string
  name: string
}

// 文件项
interface FileItem {
  id: string
  name: string
  size: number
  status: 'uploaded' | 'parsing' | 'ready' | 'failed'
  uploadTime: string
}

// 消息
interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  sources?: Source[]
}

// 引用来源
interface Source {
  fileName: string
  content: string
  page?: number
  similarity?: number
}
```

## 🎨 自定义样式

项目使用 CSS 变量系统，可轻松自定义主题：

```css
:root {
  --accent-primary: #6366f1;      /* 主题色 */
  --accent-secondary: #8b5cf6;    /* 渐变色 */
  --bg-primary: #fafafa;          /* 主背景 */
  --bg-surface: #ffffff;          /* 卡片背景 */
  --text-primary: #1a1a1a;        /* 主文字 */
  /* ... 更多变量 */
}
```

## 📱 响应式设计

- 桌面端（> 1024px）：完整三栏布局
- 平板端（768px - 1024px）：知识库面板缩窄
- 移动端（< 768px）：垂直堆叠布局

## 🔄 状态管理

应用使用 Vue3 Composition API 的响应式系统进行状态管理：

- `knowledgeBases` - 知识库列表
- `selectedKnowledgeBase` - 当前选中的知识库
- `files` - 文件列表
- `messages` - 聊天消息列表
- `chatLoading` - 聊天加载状态

## 🚧 后端配置

Vite 配置了代理，将 `/api` 请求转发到后端：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true
  }
}
```

## 📝 开发建议

1. **组件化开发** - 保持组件单一职责
2. **类型安全** - 充分利用 TypeScript 类型检查
3. **错误处理** - 使用 try-catch 和 ElMessage 提示
4. **性能优化** - 使用 v-memo、computed 缓存计算结果
5. **代码规范** - 遵循 Vue3 官方风格指南

## 🐛 已知问题

- 解析状态轮询采用简单的 setInterval，生产环境建议使用 WebSocket
- 文件上传未实现断点续传
- 未实现消息持久化存储

## 🔮 未来计划

- [ ] 支持流式响应显示
- [ ] 添加消息编辑和删除功能
- [ ] 实现会话历史管理
- [ ] 支持多轮对话上下文
- [ ] 添加文件预览功能
- [ ] 优化移动端体验
- [ ] 添加暗黑模式切换

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Built with ❤️ using Vue 3 + TypeScript + Element Plus**

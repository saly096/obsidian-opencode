# Obsidian OpenCode Plugin

在 Obsidian 中集成 OpenCode AI 编程助手，支持本地免费模型。

## 功能特点

- 🤖 **AI 对话** - 在 Obsidian 侧边栏与 AI 助手对话
- 🌐 **多模型支持** - 支持 OpenAI、Anthropic、自定义 API
- 🖥️ **本地模型** - 支持使用 OpenCode CLI 的免费模型（minimax-m2.5-free 等）
- 📝 **笔记辅助** - AI 可以帮助你整理、优化笔记
- 💻 **代码辅助** - 编写、调试、优化代码

## 安装

### 方式一：BRAT（推荐）

1. 安装 BRAT 插件
   - 打开 Obsidian 设置 → 社区插件
   - 搜索 "BRAT" 并安装
2. 打开 BRAT 设置
3. 点击 "Add Beta plugin"
4. 输入仓库地址：`https://github.com/saly096/obsidian-opencode`

### 方式二：手动安装

1. 克隆仓库到本地
2. 安装依赖：`npm install`
3. 构建：`npm run build`
4. 将 `main.js`、`manifest.json`、`styles.css` 复制到 `.obsidian/plugins/obsidian-opencode/` 目录

## 配置

### 1. 安装 OpenCode CLI

确保你已经安装了 OpenCode CLI：

```bash
npm install -g opencode
```

### 2. 配置插件

打开插件设置（设置 → 社区插件 → OpenCode AI）：

| 选项 | 说明 | 默认值 |
|------|------|--------|
| API Provider | 选择 AI 提供商 | Local (OpenCode CLI) |
| Model | 使用的模型 | minimax-m2.5-free |
| System Prompt | 系统提示词 | （默认提示词） |
| Max Tokens | 最大生成令牌数 | 4096 |
| Temperature | 创造性参数 | 0.7 |

### 可用免费模型

- `minimax-m2.5-free` （推荐）
- `gpt-5-nano`
- `glm-5-free`
- `kimi-k2.5-free`
- `big-pickle`

### 使用云端 API

如需使用 OpenAI 或 Anthropic：

1. 将 API Provider 改为 "OpenAI" 或 "Anthropic"
2. 输入你的 API Key
3. 选择模型

## 使用方法

### 打开对话面板

- 点击左侧状态栏的 🤖 机器人图标
- 使用命令 `Ctrl+P` → 搜索 "Open OpenCode AI Panel"

### 发送消息

- 在输入框中输入问题
- 按 `Enter` 发送
- AI 会用中文回复

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Enter | 发送消息 |
| Ctrl+Shift+P | 打开命令面板 |

## 项目结构

```
obsidian-opencode/
├── src/
│   ├── main.ts        # 插件主入口
│   ├── panel.ts       # 侧边栏视图
│   ├── settings.ts    # 设置配置
│   ├── skills.ts     # 技能管理
│   ├── mcp.ts        # MCP 协议
│   └── styles.css    # 样式
├── manifest.json      # 插件清单
├── package.json      # 项目配置
├── build.js          # 构建脚本
└── tsconfig.json     # TypeScript 配置
```

## 构建

```bash
npm install
npm run build
```

## 技术栈

- TypeScript
- esbuild
- Obsidian API
- OpenCode CLI

## 许可证

MIT

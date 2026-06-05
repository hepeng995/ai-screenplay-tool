# 变更记录

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- MIT LICENSE 文件
- README 徽章（CI / Vercel / License / Stars）
- YAML 结构化合并算法（替代字符串拼接）
- Toast 通知系统（替代原生 alert）
- 项目管理面板（删除 + 重命名）
- YAML 一键格式化按钮
- 编辑器行号显示
- 响应式布局适配（移动端支持）
- CONTRIBUTING.md 贡献指南

### Fixed
- YamlPreview 类型定义与 Zod Schema 对齐
- 移除 `min-w-[1024px]` 硬编码，支持小屏设备

### Changed
- CI 移除 `continue-on-error`，真正阻断失败构建
- CI 添加 `npm run build` 步骤

### Tests
- API Route 单元测试（17 个测试覆盖 3 个路由）
- React 组件测试（20 个测试覆盖 FileUploader / YamlEditor / YamlPreview）
- 完整转换流程 E2E 测试（首页→上传→转换→编辑器）

## [0.1.0] - 2026-06-05

### Added
- Next.js 14 项目初始化（App Router + Edge Runtime）
- YAML Schema 定义（Zod + JSON Schema 双重校验）
- 文件上传组件（支持 .txt/.md，拖拽上传，10MB 限制）
- 智能章节切分（中英文识别，≥3 章自动检测）
- AI 转换引擎（mimo-v2.5，Edge Runtime，3 并发限制）
- YAML 编辑器（实时校验 + 自动保存 + Ctrl+S）
- YAML 预览面板（树形结构 + 统计信息）
- 七牛云对象存储集成（Token 鉴权 + 客户端直传）
- YAML / JSON 多格式导出
- 项目索引管理（localStorage 持久化）
- 首页导航 + 特性展示
- Header / Footer 布局组件
- Vitest 单元测试框架（54 个测试）
- Playwright E2E 测试框架（5 个测试）
- ESLint + TypeScript 严格类型检查
- GitHub Actions CI 流水线
- Vercel 部署配置
- 项目文档（12 篇，含架构、API、Schema、部署等）

### 技术栈
- Next.js 14.2 + React 18 + TypeScript 5
- Tailwind CSS 3.4 + Lucide React
- js-yaml 4.1 + Zod 3.23
- Vitest 2.1 + Playwright 1.48

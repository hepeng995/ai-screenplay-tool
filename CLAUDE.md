# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI 辅助剧本创作工具——将小说章节文本自动转换为结构化剧本（YAML 格式），为作者提供可编辑的剧本初稿。

**竞赛要求（七牛云）：**
- 需处理 3 个章节以上的小说文本，输出结构化 YAML 剧本
- 需额外提供剧本 YAML Schema 定义文档及设计说明
- 评分：40% 完整度与创新性 / 40% 开发过程与质量 / 20% 演示与表达
- 代码需托管于 GitHub/Gitee，保持持续 commit 记录，禁止突击提交
- PR 规范：一个 PR 只做一件事，需包含标题、功能描述、实现思路、测试方式

## Tech Stack

**尚未选定**——项目处于初始规划阶段，技术栈待定。

## Project Structure

```
作业要求.md            # 竞赛题目与提交规范
.spec-workflow/        # Spec-driven 开发流程模板（spec/steering/approvals 目录待填充）
```

## Development Conventions

- 语言：中文交流，代码注释使用中文
- 持续小粒度提交，避免一次性大规模提交
- 每个 PR 合并后主分支需保持可运行状态
- 如使用第三方库或框架，必须在 README 中列明依赖并说明原创部分

# Git Commit 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范，所有 commit message 必须符合以下格式。

## 格式

```
<type>(<scope>): <subject>

[可选正文]

[可选脚注]
```

## Type 列表

| Type       | 含义                           |
|------------|-------------------------------|
| `feat`     | 新功能                         |
| `fix`      | Bug 修复                      |
| `docs`     | 文档变更                       |
| `style`    | 代码格式（不影响功能）          |
| `refactor` | 重构（非 feat 非 fix）         |
| `test`     | 新增或修改测试                  |
| `chore`    | 构建、依赖、脚手架等杂务        |
| `ci`       | CI 配置变更                    |
| `perf`     | 性能优化                       |

## Scope 建议

按模块划分：`init` / `layout` / `schema` / `upload` / `convert` / `editor` / `qiniu` / `deploy` / `test`

## 示例

```
feat(upload): 支持多文件拖拽上传
fix(convert): 修复 YAML 输出包含非法字符的问题
docs(schema): 补充剧本结构设计说明
chore(init): 初始化项目脚手架与依赖
ci(github): 添加 GitHub Actions CI 工作流
```

## PR 与 Commit 的关系

- 一个 PR 只做一件事
- 同一个 PR 的所有 commit 必须属于**同一主题**
- PR 合并时使用 `Squash and Merge` 保持主分支历史整洁
- 每个 commit 在 push 前都应能独立通过 lint 与单元测试
- PR 合并后主分支必须保持可运行状态

## 常见错误

- ❌ `update` / `fix bug` / `wip` 等模糊描述
- ❌ description 超过 72 字符
- ❌ 一个 commit 同时改动多个无关模块
- ❌ PR 直接 push 到 master 而非走 PR 流程

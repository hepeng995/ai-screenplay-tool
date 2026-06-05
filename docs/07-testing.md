# 测试策略文档

## 测试金字塔

```
         /\
        /E2E\        ← Playwright (5 scenarios)
       /------\
      /Integ. \      ← Mock 集成测试 (10 tests)
     /----------\
    /   Unit     \   ← Vitest (39 tests)
   /--------------\
```

## 测试覆盖

### 单元测试 (Vitest) — 39 tests / 5 files

| 文件 | 测试数 | 覆盖模块 |
|------|--------|---------|
| yaml-validator.test.ts | 8 | Zod Schema 校验器 |
| chapter-splitter.test.ts | 9 | 中英文章节切分算法 |
| storage.test.ts | 10 | localStorage CRUD |
| mimo.test.ts | 5 | AI 转换 + YAML 提取 |
| prompt.test.ts | 7 | Prompt 构建 + 截断 |

### 集成测试 (Vitest + Mock) — 10 tests / 1 file

| 文件 | 测试数 | 覆盖模块 |
|------|--------|---------|
| qiniu.test.ts | 10 | 七牛云 Token 生成 + 上传/下载 |

覆盖场景：
- Token 格式验证 + 过期时间
- 环境变量缺失错误处理
- 上传成功/失败/网络错误
- 下载成功/HTTP 404/空 key
- 安全隔离（SK 不泄露到客户端）

### E2E 测试 (Playwright) — 5 scenarios / 3 files

| 文件 | 场景数 | 覆盖流程 |
|------|--------|---------|
| home.spec.ts | 3 | 首页渲染、导航、功能展示 |
| upload-flow.spec.ts | 3 | 拖拽区、文件验证、TXT 上传 |
| editor.spec.ts | 3 | 编辑器渲染、导出按钮、云端按钮 |

## 运行测试

```bash
# 全部单元 + 集成测试
npx vitest run

# 带覆盖率
npx vitest run --coverage

# E2E 测试（需先安装浏览器）
npx playwright install chromium
npx playwright test

# 单个文件测试
npx vitest run src/lib/qiniu/__tests__/qiniu.test.ts
```

## 总计

- **测试文件**: 9 个 (6 unit/integration + 3 E2E)
- **测试用例**: 54 个 (39 unit + 10 integration + 5 E2E)
- **全部通过**: ✅

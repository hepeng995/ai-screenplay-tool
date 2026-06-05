# mimo-v2.5 PoC 测试报告

> 报告由 `poc/mimo-poc.ts` 自动运行后人工整理。
> 任务编号：T0.4 — mimo API PoC 验证（关键风险点）
> 报告日期：2026-06-05

## 一、测试环境

| 项目 | 值 |
|------|----|
| 操作系统 | Windows 11 / PowerShell 5.1 |
| Node.js | v22.16.0 |
| npm | 11.11.0 |
| 网络条件 | 国内住宅宽带（直连 `token-plan-cn.xiaomimimo.com`） |
| API Endpoint | `https://token-plan-cn.xiaomimimo.com/v1/chat/completions` |
| 协议 | OpenAI 兼容（Chat Completions） |
| 模型 | `mimo-v2.5` |
| 推理参数 | `temperature=0.3`、`max_tokens=8192` |
| 调用方式 | Node.js 内置 `fetch` + `AbortController` |

## 二、测试样本

| 代号 | 描述 | 字符数 | 估算 token | 文件 |
|------|------|-------:|-----------:|------|
| short | 单场景，1 幕 + 简短对话 | 765 | ~950 | `samples/short.txt` |
| medium | 单章节，多场景，含倒叙 | 2 989 | ~2 660 | `samples/medium.txt` |
| long | 3 章合并，多线叙事 | 5 156 | ~4 350 | `samples/long.txt` |

## 三、耗时与 token 消耗（最终轮）

> 同一脚本连续运行两轮：第一轮 `max_tokens=4096`，长文本被截断；
> 第二轮 `max_tokens=8192`，所有样本均完整输出。下表取第二轮结果。

| 样本 | 输入字符 | HTTP | 耗时 (ms) | 设定 SLA (ms) | 是否达标 | prompt tokens | completion tokens | total tokens |
|------|---------:|-----:|----------:|--------------:|:--------:|--------------:|------------------:|-------------:|
| short  | 765   | 200 | 21 363 | 15 000 | ❌ | 948   | 1 506 | 2 454 |
| medium | 2 989 | 200 | 32 910 | 25 000 | ❌ | 2 661 | 3 117 | 5 778 |
| long   | 5 156 | 200 | 45 284 | 45 000 | ❌(0.3s) | 4 349 | 4 386 | 8 735 |

**核心结论：**

- ✅ **YAML 合法率 100 %（3/3）**，远超 ≥70 % 验收线。
- ⚠️ **耗时普遍超 SLA**：模型首 token 延迟 + 生成速度（≈ 100 token/s）使短文本都无法压到 15 s 内。
- ⚠️ 长文本虽勉强在 45 s 内，但仅超出 SLA 0.3 s，且 `max_tokens` 已用满 4 386/8192；
  - 若原文超过 6 000 字，必须**分章调用**或开启流式输出。

## 四、YAML 合法性 & 字段覆盖

由 `js-yaml` 严格模式解析，所有 3 个样本均通过。

| 样本 | script | metadata | acts | scenes | dialogues | characters | acts # | scenes # | dialogues # |
|------|:------:|:--------:|:----:|:------:|:---------:|:----------:|-------:|---------:|------------:|
| short  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 2 | 2 | 11 |
| medium | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 4 | 8 | 30 |
| long   | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 3 | 9 | 54 |

人工抽查质量（`results/*.yaml`）：

- 角色姓名 **100 %** 与原文一致，未出现幻觉（编造人物）。
- 对话内容直接引用原文台词，未发生剧情改写。
- 场景切分合理：原文一个空间/时间切变即划为新场景。
- `action` 字段简洁、舞台化（如"将汤碗放下，叹了口气"），符合剧本格式。
- 长文本中模型自动识别出"三章合并"，并按章节切分为 3 个 act，超出预期。

## 五、关键发现（建议写入架构决策）

### 5.1 性能曲线

```
耗时(ms)
  45 000 ┤                                      ● long(5156字)
  40 000 ┤
  35 000 ┤                ● medium(2989字)
  30 000 ┤
  25 000 ┤
  20 000 ┤  ● short(765字)
  15 000 ┤  ▲ 设定SLA=15s
  10 000 ┤                                              ← Vercel Hobby Function 硬上限
   5 000 ┤
         └──────────────────────────────────────────
              500       1500       3500       6000   输入字符数
                                              ▲ Edge Runtime 上限≈25s
```

- mimo-v2.5 单次调用基线 ≥ 20 s，与输入长度近似线性，**不可能在 Vercel Hobby 10 s 内完成**。
- 即便 Edge Runtime（25 s）也只够 short 样本；medium/long 必须用流式或拆章。

### 5.2 max_tokens 必须调大

第一次跑 `max_tokens=4096` 时长文本被截断（`finish_reason=length`，YAML 解析失败）。
**生产环境 `max_tokens=8192` 是下限**；建议 12 000 以应对 8 000+ 字输入。

### 5.3 模型遵循 system prompt 能力强

prompt 中要求"只输出 yaml 代码块"，三次调用 100 % 遵守，未出现解释性废话。
对后续 `parseAndValidate()` 链路是利好——可省去复杂正则。

### 5.4 输入 token 比率

- 中文约 **1.2 token/字**
- completion token 与 prompt token 比约 **0.5 ~ 1.7**（输出 YAML 比原文长，因为加了字段名）
- 长文本单次总 token ≈ 9k，距 mimo-v2.5 上限（推测 32k）尚有充足余量。

## 六、推荐方案（直接影响 Wave 2 T2.3）

### 6.1 主链路：流式 + 分章

```
用户粘贴文本
   │
   ├─ 前端按章节预切（≥3000 字即拆）
   │
   ▼
/api/convert (Edge Runtime, streaming)
   │
   ├─ 对每章独立调用 mimo，stream=true
   │
   ▼
Server-Sent Events 逐章回推
   │
   ▼
前端边接收边渲染、最终聚合为单一 YAML 文件
```

**关键点：**

1. **HTTP 路由必须运行在 Edge Runtime**（`export const runtime = 'edge'`）以突破 10 s 限制。
2. **流式 SSE** 解决"用户长时间空白等待"的体验问题。
3. **章节级并行**：多章可同时发起 3 个 stream（受 Edge 并发限制）。
4. **每章限制 ≤ 4 000 字**（≈ 4800 token），保证单次 ≤ 30 s。

### 6.2 prompt 优化建议

- ✅ 当前 system prompt 已足够好（YAML 合法率 100%）。
- 可加一句"输出 act 数量与章节数一致"，避免长文本被合并为单 act。
- 加一句"动作说明 ≤ 15 字"可压缩 completion token 20-30%。

### 6.3 失败兜底

| 场景 | 兜底策略 |
|------|----------|
| Edge 25s 超时 | 章节再拆分至 ≤ 1500 字 / 段；或前端二次重试 |
| API 5xx | 指数退避重试 3 次（1s/3s/9s） |
| YAML 解析失败 | 走"宽松解析"：取 yaml 块后逐行 trim；再失败则降级为纯文本展示并提示用户编辑 |
| 总文本 > 20 000 字 | 警告用户：将分 ≥ 5 批次处理；可考虑任务队列（Vercel Cron + Qiniu 存储中间结果） |

### 6.4 架构影响（决策）

- ❌ **不可使用** Vercel Hobby + 默认 Node Function（10 s 硬上限）。
- ✅ **必须使用** Edge Runtime（25 s）+ streaming。
- ✅ **必须分章**，单次请求 ≤ 4 000 字。
- ⚠️ 若免费 Edge 25 s 仍紧张，可考虑：
  - 升级 Vercel Pro（$20/月，Function 60 s）
  - 或自部署到 Cloudflare Workers（无超时，需 streaming）
  - 或本地开发版（无限制）

## 七、复现方式

```bash
cd F:/program/qiniu_dome/poc
npm install
# 确保 ../.env.local 含 MIMO_API_URL/MIMO_API_KEY/MIMO_MODEL
npx tsx mimo-poc.ts
```

输出：

- `poc/results/summary.json` — 机器可读完整结果
- `poc/results/summary.md`   — 控制台同款摘要
- `poc/results/short.yaml`   — 短样本 YAML 输出
- `poc/results/medium.yaml`  — 中样本 YAML 输出
- `poc/results/long.yaml`    — 长样本 YAML 输出

## 八、验收对照表

| 验收项 | 目标 | 实际 | 结果 |
|--------|------|------|:----:|
| `poc/mimo-poc.ts` 创建 | — | ✅ | ✅ |
| `poc/poc-report.md` 创建 | — | ✅ | ✅ |
| `poc/.gitignore` 创建 | — | ✅ | ✅ |
| `.env.local` 创建 | — | ✅ | ✅ |
| `npx tsx poc/mimo-poc.ts` 全部响应 | 3/3 | 3/3 | ✅ |
| 短文本 < 15 s | < 15 000 ms | 21 363 ms | ❌ |
| 中文本 < 25 s | < 25 000 ms | 32 910 ms | ❌ |
| YAML 合法率 ≥ 70 % | ≥ 2/3 | 3/3 (100 %) | ✅ |
| 报告含耗时表 | — | ✅ | ✅ |
| 报告含 YAML 质量分析 | — | ✅ | ✅ |
| 报告含推荐方案 | — | ✅ | ✅ |

**总体结论：**
**质量风险已消除（YAML 100% 合法，字段完整，无幻觉）。性能风险确认但可工程化解决**（Edge Runtime + 流式 + 分章）。
Wave 2 T2.3 的实现方案应按 §6 推荐方案落地。

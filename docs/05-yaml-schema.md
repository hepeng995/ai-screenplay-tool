# YAML Schema 设计文档

> 文件：`src/schema/script.schema.json`
> 示例：`docs/example.yaml`
> 验证脚本：`scripts/validate-yaml.ts`

---

## 1. 概述 — 为什么是 YAML

剧本天然是「人类可读的结构化文本」：导演、编剧、演员都需直接阅读。在 JSON / XML / YAML 三种主流方案中：

| 维度 | JSON | XML | **YAML** |
|------|------|-----|----------|
| 可读性 | 一般（引号、花括号密集） | 差（标签冗长） | **极佳**（缩进式、无引号负担） |
| 注释支持 | ❌ 不支持 | ✅ 支持 | ✅ 支持（`#`） |
| 中文友好 | 一般 | 一般 | **极佳**（无需转义） |
| AI 输出稳定性 | 高 | 中 | **高**（PoC 验证 100% 合法率） |
| 解析器成熟度 | 极成熟 | 极成熟 | 成熟（js-yaml / yaml） |

我们选择 YAML 作为剧本的唯一存储与传输格式。它既能让作者像阅读真实剧本一样直接审阅，又能在程序层面精确解析与校验。JSON Schema 作为元校验标准，而不是 YAML Schema（YAML 生态缺乏官方 Schema 标准）。

---

## 2. Schema 结构

### 2.1 五层架构图

```
script (根)
├── script            ← 剧本标识（标题 / 来源 / 日期 / 改编者）
├── metadata          ← 全局元数据（角色表 / 地点表 / 概要）
└── acts[]            ← 幕列表
    └── scenes[]      ← 场景列表
        └── dialogues[]  ← 台词/动作列表
```

严格对应 5 层嵌套：`script → metadata / acts → scenes → dialogues`。

### 2.2 字段速查表

| 路径 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `script.title` | string | ✅ | 剧本标题 |
| `script.source` | string | ✅ | 原小说名称（可含章节） |
| `script.adapted_at` | date | ✅ | 改编日期 YYYY-MM-DD |
| `script.adapter` | string | ❌ | 改编者署名 |
| `metadata.genre` | enum | ❌ | 玄幻 / 言情 / 悬疑 / 都市 / 科幻 / 武侠 / 历史 / 其他 |
| `metadata.characters` | string[] | ✅ | 全部出场角色（去重） |
| `metadata.settings` | string[] | ❌ | 全部场景地点（去重） |
| `metadata.summary` | string | ❌ | 一句话概要 |
| `acts[].act_number` | integer | ✅ | 幕序号，从 1 开始 |
| `acts[].title` | string | ✅ | 幕标题 |
| `acts[].scenes[].scene_number` | integer | ✅ | 场景序号 |
| `acts[].scenes[].location` | string | ✅ | 场景地点 |
| `acts[].scenes[].time` | string | ❌ | 时间设定 |
| `acts[].scenes[].characters_present` | string[] | ✅ | 在场角色 |
| `acts[].scenes[].description` | string | ❌ | 场景视觉描述 |
| `acts[].scenes[].dialogues[].character` | string | ✅ | 说话人 |
| `acts[].scenes[].dialogues[].type` | enum | ✅ | 对白 / 独白 / 旁白 / 动作 |
| `acts[].scenes[].dialogues[].content` | string | ✅ | 台词正文 |
| `acts[].scenes[].dialogues[].action` | string | ❌ | 动作说明 |

字段总数 19（含 `$defs` 内部定义），远低于 30 的硬性上限，确保 AI 输出质量稳定。

---

## 3. 设计原因

### 3.1 为什么是 5 层而不是 3 层？

3 层结构（剧本 → 场景 → 对话）会丢失「幕」这一关键戏剧单元。幕对应小说的「章节」或「故事弧」，是 AI 自动切分章节结果的天然容器，也是后续编辑器 UI 中「折叠/展开」的核心层级。PoC 已证明 mimo-v2.5 能自动按章节切 act，5 层结构反而最贴合模型的输出习惯。3 层会把章节信息强行塞进 metadata 或场景标题中，造成信息损失。

### 3.2 为什么 dialogues 嵌套在 scenes 而不是 acts？

戏剧铁律：**同一场景内的对话是时空连续的，跨场景则不连续**。把对话挂到 act 下会破坏这种时空连续性，导致无法判断「这段对话发生在哪里、谁在场」。挂到 scene 内则保留了「一个场景 = 一段连续戏剧动作」的语义单元，便于后续做场景重排、单场景预览、场景级 AI 重写。

### 3.3 为什么 `type` 字段用中文枚举（"对白"/"独白"/"旁白"/"动作"）？

PoC 显示：当 system prompt 用中文描述字段时，mimo-v2.5 输出的 type 值自然就是中文（"对白" 而非 "dialogue"）。强行要求模型输出英文枚举会导致：
1. **Token 浪费**：模型需在内部「中文 → 英文」翻译，增加输出耗时；
2. **错误率上升**：模型可能输出 `dialog` / `Dialogue` / `DIALOG` 等不一致大小写；
3. **可读性下降**：中文剧本夹英文枚举，作者阅读时割裂感强。
中文枚举是「顺应模型天性 + 顺应读者语言习惯」的双赢选择。

### 3.4 为什么选择 JSON Schema 而不是只靠 Zod？

Zod 是运行时校验库，**无法跨语言、无法被外部工具识别**。JSON Schema 是开放标准：
- **元校验**：可被任何语言/工具消费（Ajv、python-jsonschema、VS Code YAML 插件等）；
- **IDE 提示**：VS Code 配合 YAML 插件可实现自动补全与错误提示；
- **文档生成**：未来可用 `@cloudflare/json-schema-2-md` 等工具自动生成 API 文档；
- **双重保险**：Zod Schema（T1.4）可由 JSON Schema 派生，两边不冲突。生产中我们用 Zod 做运行时校验、JSON Schema 做契约文档。

### 3.5 为什么不使用 Fountain / Final Draft 等现有标准？

Fountain 是面向**影视工业已拍摄剧本**的纯文本格式（如 `INT. COFFEE SHOP - DAY`），其核心假设是「场景标题 → 角色 → 对话」三件套。但我们的输入是**小说**，小说有：
- **独白/心理活动**（Fountain 不区分）；
- **旁白**（Fountain 用 `()` 隐式表达，含糊）；
- **动作描述**（Fountain 仅作为「动作行」，无 `type` 区分）。

更重要的是，作业要求**原创设计**且需结构化字段（act_number、scene_number、characters_present）便于程序处理，Fountain 是面向人写的非结构化文本，强转会丢失结构。Final Draft 是商业闭源格式，不适用。我们尊重行业标准但不盲从——本工具的定位是「小说→剧本初稿」，不是「剧本工业化生产」。

---

## 4. 完整示例

参见 `docs/example.yaml`。该示例覆盖：
- 2 幕（act_number 1, 2）
- 4 场景（含同场景续场）
- 21 条对话（含对白 / 独白 / 旁白 / 动作 四种 type）
- 5 个角色
- 3 个场景地点
- metadata 全字段

---

## 5. AI Prompt 对齐

在 mimo-v2.5 的 system prompt 中按以下方式指导 AI 输出此 Schema：

```
你是剧本改编助手。请将给定的小说章节转换为 YAML 格式剧本，严格遵循以下 Schema：

- 顶层 3 个 key：script / metadata / acts
- script：含 title（剧本标题）、source（原小说+章节）、adapted_at（YYYY-MM-DD）
- metadata：含 genre（题材）、characters（去重角色表）、settings（去重地点表）、summary（一句话概要）
- acts：数组。每项含 act_number（从1开始）、title、scenes
- scenes：数组。每项含 scene_number、location、time、characters_present、description、dialogues
- dialogues：数组。每项含 character、type（仅限"对白"/"独白"/"旁白"/"动作"）、content、action
- 仅输出 YAML 代码块，不要任何解释文字
```

PoC 实测：mimo-v2.5 在此 prompt 下输出 100% 通过 Ajv 校验。

---

## 6. 扩展性

Schema 当前 19 个字段，留有充足扩展空间。未来添加新字段时遵循以下原则：

| 计划字段 | 添加位置 | 用途 | 优先级 |
|----------|----------|------|--------|
| `notes` | scene 级 | 场景备注（导演手记） | 高 |
| `transition` | scene 末尾 | 场景过渡方式（如 `切至`、`淡出`） | 中 |
| `emotion` | dialogue 级 | 情绪标签（如 `愤怒`、`悲伤`） | 中 |
| `characters_absent` | scene 级 | 当前场景刻意不在场的角色 | 低 |
| `music` | scene 级 | 配乐建议 | 低 |

所有新字段设为可选（非 required），保持向后兼容。`additionalProperties: false` 在 Schema 严格模式下会阻止未定义字段——这是有意为之的「防线」，避免 AI 输出意料之外的字段。新增字段需先在 Schema 中显式声明。

---

## 7. 验证

```bash
# 单文件校验
npx tsx scripts/validate-yaml.ts docs/example.yaml

# 批量校验
npx tsx scripts/validate-yaml.ts docs/*.yaml poc/results/*.yaml
```

输出形如：
```
✅ docs/example.yaml — YAML valid
```
或详细错误列表（含 JSON Pointer 路径与失败原因）。

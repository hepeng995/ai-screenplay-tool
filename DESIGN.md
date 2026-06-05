---
name: AI 剧本工坊
description: 将小说文本自动转换为结构化 YAML 剧本的 AI 辅助创作工具
colors:
  artisan-teal: "#0d9488"
  artisan-teal-hover: "#0f766e"
  artisan-teal-light: "#14b8a6"
  artisan-teal-glow: "#2dd4bf"
  artisan-teal-tint: "#f0fdfa"
  graphite-text: "#09090b"
  graphite-body: "#3f3f46"
  graphite-muted: "#71717a"
  graphite-subtle: "#a1a1aa"
  graphite-border: "#e4e4e7"
  graphite-surface: "#ffffff"
  graphite-floor: "#fafafa"
  graphite-deep: "#18181b"
  graphite-abyss: "#09090b"
  semantic-success: "#059669"
  semantic-danger: "#dc2626"
  semantic-info: "#0284c7"
  semantic-warning: "#f59e0b"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, system-ui, -apple-system, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0em"
  mono:
    fontFamily: "Menlo, Monaco, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
rounded:
  sm: "8px"
  md: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.artisan-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.artisan-teal-hover}"
  button-outline:
    backgroundColor: "{colors.graphite-surface}"
    textColor: "{colors.graphite-body}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-body}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.graphite-surface}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.md}"
    padding: "24px"
  input:
    backgroundColor: "{colors.graphite-surface}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: AI 剧本工坊

## 1. Overview

**Creative North Star: "沉静工坊"**

这间工坊的光线是均匀的，工具已经就位，不需要到处找。用户走进来，看到清晰的流程走廊：上传、切分、转换、编辑。每一步都知道自己在哪里、要去哪里。没有花哨的装饰争夺注意力，没有多余的动画打断思路。文本内容本身就是焦点，界面只是承载它的容器。

整体气质克制而温润。色彩以青色为唯一的情绪锚点，其余交给石墨灰调系统。留白慷慨，间距规律。动效只做一件事：让用户感知到系统在响应。Apple 式的极简不是空洞，而是每个元素都恰好够用，没有多余的一笔。

**Key Characteristics:**
- 单一强调色（匠心青）贯穿全局，占比不超过 10%，以克制换高级感
- 石墨灰调（zinc）构建全部中性层次，从背景到文字到边框，层级清晰不暧昧
- 8px / 12px 两档圆角：交互元素 8px，容器卡片 12px，绝不过度圆润
- 留白即节奏：section 间距 48px，卡片内边距 24px，控件间距 8-16px
- 动效仅服务于反馈（状态切换、进度、保存确认），不做装饰性表演

## 2. Colors

色板以一个沉静的青色锚点和一套完整的石墨灰调构成。青色是唯一的情绪色，用在按钮、激活态、链接和关键提示上。灰色系统覆盖从最深文字到最浅背景的所有中性场景。

**The 一色原则.** 匠心青在任何屏幕上占比不超过 10%。它的稀有就是它的力量。如果一块屏幕上超过三分之一的像素是青色，说明设计走偏了。

### Primary

- **匠心青** (`#0d9488`): 按钮默认态、激活态指示器、链接色。这是全局唯一的行为引导色。用户需要点击或注意的关键元素使用此色。暗色模式下提升至 `#2dd4bf`（匠心青辉）以保证对比度。
- **匠心青深** (`#0f766e`): 按钮悬停态、按压态。比默认色暗一级，传达"正在按下"的物理感。
- **匠心青辉** (`#2dd4bf`): 暗色模式下的主色替代。在深色背景上保持可读性和活力。
- **匠心青晕** (`#f0fdfa`): 极浅的青色底色，用于拖拽区激活态、选中行的微弱高亮。像一层薄薄的雾，不是填色。

### Neutral

- **石墨墨** (`#09090b`): 最深文字色（h1、主标题）、暗色模式背景。接近纯黑但不死黑。
- **石墨文** (`#3f3f46`): 正文辅助文字色（zinc-700）。在浅背景上用于次要标题和图标。
- **石墨灰** (`#71717a`): 正文描述文字（zinc-500）。卡片说明、副标题、面包屑。这是出现频率最高的文字色。
- **石墨淡** (`#a1a1aa`): 极弱文字（zinc-400）。时间戳、字数提示、占位符文字的辅助信息。
- **石墨线** (`#e4e4e7`): 边框默认态（zinc-200）。卡片的呼吸边界，不是围栏。
- **石墨面** (`#ffffff`): 卡片和容器背景。纯白但不是空白的白，有边框和阴影定义它的边界。
- **石墨底** (`#fafafa`): 页面底色（zinc-50）。比纯白暖一个色阶，给整个页面铺一层安静的底。
- **石墨深** (`#18181b`): 暗色模式卡片/容器背景（zinc-900）。
- **石墨渊** (`#09090b`): 暗色模式页面背景（zinc-950）。

### Semantic

- **成功绿** (`#059669`): 转换成功、保存确认、完成状态。
- **危险红** (`#dc2626`): 删除操作、错误提示、失败状态。仅用于需要用户立即注意的场景。
- **信息蓝** (`#0284c7`): 提示信息、断点续传说明、中性通知。
- **警戒琥珀** (`#f59e0b`): 跳过状态、容量警告、需要注意但非错误的情况。

## 3. Typography

**Display Font:** Inter (system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC 回退)
**Body Font:** Inter（与 Display 共用，通过 weight 和 size 区分层级）
**Mono Font:** Menlo, Monaco, Consolas（编辑器代码区域、快捷键标签）

**Character:** Inter 是一把通用但精密的工具，配合 PingFang SC 和微软雅黑的中文回退，在中文排版中保持舒适的阅读节奏。不加花哨的字体，是因为工具的身份不需要装饰性排版，权重对比和尺寸落差已经足够建立层级。

### Hierarchy

- **Display** (700, `clamp(2.25rem, 5vw, 3.75rem)`, 1.1, -0.02em tracking): 仅用于首页 Hero 大标题。一个页面最多出现一次。最大值 60px，绝不超标。
- **Headline** (700, `1.875rem`, 1.25): 二级页面主标题（转换页、编辑器页的 h1）。配合面包屑导航使用。
- **Title** (600, `1.125rem` - `1.25rem`, 1.4): 卡片标题（CardTitle）、区块标题。页面中的结构性标题。
- **Body** (400, `0.875rem` - `1rem`, 1.625): 正文、描述文字、卡片说明（CardDescription）。Hero 区描述可用 `1rem` 或 `1.125rem`。行宽控制在 65-75ch。
- **Label** (500, `0.75rem`, 1.5): 状态标签、时间戳、辅助说明。偶尔使用大写 tracking-wider，但仅限于短标签（≤4 字），绝不在句子中使用全大写。
- **Mono** (400, `0.8125rem` - `0.875rem`, 1.6): YAML 编辑器、快捷键标签。代码区域独占。

**The 一家多面原则.** 全站使用 Inter 一个字体家族，通过 weight（400/500/600/700）和 size（12px-60px）的对比建立层级。不引入第二个 sans-serif 家族，因为两个相似但不相同的无衬线体比一个字体更乱。

## 4. Elevation

本系统采用 **平坦优先、状态触发** 的阴影策略。静止状态下几乎没有可感知的阴影（`shadow-sm` 是 0 1px 2px 的极薄阴影，仅用于定义卡片边界）。阴影在悬停时微微加深，告诉用户"这个元素可以交互了"。

不使用 tonal layering（色调分层），因为石墨灰调本身已经足够建立背景与容器的层级关系。纯白卡片在 `#fafafa` 底色上自然浮起，不需要额外的阴影来证明自己的存在。

### Shadow Vocabulary

- **呼吸** (`0 1px 2px 0 rgba(0,0,0,0.05)`): 卡片默认态。极薄，定义边界但不抢占注意力。
- **悬停** (`0 4px 6px -1px rgba(0,0,0,0.07)`): 卡片、按钮悬停态。在呼吸的基础上稍微扩展，传达交互可及性。
- **浮起** (`0 10px 15px -3px rgba(0,0,0,0.08)`): 弹窗、下拉菜单。有明显的浮动感，但不夸张。
- **强调** (`0 4px 24px rgba(0,0,0,0.12)`): Toast 通知。需要在页面上方清晰可辨。

**The 平坦默认原则.** 静止态没有阴影。阴影是对交互状态的响应（hover、elevation、focus），不是装饰。如果一张卡片在没有任何交互时就带着明显的投影，那它太急了。

## 5. Components

### Buttons

**Shape:** 圆润但不圆滑 (8px radius)。高度 40px (default)、32px (sm)、48px (lg)。字体 weight 500。

- **Primary**: 匠心青底色 (`#0d9488`)，白色文字。悬停时加深至 `#0f766e`，按下时微缩 (`scale(0.98)`)，像按下一个做工精良的物理按键。暗色模式下底色提升至 `#2dd4bf`。
- **Outline**: 白底 + 石墨线边框 (`#e4e4e7`) + 石墨文文字。悬停时底色微灰 (`#fafafa`)。用于次要操作（导出、格式化）。
- **Ghost**: 透明底 + 石墨文文字。悬停时底色微灰 (`#f4f4f5`)。用于工具栏按钮、列表操作。
- **Destructive**: 危险红底色 (`#dc2626`)，白色文字。仅用于删除确认弹窗中的确认按钮。
- **Focus**: 所有按钮的 focus 态使用 2px 匠心青辉 ring + 2px offset。键盘用户永远不会迷路。

### Cards / Containers

- **Corner Style:** 12px (rounded-xl)，比按钮圆润一级但不过分。
- **Background:** 石墨面 (`#ffffff`)，暗色模式石墨深 (`#18181b`)。
- **Border:** 石墨线 (`#e4e4e7`)，1px solid。暗色模式 `#27272a`。
- **Shadow:** 呼吸级（默认），悬停时升级至悬停级。悬停同时边框色向匠心青偏移。
- **Internal Padding:** 24px (CardHeader/CardContent)。Header 与 Content 之间有 6px 的 space-y 间距。

### Inputs / Fields

- **Style:** 1px 石墨线边框，白底，8px 圆角。字号 `0.875rem`。
- **Focus:** 边框色过渡到匠心青辉，外加 1px 匠心青辉 ring。过渡时长 200ms。
- **Textarea:** 同 input 风格，支持 resize-y，最小高度 192px (h-48)。

### Navigation (Header)

- **Style:** 64px 高度，sticky 定位。底部 1px 石墨线边框。背景 `rgba(255,255,255,0.8)` + `backdrop-blur(12px)`，像一层半透明的磨砂玻璃。
- **Logo:** 32×32 匠心青圆角方块 + 白色笔形图标。右侧品牌文字。
- **Nav Items**: 圆角药片状（8px），内含图标+文字。激活态：匠心青文字 + 底部 2px 匠心青指示线。非激活态：石墨灰文字。
- **Mobile**: 汉堡菜单展开后为全宽下拉面板，列表项带 8px 圆角和 hover 底色。

### Toast Notifications

- **Position:** 固定在视口右上角，距边缘 16px。最多堆叠 5 条。
- **Style:** 圆角 (8px)，1px 边框 + `shadow-md`。左侧语义色图标，右侧关闭按钮。
- **Variants**: 成功绿底/边框、危险红底/边框、信息蓝底/边框。背景均为对应色的极浅 tint。
- **Auto-dismiss**: 默认 3 秒，可手动关闭。

### Dialog (Confirmation)

- **Overlay:** 全屏 `rgba(9,9,11,0.5)` + `backdrop-blur(4px)`。
- **Card:** 居中，12px 圆角，白色底，`shadow-lg`。最大宽度 448px。
- **Footer:** 底部分隔线，取消按钮（outline 风格）在左，确认按钮（primary 或 destructive）在右。
- **Keyboard:** ESC 关闭，点击遮罩关闭。

### Signature Component: Drag-Drop Upload Zone

- **Default:** 2px 石墨线虚线边框 (`dashed`)，12px 圆角，192px 高度。居中显示上传图标和提示文字。
- **Dragging:** 边框变为匠心青实感 (`#14b8a6`)，底色变为匠心青晕 (`#f0fdfa`)。像被激活的感应区域。
- **File loaded:** 绿色勾号 + 文件名 + 元信息（大小、字符数、编码），底部全宽"下一步"按钮。

## 6. Do's and Don'ts

### Do:

- **Do** 保持匠心青在单一屏幕中的占比 ≤10%。它是锚点，不是颜料。
- **Do** 使用 `active:scale-[0.98]` 给按钮提供按下反馈。0.98 是精确的，不是 0.95（太夸张）或 1（没有反馈）。
- **Do** 在所有卡片悬停时让边框色向匠心青偏移（`hover:border-teal-300`），这是统一的交互暗示。
- **Do** 使用面包屑导航建立页面层级：首页 / 转换 / 编辑器。用户永远知道自己在哪里。
- **Do** 在空状态显示引导文字和图标（如"尚未创建项目"），不让用户面对一片空白。
- **Do** 所有动画提供 `prefers-reduced-motion` 降级方案。尊重用户的运动偏好。
- **Do** 正文行宽控制在 65-75ch。超长行降低可读性。

### Don't:

- **Don't** 在同一屏幕上使用超过一个强调色。emerald/sky/amber 仅用于语义状态（成功/信息/警告），不作为装饰色。
- **Don't** 使用超过 12px 的圆角。16px+ 的卡片看起来像气泡，不像工具。按钮 8px，卡片 12px，到此为止。
- **Don't** 在句子上使用全大写 + tracking-wider。短标签（"Step 1"）可以，但中文正文绝不大写化。
- **Don't** 在静止元素上使用明显的阴影。阴影是悬停和提升的响应，不是默认态的装饰。
- **Don't** 添加渐变文字（`background-clip: text`）、玻璃拟态卡片、霓虹发光效果。这个工具的身份是"沉静工坊"，不是"赛博夜店"。
- **Don't** 在每个区块上方都加 uppercase eyebrow（小号全大写标题）。一个流程步骤可以有 "Step 1"，但不是每个章节都需要这种脚手架。
- **Don't** 使用 `border-left` 超过 1px 的彩色侧边条。这是 AI 生成界面的典型特征，本系统拒绝使用。
- **Don't** 让 Display 标题超过 `clamp(2.25rem, 5vw, 3.75rem)` 的上限。超过 60px 的标题在中文排版中失控。

/** 示例 YAML 剧本（桃花源记改编版，严格对齐 ScriptSchema） */
export const DEMO_YAML = `script:
  title: "桃花源记"
  source: "桃花源记"
  adapted_at: "2026-06-05"
  adapter: "AI 剧本工坊 Demo"
metadata:
  genre: "历史"
  characters:
    - "渔夫"
    - "村长"
    - "村妇"
    - "太守使者"
  settings:
    - "武陵溪边"
    - "桃花林"
    - "桃花源村"
  summary: "东晋太元年间，武陵渔夫沿溪捕鱼，误入桃花源，发现一个与世隔绝的理想世界。"
acts:
  - act_number: 1
    title: "误入桃源"
    scenes:
      - scene_number: 1
        location: "武陵溪边"
        time: "日"
        characters_present:
          - "渔夫"
        description: "春日午后，武陵溪上薄雾笼罩，渔夫独自划船捕鱼。"
        dialogues:
          - character: "渔夫"
            type: "独白"
            content: "今日鱼获寥寥，不如顺流而下，看看尽头是何光景。"
          - character: "渔夫"
            type: "旁白"
            content: "渔夫撑篙前行，溪水渐窄，两岸忽然满是桃花，落英缤纷。"
          - character: "渔夫"
            type: "独白"
            content: "奇怪，此处桃花遍野，芳草鲜美，世外竟有此等美景！"
      - scene_number: 2
        location: "桃花源村口"
        time: "日"
        characters_present:
          - "渔夫"
          - "村长"
        description: "穿过狭窄山洞后豁然开朗，土地平旷，屋舍俨然。"
        dialogues:
          - character: "渔夫"
            type: "独白"
            content: "这……这是何处？宛如仙境！"
          - character: "村长"
            type: "对白"
            content: "这位客人从何而来？此地与世隔绝已久，从未有外人到访。"
          - character: "渔夫"
            type: "对白"
            content: "老丈，在下是武陵渔夫，顺溪而来，误入贵地。请问这是什么地方？"
          - character: "村长"
            type: "对白"
            content: "此地名为桃花源。我们先祖为避秦时战乱，举家迁入此地，从此再未外出。"
          - character: "渔夫"
            type: "独白"
            content: "秦朝？如今已是晋朝，世间已过了数百年！"
  - act_number: 2
    title: "桃源做客"
    scenes:
      - scene_number: 3
        location: "村长家中"
        time: "夜"
        characters_present:
          - "渔夫"
          - "村长"
          - "村妇"
        description: "村长设宴款待渔夫，村民纷纷前来询问外间消息。"
        dialogues:
          - character: "村妇"
            type: "对白"
            content: "客人，外间天下可还太平？百姓可还安居？"
          - character: "渔夫"
            type: "对白"
            content: "唉……外间朝代更迭，战乱频仍，百姓苦不堪言。"
          - character: "村长"
            type: "独白"
            content: "果然先祖有先见之明，避世于此，方得安宁。"
          - character: "渔夫"
            type: "对白"
            content: "这里人人怡然自乐，真乃人间仙境。在下能否留下来？"
          - character: "村长"
            type: "对白"
            content: "客人尽可住下。只是有一事相求——离去之后，切勿告诉外人此地所在。"
          - character: "渔夫"
            type: "对白"
            content: "老丈放心，在下绝不相负。"
`;

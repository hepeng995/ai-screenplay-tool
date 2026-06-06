'use client';

import { useMemo, useState, useCallback } from 'react';
import { Users, ZoomIn, ZoomOut } from 'lucide-react';
import type { Script } from '@/schema/script.schema';

interface CharacterGraphProps {
  data: Script;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  /** 共现场景数（决定节点大小） */
  weight: number;
}

interface GraphEdge {
  source: string;
  target: string;
  /** 两角色共同出现的场景数（决定线条粗细） */
  weight: number;
}

/** 从剧本数据中提取角色共现关系（综合 metadata / characters_present / dialogues 三处来源） */
function extractGraph(data: Script): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const cooccurrence = new Map<string, Map<string, number>>();

  // 全角色集合（保证 metadata.characters 中的角色即使没有场景数据也能出现在图谱中）
  const allCharacters = new Set<string>();
  for (const c of data.metadata.characters) {
    if (c) allCharacters.add(c);
  }

  // 角色在场次数（决定节点大小）
  const appearanceCount = new Map<string, number>();

  for (const act of data.acts) {
    for (const scene of act.scenes) {
      // 合并 characters_present 和 dialogues 中的角色，确保不遗漏
      const presentChars = scene.characters_present.filter(Boolean);
      const dialogueChars = scene.dialogues
        .map((d) => d.character)
        .filter((c): c is string => typeof c === 'string' && c.length > 0);

      // 去重合并：该场景涉及的完整角色集
      const sceneChars = Array.from(new Set([...presentChars, ...dialogueChars]));
      for (const c of sceneChars) {
        allCharacters.add(c);
      }

      // 统计单角色出现次数（在场列表中的角色权重更高）
      for (const c of presentChars) {
        appearanceCount.set(c, (appearanceCount.get(c) ?? 0) + 1);
      }
      // dialogues 中但不在 present 中的角色也计一次（权重较低，但至少出现）
      for (const c of dialogueChars) {
        if (!presentChars.includes(c)) {
          appearanceCount.set(c, (appearanceCount.get(c) ?? 0) + 0.5);
        }
      }

      // 统计两两共现次数
      for (let i = 0; i < sceneChars.length; i++) {
        for (let j = i + 1; j < sceneChars.length; j++) {
          const a = sceneChars[i];
          const b = sceneChars[j];
          if (!cooccurrence.has(a)) cooccurrence.set(a, new Map());
          if (!cooccurrence.has(b)) cooccurrence.set(b, new Map());
          cooccurrence.get(a)!.set(b, (cooccurrence.get(a)!.get(b) ?? 0) + 1);
          cooccurrence.get(b)!.set(a, (cooccurrence.get(b)!.get(a) ?? 0) + 1);
        }
      }
    }
  }

  // 构建节点（圆形布局）—— 使用全角色集合，而非仅 appearanceCount 中的角色
  const characters = Array.from(allCharacters);
  const centerX = 250;
  const centerY = 200;
  const radius = Math.min(150, characters.length * 25);

  const nodes: GraphNode[] = characters.map((name, idx) => {
    const angle = (2 * Math.PI * idx) / characters.length - Math.PI / 2;
    return {
      id: name,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      weight: Math.ceil(appearanceCount.get(name) ?? 0),
    };
  });

  // 构建边（去重：只保留 a < b）
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const [a, peers] of cooccurrence) {
    for (const [b, count] of peers) {
      const key = [a, b].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: a, target: b, weight: count });
      }
    }
  }

  return { nodes, edges };
}

/** 根据权重映射节点半径 */
function nodeRadius(weight: number): number {
  return Math.max(12, Math.min(28, 10 + weight * 5));
}

/** 根据权重映射线条粗细 */
function edgeWidth(weight: number): number {
  return Math.max(1, Math.min(6, weight * 1.5));
}

export function CharacterGraph({ data }: CharacterGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => extractGraph(data), [data]);

  // 查找节点
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(2, z + 0.2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.5, z - 0.2)), []);

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
        <div className="text-center">
          <Users className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm">暂无角色数据</p>
        </div>
      </div>
    );
  }

  // 高亮的边
  const highlightedEdges = hoveredNode
    ? edges.filter((e) => e.source === hoveredNode || e.target === hoveredNode)
    : [];

  const highlightedNodes = new Set<string>();
  if (hoveredNode) {
    highlightedNodes.add(hoveredNode);
    for (const e of highlightedEdges) {
      highlightedNodes.add(e.source);
      highlightedNodes.add(e.target);
    }
  }

  return (
    <div className="h-full overflow-auto p-4">
      {/* 标题和缩放控制 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            角色关系图谱
          </span>
          <span className="text-xs text-slate-400">（{nodes.length} 角色，{edges.length} 关系）</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-500"
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-500"
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SVG 关系图 */}
      <svg
        viewBox="0 0 500 400"
        className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        <g transform={`translate(0, 0) scale(${zoom})`}>
          {/* 边 */}
          {edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;

            const isHighlighted = highlightedEdges.includes(edge);
            const isDimmed = hoveredNode && !isHighlighted;

            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isHighlighted ? '#14b8a6' : '#cbd5e1'}
                strokeWidth={edgeWidth(edge.weight)}
                strokeOpacity={isDimmed ? 0.15 : isHighlighted ? 0.8 : 0.4}
              />
            );
          })}

          {/* 节点 */}
          {nodes.map((node) => {
            const r = nodeRadius(node.weight);
            const isDimmed = hoveredNode && !highlightedNodes.has(node.id);
            const isHovered = hoveredNode === node.id;

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={isHovered ? '#14b8a6' : '#6366f1'}
                  fillOpacity={isDimmed ? 0.2 : 0.8}
                  stroke={isHovered ? '#0d9488' : '#4f46e5'}
                  strokeWidth={2}
                  strokeOpacity={isDimmed ? 0.1 : 1}
                />
                <text
                  x={node.x}
                  y={node.y + r + 14}
                  textAnchor="middle"
                  className="text-xs fill-slate-700 dark:fill-slate-300"
                  fontSize="10"
                  fontWeight="500"
                  opacity={isDimmed ? 0.3 : 1}
                >
                  {node.id}
                </text>
                {/* 共现场次数标签 */}
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="9"
                  fontWeight="bold"
                  opacity={isDimmed ? 0.2 : 1}
                >
                  {node.weight}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 图例 */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-indigo-500" />
          <span>节点 = 角色（数字 = 出现场景数）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-6 bg-slate-400 rounded" />
          <span>连线 = 共现关系（粗细 = 共现次数）</span>
        </div>
      </div>
    </div>
  );
}

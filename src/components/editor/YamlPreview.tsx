'use client';

import { useMemo, useState } from 'react';
import yaml from 'js-yaml';
import { ChevronDown, ChevronRight, Users, Film, MessageSquare, Layers } from 'lucide-react';

interface YamlPreviewProps {
  yamlContent: string;
}

export function YamlPreview({ yamlContent }: YamlPreviewProps) {
  const [expandedActs, setExpandedActs] = useState<Set<number>>(new Set([0]));
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  const { parsed, stats, error } = useMemo(() => {
    if (!yamlContent || yamlContent.trim().length === 0) {
      return { parsed: null, stats: null, error: 'YAML 内容为空' };
    }

    try {
      // 安全解析：不使用 as Script，使用运行时类型守卫
      const raw = yaml.load(yamlContent);
      if (!raw || typeof raw !== 'object') {
        return { parsed: null, stats: null, error: 'YAML 解析结果不是对象' };
      }
      const data = raw as Record<string, unknown>;

      // 安全访问数组字段，运行时校验
      const acts = Array.isArray(data.acts) ? data.acts : [];
      const scenes = acts.flatMap((a) => {
        const obj = a as Record<string, unknown>;
        return Array.isArray(obj.scenes) ? obj.scenes : [];
      });
      const dialogues = scenes.flatMap((s) => {
        const obj = s as Record<string, unknown>;
        return Array.isArray(obj.dialogues) ? obj.dialogues : [];
      });
      const characters = new Set(
        dialogues
          .map((d) => {
            const obj = d as Record<string, unknown>;
            return typeof obj.character === 'string' ? obj.character : '';
          })
          .filter(Boolean)
      );

      return {
        parsed: data,
        stats: {
          acts: acts.length,
          scenes: scenes.length,
          dialogues: dialogues.length,
          characters: characters.size,
        },
        error: null,
      };
    } catch (e) {
      return { parsed: null, stats: null, error: e instanceof Error ? e.message : 'YAML 解析失败' };
    }
  }, [yamlContent]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-sm font-medium">YAML 解析错误</p>
          <p className="mt-2 text-xs text-red-400 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!parsed || !stats) {
    return null;
  }

  const toggleAct = (idx: number) => {
    setExpandedActs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleScene = (key: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      {/* 统计栏 */}
      <div data-testid="preview-stats" className="grid grid-cols-4 gap-2 mb-4">
        <StatCard icon={Layers} label="幕" value={stats.acts} testId="stats-acts" />
        <StatCard icon={Film} label="场景" value={stats.scenes} testId="stats-scenes" />
        <StatCard icon={MessageSquare} label="台词" value={stats.dialogues} testId="stats-dialogues" />
        <StatCard icon={Users} label="角色" value={stats.characters} testId="stats-characters" />
      </div>

      {/* 剧本信息 */}
      {(() => {
        const script = parsed.script as Record<string, unknown> | undefined;
        const metadata = parsed.metadata as Record<string, unknown> | undefined;
        if (!script) return null;
        return (
          <div className="rounded-lg bg-indigo-50 p-3">
            <h3 data-testid="preview-title" className="font-bold text-slate-900">
              {typeof script.title === 'string' ? script.title : '未命名'}
            </h3>
            {metadata && typeof metadata.summary === 'string' && (
              <p className="mt-1 text-sm text-slate-600">{metadata.summary}</p>
            )}
            {metadata && typeof metadata.genre === 'string' && (
              <span className="mt-1 inline-block text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                {metadata.genre}
              </span>
            )}
          </div>
        );
      })()}

      {/* 幕/场/台词 树 */}
      {(Array.isArray(parsed.acts) ? parsed.acts : []).map((actRaw, actIdx) => {
        const act = actRaw as Record<string, unknown>;
        const actExpanded = expandedActs.has(actIdx);
        return (
          <div key={actIdx} data-testid={`tree-act-${actIdx}`} className="rounded-lg border border-slate-200">
            <button
              onClick={() => toggleAct(actIdx)}
              className="flex w-full items-center gap-2 p-3 hover:bg-slate-50 rounded-t-lg"
            >
              {actExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium text-slate-900">
                {typeof act.title === 'string' ? act.title : `第 ${actIdx + 1} 幕`}
              </span>
            </button>
            {actExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {(Array.isArray(act.scenes) ? act.scenes : []).map((sceneRaw, sceneIdx) => {
                  const scene = sceneRaw as Record<string, unknown>;
                  const sceneKey = `${actIdx}-${sceneIdx}`;
                  const sceneExpanded = expandedScenes.has(sceneKey);
                  return (
                    <div key={sceneIdx} data-testid={`tree-scene-${sceneKey}`} className="ml-4 rounded-md bg-slate-50 p-2">
                      <button
                        onClick={() => toggleScene(sceneKey)}
                        className="flex w-full items-center gap-2"
                      >
                        {sceneExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span className="text-sm font-medium text-slate-700">
                          {`场景 ${typeof scene.scene_number === 'number' ? scene.scene_number : sceneIdx + 1}`}
                        </span>
                        {typeof scene.location === 'string' && (
                          <span className="text-xs text-slate-400">@ {scene.location}</span>
                        )}
                      </button>
                      {sceneExpanded && Array.isArray(scene.dialogues) && (
                        <div className="mt-2 ml-4 space-y-1">
                          {scene.dialogues.map((dRaw, dIdx) => {
                            const d = dRaw as Record<string, unknown>;
                            const character = typeof d.character === 'string' ? d.character : '';
                            const type = typeof d.type === 'string' ? d.type : '';
                            const content = typeof d.content === 'string' ? d.content : '';
                            return (
                              <div key={dIdx} className="text-xs">
                                <span className={`font-medium ${type === '旁白' ? 'text-slate-400 italic' : 'text-indigo-600'}`}>
                                  {character}（{type}）
                                </span>
                                <span className="ml-2 text-slate-600">{content}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, testId }: { icon: React.ElementType; label: string; value: number; testId: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-2 text-center" data-testid={testId}>
      <Icon className="mx-auto h-4 w-4 text-slate-400" />
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

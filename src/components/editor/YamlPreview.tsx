'use client';

import { useMemo } from 'react';
import yaml from 'js-yaml';
import { ChevronDown, ChevronRight, Users, Film, MessageSquare, Layers } from 'lucide-react';
import { useState } from 'react';

interface YamlPreviewProps {
  yamlContent: string;
}

interface ParsedData {
  script?: {
    title?: string;
    genre?: string;
    logline?: string;
  };
  acts?: Array<{
    title?: string;
    scenes?: Array<{
      title?: string;
      location?: string;
      timeOfDay?: string;
      dialogues?: Array<{
        character?: string;
        type?: string;
        content?: string;
      }>;
    }>;
  }>;
}

export function YamlPreview({ yamlContent }: YamlPreviewProps) {
  const [expandedActs, setExpandedActs] = useState<Set<number>>(new Set([0]));
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  const { parsed, stats, error } = useMemo(() => {
    if (!yamlContent || yamlContent.trim().length === 0) {
      return { parsed: null, stats: null, error: 'YAML 内容为空' };
    }

    try {
      const data = yaml.load(yamlContent) as ParsedData;
      if (!data || typeof data !== 'object') {
        return { parsed: null, stats: null, error: 'YAML 解析结果不是对象' };
      }

      const acts = data.acts ?? [];
      const scenes = acts.flatMap((a) => a.scenes ?? []);
      const dialogues = scenes.flatMap((s) => s.dialogues ?? []);
      const characters = new Set(dialogues.map((d) => d.character).filter(Boolean));

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
      {parsed.script && (
        <div className="rounded-lg bg-indigo-50 p-3">
          <h3 data-testid="preview-title" className="font-bold text-slate-900">
            {parsed.script.title ?? '未命名'}
          </h3>
          {parsed.script.logline && (
            <p className="mt-1 text-sm text-slate-600">{parsed.script.logline}</p>
          )}
        </div>
      )}

      {/* 幕/场/台词 树 */}
      {parsed.acts?.map((act, actIdx) => {
        const actExpanded = expandedActs.has(actIdx);
        return (
          <div key={actIdx} data-testid={`tree-act-${actIdx}`} className="rounded-lg border border-slate-200">
            <button
              onClick={() => toggleAct(actIdx)}
              className="flex w-full items-center gap-2 p-3 hover:bg-slate-50 rounded-t-lg"
            >
              {actExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium text-slate-900">{act.title ?? `第 ${actIdx + 1} 幕`}</span>
            </button>
            {actExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {act.scenes?.map((scene, sceneIdx) => {
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
                          {scene.title ?? `场景 ${sceneIdx + 1}`}
                        </span>
                        {scene.location && (
                          <span className="text-xs text-slate-400">@ {scene.location}</span>
                        )}
                      </button>
                      {sceneExpanded && scene.dialogues && (
                        <div className="mt-2 ml-4 space-y-1">
                          {scene.dialogues.map((d, dIdx) => (
                            <div key={dIdx} className="text-xs">
                              <span className={`font-medium ${d.type === '旁白' ? 'text-slate-400 italic' : 'text-indigo-600'}`}>
                                {d.character}（{d.type}）
                              </span>
                              <span className="ml-2 text-slate-600">{d.content}</span>
                            </div>
                          ))}
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

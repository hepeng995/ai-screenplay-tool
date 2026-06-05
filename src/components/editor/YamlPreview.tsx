'use client';

import { useMemo, useState } from 'react';
import yaml from 'js-yaml';
import { ChevronDown, ChevronRight, Users, Film, MessageSquare, Layers, MapPin, Clock, UserCheck } from 'lucide-react';
import type { ValidationResult } from '@/lib/utils/yaml-validator';

interface YamlPreviewProps {
  yamlContent: string;
  /** 父组件传入的校验结果（可选，避免重复解析） */
  validationResult?: ValidationResult | null;
}

export function YamlPreview({ yamlContent, validationResult }: YamlPreviewProps) {
  const [expandedActs, setExpandedActs] = useState<Set<number>>(new Set([0]));
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  const { parsed, stats, allCharacters, error } = useMemo(() => {
    if (!yamlContent || yamlContent.trim().length === 0) {
      return { parsed: null, stats: null, allCharacters: [], error: 'YAML 内容为空' };
    }

    // 优先使用父组件传入的已校验数据，避免重复解析
    if (validationResult?.success && validationResult.data) {
      const data = validationResult.data as unknown as Record<string, unknown>;
      return computeStats(data);
    }

    // 校验失败或未传入时，自行解析（仅用于展示局部内容）
    try {
      const raw = yaml.load(yamlContent);
      if (!raw || typeof raw !== 'object') {
        return { parsed: null, stats: null, allCharacters: [], error: 'YAML 解析结果不是对象' };
      }
      const data = raw as Record<string, unknown>;
      return computeStats(data);
    } catch (e) {
      return { parsed: null, stats: null, allCharacters: [], error: e instanceof Error ? e.message : 'YAML 解析失败' };
    }
  }, [yamlContent, validationResult]);

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
      <div data-testid="preview-stats" className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
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
            {typeof script.source === 'string' && (
              <p className="mt-1 text-xs text-slate-500">原著：{script.source}</p>
            )}
            {metadata && typeof metadata.summary === 'string' && (
              <p className="mt-1 text-sm text-slate-600">{metadata.summary}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {metadata && typeof metadata.genre === 'string' && (
                <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                  {metadata.genre}
                </span>
              )}
              {typeof script.adapted_at === 'string' && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  改编于 {script.adapted_at}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* 角色总览 */}
      {allCharacters.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">角色总览（{allCharacters.length}）</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allCharacters.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 幕/场/台词 树 */}
      {(Array.isArray(parsed.acts) ? parsed.acts : []).map((actRaw, actIdx) => {
        const act = actRaw as Record<string, unknown>;
        const actExpanded = expandedActs.has(actIdx);
        const actScenes = Array.isArray(act.scenes) ? act.scenes : [];
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
              <span className="ml-auto text-xs text-slate-400">{actScenes.length} 场</span>
            </button>
            {actExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {actScenes.map((sceneRaw, sceneIdx) => {
                  const scene = sceneRaw as Record<string, unknown>;
                  const sceneKey = `${actIdx}-${sceneIdx}`;
                  const sceneExpanded = expandedScenes.has(sceneKey);
                  const location = typeof scene.location === 'string' ? scene.location : '';
                  const time = typeof scene.time === 'string' ? scene.time : '';
                  const description = typeof scene.description === 'string' ? scene.description : '';
                  const charactersPresent = Array.isArray(scene.characters_present)
                    ? (scene.characters_present as string[]).filter((c): c is string => typeof c === 'string')
                    : [];
                  const dialogues = Array.isArray(scene.dialogues) ? scene.dialogues : [];
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
                        {location && (
                          <span className="text-xs text-slate-400 flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />{location}
                          </span>
                        )}
                        {time && (
                          <span className="text-xs text-slate-400 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />{time}
                          </span>
                        )}
                      </button>
                      {sceneExpanded && (
                        <div className="mt-2 ml-4 space-y-2">
                          {/* 场景描述 */}
                          {description && (
                            <p className="text-xs text-slate-500 italic bg-white rounded p-2 border border-slate-100">
                              {description}
                            </p>
                          )}
                          {/* 在场角色 */}
                          {charactersPresent.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <UserCheck className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              {charactersPresent.map((name, idx) => (
                                <span key={idx} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* 对话列表 */}
                          {dialogues.map((dRaw, dIdx) => {
                            const d = dRaw as Record<string, unknown>;
                            const character = typeof d.character === 'string' ? d.character : '';
                            const type = typeof d.type === 'string' ? d.type : '';
                            const content = typeof d.content === 'string' ? d.content : '';
                            const action = typeof d.action === 'string' ? d.action : '';
                            return (
                              <div key={dIdx} className="text-xs space-y-0.5">
                                <div className="flex items-baseline gap-1">
                                  <span className={`font-medium ${type === '旁白' ? 'text-slate-400 italic' : type === '动作' ? 'text-amber-600' : 'text-indigo-600'}`}>
                                    {character}
                                  </span>
                                  <span className="text-slate-400">（{type}）</span>
                                </div>
                                <p className="text-slate-600 ml-3 leading-relaxed">{content}</p>
                                {action && (
                                  <p className="text-amber-600/70 ml-3 italic">※ {action}</p>
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

/** 从已解析的 YAML 对象中提取统计信息 */
function computeStats(data: Record<string, unknown>) {
  const acts = Array.isArray(data.acts) ? data.acts : [];
  const scenes = acts.flatMap((a) => {
    const obj = a as Record<string, unknown>;
    return Array.isArray(obj.scenes) ? obj.scenes : [];
  });
  const dialogues = scenes.flatMap((s) => {
    const obj = s as Record<string, unknown>;
    return Array.isArray(obj.dialogues) ? obj.dialogues : [];
  });

  const dialogueCharacters = new Set(
    dialogues
      .map((d) => {
        const obj = d as Record<string, unknown>;
        return typeof obj.character === 'string' ? obj.character : '';
      })
      .filter(Boolean),
  );

  const metadata = data.metadata as Record<string, unknown> | undefined;
  const metaCharacters: string[] = Array.isArray(metadata?.characters)
    ? (metadata!.characters as string[]).filter((c): c is string => typeof c === 'string')
    : [];
  const allCharacters = [...new Set([...metaCharacters, ...dialogueCharacters])];

  return {
    parsed: data,
    stats: {
      acts: acts.length,
      scenes: scenes.length,
      dialogues: dialogues.length,
      characters: allCharacters.length,
    },
    allCharacters,
    error: null as string | null,
  };
}

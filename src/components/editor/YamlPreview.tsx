'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import yaml from 'js-yaml';
import { ChevronDown, ChevronRight, Users, Film, MessageSquare, Layers, MapPin, Clock, UserCheck, RefreshCw } from 'lucide-react';
import type { ValidationResult } from '@/lib/utils/yaml-validator';
import { toast } from '@/lib/utils/toast';

/** 重新生成定位信息：精确到某幕某场（台词再带 dlgIdx） */
export interface RegenerateTarget {
  actIdx: number;
  sceneIdx: number;
  dlgIdx?: number;
}

interface YamlPreviewProps {
  yamlContent: string;
  /** 父组件传入的校验结果（可选，避免重复解析） */
  validationResult?: ValidationResult | null;
  /** 局部重新生成回调（可选，传入后场景/台词行显示重新生成按钮） */
  onRegenerate?: (type: 'scene' | 'dialogue', context: string, target: RegenerateTarget) => void;
  /** 就地编辑回写回调（可选，传入后预览区关键字段可点击编辑） */
  onContentChange?: (yaml: string) => void;
}

/* ========== 就地编辑辅助：按路径安全取节点（不使用 any） ========== */

/** 取某幕某场的场景对象 */
function getScene(doc: unknown, actIdx: number, sceneIdx: number): Record<string, unknown> | null {
  const acts = (doc as { acts?: unknown }).acts;
  if (!Array.isArray(acts)) return null;
  const act = acts[actIdx];
  const scenes = act && typeof act === 'object' ? (act as { scenes?: unknown }).scenes : null;
  if (!Array.isArray(scenes)) return null;
  const scene = scenes[sceneIdx];
  return scene && typeof scene === 'object' ? (scene as Record<string, unknown>) : null;
}

/** 取某条台词对象 */
function getDialogue(doc: unknown, actIdx: number, sceneIdx: number, dlgIdx: number): Record<string, unknown> | null {
  const scene = getScene(doc, actIdx, sceneIdx);
  const dialogues = scene ? (scene.dialogues as unknown) : null;
  if (!Array.isArray(dialogues)) return null;
  const d = dialogues[dlgIdx];
  return d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
}

/** 取顶层对象字段（script / metadata） */
function getTopObj(doc: unknown, key: string): Record<string, unknown> | null {
  const v = (doc as Record<string, unknown>)[key];
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

/* ========== 可编辑文本组件 ========== */

interface EditableTextProps {
  value: string;
  editable: boolean;
  onCommit: (next: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * 点击进入编辑的文本：
 * - editable=false 时退化为纯文本 span（保证只读场景与测试行为不变）
 * - Enter 提交（多行用 Esc 提交/失焦提交），Esc 取消
 */
function EditableText({ value, editable, onCommit, multiline, className, placeholder }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // 非编辑态时跟随外部值变化
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  if (!editable) {
    return <span className={className}>{value}</span>;
  }

  if (!editing) {
    return (
      <span
        className={`${className ?? ''} cursor-text rounded px-0.5 -mx-0.5 hover:bg-teal-50 hover:ring-1 hover:ring-teal-200 dark:hover:bg-teal-950/20 dark:hover:ring-teal-800 transition-colors`}
        title="点击编辑"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setEditing(true);
        }}
      >
        {value || <span className="text-slate-300 dark:text-slate-600">{placeholder ?? '（点击编辑）'}</span>}
      </span>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };
  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const sharedClass =
    'w-full rounded border border-teal-400 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-400';

  if (multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        rows={2}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
          // Ctrl/Cmd+Enter 提交，普通 Enter 允许换行
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit();
        }}
        className={sharedClass}
      />
    );
  }

  return (
    <input
      type="text"
      autoFocus
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
      }}
      className={sharedClass}
    />
  );
}

export function YamlPreview({ yamlContent, validationResult, onRegenerate, onContentChange }: YamlPreviewProps) {
  const [expandedActs, setExpandedActs] = useState<Set<number>>(new Set([0]));
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  // 防抖：预览区延迟 300ms 跟随编辑内容，减少高频重绘
  const [debouncedContent, setDebouncedContent] = useState(yamlContent);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedContent(yamlContent), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [yamlContent]);

  const editable = !!onContentChange;

  /**
   * 就地编辑：基于最新 yamlContent 解析 → 用 mutate 修改 → 重新 dump 回写。
   * mutate 返回 false（未定位到目标）时不回写，避免无意义的整篇重排。
   */
  const applyEdit = useCallback(
    (mutate: (doc: Record<string, unknown>) => boolean) => {
      if (!onContentChange) return;
      try {
        const doc = yaml.load(yamlContent);
        if (!doc || typeof doc !== 'object') {
          toast.error('当前内容无法解析，请在左侧编辑器修正后再试');
          return;
        }
        const changed = mutate(doc as Record<string, unknown>);
        if (!changed) return;
        onContentChange(yaml.dump(doc, { indent: 2, lineWidth: 120, sortKeys: false }));
      } catch (e) {
        toast.error('编辑失败：' + (e instanceof Error ? e.message : '未知错误'));
      }
    },
    [onContentChange, yamlContent],
  );

  const { parsed, stats, allCharacters, error } = useMemo(() => {
    if (!debouncedContent || debouncedContent.trim().length === 0) {
      return { parsed: null, stats: null, allCharacters: [], error: 'YAML 内容为空' };
    }

    // 优先使用父组件传入的已校验数据，避免重复解析
    if (validationResult?.success && validationResult.data) {
      const data = validationResult.data as unknown as Record<string, unknown>;
      return computeStats(data);
    }

    // 校验失败或未传入时，自行解析（仅用于展示局部内容）
    try {
      const raw = yaml.load(debouncedContent);
      if (!raw || typeof raw !== 'object') {
        return { parsed: null, stats: null, allCharacters: [], error: 'YAML 解析结果不是对象' };
      }
      const data = raw as Record<string, unknown>;
      return computeStats(data);
    } catch (e) {
      return { parsed: null, stats: null, allCharacters: [], error: e instanceof Error ? e.message : 'YAML 解析失败' };
    }
  }, [debouncedContent, validationResult]);

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

      {/* 编辑提示 */}
      {editable && (
        <p className="text-xs text-teal-600 dark:text-teal-400">提示：点击下方标题、台词、描述等文字可直接编辑，修改会同步到左侧 YAML。</p>
      )}

      {/* 剧本信息 */}
      {(() => {
        const script = parsed.script as Record<string, unknown> | undefined;
        const metadata = parsed.metadata as Record<string, unknown> | undefined;
        if (!script) return null;
        const title = typeof script.title === 'string' ? script.title : '';
        const summary = metadata && typeof metadata.summary === 'string' ? metadata.summary : '';
        return (
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-3">
            <h3 data-testid="preview-title" className="font-bold text-slate-900 dark:text-slate-100">
              <EditableText
                value={title || '未命名'}
                editable={editable}
                onCommit={(v) =>
                  applyEdit((doc) => {
                    const s = getTopObj(doc, 'script');
                    if (!s) return false;
                    s.title = v;
                    return true;
                  })
                }
              />
            </h3>
            {typeof script.source === 'string' && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">原著：{script.source}</p>
            )}
            {summary && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                <EditableText
                  value={summary}
                  editable={editable}
                  multiline
                  onCommit={(v) =>
                    applyEdit((doc) => {
                      const m = getTopObj(doc, 'metadata');
                      if (!m) return false;
                      m.summary = v;
                      return true;
                    })
                  }
                />
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {metadata && typeof metadata.genre === 'string' && (
                <span className="text-xs text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/40 px-2 py-0.5 rounded">
                  {metadata.genre}
                </span>
              )}
              {typeof script.adapted_at === 'string' && (
                <span className="text-xs text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 px-2 py-0.5 rounded">
                  改编于 {script.adapted_at}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* 角色总览 */}
      {allCharacters.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">角色总览（{allCharacters.length}）</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allCharacters.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300"
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
          <div key={actIdx} data-testid={`tree-act-${actIdx}`} className="rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => toggleAct(actIdx)}
              className="flex w-full items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-t-lg"
            >
              {actExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium text-slate-900 dark:text-slate-100">
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
                    <div key={sceneIdx} data-testid={`tree-scene-${sceneKey}`} className="ml-4 rounded-md bg-slate-50 dark:bg-slate-800/50 p-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleScene(sceneKey)}
                          className="flex flex-1 items-center gap-2 min-w-0"
                        >
                          {sceneExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        {/* 重新生成场景按钮 */}
                        {onRegenerate && (
                          <button
                            type="button"
                            onClick={() => {
                              const sceneYaml = yaml.dump({ scene }, { indent: 2, lineWidth: 120 });
                              onRegenerate('scene', sceneYaml, { actIdx, sceneIdx });
                            }}
                            className="p-1 rounded hover:bg-teal-100 dark:hover:bg-teal-950/30 text-slate-400 hover:text-teal-600 transition-colors"
                            title="重新生成此场景"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {sceneExpanded && (
                        <div className="mt-2 ml-4 space-y-2">
                          {/* 场景描述 */}
                          {description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-zinc-900 rounded p-2 border border-slate-100 dark:border-slate-700">
                              <EditableText
                                value={description}
                                editable={editable}
                                multiline
                                onCommit={(v) =>
                                  applyEdit((doc) => {
                                    const s = getScene(doc, actIdx, sceneIdx);
                                    if (!s) return false;
                                    s.description = v;
                                    return true;
                                  })
                                }
                              />
                            </div>
                          )}
                          {/* 在场角色 */}
                          {charactersPresent.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <UserCheck className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              {charactersPresent.map((name, idx) => (
                                <span key={idx} className="text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300 px-1.5 py-0.5 rounded">
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
                              <div key={dIdx} className="text-xs space-y-0.5 group/dlg">
                                <div className="flex items-baseline gap-1">
                                  <span className={`font-medium ${type === '旁白' ? 'text-slate-400 italic' : type === '动作' ? 'text-amber-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                    <EditableText
                                      value={character}
                                      editable={editable}
                                      onCommit={(v) =>
                                        applyEdit((doc) => {
                                          const dlg = getDialogue(doc, actIdx, sceneIdx, dIdx);
                                          if (!dlg) return false;
                                          dlg.character = v;
                                          return true;
                                        })
                                      }
                                    />
                                  </span>
                                  <span className="text-slate-400">（{type}）</span>
                                  {/* 重新生成单句台词 */}
                                  {onRegenerate && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const dlgYaml = yaml.dump({ dialogue: d }, { indent: 2, lineWidth: 120 });
                                        // 附带场景上下文
                                        const ctx = `${dlgYaml}\n\n# 场景：${location || '未知'} | 在场角色：${charactersPresent.join('、')}`;
                                        onRegenerate('dialogue', ctx, { actIdx, sceneIdx, dlgIdx: dIdx });
                                      }}
                                      className="ml-auto p-0.5 rounded opacity-0 group-hover/dlg:opacity-100 hover:bg-teal-100 dark:hover:bg-teal-950/30 text-slate-400 hover:text-teal-600 transition-all"
                                      title="重新生成此台词"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-slate-600 dark:text-slate-300 ml-3 leading-relaxed">
                                  <EditableText
                                    value={content}
                                    editable={editable}
                                    multiline
                                    onCommit={(v) =>
                                      applyEdit((doc) => {
                                        const dlg = getDialogue(doc, actIdx, sceneIdx, dIdx);
                                        if (!dlg) return false;
                                        dlg.content = v;
                                        return true;
                                      })
                                    }
                                  />
                                </div>
                                {action && (
                                  <p className="text-amber-600/70 dark:text-amber-500/70 ml-3 italic">
                                    ※{' '}
                                    <EditableText
                                      value={action}
                                      editable={editable}
                                      onCommit={(v) =>
                                        applyEdit((doc) => {
                                          const dlg = getDialogue(doc, actIdx, sceneIdx, dIdx);
                                          if (!dlg) return false;
                                          dlg.action = v;
                                          return true;
                                        })
                                      }
                                    />
                                  </p>
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
    <div className="rounded-md bg-slate-50 dark:bg-slate-800/50 p-2 text-center" data-testid={testId}>
      <Icon className="mx-auto h-4 w-4 text-slate-400" />
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
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

/**
 * localStorage 项目索引 + 文本存储工具
 * T2.6: 项目 CRUD（增删改查）
 * T2.1: 小说文本暂存
 */

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'uploaded' | 'split' | 'converted' | 'edited';
  chapterCount: number;
  qiniuKey?: string;
}

const PROJECTS_KEY = 'ai-script-projects';
const NOVEL_PREFIX = 'novel-';

/* ========== 项目 CRUD ========== */

/** 获取所有项目 */
export function listProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const projects: Project[] = JSON.parse(raw);
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

/** 获取单个项目 */
export function loadProject(id: string): Project | null {
  const projects = listProjects();
  return projects.find((p) => p.id === id) ?? null;
}

/** 保存/更新项目 */
export function saveProject(project: Project): void {
  if (typeof window === 'undefined') return;
  const projects = listProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  project.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

/** 删除项目 */
export function deleteProject(id: string): void {
  if (typeof window === 'undefined') return;
  const projects = listProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  // 同时删除暂存的文本
  localStorage.removeItem(`${NOVEL_PREFIX}${id}`);
}

/** 重命名项目（不修改其它字段，仅 name 和 updatedAt） */
export function renameProject(id: string, newName: string): void {
  if (typeof window === 'undefined') return;
  const projects = listProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx >= 0) {
    projects[idx].name = newName;
    projects[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }
}

/** 创建新项目 */
export function createProject(name: string): Project {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const project: Project = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    status: 'uploaded',
    chapterCount: 0,
  };
  saveProject(project);
  return project;
}

/* ========== 小说文本暂存 ========== */

/** 暂存小说原文到 localStorage */
export function saveNovelText(id: string, text: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${NOVEL_PREFIX}${id}`, text);
  } catch (e) {
    // localStorage 容量不足时提示用户
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      throw new Error('存储空间不足，建议导出或删除旧项目后重试');
    }
    console.error('保存小说文本失败:', e);
    throw new Error('保存小说文本失败');
  }
}

/** 读取暂存的小说原文 */
export function loadNovelText(id: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${NOVEL_PREFIX}${id}`);
}

/* ========== YAML 剧本暂存 ========== */

/** 暂存 YAML 剧本内容 */
export function saveYamlContent(id: string, yaml: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`yaml-${id}`, yaml);
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      throw new Error('存储空间不足，建议导出或删除旧项目后重试');
    }
    console.error('保存 YAML 失败:', e);
  }
}

/** 读取暂存的 YAML 剧本 */
export function loadYamlContent(id: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`yaml-${id}`);
}

/* ========== 项目导入/导出 ========== */

/** 导出数据格式 */
export interface ExportData {
  version: 1;
  exportedAt: string;
  projects: Array<{
    project: Project;
    novelText: string | null;
    yamlContent: string | null;
  }>;
}

/**
 * 导出指定项目为 JSON 字符串
 * 包含项目元信息、小说原文、YAML 剧本
 */
export function exportProjects(ids: string[]): string {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: ids.map((id) => ({
      project: loadProject(id),
      novelText: loadNovelText(id),
      yamlContent: loadYamlContent(id),
    })).filter((item) => item.project !== null) as ExportData['projects'],
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 导入项目数据
 * @returns 导入的项目数量
 */
/** 导入策略 */
export type ImportStrategy = 'skip' | 'overwrite' | 'clone';

/** 导入结果统计 */
export interface ImportResult {
  imported: number;
  skipped: number;
  overwritten: number;
}

export function importProjects(jsonStr: string, strategy: ImportStrategy = 'skip'): ImportResult {
  const data = JSON.parse(jsonStr) as ExportData;
  if (!data.projects || !Array.isArray(data.projects)) {
    throw new Error('无效的导入文件格式');
  }

  const result: ImportResult = { imported: 0, skipped: 0, overwritten: 0 };

  for (const item of data.projects) {
    if (!item.project?.id || !item.project?.name) continue;

    const existing = loadProject(item.project.id);
    if (existing) {
      if (strategy === 'skip') {
        result.skipped++;
        continue;
      }
      if (strategy === 'overwrite') {
        saveProject(item.project);
        if (item.novelText) saveNovelText(item.project.id, item.novelText);
        if (item.yamlContent) saveYamlContent(item.project.id, item.yamlContent);
        result.overwritten++;
        result.imported++;
        continue;
      }
      // strategy === 'clone'：生成新 ID 导入
      const newId = crypto.randomUUID();
      const cloned: Project = {
        ...item.project,
        id: newId,
        name: `${item.project.name}（导入）`,
      };
      saveProject(cloned);
      if (item.novelText) saveNovelText(newId, item.novelText);
      if (item.yamlContent) saveYamlContent(newId, item.yamlContent);
      result.imported++;
      continue;
    }

    saveProject(item.project);
    if (item.novelText) saveNovelText(item.project.id, item.novelText);
    if (item.yamlContent) saveYamlContent(item.project.id, item.yamlContent);
    result.imported++;
  }
  return result;
}

/* ========== 项目复制 ========== */

/** 复制项目（生成新 ID，复制所有关联数据） */
export function cloneProject(id: string): Project | null {
  const original = loadProject(id);
  if (!original) return null;

  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const cloned: Project = {
    ...original,
    id: newId,
    name: `${original.name}（副本）`,
    createdAt: now,
    updatedAt: now,
  };
  saveProject(cloned);

  // 复制小说原文
  const novelText = loadNovelText(id);
  if (novelText) saveNovelText(newId, novelText);

  // 复制 YAML 剧本
  const yamlContent = loadYamlContent(id);
  if (yamlContent) saveYamlContent(newId, yamlContent);

  return cloned;
}

/* ========== 存储空间管理 ========== */

/** localStorage 总大小估算（字节） */
export function getStorageUsage(): { used: number; total: number } {
  if (typeof window === 'undefined') return { used: 0, total: 0 };
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        used += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
    }
    // JS 字符串使用 UTF-16 编码，每个字符 2 字节
    const usedBytes = used * 2;
    // localStorage 常见上限约 5MB（部分浏览器 10MB）
    const totalBytes = 5 * 1024 * 1024;
    return { used: usedBytes, total: totalBytes };
  } catch {
    return { used: 0, total: 5 * 1024 * 1024 };
  }
}

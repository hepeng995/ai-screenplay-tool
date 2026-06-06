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

/** 删除项目（软删除：移入回收站，数据保留可恢复） */
export function deleteProject(id: string): void {
  if (typeof window === 'undefined') return;
  const project = loadProject(id);
  if (!project) return;

  // 从项目列表移除
  const projects = listProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  // 移入回收站（保留 novel + yaml 数据）
  const trash = loadTrashRaw();
  trash.push({ ...project, deletedAt: new Date().toISOString() });
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
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

/* ========== 回收站（软删除） ========== */

/** 回收站中的项目（带删除时间） */
export interface TrashedProject extends Project {
  deletedAt: string;
}

const TRASH_KEY = 'ai-script-trash';

function loadTrashRaw(): TrashedProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    return raw ? (JSON.parse(raw) as TrashedProject[]) : [];
  } catch {
    return [];
  }
}

/** 列出回收站中的所有项目（按删除时间倒序） */
export function listTrash(): TrashedProject[] {
  return loadTrashRaw().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/** 从回收站还原项目 */
export function restoreProject(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const trash = loadTrashRaw();
  const idx = trash.findIndex((p) => p.id === id);
  if (idx < 0) return false;

  // 从 trash 数组取出，去掉 deletedAt
  const { deletedAt: _, ...project } = trash[idx];
  trash.splice(idx, 1);
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash));

  // 重新写回项目列表（novel + yaml 数据未被删除，仍在 localStorage）
  saveProject(project);
  return true;
}

/** 彻底删除一个回收站项目（连同关联数据） */
export function permanentlyDelete(id: string): void {
  if (typeof window === 'undefined') return;
  const trash = loadTrashRaw().filter((p) => p.id !== id);
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
  // 删除关联的文本数据
  localStorage.removeItem(`${NOVEL_PREFIX}${id}`);
  localStorage.removeItem(`yaml-${id}`);
}

/** 清空回收站（彻底删除所有已软删项目及其关联数据） */
export function emptyTrash(): number {
  if (typeof window === 'undefined') return 0;
  const trash = loadTrashRaw();
  for (const p of trash) {
    localStorage.removeItem(`${NOVEL_PREFIX}${p.id}`);
    localStorage.removeItem(`yaml-${p.id}`);
  }
  localStorage.setItem(TRASH_KEY, '[]');
  return trash.length;
}

/* ========== 云端备份 / 恢复 ========== */

/**
 * 将全部项目数据序列化为 JSON 字符串（供上传到七牛云等云存储）
 * 复用 exportProjects 的序列化格式
 */
export function serializeAllProjects(): string {
  const projects = listProjects();
  return exportProjects(projects.map((p) => p.id));
}

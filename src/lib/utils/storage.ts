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

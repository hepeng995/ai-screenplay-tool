'use client';

import { useEffect, useState, useCallback } from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesBento } from '@/components/home/FeaturesBento';
import { ProjectList } from '@/components/home/ProjectList';
import { StorageBar } from '@/components/home/StorageBar';
import { createProject, saveYamlContent, listProjects, getStorageUsage, type Project } from '@/lib/utils/storage';

/** 示例 YAML 数据：点击「体验示例」时按需加载 */
const loadDemoYaml = () => import('@/lib/data/demo-yaml').then((m) => m.DEMO_YAML);

interface RecentProject {
  id: string;
  title: string;
  updatedAt: string;
  status: Project['status'];
  chapterCount: number;
  qiniuKey?: string;
}

export default function Home() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);

  const loadProjects = useCallback(() => {
    const projects: Project[] = listProjects();
    const mapped: RecentProject[] = projects.map((p) => ({
      id: p.id,
      title: p.name,
      updatedAt: p.updatedAt,
      status: p.status,
      chapterCount: p.chapterCount,
      qiniuKey: p.qiniuKey,
    }));
    setRecentProjects(mapped);
    const { used } = getStorageUsage();
    setStorageUsed(used);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /** 体验示例 */
  const handleTryDemo = async () => {
    const demoYaml = await loadDemoYaml();
    const project = createProject('示例剧本 - 桃花源记');
    saveYamlContent(project.id, demoYaml);
    window.location.href = `/editor?id=${project.id}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-6">
      <HeroSection onTryDemo={handleTryDemo} />
      <FeaturesBento />
      <ProjectList projects={recentProjects} onProjectsChange={loadProjects} />
      <section className="pb-12">
        <StorageBar used={storageUsed} total={5 * 1024 * 1024} />
      </section>
    </div>
  );
}

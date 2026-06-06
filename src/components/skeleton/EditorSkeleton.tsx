/** 编辑器页骨架屏（带 shimmer 微光效果） */
export function EditorSkeleton() {
  const skel = 'bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden';

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 animate-pulse">
      {/* 面包屑 */}
      <div className={`mb-3 h-4 w-56 rounded ${skel}`}>
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      {/* 标题 + 工具栏 */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className={`h-8 w-64 rounded-lg ${skel}`}>
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className={`h-4 w-48 rounded ${skel}`}>
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-9 w-20 rounded-lg ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          ))}
        </div>
      </div>
      {/* 双栏编辑区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:h-[calc(100vh-200px)]">
        <div className="h-[70vh] lg:h-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="p-4 space-y-2">
            <div className={`h-5 w-16 rounded ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className={`h-4 w-56 rounded ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
          <div className="px-4 space-y-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-4 rounded bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden"
                style={{ width: `${60 + Math.random() * 40}%` }}
              >
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block h-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="p-4 space-y-2">
            <div className={`h-5 w-12 rounded ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className={`h-4 w-48 rounded ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
          <div className="px-4 space-y-3">
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-md bg-zinc-50 dark:bg-zinc-800 relative overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              ))}
            </div>
            {/* 树形结构 */}
            <div className="space-y-2">
              <div className="h-10 rounded-lg bg-zinc-50 dark:bg-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="h-8 ml-4 rounded-md bg-zinc-50 dark:bg-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="h-8 ml-4 rounded-md bg-zinc-50 dark:bg-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

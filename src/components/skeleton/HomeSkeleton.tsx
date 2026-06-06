/** 首页骨架屏（带 shimmer 微光效果） */
export function HomeSkeleton() {
  // 骨架条目基类：比普通的 bg-zinc-200 多一个 shimmer 微光叠加
  const skel = 'bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden';

  return (
    <div className="mx-auto max-w-6xl px-6 animate-pulse">
      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8 items-center">
          {/* 左侧文字 */}
          <div className="max-w-xl space-y-4">
            <div className={`h-14 w-3/4 rounded-lg ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className={`h-6 w-2/3 rounded ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className={`h-6 w-1/2 rounded ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className="flex gap-3 mt-6">
              <div className={`h-11 w-32 rounded-lg ${skel}`}>
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className={`h-11 w-28 rounded-lg ${skel}`}>
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>
          </div>
          {/* 右侧流程图占位（md+） */}
          <div className="hidden md:flex items-center justify-center">
            <div className={`w-full max-w-sm h-32 rounded-2xl ${skel}`}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
        </div>
      </section>

      {/* 工作流步骤 */}
      <section className="pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className={`h-8 w-8 rounded-lg ${skel}`}>
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className={`h-2.5 w-8 rounded ${skel}`}>
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
                <div className={`h-3 w-16 rounded ${skel}`}>
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bento 特性（匹配新的 2-col 布局） */}
      <section className="pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`h-36 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 space-y-3 relative overflow-hidden`}>
            <div className="absolute inset-0 animate-shimmer" />
            <div className="flex items-center gap-3 relative">
              <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800 relative" />
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800 relative" />
          </div>
          <div className={`h-36 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 space-y-3 relative overflow-hidden`}>
            <div className="absolute inset-0 animate-shimmer" />
            <div className="flex items-center gap-3 relative">
              <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-950/30" />
              <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800 relative" />
          </div>
        </div>
      </section>

      {/* 项目列表占位 */}
      <section className="pb-12 space-y-2">
        <div className={`h-6 w-24 rounded ${skel}`}>
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-14 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 relative overflow-hidden`}>
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        ))}
      </section>
    </div>
  );
}

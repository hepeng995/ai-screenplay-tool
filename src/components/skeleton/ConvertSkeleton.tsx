/** 转换页骨架屏（带 shimmer 微光效果） */
export function ConvertSkeleton() {
  const skel = 'bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden';

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 animate-pulse">
      {/* 面包屑 */}
      <div className={`mb-4 h-4 w-40 rounded ${skel}`}>
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      {/* 标题 */}
      <div className={`h-9 w-48 rounded-lg ${skel} mb-2`}>
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      <div className={`h-4 w-72 rounded ${skel} mb-8`}>
        <div className="absolute inset-0 animate-shimmer" />
      </div>

      {/* 上传卡片 */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-6 space-y-1.5">
          <div className={`h-6 w-48 rounded ${skel}`}>
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className={`h-4 w-80 rounded ${skel}`}>
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
        <div className="px-6 pb-6">
          {/* 拖拽区域 */}
          <div className="h-48 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

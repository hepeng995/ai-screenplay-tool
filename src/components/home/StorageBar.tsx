'use client';

interface StorageBarProps {
  used: number;
  total: number;
}

export function StorageBar({ used, total }: StorageBarProps) {
  const pct = Math.min(Math.round((used / total) * 100), 100);
  const usedMB = (used / (1024 * 1024)).toFixed(2);
  const totalMB = (total / (1024 * 1024)).toFixed(0);
  const isWarning = pct > 80;

  if (used === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">本地存储空间</span>
        <span className={`text-xs ${isWarning ? 'text-red-600 dark:text-red-400 font-medium' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {usedMB} MB / {totalMB} MB（{pct}%）
        </span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 animate-shimmer-bar ${isWarning ? 'bg-red-500' : 'bg-teal-500 dark:bg-teal-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isWarning && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          存储空间不足，建议导出备份后清理旧项目
        </p>
      )}
    </div>
  );
}

import { Github, PenLine } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-teal-600 dark:bg-teal-500">
              <PenLine className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              AI 剧本工坊
            </span>
          </div>
          <span className="hidden sm:inline text-xs text-zinc-500 dark:text-zinc-400">
            七牛云校园编程大赛参赛项目
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            © 2026
          </span>
          <a
            href="https://github.com/hepeng995/ai-screenplay-tool"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

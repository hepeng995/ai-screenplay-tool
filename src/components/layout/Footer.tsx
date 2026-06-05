import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="h-12 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <p className="text-sm text-slate-500">
          © 2026 AI 剧本工坊 · 七牛云校园编程大赛
        </p>
        <a
          href="https://github.com/hepeng995/ai-screenplay-tool"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </div>
    </footer>
  );
}

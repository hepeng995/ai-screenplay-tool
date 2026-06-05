import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ToastContainer } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 剧本工坊 | 小说自动改编为 YAML 剧本',
  description: '将 3 章节以上的小说文本自动转换为结构化 YAML 剧本，免费、开源。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Header />
        <main className="min-h-[calc(100vh-112px)]">{children}</main>
        <Footer />
        <ToastContainer />
      </body>
    </html>
  );
}

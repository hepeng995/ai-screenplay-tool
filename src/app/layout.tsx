import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ToastContainer } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100`}>
        <Header />
        <main className="min-h-[calc(100vh-112px)]">{children}</main>
        <Footer />
        <ToastContainer />
      </body>
    </html>
  );
}

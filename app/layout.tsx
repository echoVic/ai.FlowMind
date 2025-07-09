import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI架构图生成器',
  description: '基于 AI 的架构图和流程图生成工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
} 
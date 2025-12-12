import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '期货策略分析平台',
  description: '期货策略绩效分析与风险监控平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const navigation = [
  { name: '总览', href: '/' },
  { name: '策略列表', href: '/strategies' },
  { name: '风险监控', href: '/risk' },
  { name: 'AI 分析', href: '/analysis' },
]

export default function Layout({ children }: Props) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* 顶部导航栏 */}
      <header className="bg-[#141414] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Q</span>
                </div>
                <span className="text-lg font-semibold text-white">
                  期货策略分析
                </span>
              </Link>

              {/* 导航菜单 */}
              <nav className="hidden md:flex space-x-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                2025-12-10
              </span>
              <Link
                href="/analysis"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                AI 分析
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 移动端底部导航 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-gray-800 z-50">
        <div className="grid grid-cols-4 h-16">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 ${
                  isActive ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  )
}

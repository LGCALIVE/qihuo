'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'

interface StrategyScore {
  strategy_code: string
  total_return: number
  sharpe_ratio: number
  max_drawdown: number
  win_rate: number
  total_score: number
  rank: number
  annualized_return: number
  volatility: number
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyScore[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'total_score' | 'total_return' | 'sharpe_ratio'>('total_score')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/data.json')
        const data = await res.json()
        setStrategies(data.scores)
      } catch (err) {
        console.error('Failed to load data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const sortedStrategies = [...strategies].sort((a, b) => {
    if (sortBy === 'total_score') return b.total_score - a.total_score
    if (sortBy === 'total_return') return b.total_return - a.total_return
    return b.sharpe_ratio - a.sharpe_ratio
  })

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20'
    if (score >= 70) return 'text-blue-400 bg-blue-500/20'
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-red-400 bg-red-500/20'
  }

  const getReturnColor = (ret: number) => {
    if (ret > 0) return 'text-green-400'
    if (ret < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">策略列表</h1>
            <p className="text-gray-500 mt-1">查看所有策略的详细表现</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">排序:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="total_score">综合评分</option>
              <option value="total_return">累计收益</option>
              <option value="sharpe_ratio">夏普比率</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedStrategies.map((strategy, index) => (
              <Link
                key={strategy.strategy_code}
                href={`/strategies/${strategy.strategy_code}`}
                className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6 hover:border-gray-600 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      index < 3 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                        {strategy.strategy_code}
                      </h3>
                      <p className="text-sm text-gray-500">策略账户</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(strategy.total_score)}`}>
                    {strategy.total_score.toFixed(1)}分
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">累计收益</p>
                    <p className={`text-lg font-bold ${getReturnColor(strategy.total_return)}`}>
                      {(strategy.total_return * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">夏普比率</p>
                    <p className={`text-lg font-bold ${strategy.sharpe_ratio > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {strategy.sharpe_ratio.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">最大回撤</p>
                    <p className="text-lg font-bold text-orange-400">
                      {(strategy.max_drawdown * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">胜率</p>
                    <p className="text-lg font-bold text-blue-400">
                      {(strategy.win_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-sm text-gray-500">点击查看详情</span>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

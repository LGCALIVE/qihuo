'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

interface StrategyScore {
  strategy_code: string
  total_return: number
  sharpe_ratio: number
  max_drawdown: number
  win_rate: number
  total_score: number
  rank: number
}

interface EquityData {
  trade_date: string
  cumulative_return: number
  strategies: { strategy_code: string }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export default function Dashboard() {
  const [scores, setScores] = useState<StrategyScore[]>([])
  const [equity, setEquity] = useState<EquityData[]>([])
  const [loading, setLoading] = useState(true)
  const [latestDate, setLatestDate] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/data.json')
        const data = await res.json()
        setScores(data.scores)
        setEquity(data.equity)
        setLatestDate(data.meta.latest_date)
      } catch (err) {
        console.error('Failed to load data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const chartData = (() => {
    const grouped: Record<string, Record<string, number | string>> = {}
    equity.forEach(e => {
      const date = e.trade_date
      const code = e.strategies?.strategy_code
      if (!grouped[date]) grouped[date] = { date }
      if (code) grouped[date][code] = e.cumulative_return
    })
    return Object.values(grouped).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  })()

  const strategyCodes = [...new Set(equity.map(e => e.strategies?.strategy_code).filter(Boolean))]
  const avgReturn = scores.length ? scores.reduce((sum, s) => sum + s.total_return, 0) / scores.length : 0
  const avgScore = scores.length ? scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length : 0
  const topStrategy = scores[0]

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">策略总览</h1>
            <p className="text-gray-500 mt-1">数据更新至 {latestDate}</p>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="策略数量" value={scores.length} subtitle={`${equity.length} 条记录`} />
          <MetricCard
            title="平均收益"
            value={`${(avgReturn * 100).toFixed(2)}%`}
            subtitle={avgReturn >= 0 ? '整体盈利' : '整体亏损'}
            valueColor={avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <MetricCard title="平均评分" value={avgScore.toFixed(1)} subtitle="综合表现" />
          <MetricCard
            title="最佳策略"
            value={topStrategy?.strategy_code || '-'}
            subtitle={`评分 ${topStrategy?.total_score.toFixed(1)}`}
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 累计收益曲线 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">累计收益率曲线</h3>
              <Link href="/strategies" className="text-sm text-blue-400 hover:text-blue-300">
                查看全部 →
              </Link>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(v: number) => [`${v.toFixed(3)}%`, '']}
                  />
                  <Legend />
                  {strategyCodes.map((code, i) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={code}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 策略排行榜 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">策略排行榜</h3>
              <Link href="/strategies" className="text-sm text-blue-400 hover:text-blue-300">
                查看详情 →
              </Link>
            </div>
            <div className="space-y-2">
              {scores.slice(0, 6).map((s, i) => (
                <Link
                  key={s.strategy_code}
                  href={`/strategies/${s.strategy_code}`}
                  className="flex items-center p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < 3 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-black' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-white group-hover:text-blue-400">{s.strategy_code}</p>
                    <p className="text-xs text-gray-500">
                      夏普 {s.sharpe_ratio.toFixed(2)} · 胜率 {(s.win_rate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${s.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(s.total_return * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500">{s.total_score.toFixed(1)}分</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}

function MetricCard({ title, value, subtitle, valueColor = 'text-white' }: {
  title: string
  value: string | number
  subtitle: string
  valueColor?: string
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
    </div>
  )
}

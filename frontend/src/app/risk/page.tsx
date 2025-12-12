'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts'

interface RiskData {
  strategy_code: string
  margin_ratio: number
  net_exposure: number
  gross_exposure: number
  top1_concentration: number
  position_count: number
  trade_count: number
  turnover: number
}

interface BehaviorData {
  strategy_code: string
  floating_loss_add_count: number
  counter_trend_add_count: number
  high_severity_count: number
  behavior_risk_score: number
}

export default function RiskPage() {
  const [riskData, setRiskData] = useState<RiskData[]>([])
  const [behaviorData, setBehaviorData] = useState<BehaviorData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/data.json')
        const data = await res.json()
        setRiskData(data.risk || [])
        setBehaviorData(data.behavior || [])
      } catch (err) {
        console.error('Failed to load data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  // 准备图表数据
  const marginData = riskData.map(r => ({
    name: r.strategy_code,
    value: r.margin_ratio * 100,
    color: r.margin_ratio > 0.3 ? '#ef4444' : r.margin_ratio > 0.15 ? '#f59e0b' : '#10b981'
  }))

  const exposureData = riskData.map(r => ({
    name: r.strategy_code,
    净敞口: Math.abs(r.net_exposure) * 100,
    总敞口: r.gross_exposure * 100,
  }))

  const concentrationData = riskData.map(r => ({
    name: r.strategy_code,
    value: r.top1_concentration * 100,
    color: r.top1_concentration > 0.8 ? '#ef4444' : r.top1_concentration > 0.5 ? '#f59e0b' : '#10b981'
  }))

  // 计算风险综合评分
  const getRiskLevel = (r: RiskData) => {
    let score = 0
    if (r.margin_ratio > 0.3) score += 30
    else if (r.margin_ratio > 0.15) score += 15

    if (r.top1_concentration > 0.8) score += 30
    else if (r.top1_concentration > 0.5) score += 15

    if (r.gross_exposure > 3) score += 20
    else if (r.gross_exposure > 2) score += 10

    if (r.position_count <= 2) score += 20
    else if (r.position_count <= 4) score += 10

    return score
  }

  const riskScores = riskData.map(r => ({
    strategy: r.strategy_code,
    score: getRiskLevel(r),
  })).sort((a, b) => b.score - a.score)

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-white">风险监控</h1>
          <p className="text-gray-500 mt-1">实时监控所有策略的风险指标</p>
        </div>

        {/* 风险概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <RiskOverviewCard
            title="高风险策略"
            value={riskScores.filter(r => r.score >= 50).length}
            total={riskScores.length}
            color="red"
          />
          <RiskOverviewCard
            title="中风险策略"
            value={riskScores.filter(r => r.score >= 25 && r.score < 50).length}
            total={riskScores.length}
            color="yellow"
          />
          <RiskOverviewCard
            title="低风险策略"
            value={riskScores.filter(r => r.score < 25).length}
            total={riskScores.length}
            color="green"
          />
          <RiskOverviewCard
            title="平均集中度"
            value={`${(riskData.reduce((sum, r) => sum + r.top1_concentration, 0) / riskData.length * 100).toFixed(1)}%`}
            subtitle="最大品种占比"
            color="blue"
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 保证金占用率 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">保证金占用率</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" domain={[0, 10]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#888' }} />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fill: '#888' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(v: number) => [`${v.toFixed(1)}%`, '保证金占用']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {marginData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 敞口对比 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">敞口对比</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exposureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fill: '#888' }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: '#888' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(v: number) => [`${v.toFixed(1)}%`, '']} />
                  <Legend />
                  <Bar dataKey="净敞口" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="总敞口" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 集中度 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">持仓集中度</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={concentrationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#888' }} />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fill: '#888' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(v: number) => [`${v.toFixed(1)}%`, '集中度']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {concentrationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 风险评分排名 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">风险评分排名</h3>
            <p className="text-sm text-gray-500 mb-4">分数越高风险越大</p>
            <div className="space-y-3">
              {riskScores.map((item, index) => (
                <div key={item.strategy} className="flex items-center">
                  <span className="w-16 text-sm font-medium text-gray-400">{item.strategy}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          item.score >= 50 ? 'bg-red-500' :
                          item.score >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                  <span className={`w-12 text-right font-bold ${
                    item.score >= 50 ? 'text-red-400' :
                    item.score >= 25 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 详细风险表格 */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">详细风险指标</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">策略</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">保证金占用</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">净敞口</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">总敞口</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">集中度</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">品种数</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">成交数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {riskData.map((r) => (
                  <tr key={r.strategy_code} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{r.strategy_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge value={r.margin_ratio * 100} thresholds={[15, 30]} suffix="%" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-300">
                      {(r.net_exposure * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge value={r.gross_exposure * 100} thresholds={[200, 300]} suffix="%" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge value={r.top1_concentration * 100} thresholds={[50, 80]} suffix="%" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-300">{r.position_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-300">{r.trade_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function RiskOverviewCard({ title, value, total, subtitle, color }: {
  title: string
  value: number | string
  total?: number
  subtitle?: string
  color: 'red' | 'yellow' | 'green' | 'blue'
}) {
  const colorClasses = {
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  }

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <p className="text-sm opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-1">
        {value}
        {total !== undefined && <span className="text-lg opacity-50">/{total}</span>}
      </p>
      {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
  )
}

function StatusBadge({ value, thresholds, suffix = '' }: {
  value: number
  thresholds: [number, number]
  suffix?: string
}) {
  const [warn, danger] = thresholds
  const color = value >= danger ? 'bg-red-500/20 text-red-400' :
                value >= warn ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'

  return (
    <span className={`px-2 py-1 rounded-full text-sm font-medium ${color}`}>
      {value.toFixed(1)}{suffix}
    </span>
  )
}

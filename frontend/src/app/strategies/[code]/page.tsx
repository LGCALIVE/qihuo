'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, BarChart, Bar } from 'recharts'

interface Position {
  strategy_code: string
  trade_date: string
  contract: string
  direction: string
  qty: number
  avg_price: number
  settlement: number
  floating_pnl: number
  margin: number
  exchange: string
  open_date: string
}

interface StrategyData {
  score: {
    strategy_code: string
    total_return: number
    annualized_return: number
    sharpe_ratio: number
    max_drawdown: number
    calmar_ratio: number
    win_rate: number
    volatility: number
    avg_margin_ratio: number
    performance_score: number
    risk_score: number
    total_score: number
    rank: number
  } | null
  equity: Array<{
    trade_date: string
    equity: number
    cumulative_return: number
    margin_used: number
    floating_pnl: number
  }>
  risk: {
    margin_ratio: number
    net_exposure: number
    gross_exposure: number
    top1_concentration: number
    position_count: number
    trade_count: number
    turnover: number
  } | null
  positions: Position[]
}

export default function StrategyDetailPage() {
  const params = useParams()
  const code = params.code as string
  const [data, setData] = useState<StrategyData>({ score: null, equity: [], risk: null, positions: [] })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/data.json')
        const allData = await res.json()

        const score = allData.scores.find((s: any) => s.strategy_code === code)
        const equity = allData.equity
          .filter((e: any) => e.strategies?.strategy_code === code)
          .map((e: any) => ({
            trade_date: e.trade_date,
            equity: e.equity,
            cumulative_return: e.cumulative_return,
            margin_used: e.margin_used,
            floating_pnl: e.floating_pnl,
          }))
        const risk = allData.risk.find((r: any) => r.strategy_code === code)
        const positions = (allData.positions || []).filter((p: any) => p.strategy_code === code)

        setData({ score, equity, risk, positions })

        // 设置默认选中日期为最新日期
        if (equity.length > 0) {
          const sortedDates = equity.map((e: any) => e.trade_date).sort().reverse()
          setSelectedDate(sortedDates[0])
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [code])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!data.score) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">未找到策略数据</p>
          <Link href="/strategies" className="text-blue-600 hover:underline mt-2 inline-block">
            返回策略列表
          </Link>
        </div>
      </Layout>
    )
  }

  const { score, equity, risk, positions } = data

  // 获取所有日期列表
  const dates = [...new Set(positions.map(p => p.trade_date))].sort().reverse()

  // 获取选中日期的持仓
  const selectedPositions = positions.filter(p => p.trade_date === selectedDate)

  // 计算每日收益率
  const dailyReturns = equity.map((e, i) => {
    if (i === 0) return { ...e, daily_return: 0 }
    const prevEquity = equity[i - 1].equity
    const dailyReturn = ((e.equity - prevEquity) / prevEquity) * 100
    return { ...e, daily_return: dailyReturn }
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* 返回按钮和标题 */}
        <div className="flex items-center space-x-4">
          <Link
            href="/strategies"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{code}</h1>
            <p className="text-gray-500">策略详细分析</p>
          </div>
          <span className={`ml-auto px-4 py-2 rounded-full text-lg font-bold ${
            score.total_score >= 80 ? 'bg-green-500/20 text-green-400' :
            score.total_score >= 70 ? 'bg-blue-500/20 text-blue-400' :
            score.total_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            排名 #{score.rank} · {score.total_score.toFixed(1)}分
          </span>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard
            label="累计收益"
            value={`${(score.total_return * 100).toFixed(2)}%`}
            color={score.total_return >= 0 ? 'green' : 'red'}
          />
          <MetricCard
            label="年化收益"
            value={`${(score.annualized_return * 100).toFixed(2)}%`}
            color={score.annualized_return >= 0 ? 'green' : 'red'}
          />
          <MetricCard
            label="夏普比率"
            value={score.sharpe_ratio.toFixed(2)}
            color={score.sharpe_ratio >= 1 ? 'green' : score.sharpe_ratio >= 0 ? 'yellow' : 'red'}
          />
          <MetricCard
            label="最大回撤"
            value={`${(score.max_drawdown * 100).toFixed(2)}%`}
            color={score.max_drawdown <= 0.05 ? 'green' : score.max_drawdown <= 0.1 ? 'yellow' : 'red'}
          />
          <MetricCard
            label="胜率"
            value={`${(score.win_rate * 100).toFixed(1)}%`}
            color={score.win_rate >= 0.6 ? 'green' : score.win_rate >= 0.5 ? 'yellow' : 'red'}
          />
          <MetricCard
            label="卡玛比率"
            value={score.calmar_ratio.toFixed(2)}
            color={score.calmar_ratio >= 2 ? 'green' : score.calmar_ratio >= 1 ? 'yellow' : 'red'}
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 累计收益曲线 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">累计收益率曲线</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equity}>
                  <defs>
                    <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="trade_date" tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(v: number) => [`${v.toFixed(3)}%`, '累计收益']} />
                  <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="cumulative_return" stroke="#3b82f6" fill="url(#colorReturn)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 每日收益分布 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">每日收益率</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyReturns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="trade_date" tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(v: number) => [`${v.toFixed(3)}%`, '日收益']} />
                  <ReferenceLine y={0} stroke="#555" />
                  <Bar
                    dataKey="daily_return"
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 权益变化 */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">账户权益变化</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="trade_date" tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#888' }}
                    tickFormatter={(v) => `${(v/1e6).toFixed(2)}M`}
                    domain={[(dataMin: number) => dataMin * 0.999, (dataMax: number) => dataMax * 1.001]}
                  />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(v: number) => [`${v.toLocaleString()}`, '权益']} />
                  <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 风险指标 */}
          {risk && (
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">当前风险状态</h3>
              <div className="space-y-4">
                <RiskBar label="保证金占用" value={risk.margin_ratio} max={0.5} />
                <RiskBar label="净敞口" value={Math.abs(risk.net_exposure)} max={2} />
                <RiskBar label="总敞口" value={risk.gross_exposure} max={4} />
                <RiskBar label="集中度" value={risk.top1_concentration} max={1} />
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{risk.position_count}</p>
                    <p className="text-sm text-gray-500">持仓品种数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{risk.trade_count}</p>
                    <p className="text-sm text-gray-500">今日成交笔数</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 持仓明细 */}
        {positions.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">持仓明细</h3>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#0d0d0d] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>

            {selectedPositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">合约</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">方向</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">数量</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">均价</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">结算价</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">浮动盈亏</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">保证金</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">交易所</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {selectedPositions.map((pos, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-white">{pos.contract}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            pos.direction === '多' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {pos.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">{pos.qty}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">{pos.avg_price.toFixed(2)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">{pos.settlement.toFixed(2)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-right font-medium ${
                          pos.floating_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {pos.floating_pnl >= 0 ? '+' : ''}{pos.floating_pnl.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">{pos.margin.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-gray-400">{pos.exchange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 持仓汇总 */}
                <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">持仓品种</p>
                    <p className="text-xl font-bold text-white">{selectedPositions.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">浮动盈亏</p>
                    <p className={`text-xl font-bold ${
                      selectedPositions.reduce((sum, p) => sum + p.floating_pnl, 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedPositions.reduce((sum, p) => sum + p.floating_pnl, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">占用保证金</p>
                    <p className="text-xl font-bold text-white">
                      {selectedPositions.reduce((sum, p) => sum + p.margin, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                当日无持仓
              </div>
            )}
          </div>
        )}

        {/* AI分析入口 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">AI 智能分析</h3>
              <p className="text-blue-100">让 AI 为您分析该策略的表现，并给出优化建议</p>
            </div>
            <Link
              href={`/analysis?strategy=${code}`}
              className="px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              开始分析
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'green' | 'red' | 'yellow' | 'blue' }) {
  const colorClasses = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <p className="text-xs opacity-75 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function RiskBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = Math.min((value / max) * 100, 100)
  const getColor = () => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-white">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface BehaviorAlert {
  strategy_code: string
  trade_date: string
  alert_type: string
  severity: string
  contract: string
  description: string
  details: {
    floating_pnl?: number
    loss_ratio?: number
    add_quantity?: number
    add_direction?: string
    price_change?: number
    change_pct?: number
    direction?: string
    quantity?: number
    price?: number
  }
}

interface BehaviorSummary {
  strategy_code: string
  floating_loss_add_count: number
  counter_trend_add_count: number
  high_severity_count: number
  behavior_risk_score: number
  recent_alerts: BehaviorAlert[]
}

interface Props {
  data: BehaviorSummary[]
  onSelectStrategy?: (code: string) => void
}

const SEVERITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
}

const ALERT_TYPE_LABELS = {
  floating_loss_add: '浮亏加仓',
  counter_trend_add: '逆势加仓',
}

export default function BehaviorAnalysis({ data, onSelectStrategy }: Props) {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  // 按行为风险评分排序
  const sortedData = [...data].sort((a, b) => b.behavior_risk_score - a.behavior_risk_score)

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: '高危', color: 'text-red-600 bg-red-50' }
    if (score >= 50) return { label: '中等', color: 'text-yellow-600 bg-yellow-50' }
    if (score >= 20) return { label: '注意', color: 'text-blue-600 bg-blue-50' }
    return { label: '正常', color: 'text-green-600 bg-green-50' }
  }

  const toggleExpand = (code: string) => {
    setExpandedStrategy(expandedStrategy === code ? null : code)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">行为分析</h2>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">浮亏加仓</span>
          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">逆势加仓</span>
        </div>
      </div>

      {/* 行为风险概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {sortedData.slice(0, 4).map((item) => {
          const risk = getRiskLevel(item.behavior_risk_score)
          return (
            <div
              key={item.strategy_code}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${risk.color}`}
              onClick={() => {
                toggleExpand(item.strategy_code)
                onSelectStrategy?.(item.strategy_code)
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.strategy_code}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/50">{risk.label}</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{item.behavior_risk_score}</div>
              <div className="mt-1 text-xs opacity-75">
                浮亏加仓 {item.floating_loss_add_count} | 逆势 {item.counter_trend_add_count}
              </div>
            </div>
          )
        })}
      </div>

      {/* 详细列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>策略行为详情</span>
          <button
            onClick={() => setShowAllAlerts(!showAllAlerts)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showAllAlerts ? '收起' : '展开全部'}
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">策略</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">风险分</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">浮亏加仓</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">逆势加仓</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">高危</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(showAllAlerts ? sortedData : sortedData.slice(0, 5)).map((item) => {
                const risk = getRiskLevel(item.behavior_risk_score)
                const isExpanded = expandedStrategy === item.strategy_code

                return (
                  <>
                    <tr
                      key={item.strategy_code}
                      className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleExpand(item.strategy_code)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <span className="ml-2 font-medium text-gray-900">{item.strategy_code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-sm rounded ${risk.color}`}>
                          {item.behavior_risk_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={item.floating_loss_add_count > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                          {item.floating_loss_add_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={item.counter_trend_add_count > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                          {item.counter_trend_add_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={item.high_severity_count > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}>
                          {item.high_severity_count}
                        </span>
                      </td>
                    </tr>

                    {/* 展开的预警详情 */}
                    {isExpanded && item.recent_alerts && item.recent_alerts.length > 0 && (
                      <tr key={`${item.strategy_code}-alerts`}>
                        <td colSpan={5} className="px-4 py-3 bg-gray-50">
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 mb-2">最近预警记录</div>
                            {item.recent_alerts.slice(0, 5).map((alert, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded border text-sm ${SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS] || 'bg-gray-100'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {ALERT_TYPE_LABELS[alert.alert_type as keyof typeof ALERT_TYPE_LABELS] || alert.alert_type}
                                  </span>
                                  <span className="text-xs opacity-75">{alert.trade_date}</span>
                                </div>
                                <div className="mt-1 text-xs opacity-90">{alert.description}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 说明 */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p><strong>浮亏加仓:</strong> 在持仓亏损时继续加仓，可能导致亏损放大</p>
        <p><strong>逆势加仓:</strong> 在价格下跌时买入或上涨时卖出，可能是抄底/摸顶行为</p>
      </div>
    </div>
  )
}

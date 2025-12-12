'use client'

import { StrategyScoreWithInfo } from '@/types/database'

interface Props {
  data: StrategyScoreWithInfo[]
  onSelect?: (strategyId: string) => void
  selectedId?: string
}

export default function StrategyRankingTable({ data, onSelect, selectedId }: Props) {
  const formatPercent = (value: number | null) => {
    if (value === null) return '-'
    return `${(value * 100).toFixed(2)}%`
  }

  const formatNumber = (value: number | null, decimals = 2) => {
    if (value === null) return '-'
    return value.toFixed(decimals)
  }

  const getReturnColor = (value: number | null) => {
    if (value === null) return ''
    return value >= 0 ? 'text-profit' : 'text-loss'
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100'
    if (score >= 70) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">策略排行榜</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">策略</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">累计收益</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">夏普比率</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">最大回撤</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">胜率</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">综合评分</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedId === item.strategy_id ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelect?.(item.strategy_id)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    item.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                    item.rank === 2 ? 'bg-gray-100 text-gray-800' :
                    item.rank === 3 ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {item.rank}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {item.strategies?.strategy_code || '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.strategies?.strategy_name || '-'}
                  </div>
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-right text-sm font-medium ${getReturnColor(item.total_return)}`}>
                  {formatPercent(item.total_return)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-right text-sm ${getReturnColor(item.sharpe_ratio)}`}>
                  {formatNumber(item.sharpe_ratio)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-loss">
                  {formatPercent(item.max_drawdown)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                  {formatPercent(item.win_rate)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(item.total_score)}`}>
                    {formatNumber(item.total_score, 1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

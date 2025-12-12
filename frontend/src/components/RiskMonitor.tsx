'use client'

interface RiskMetric {
  strategy_code: string
  margin_ratio: number | null
  net_exposure: number | null
  gross_exposure: number | null
  top1_concentration: number | null
  position_count: number | null
}

interface Props {
  data: RiskMetric[]
}

export default function RiskMonitor({ data }: Props) {
  const formatPercent = (value: number | null) => {
    if (value === null) return '-'
    return `${(value * 100).toFixed(1)}%`
  }

  const getStatusColor = (value: number | null, thresholds: { warning: number; danger: number }) => {
    if (value === null) return 'bg-gray-100 text-gray-800'
    if (value >= thresholds.danger) return 'bg-red-100 text-red-800'
    if (value >= thresholds.warning) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">风险监控</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">策略</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">保证金占用率</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">净敞口</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">总敞口</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">集中度</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">品种数</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.strategy_code} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.strategy_code}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    getStatusColor(item.margin_ratio, { warning: 0.5, danger: 0.8 })
                  }`}>
                    {formatPercent(item.margin_ratio)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                  {formatPercent(item.net_exposure)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    getStatusColor(item.gross_exposure, { warning: 2, danger: 5 })
                  }`}>
                    {formatPercent(item.gross_exposure)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    getStatusColor(item.top1_concentration, { warning: 0.5, danger: 0.8 })
                  }`}>
                    {formatPercent(item.top1_concentration)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                  {item.position_count ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-xs">
          <span className="flex items-center">
            <span className="w-3 h-3 bg-green-100 rounded-full mr-1"></span>
            正常
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 bg-yellow-100 rounded-full mr-1"></span>
            警告
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 bg-red-100 rounded-full mr-1"></span>
            危险
          </span>
        </div>
      </div>
    </div>
  )
}

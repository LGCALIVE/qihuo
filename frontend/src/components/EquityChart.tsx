'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

interface EquityData {
  trade_date: string
  equity?: number | null
  cumulative_return?: number | null
  strategies?: {
    strategy_code: string
    strategy_name?: string | null
  }
  strategy_id?: string
}

interface Props {
  data: EquityData[]
  selectedStrategies?: string[]
}

// 颜色列表
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
]

export default function EquityChart({ data, selectedStrategies }: Props) {
  // 按日期分组，使用累计收益率
  const groupedByDate = data.reduce((acc, item) => {
    const date = item.trade_date
    if (!acc[date]) {
      acc[date] = { date }
    }
    const strategyCode = item.strategies?.strategy_code || item.strategy_id
    // 使用累计收益率，如果没有则用0
    acc[date][strategyCode] = item.cumulative_return ?? 0
    return acc
  }, {} as Record<string, any>)

  const chartData = Object.values(groupedByDate).sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  // 获取所有策略代码
  const allStrategies = [...new Set(data.map(d => d.strategies?.strategy_code || d.strategy_id))]
  const displayStrategies = selectedStrategies?.length ? selectedStrategies : allStrategies

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">累计收益率曲线</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.slice(5)} // 只显示 MM-DD
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
              domain={['auto', 'auto']}
            />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(3)}%`, '']}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Legend />
            {displayStrategies.map((strategy, index) => (
              <Line
                key={strategy}
                type="monotone"
                dataKey={strategy}
                name={strategy}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

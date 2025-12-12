'use client'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'default' | 'success' | 'warning' | 'danger'
}

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  color = 'default'
}: Props) {
  const colorClasses = {
    default: 'bg-white',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  }

  const trendClasses = {
    up: 'text-profit',
    down: 'text-loss',
    neutral: 'text-gray-500',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  return (
    <div className={`rounded-lg shadow border p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-1 flex items-baseline justify-between">
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        {trend && trendValue && (
          <div className={`flex items-center text-sm ${trendClasses[trend]}`}>
            <span>{trendIcons[trend]}</span>
            <span className="ml-1">{trendValue}</span>
          </div>
        )}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
      )}
    </div>
  )
}

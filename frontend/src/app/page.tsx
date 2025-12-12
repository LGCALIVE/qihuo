'use client'

import { useState, useEffect } from 'react'
import StrategyRankingTable from '@/components/StrategyRankingTable'
import EquityChart from '@/components/EquityChart'
import MetricCard from '@/components/MetricCard'
import RiskMonitor from '@/components/RiskMonitor'
import { supabase } from '@/lib/supabase'
import type { StrategyScoreWithInfo, DailyEquityWithInfo } from '@/types/database'

interface RiskMetric {
  strategy_code: string
  margin_ratio: number | null
  net_exposure: number | null
  gross_exposure: number | null
  top1_concentration: number | null
  position_count: number | null
  trade_count?: number | null
  turnover?: number | null
}

interface DataFile {
  scores: StrategyScoreWithInfo[]
  equity: DailyEquityWithInfo[]
  risk: RiskMetric[]
  meta: {
    latest_date: string
    strategy_count: number
    total_equity_records: number
    total_position_records: number
    total_trade_records: number
  }
}

export default function Dashboard() {
  const [scores, setScores] = useState<StrategyScoreWithInfo[]>([])
  const [equity, setEquity] = useState<DailyEquityWithInfo[]>([])
  const [riskData, setRiskData] = useState<RiskMetric[]>([])
  const [meta, setMeta] = useState<DataFile['meta'] | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'supabase' | 'static'>('static')

  useEffect(() => {
    async function fetchFromSupabase(): Promise<boolean> {
      try {
        // 尝试从 Supabase 获取数据
        const { data: scoresData, error: scoresError } = await supabase
          .from('strategy_scores')
          .select(`*, strategies (strategy_code, strategy_name)`)
          .order('rank')

        if (scoresError || !scoresData || scoresData.length === 0) {
          return false
        }

        setScores(scoresData as StrategyScoreWithInfo[])

        // 获取权益数据
        const { data: equityData } = await supabase
          .from('daily_equity')
          .select(`*, strategies (strategy_code, strategy_name)`)
          .order('trade_date')

        if (equityData && equityData.length > 0) {
          // 计算累计收益率
          const strategyGroups: Record<string, any[]> = {}
          equityData.forEach((e: any) => {
            const code = e.strategies?.strategy_code || e.strategy_id
            if (!strategyGroups[code]) strategyGroups[code] = []
            strategyGroups[code].push(e)
          })

          const enrichedEquity: any[] = []
          Object.entries(strategyGroups).forEach(([code, items]) => {
            items.sort((a, b) => a.trade_date.localeCompare(b.trade_date))
            const firstEquity = items[0].equity
            items.forEach(item => {
              enrichedEquity.push({
                ...item,
                cumulative_return: ((item.equity / firstEquity) - 1) * 100
              })
            })
          })
          setEquity(enrichedEquity)
        }

        // 获取最新风险数据
        const latestDate = equityData?.[equityData.length - 1]?.trade_date
        if (latestDate) {
          const { data: metricsData } = await supabase
            .from('daily_metrics')
            .select(`*, strategies (strategy_code)`)
            .eq('trade_date', latestDate)

          if (metricsData) {
            setRiskData(metricsData.map((m: any) => ({
              strategy_code: m.strategies?.strategy_code || '',
              margin_ratio: m.margin_ratio,
              net_exposure: m.net_exposure,
              gross_exposure: m.gross_exposure,
              top1_concentration: m.top1_concentration,
              position_count: m.position_count,
            })))
          }

          setMeta({
            latest_date: latestDate,
            strategy_count: scoresData.length,
            total_equity_records: equityData?.length || 0,
            total_position_records: 0,
            total_trade_records: 0,
          })
        }

        setDataSource('supabase')
        return true
      } catch (err) {
        console.log('Supabase 连接失败，尝试静态数据')
        return false
      }
    }

    async function fetchFromStatic(): Promise<boolean> {
      try {
        const response = await fetch('/data.json')
        if (!response.ok) return false
        const data: DataFile = await response.json()
        setScores(data.scores)
        setEquity(data.equity)
        setRiskData(data.risk)
        setMeta(data.meta)
        setDataSource('static')
        return true
      } catch {
        return false
      }
    }

    async function fetchData() {
      // 优先尝试 Supabase
      const supabaseOk = await fetchFromSupabase()
      if (!supabaseOk) {
        // 回退到静态数据
        const staticOk = await fetchFromStatic()
        if (!staticOk) {
          setError('数据加载失败')
        }
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  // 计算汇总指标
  const avgReturn = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.total_return || 0), 0) / scores.length
    : 0
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.total_score || 0), 0) / scores.length
    : 0
  const highRiskCount = riskData.filter(r =>
    (r.margin_ratio || 0) > 0.5 || (r.top1_concentration || 0) > 0.8
  ).length

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">期货策略分析平台</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 text-xs rounded ${
                dataSource === 'supabase'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {dataSource === 'supabase' ? 'Supabase' : '本地数据'}
              </span>
              {meta && (
                <span className="text-sm text-gray-500">
                  {meta.latest_date}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">加载数据中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500">{error}</p>
              <p className="mt-2 text-sm text-gray-500">
                请运行: <code className="bg-gray-100 px-2 py-1 rounded">python src/export_data.py</code>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="策略数量"
                value={scores.length}
                subtitle={meta ? `${meta.total_equity_records} 条权益记录` : ''}
              />
              <MetricCard
                title="平均收益率"
                value={`${(avgReturn * 100).toFixed(2)}%`}
                trend={avgReturn >= 0 ? 'up' : 'down'}
                trendValue={avgReturn >= 0 ? '盈利' : '亏损'}
                color={avgReturn >= 0 ? 'success' : 'danger'}
              />
              <MetricCard
                title="平均评分"
                value={avgScore.toFixed(1)}
                subtitle="综合表现"
                color={avgScore >= 70 ? 'success' : avgScore >= 60 ? 'warning' : 'danger'}
              />
              <MetricCard
                title="风险预警"
                value={highRiskCount}
                subtitle={highRiskCount > 0 ? '需关注' : '全部正常'}
                color={highRiskCount > 0 ? 'warning' : 'success'}
              />
            </div>

            {/* 主内容区 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 策略排行榜 */}
              <StrategyRankingTable
                data={scores}
                onSelect={setSelectedStrategy}
                selectedId={selectedStrategy}
              />

              {/* 权益曲线 */}
              <EquityChart
                data={equity}
                selectedStrategies={selectedStrategy ? [
                  scores.find(s => s.strategy_id === selectedStrategy)?.strategies?.strategy_code || ''
                ] : undefined}
              />
            </div>

            {/* 风险监控 */}
            <RiskMonitor data={riskData} />

            {/* 数据统计 */}
            {meta && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">数据统计</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">策略数:</span>
                    <span className="ml-2 font-medium">{meta.strategy_count}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">权益记录:</span>
                    <span className="ml-2 font-medium">{meta.total_equity_records}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">持仓记录:</span>
                    <span className="ml-2 font-medium">{meta.total_position_records}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">成交记录:</span>
                    <span className="ml-2 font-medium">{meta.total_trade_records}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部 */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            期货策略分析平台 MVP v0.1 - 基于Excel结算单真实计算
          </p>
        </div>
      </footer>
    </main>
  )
}

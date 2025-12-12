'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Layout from '@/components/Layout'
import ReactMarkdown from 'react-markdown'

interface StrategyData {
  code: string
  score: any
  risk: any
  behavior?: any
}

function AnalysisContent() {
  const searchParams = useSearchParams()
  const strategyParam = searchParams.get('strategy')

  const [strategies, setStrategies] = useState<StrategyData[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<string>(strategyParam || '')
  const [analysisMode, setAnalysisMode] = useState<'single' | 'overview'>('single')
  const [apiKey] = useState(process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/data.json')
        const data = await res.json()

        const strategyList = data.scores.map((s: any) => ({
          code: s.strategy_code,
          score: s,
          risk: data.risk.find((r: any) => r.strategy_code === s.strategy_code),
          behavior: data.behavior?.find((b: any) => b.strategy_code === s.strategy_code),
        }))

        setStrategies(strategyList)

        if (strategyParam && !selectedStrategy) {
          setSelectedStrategy(strategyParam)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      }
    }
    fetchData()
  }, [strategyParam, selectedStrategy])

  const selectedData = strategies.find(s => s.code === selectedStrategy)

  const buildPrompt = () => {
    if (!selectedData) return ''

    const { score, risk, behavior } = selectedData

    return `你是一个专业的期货策略分析师。请根据以下策略数据进行详细分析，并给出具体的优化建议。

## 策略基本信息
- 策略代码: ${score.strategy_code}
- 综合评分: ${score.total_score}/100 (排名第${score.rank})

## 绩效指标
- 累计收益率: ${(score.total_return * 100).toFixed(2)}%
- 年化收益率: ${(score.annualized_return * 100).toFixed(2)}%
- 夏普比率: ${score.sharpe_ratio.toFixed(2)}
- 卡玛比率: ${score.calmar_ratio.toFixed(2)}
- 最大回撤: ${(score.max_drawdown * 100).toFixed(2)}%
- 胜率: ${(score.win_rate * 100).toFixed(1)}%
- 波动率: ${(score.volatility * 100).toFixed(2)}%

## 风险指标
${risk ? `- 保证金占用率: ${(risk.margin_ratio * 100).toFixed(1)}%
- 净敞口: ${(risk.net_exposure * 100).toFixed(1)}%
- 总敞口: ${(risk.gross_exposure * 100).toFixed(1)}%
- 最大品种集中度: ${(risk.top1_concentration * 100).toFixed(1)}%
- 持仓品种数: ${risk.position_count}
- 当日成交笔数: ${risk.trade_count}` : '无风险数据'}

${behavior ? `## 行为分析
- 浮亏加仓次数: ${behavior.floating_loss_add_count}
- 逆势加仓次数: ${behavior.counter_trend_add_count}
- 高危预警次数: ${behavior.high_severity_count}
- 行为风险评分: ${behavior.behavior_risk_score}` : ''}

请从以下几个方面进行分析：

1. **总体评价**: 对策略的整体表现进行评价，指出优势和不足
2. **风险评估**: 分析当前的风险水平，是否存在潜在风险
3. **绩效诊断**: 分析收益来源和亏损原因，评估策略的稳定性
4. **行为分析**: 评估交易行为是否合理，是否存在危险操作
5. **优化建议**: 给出3-5条具体可行的优化建议
6. **风险预警**: 指出需要特别关注的风险点

请用中文回答，语言专业但易懂，适合给基金经理汇报。`
  }

  const buildOverviewPrompt = () => {
    if (strategies.length === 0) return ''

    const strategySummaries = strategies.map(s => {
      const { score, risk } = s
      return `### ${score.strategy_code}
- 综合评分: ${score.total_score.toFixed(1)}/100 (排名第${score.rank})
- 累计收益: ${(score.total_return * 100).toFixed(2)}%
- 年化收益: ${(score.annualized_return * 100).toFixed(2)}%
- 夏普比率: ${score.sharpe_ratio.toFixed(2)}
- 最大回撤: ${(score.max_drawdown * 100).toFixed(2)}%
- 胜率: ${(score.win_rate * 100).toFixed(1)}%
- 波动率: ${(score.volatility * 100).toFixed(2)}%
${risk ? `- 保证金占用: ${(risk.margin_ratio * 100).toFixed(1)}%
- 集中度: ${(risk.top1_concentration * 100).toFixed(1)}%
- 持仓品种: ${risk.position_count}个` : ''}`
    }).join('\n\n')

    return `你是一个专业的期货策略分析师。请对以下所有策略进行综合对比分析，帮助投资者了解每个策略的特点，并给出投资建议。

## 策略数据总览

${strategySummaries}

请从以下几个方面进行综合分析：

1. **策略排名与评价**: 按综合表现对所有策略进行排名，说明每个排名的理由
2. **收益对比**: 对比各策略的收益能力，分析收益来源差异
3. **风险对比**: 对比各策略的风险水平，分析谁的风险控制更好
4. **风险收益比**: 从夏普比率、卡玛比率等角度分析各策略的性价比
5. **策略特点**: 总结每个策略的核心特点和适合的投资场景
6. **投资建议**:
   - 哪个策略最值得重点关注？为什么？
   - 哪个策略需要警惕？为什么？
   - 如何进行策略组合配置？
7. **风险提示**: 指出整体需要关注的风险点

请用中文回答，语言专业但易懂，适合给基金经理汇报。结论要明确，不要模棱两可。`
  }

  const handleAnalysis = async () => {
    if (analysisMode === 'single' && !selectedStrategy) {
      setError('请选择要分析的策略')
      return
    }

    setLoading(true)
    setError('')
    setAnalysis('')

    try {
      const prompt = analysisMode === 'overview' ? buildOverviewPrompt() : buildPrompt()

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个专业的期货策略分析师，擅长分析量化策略的绩效和风险。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || '请求失败')
      }

      // 流式读取
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  content += delta
                  setAnalysis(content)
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || '分析失败，请检查 API Key 是否正确')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-white">AI 智能分析</h1>
        <p className="text-gray-500 mt-1">使用 DeepSeek AI 分析策略表现并获取优化建议</p>
      </div>

      {/* 分析模式选择 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setAnalysisMode('overview')}
          className={`p-6 rounded-xl border transition-all ${
            analysisMode === 'overview'
              ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500 text-white'
              : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-600'
          }`}
        >
          <div className="text-left">
            <h3 className="font-semibold text-lg mb-1">全部策略对比分析</h3>
            <p className="text-sm opacity-70">AI 对比所有策略，推荐最佳策略</p>
          </div>
        </button>
        <button
          onClick={() => setAnalysisMode('single')}
          className={`p-6 rounded-xl border transition-all ${
            analysisMode === 'single'
              ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500 text-white'
              : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-600'
          }`}
        >
          <div className="text-left">
            <h3 className="font-semibold text-lg mb-1">单策略深度分析</h3>
            <p className="text-sm opacity-70">AI 深入分析单个策略的表现</p>
          </div>
        </button>
      </div>

      {/* 配置区域 */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {analysisMode === 'overview' ? '全部策略对比' : '分析配置'}
        </h3>

        {analysisMode === 'single' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              选择策略
            </label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择...</option>
              {strategies.map(s => (
                <option key={s.code} value={s.code}>
                  {s.code} (评分: {s.score.total_score.toFixed(1)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 策略概览 - 单策略模式 */}
        {analysisMode === 'single' && selectedData && (
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-3">策略概览: {selectedData.code}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">累计收益:</span>
                <span className={`ml-2 font-medium ${selectedData.score.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(selectedData.score.total_return * 100).toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">夏普比率:</span>
                <span className="ml-2 font-medium text-white">{selectedData.score.sharpe_ratio.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">最大回撤:</span>
                <span className="ml-2 font-medium text-orange-400">
                  {(selectedData.score.max_drawdown * 100).toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">综合评分:</span>
                <span className="ml-2 font-medium text-white">{selectedData.score.total_score.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 策略概览 - 总览模式 */}
        {analysisMode === 'overview' && strategies.length > 0 && (
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-3">将分析 {strategies.length} 个策略</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {strategies.map(s => (
                <div key={s.code} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{s.code}</span>
                  <span className={`font-medium ${s.score.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(s.score.total_return * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleAnalysis}
          disabled={loading || (analysisMode === 'single' && !selectedStrategy)}
          className={`mt-6 w-full py-3 rounded-lg font-medium transition-colors ${
            loading || (analysisMode === 'single' && !selectedStrategy)
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI 分析中...
            </span>
          ) : (
            analysisMode === 'overview' ? '开始全部策略对比分析' : '开始 AI 分析'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* 分析结果 */}
      {(analysis || loading) && (
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {analysisMode === 'overview' ? '全部策略对比分析报告' : '分析报告'}
            </h3>
            <span className="text-sm text-gray-500">
              {loading ? '正在生成...' : '由 DeepSeek AI 生成'}
            </span>
          </div>
          <div className="text-gray-300 leading-relaxed">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-6 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-5 mb-2">{children}</h3>,
                h4: ({ children }) => <h4 className="text-base font-semibold text-white mt-4 mb-2">{children}</h4>,
                p: ({ children }) => <p className="my-3 text-gray-300">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                ul: ({ children }) => <ul className="my-3 ml-4 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-3 ml-4 list-decimal space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                hr: () => <hr className="my-6 border-gray-700" />,
              }}
            >
              {analysis || ''}
            </ReactMarkdown>
            {loading && (
              <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <AnalysisContent />
      </Suspense>
    </Layout>
  )
}

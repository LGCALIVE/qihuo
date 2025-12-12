export interface Database {
  public: {
    Tables: {
      strategies: {
        Row: {
          id: string
          strategy_code: string
          strategy_name: string | null
          client_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          strategy_code: string
          strategy_name?: string | null
          client_name?: string | null
        }
        Update: {
          strategy_code?: string
          strategy_name?: string | null
          client_name?: string | null
        }
      }
      daily_equity: {
        Row: {
          id: string
          strategy_id: string
          trade_date: string
          prev_balance: number | null
          deposit_withdraw: number | null
          realized_pnl: number | null
          commission: number | null
          current_balance: number | null
          floating_pnl: number | null
          equity: number | null
          margin_used: number | null
          available_funds: number | null
          risk_degree: number | null
          daily_return: number | null
          cumulative_return: number | null
          drawdown: number | null
          max_drawdown: number | null
          created_at: string
        }
      }
      strategy_scores: {
        Row: {
          id: string
          strategy_id: string
          calc_date: string
          total_return: number | null
          annualized_return: number | null
          sharpe_ratio: number | null
          max_drawdown: number | null
          calmar_ratio: number | null
          win_rate: number | null
          volatility: number | null
          avg_margin_ratio: number | null
          performance_score: number | null
          risk_score: number | null
          total_score: number | null
          rank: number | null
          created_at: string
        }
      }
      daily_metrics: {
        Row: {
          id: string
          strategy_id: string
          trade_date: string
          margin_ratio: number | null
          long_exposure: number | null
          short_exposure: number | null
          net_exposure: number | null
          gross_exposure: number | null
          total_position_value: number | null
          top1_concentration: number | null
          top3_concentration: number | null
          position_count: number | null
          trade_count: number | null
          turnover: number | null
          created_at: string
        }
      }
      positions: {
        Row: {
          id: string
          strategy_id: string
          trade_date: string
          contract: string
          long_qty: number | null
          long_price: number | null
          short_qty: number | null
          short_price: number | null
          floating_pnl: number | null
          position_value: number | null
          margin: number | null
          exchange: string | null
        }
      }
      alerts: {
        Row: {
          id: string
          strategy_id: string
          trade_date: string
          alert_type: string
          alert_level: string
          alert_message: string | null
          metric_value: number | null
          threshold_value: number | null
          created_at: string
        }
      }
    }
  }
}

// 扩展类型：带策略信息的评分
export interface StrategyScoreWithInfo {
  id: string
  strategy_id: string
  calc_date: string
  total_return: number | null
  annualized_return: number | null
  sharpe_ratio: number | null
  max_drawdown: number | null
  calmar_ratio: number | null
  win_rate: number | null
  volatility: number | null
  avg_margin_ratio: number | null
  performance_score: number | null
  risk_score: number | null
  total_score: number | null
  rank: number | null
  strategies: {
    strategy_code: string
    strategy_name: string | null
  }
}

// 带策略信息的每日权益
export interface DailyEquityWithInfo {
  id: string
  strategy_id: string
  trade_date: string
  equity: number | null
  daily_return: number | null
  cumulative_return: number | null
  margin_used: number | null
  floating_pnl: number | null
  strategies: {
    strategy_code: string
    strategy_name: string | null
  }
}

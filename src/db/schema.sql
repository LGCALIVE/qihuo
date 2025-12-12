-- Supabase 数据库表结构
-- 期货策略分析平台

-- 1. 策略账户表
CREATE TABLE strategies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_code VARCHAR(50) UNIQUE NOT NULL,  -- 策略代码，如 mgq01
    strategy_name VARCHAR(100),                  -- 策略名称
    client_name VARCHAR(100),                    -- 客户名称
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 每日权益表（核心数据）
CREATE TABLE daily_equity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,                    -- 交易日期

    -- 资金状况
    prev_balance DECIMAL(18,2),                  -- 上日结存
    deposit_withdraw DECIMAL(18,2) DEFAULT 0,   -- 当日存取合计
    realized_pnl DECIMAL(18,2),                 -- 平仓盈亏
    commission DECIMAL(18,2),                   -- 当日手续费
    current_balance DECIMAL(18,2),              -- 当日结存
    floating_pnl DECIMAL(18,2),                 -- 浮动盈亏
    equity DECIMAL(18,2),                       -- 客户权益
    margin_used DECIMAL(18,2),                  -- 保证金占用
    available_funds DECIMAL(18,2),              -- 可用资金
    risk_degree DECIMAL(8,4),                   -- 风险度 (%)

    -- 计算指标（由脚本计算后写入）
    daily_return DECIMAL(12,6),                 -- 日收益率
    cumulative_return DECIMAL(12,6),            -- 累计收益率
    drawdown DECIMAL(12,6),                     -- 当前回撤
    max_drawdown DECIMAL(12,6),                 -- 历史最大回撤

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(strategy_id, trade_date)
);

-- 3. 持仓明细表
CREATE TABLE positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,

    contract VARCHAR(50) NOT NULL,              -- 合约代码
    long_qty INT DEFAULT 0,                     -- 买持仓
    long_price DECIMAL(18,4),                   -- 买入价
    short_qty INT DEFAULT 0,                    -- 卖持仓
    short_price DECIMAL(18,4),                  -- 卖出价
    prev_settlement DECIMAL(18,4),              -- 昨结算价
    settlement DECIMAL(18,4),                   -- 今结算价
    floating_pnl DECIMAL(18,2),                 -- 浮动盈亏
    position_value DECIMAL(18,2),               -- 持仓市值
    margin DECIMAL(18,2),                       -- 保证金
    exchange VARCHAR(50),                       -- 交易所
    open_date DATE,                             -- 开仓日期

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 成交明细表
CREATE TABLE trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,

    contract VARCHAR(50) NOT NULL,              -- 合约代码
    trade_id VARCHAR(50),                       -- 成交编号
    trade_time TIME,                            -- 成交时间
    direction VARCHAR(10),                      -- 买/卖
    offset_flag VARCHAR(10),                    -- 开/平
    price DECIMAL(18,4),                        -- 成交价
    quantity INT,                               -- 手数
    amount DECIMAL(18,2),                       -- 成交额
    commission DECIMAL(18,4),                   -- 手续费
    realized_pnl DECIMAL(18,2),                 -- 平仓盈亏
    exchange VARCHAR(50),                       -- 交易所

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 每日风险指标表（计算后存储）
CREATE TABLE daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,

    -- 持仓风险指标
    margin_ratio DECIMAL(8,4),                  -- 保证金占用率
    long_exposure DECIMAL(18,2),                -- 多头敞口
    short_exposure DECIMAL(18,2),               -- 空头敞口
    net_exposure DECIMAL(12,6),                 -- 净敞口比率
    gross_exposure DECIMAL(12,6),               -- 总敞口比率
    total_position_value DECIMAL(18,2),         -- 总持仓市值

    -- 集中度指标
    top1_concentration DECIMAL(8,4),            -- 最大品种占比
    top3_concentration DECIMAL(8,4),            -- 前3品种占比
    position_count INT,                         -- 持仓品种数

    -- 交易活跃度
    trade_count INT,                            -- 成交笔数
    turnover DECIMAL(18,2),                     -- 成交额

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(strategy_id, trade_date)
);

-- 6. 策略评分表（定期计算）
CREATE TABLE strategy_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    calc_date DATE NOT NULL,                    -- 计算日期

    -- 绩效指标
    total_return DECIMAL(12,6),                 -- 累计收益率
    annualized_return DECIMAL(12,6),            -- 年化收益率
    sharpe_ratio DECIMAL(8,4),                  -- 夏普比率
    max_drawdown DECIMAL(12,6),                 -- 最大回撤
    calmar_ratio DECIMAL(8,4),                  -- 卡玛比率
    win_rate DECIMAL(8,4),                      -- 胜率

    -- 风险指标
    avg_margin_ratio DECIMAL(8,4),              -- 平均保证金占用率
    avg_net_exposure DECIMAL(8,4),              -- 平均净敞口
    volatility DECIMAL(12,6),                   -- 波动率

    -- 综合评分
    performance_score DECIMAL(8,2),             -- 绩效得分 (0-100)
    risk_score DECIMAL(8,2),                    -- 风险得分 (0-100)
    total_score DECIMAL(8,2),                   -- 综合得分 (0-100)
    rank INT,                                   -- 排名

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(strategy_id, calc_date)
);

-- 7. 预警记录表
CREATE TABLE alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,

    alert_type VARCHAR(50) NOT NULL,            -- 预警类型
    alert_level VARCHAR(20) NOT NULL,           -- 预警级别: warning/danger
    alert_message TEXT,                         -- 预警内容
    metric_value DECIMAL(18,4),                 -- 触发值
    threshold_value DECIMAL(18,4),              -- 阈值

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 行为预警表（浮亏加仓、逆势加仓等）
CREATE TABLE behavior_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,

    alert_type VARCHAR(50) NOT NULL,            -- 预警类型: floating_loss_add, counter_trend_add
    severity VARCHAR(20) NOT NULL,              -- 严重程度: high, medium, low
    contract VARCHAR(50),                       -- 相关合约
    description TEXT,                           -- 预警描述
    details JSONB,                              -- 详细数据

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 策略行为摘要表（每日汇总）
CREATE TABLE behavior_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    calc_date DATE NOT NULL,                    -- 计算日期

    floating_loss_add_count INT DEFAULT 0,      -- 浮亏加仓次数
    counter_trend_add_count INT DEFAULT 0,      -- 逆势加仓次数
    high_severity_count INT DEFAULT 0,          -- 高危预警次数
    behavior_risk_score DECIMAL(8,2),           -- 行为风险评分 (0-100)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(strategy_id, calc_date)
);

-- 创建索引
CREATE INDEX idx_daily_equity_strategy_date ON daily_equity(strategy_id, trade_date);
CREATE INDEX idx_positions_strategy_date ON positions(strategy_id, trade_date);
CREATE INDEX idx_trades_strategy_date ON trades(strategy_id, trade_date);
CREATE INDEX idx_daily_metrics_strategy_date ON daily_metrics(strategy_id, trade_date);
CREATE INDEX idx_strategy_scores_date ON strategy_scores(calc_date);
CREATE INDEX idx_alerts_strategy_date ON alerts(strategy_id, trade_date);
CREATE INDEX idx_behavior_alerts_strategy_date ON behavior_alerts(strategy_id, trade_date);
CREATE INDEX idx_behavior_summary_strategy_date ON behavior_summary(strategy_id, calc_date);

-- 启用 Row Level Security (可选)
-- ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_equity ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE strategy_scores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

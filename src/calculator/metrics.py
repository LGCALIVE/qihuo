"""
绩效与风险指标计算模块
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class PerformanceMetrics:
    """绩效指标"""
    strategy_code: str
    calc_date: str
    total_return: float          # 累计收益率
    annualized_return: float     # 年化收益率
    sharpe_ratio: float          # 夏普比率
    max_drawdown: float          # 最大回撤
    calmar_ratio: float          # 卡玛比率
    win_rate: float              # 胜率（盈利天数/总天数）
    volatility: float            # 波动率
    avg_margin_ratio: float      # 平均保证金占用率
    performance_score: float     # 绩效得分
    risk_score: float            # 风险得分
    total_score: float           # 综合得分


@dataclass
class DailyMetrics:
    """每日风险指标"""
    strategy_code: str
    trade_date: str
    margin_ratio: float          # 保证金占用率
    long_exposure: float         # 多头敞口
    short_exposure: float        # 空头敞口
    net_exposure: float          # 净敞口比率
    gross_exposure: float        # 总敞口比率
    total_position_value: float  # 总持仓市值
    top1_concentration: float    # 最大品种占比
    top3_concentration: float    # 前3品种占比
    position_count: int          # 持仓品种数
    trade_count: int             # 成交笔数
    turnover: float              # 成交额


class MetricsCalculator:
    """指标计算器"""

    def __init__(self, risk_free_rate: float = 0.03):
        """
        Args:
            risk_free_rate: 无风险利率，默认3%年化
        """
        self.risk_free_rate = risk_free_rate

    def calculate_daily_returns(self, equity_df: pd.DataFrame) -> pd.DataFrame:
        """计算每日收益率"""
        df = equity_df.copy().sort_values('trade_date')

        # 计算日收益率 = (今日权益 - 昨日权益 - 存取金) / 昨日权益
        df['prev_equity'] = df['equity'].shift(1)
        df['daily_return'] = (df['equity'] - df['prev_equity'] - df['deposit_withdraw']) / df['prev_equity']

        # 第一天收益率设为0
        df.loc[df['daily_return'].isna(), 'daily_return'] = 0

        # 计算累计收益率
        df['cumulative_return'] = (1 + df['daily_return']).cumprod() - 1

        # 计算最大回撤
        df['running_max'] = df['equity'].cummax()
        df['drawdown'] = (df['running_max'] - df['equity']) / df['running_max']
        df['max_drawdown'] = df['drawdown'].cummax()

        return df

    def calculate_performance(self, equity_df: pd.DataFrame, strategy_code: str) -> Optional[PerformanceMetrics]:
        """计算策略绩效指标"""
        if len(equity_df) < 2:
            return None

        df = self.calculate_daily_returns(equity_df)
        calc_date = df['trade_date'].max()

        # 基础指标
        total_return = df['cumulative_return'].iloc[-1]
        trading_days = len(df)

        # 年化收益率 (假设252个交易日/年)
        annualized_return = total_return * (252 / trading_days) if trading_days > 0 else 0

        # 波动率（日收益率标准差 × sqrt(252)）
        daily_std = df['daily_return'].std()
        volatility = daily_std * np.sqrt(252) if not np.isnan(daily_std) else 0

        # 夏普比率
        excess_return = annualized_return - self.risk_free_rate
        sharpe_ratio = excess_return / volatility if volatility > 0 else 0

        # 最大回撤
        max_drawdown = df['max_drawdown'].max()

        # 卡玛比率 = 年化收益 / 最大回撤
        calmar_ratio = annualized_return / max_drawdown if max_drawdown > 0 else 0

        # 胜率（日收益>0的天数占比）
        win_days = (df['daily_return'] > 0).sum()
        total_days = (df['daily_return'] != 0).sum()  # 排除无变化的天数
        win_rate = win_days / total_days if total_days > 0 else 0

        # 平均保证金占用率
        avg_margin_ratio = (df['margin_used'] / df['equity']).mean()
        avg_margin_ratio = 0 if np.isnan(avg_margin_ratio) else avg_margin_ratio

        # 计算评分
        performance_score = self._calculate_performance_score(
            total_return, sharpe_ratio, max_drawdown, win_rate
        )
        risk_score = self._calculate_risk_score(avg_margin_ratio, volatility, max_drawdown)
        total_score = performance_score * 0.5 + risk_score * 0.5

        return PerformanceMetrics(
            strategy_code=strategy_code,
            calc_date=calc_date,
            total_return=round(total_return, 6),
            annualized_return=round(annualized_return, 6),
            sharpe_ratio=round(sharpe_ratio, 4),
            max_drawdown=round(max_drawdown, 6),
            calmar_ratio=round(calmar_ratio, 4),
            win_rate=round(win_rate, 4),
            volatility=round(volatility, 6),
            avg_margin_ratio=round(avg_margin_ratio, 4),
            performance_score=round(performance_score, 2),
            risk_score=round(risk_score, 2),
            total_score=round(total_score, 2)
        )

    def _calculate_performance_score(self, total_return: float, sharpe: float,
                                      max_drawdown: float, win_rate: float) -> float:
        """计算绩效得分 (0-100)"""
        # 收益得分 (0-40)：收益率越高越好
        return_score = min(40, max(0, (total_return + 0.05) * 200))  # -5%到15%映射到0-40

        # 夏普得分 (0-30)：夏普比率越高越好
        sharpe_score = min(30, max(0, sharpe * 15))  # 0到2映射到0-30

        # 回撤得分 (0-20)：回撤越小越好
        drawdown_score = max(0, 20 - max_drawdown * 100)  # 0%到20%映射到20-0

        # 胜率得分 (0-10)
        winrate_score = win_rate * 10

        return return_score + sharpe_score + drawdown_score + winrate_score

    def _calculate_risk_score(self, avg_margin_ratio: float, volatility: float,
                               max_drawdown: float) -> float:
        """计算风险得分 (0-100)，越高风险越低"""
        # 保证金占用得分 (0-40)：占用越低越好
        margin_score = max(0, 40 - avg_margin_ratio * 80)  # 0%到50%映射到40-0

        # 波动率得分 (0-30)：波动越低越好
        vol_score = max(0, 30 - volatility * 60)  # 0%到50%映射到30-0

        # 回撤得分 (0-30)：回撤越小越好
        drawdown_score = max(0, 30 - max_drawdown * 150)  # 0%到20%映射到30-0

        return margin_score + vol_score + drawdown_score

    def calculate_daily_metrics(self, equity_row: dict, positions: List[dict],
                                 trades: List[dict]) -> Optional[DailyMetrics]:
        """计算单日风险指标"""
        strategy_code = equity_row['strategy_code']
        trade_date = equity_row['trade_date']
        equity = equity_row['equity']

        if equity <= 0:
            return None

        # 保证金占用率
        margin_ratio = equity_row['margin_used'] / equity if equity > 0 else 0

        # 计算敞口
        long_exposure = 0
        short_exposure = 0
        position_values = {}

        for pos in positions:
            if pos['trade_date'] != trade_date:
                continue

            value = pos['position_value']
            contract_base = ''.join(filter(str.isalpha, pos['contract'].upper()))

            if pos['long_qty'] > 0:
                long_exposure += value
            if pos['short_qty'] > 0:
                short_exposure += value

            # 按品种汇总
            if contract_base not in position_values:
                position_values[contract_base] = 0
            position_values[contract_base] += value

        total_position_value = long_exposure + short_exposure
        net_exposure = (long_exposure - short_exposure) / equity if equity > 0 else 0
        gross_exposure = total_position_value / equity if equity > 0 else 0

        # 集中度
        if position_values:
            sorted_values = sorted(position_values.values(), reverse=True)
            top1_concentration = sorted_values[0] / total_position_value if total_position_value > 0 else 0
            top3_sum = sum(sorted_values[:3])
            top3_concentration = top3_sum / total_position_value if total_position_value > 0 else 0
            position_count = len(position_values)
        else:
            top1_concentration = 0
            top3_concentration = 0
            position_count = 0

        # 成交统计
        day_trades = [t for t in trades if t['trade_date'] == trade_date]
        trade_count = len(day_trades)
        turnover = sum(t['amount'] for t in day_trades)

        return DailyMetrics(
            strategy_code=strategy_code,
            trade_date=trade_date,
            margin_ratio=round(margin_ratio, 4),
            long_exposure=round(long_exposure, 2),
            short_exposure=round(short_exposure, 2),
            net_exposure=round(net_exposure, 6),
            gross_exposure=round(gross_exposure, 6),
            total_position_value=round(total_position_value, 2),
            top1_concentration=round(top1_concentration, 4),
            top3_concentration=round(top3_concentration, 4),
            position_count=position_count,
            trade_count=trade_count,
            turnover=round(turnover, 2)
        )


def performance_to_dict(metrics: PerformanceMetrics) -> dict:
    """转换为字典"""
    return {
        'strategy_code': metrics.strategy_code,
        'calc_date': metrics.calc_date,
        'total_return': metrics.total_return,
        'annualized_return': metrics.annualized_return,
        'sharpe_ratio': metrics.sharpe_ratio,
        'max_drawdown': metrics.max_drawdown,
        'calmar_ratio': metrics.calmar_ratio,
        'win_rate': metrics.win_rate,
        'volatility': metrics.volatility,
        'avg_margin_ratio': metrics.avg_margin_ratio,
        'performance_score': metrics.performance_score,
        'risk_score': metrics.risk_score,
        'total_score': metrics.total_score
    }


def daily_metrics_to_dict(metrics: DailyMetrics) -> dict:
    """转换为字典"""
    return {
        'strategy_code': metrics.strategy_code,
        'trade_date': metrics.trade_date,
        'margin_ratio': metrics.margin_ratio,
        'long_exposure': metrics.long_exposure,
        'short_exposure': metrics.short_exposure,
        'net_exposure': metrics.net_exposure,
        'gross_exposure': metrics.gross_exposure,
        'total_position_value': metrics.total_position_value,
        'top1_concentration': metrics.top1_concentration,
        'top3_concentration': metrics.top3_concentration,
        'position_count': metrics.position_count,
        'trade_count': metrics.trade_count,
        'turnover': metrics.turnover
    }


if __name__ == '__main__':
    # 测试计算
    import sys
    import os
    # 添加 src 目录到 path
    src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    # 使用绝对导入
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "excel_parser",
        os.path.join(src_dir, "parser", "excel_parser.py")
    )
    excel_parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(excel_parser)

    ExcelParser = excel_parser.ExcelParser
    equity_to_dict = excel_parser.equity_to_dict
    position_to_dict = excel_parser.position_to_dict
    trade_to_dict = excel_parser.trade_to_dict

    # 解析数据
    parser = ExcelParser('/Users/jayliu/qihuo_xianyu')
    equity_list, positions_list, trades_list = parser.parse_all()

    # 转换为DataFrame
    equity_dicts = [equity_to_dict(e) for e in equity_list]
    position_dicts = [position_to_dict(p) for p in positions_list]
    trade_dicts = [trade_to_dict(t) for t in trades_list]

    equity_df = pd.DataFrame(equity_dicts)

    # 计算每个策略的绩效
    calculator = MetricsCalculator()

    print("\n=== 策略绩效排名 ===")
    results = []

    for strategy_code in equity_df['strategy_code'].unique():
        strategy_equity = equity_df[equity_df['strategy_code'] == strategy_code].copy()
        perf = calculator.calculate_performance(strategy_equity, strategy_code)
        if perf:
            results.append(performance_to_dict(perf))

    # 按综合得分排序
    results_df = pd.DataFrame(results).sort_values('total_score', ascending=False)
    results_df['rank'] = range(1, len(results_df) + 1)

    print(results_df[['rank', 'strategy_code', 'total_return', 'sharpe_ratio',
                      'max_drawdown', 'win_rate', 'total_score']].to_string(index=False))

    print("\n=== 每日风险指标示例 (最新一天) ===")
    latest_date = equity_df['trade_date'].max()
    for strategy_code in equity_df['strategy_code'].unique()[:2]:  # 只显示前2个
        strategy_equity = equity_df[
            (equity_df['strategy_code'] == strategy_code) &
            (equity_df['trade_date'] == latest_date)
        ]
        if len(strategy_equity) > 0:
            strategy_positions = [p for p in position_dicts if p['strategy_code'] == strategy_code]
            strategy_trades = [t for t in trade_dicts if t['strategy_code'] == strategy_code]

            daily = calculator.calculate_daily_metrics(
                strategy_equity.iloc[0].to_dict(),
                strategy_positions,
                strategy_trades
            )
            if daily:
                print(f"\n{strategy_code}:")
                print(f"  保证金占用率: {daily.margin_ratio:.2%}")
                print(f"  净敞口: {daily.net_exposure:.2%}")
                print(f"  总敞口: {daily.gross_exposure:.2%}")
                print(f"  品种数: {daily.position_count}")
                print(f"  Top1集中度: {daily.top1_concentration:.2%}")

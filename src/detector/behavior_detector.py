"""
交易行为检测模块
检测浮亏加仓、逆势加仓等危险行为
"""

import pandas as pd
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class BehaviorAlert:
    """行为预警"""
    strategy_code: str
    trade_date: str
    alert_type: str          # floating_loss_add, counter_trend_add
    severity: str            # high, medium, low
    contract: str
    description: str
    details: dict


class BehaviorDetector:
    """交易行为检测器"""

    def __init__(self):
        self.alerts: List[BehaviorAlert] = []

    def detect_floating_loss_add(
        self,
        positions: List[dict],
        trades: List[dict],
        equity_data: List[dict]
    ) -> List[BehaviorAlert]:
        """
        检测浮亏加仓行为

        浮亏加仓定义：
        - 当某合约持仓处于浮亏状态时
        - 策略在该合约上继续开仓（加仓）

        这是一种高风险行为，可能导致亏损放大
        """
        alerts = []

        # 按策略和日期分组
        positions_df = pd.DataFrame(positions)
        trades_df = pd.DataFrame(trades)

        if positions_df.empty or trades_df.empty:
            return alerts

        # 获取所有日期
        all_dates = sorted(positions_df['trade_date'].unique())

        for strategy_code in positions_df['strategy_code'].unique():
            strategy_positions = positions_df[positions_df['strategy_code'] == strategy_code]
            strategy_trades = trades_df[trades_df['strategy_code'] == strategy_code]

            for trade_date in all_dates:
                # 获取当天持仓
                day_positions = strategy_positions[
                    strategy_positions['trade_date'] == trade_date
                ]

                # 获取当天开仓交易
                day_trades = strategy_trades[
                    (strategy_trades['trade_date'] == trade_date) &
                    (strategy_trades['offset_flag'] == '开仓')
                ]

                if day_positions.empty or day_trades.empty:
                    continue

                # 检查每笔开仓交易
                for _, trade in day_trades.iterrows():
                    contract = trade['contract']

                    # 找到该合约的现有持仓
                    contract_positions = day_positions[
                        day_positions['contract'] == contract
                    ]

                    if contract_positions.empty:
                        continue

                    # 检查是否有浮亏
                    total_floating_pnl = contract_positions['floating_pnl'].sum()

                    if total_floating_pnl < 0:
                        # 计算浮亏幅度
                        position_value = contract_positions['position_value'].sum()
                        loss_ratio = abs(total_floating_pnl) / position_value if position_value > 0 else 0

                        # 确定严重程度
                        if loss_ratio > 0.05:  # 浮亏超过5%
                            severity = 'high'
                        elif loss_ratio > 0.02:  # 浮亏超过2%
                            severity = 'medium'
                        else:
                            severity = 'low'

                        alerts.append(BehaviorAlert(
                            strategy_code=strategy_code,
                            trade_date=trade_date,
                            alert_type='floating_loss_add',
                            severity=severity,
                            contract=contract,
                            description=f'浮亏加仓: {contract} 浮亏{abs(total_floating_pnl):.2f}元({loss_ratio:.2%})时加仓{trade["quantity"]}手',
                            details={
                                'floating_pnl': round(total_floating_pnl, 2),
                                'loss_ratio': round(loss_ratio, 4),
                                'add_quantity': trade['quantity'],
                                'add_direction': trade['direction'],
                                'add_price': trade['price'],
                                'position_value': round(position_value, 2)
                            }
                        ))

        return alerts

    def detect_counter_trend_add(
        self,
        positions: List[dict],
        trades: List[dict]
    ) -> List[BehaviorAlert]:
        """
        检测逆势加仓行为

        逆势加仓定义：
        - 当合约价格连续下跌时，继续买入（做多）
        - 当合约价格连续上涨时，继续卖出（做空）

        这种行为可能是抄底/摸顶，风险较高
        """
        alerts = []

        positions_df = pd.DataFrame(positions)
        trades_df = pd.DataFrame(trades)

        if positions_df.empty or trades_df.empty:
            return alerts

        # 按策略分组
        for strategy_code in positions_df['strategy_code'].unique():
            strategy_positions = positions_df[positions_df['strategy_code'] == strategy_code]
            strategy_trades = trades_df[trades_df['strategy_code'] == strategy_code]

            # 获取所有日期
            all_dates = sorted(strategy_positions['trade_date'].unique())

            # 构建价格历史（用结算价）
            price_history = {}
            for _, pos in strategy_positions.iterrows():
                contract = pos['contract']
                trade_date = pos['trade_date']
                settlement = pos['settlement']
                prev_settlement = pos['prev_settlement']

                if contract not in price_history:
                    price_history[contract] = {}
                price_history[contract][trade_date] = {
                    'settlement': settlement,
                    'prev_settlement': prev_settlement,
                    'change': settlement - prev_settlement if prev_settlement > 0 else 0,
                    'change_pct': (settlement - prev_settlement) / prev_settlement if prev_settlement > 0 else 0
                }

            # 检查开仓交易
            for _, trade in strategy_trades.iterrows():
                if trade['offset_flag'] != '开仓':
                    continue

                contract = trade['contract']
                trade_date = trade['trade_date']
                direction = trade['direction']

                if contract not in price_history or trade_date not in price_history[contract]:
                    continue

                price_info = price_history[contract][trade_date]
                price_change = price_info['change']
                change_pct = price_info['change_pct']

                # 检测逆势
                is_counter_trend = False
                trend_desc = ''

                if direction == '买' and price_change < 0:
                    # 价格下跌时买入
                    is_counter_trend = True
                    trend_desc = f'价格下跌{abs(change_pct):.2%}时买入'
                elif direction == '卖' and price_change > 0:
                    # 价格上涨时卖出
                    is_counter_trend = True
                    trend_desc = f'价格上涨{change_pct:.2%}时卖出'

                if is_counter_trend:
                    # 确定严重程度
                    if abs(change_pct) > 0.03:  # 涨跌幅超过3%
                        severity = 'high'
                    elif abs(change_pct) > 0.015:  # 涨跌幅超过1.5%
                        severity = 'medium'
                    else:
                        severity = 'low'

                    alerts.append(BehaviorAlert(
                        strategy_code=strategy_code,
                        trade_date=trade_date,
                        alert_type='counter_trend_add',
                        severity=severity,
                        contract=contract,
                        description=f'逆势加仓: {contract} {trend_desc}, 开仓{trade["quantity"]}手',
                        details={
                            'direction': direction,
                            'price_change': round(price_change, 2),
                            'change_pct': round(change_pct, 4),
                            'quantity': trade['quantity'],
                            'price': trade['price'],
                            'settlement': price_info['settlement'],
                            'prev_settlement': price_info['prev_settlement']
                        }
                    ))

        return alerts

    def detect_all(
        self,
        positions: List[dict],
        trades: List[dict],
        equity_data: List[dict]
    ) -> Dict[str, List[BehaviorAlert]]:
        """
        执行所有行为检测
        """
        floating_loss_alerts = self.detect_floating_loss_add(positions, trades, equity_data)
        counter_trend_alerts = self.detect_counter_trend_add(positions, trades)

        # 合并并按严重程度和日期排序
        all_alerts = floating_loss_alerts + counter_trend_alerts

        # 按策略分组
        alerts_by_strategy = {}
        for alert in all_alerts:
            if alert.strategy_code not in alerts_by_strategy:
                alerts_by_strategy[alert.strategy_code] = []
            alerts_by_strategy[alert.strategy_code].append(alert)

        # 每个策略内按日期和严重程度排序
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        for strategy_code in alerts_by_strategy:
            alerts_by_strategy[strategy_code].sort(
                key=lambda x: (x.trade_date, severity_order.get(x.severity, 3)),
                reverse=True
            )

        return alerts_by_strategy

    def get_behavior_summary(
        self,
        positions: List[dict],
        trades: List[dict],
        equity_data: List[dict]
    ) -> Dict[str, dict]:
        """
        获取行为分析摘要
        """
        alerts_by_strategy = self.detect_all(positions, trades, equity_data)

        summary = {}
        for strategy_code, alerts in alerts_by_strategy.items():
            floating_loss_count = len([a for a in alerts if a.alert_type == 'floating_loss_add'])
            counter_trend_count = len([a for a in alerts if a.alert_type == 'counter_trend_add'])
            high_severity_count = len([a for a in alerts if a.severity == 'high'])

            # 计算行为风险评分 (0-100, 越高越危险)
            behavior_risk_score = min(100, (
                floating_loss_count * 5 +
                counter_trend_count * 3 +
                high_severity_count * 10
            ))

            summary[strategy_code] = {
                'total_alerts': len(alerts),
                'floating_loss_add_count': floating_loss_count,
                'counter_trend_add_count': counter_trend_count,
                'high_severity_count': high_severity_count,
                'behavior_risk_score': behavior_risk_score,
                'recent_alerts': [alert_to_dict(a) for a in alerts[:5]]  # 最近5条
            }

        return summary


def alert_to_dict(alert: BehaviorAlert) -> dict:
    """转换为字典"""
    return {
        'strategy_code': alert.strategy_code,
        'trade_date': alert.trade_date,
        'alert_type': alert.alert_type,
        'severity': alert.severity,
        'contract': alert.contract,
        'description': alert.description,
        'details': alert.details
    }


if __name__ == '__main__':
    # 测试检测
    import sys
    import os

    src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    from parser.excel_parser import ExcelParser, equity_to_dict, position_to_dict, trade_to_dict

    # 解析数据
    parser = ExcelParser('/Users/jayliu/qihuo_xianyu')
    equity_list, positions_list, trades_list = parser.parse_all()

    equity_dicts = [equity_to_dict(e) for e in equity_list]
    position_dicts = [position_to_dict(p) for p in positions_list]
    trade_dicts = [trade_to_dict(t) for t in trades_list]

    # 行为检测
    detector = BehaviorDetector()
    summary = detector.get_behavior_summary(position_dicts, trade_dicts, equity_dicts)

    print("\n=== 行为分析摘要 ===")
    for strategy_code, data in sorted(summary.items(), key=lambda x: x[1]['behavior_risk_score'], reverse=True):
        print(f"\n{strategy_code}:")
        print(f"  行为风险评分: {data['behavior_risk_score']}")
        print(f"  浮亏加仓次数: {data['floating_loss_add_count']}")
        print(f"  逆势加仓次数: {data['counter_trend_add_count']}")
        print(f"  高危预警次数: {data['high_severity_count']}")

        if data['recent_alerts']:
            print(f"  最近预警:")
            for alert in data['recent_alerts'][:3]:
                print(f"    - [{alert['severity']}] {alert['description']}")

"""
导出真实计算数据为 JSON 文件
供前端直接使用
"""

import os
import sys
import json
import importlib.util

# 动态导入模块
src_dir = os.path.dirname(os.path.abspath(__file__))

spec = importlib.util.spec_from_file_location(
    "excel_parser",
    os.path.join(src_dir, "parser", "excel_parser.py")
)
excel_parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(excel_parser)

spec2 = importlib.util.spec_from_file_location(
    "metrics",
    os.path.join(src_dir, "calculator", "metrics.py")
)
metrics_module = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(metrics_module)

import pandas as pd


def main():
    # 解析 Excel 数据
    print("解析 Excel 数据...")
    base_path = os.path.dirname(src_dir)
    parser = excel_parser.ExcelParser(base_path)
    equity_list, positions_list, trades_list = parser.parse_all()

    # 转换为 DataFrame
    equity_dicts = [excel_parser.equity_to_dict(e) for e in equity_list]
    position_dicts = [excel_parser.position_to_dict(p) for p in positions_list]
    trade_dicts = [excel_parser.trade_to_dict(t) for t in trades_list]

    equity_df = pd.DataFrame(equity_dicts)

    # 计算绩效指标
    print("\n计算绩效指标...")
    calculator = metrics_module.MetricsCalculator()

    # 1. 策略评分
    scores = []
    for strategy_code in equity_df['strategy_code'].unique():
        strategy_equity = equity_df[equity_df['strategy_code'] == strategy_code].copy()
        perf = calculator.calculate_performance(strategy_equity, strategy_code)
        if perf:
            scores.append(metrics_module.performance_to_dict(perf))

    # 按综合得分排序并添加排名
    scores.sort(key=lambda x: x['total_score'], reverse=True)
    for i, s in enumerate(scores):
        s['rank'] = i + 1
        s['id'] = str(i + 1)
        s['strategy_id'] = str(i + 1)
        s['strategies'] = {
            'strategy_code': s['strategy_code'],
            'strategy_name': s['strategy_code']
        }

    # 2. 每日权益数据（用于图表）- 计算累计收益率
    equity_data = []
    strategy_id_map = {s['strategy_code']: s['strategy_id'] for s in scores}

    # 按策略分组计算累计收益率
    for strategy_code in equity_df['strategy_code'].unique():
        strategy_equity = equity_df[equity_df['strategy_code'] == strategy_code].copy()
        strategy_equity = strategy_equity.sort_values('trade_date')

        # 计算累计收益率
        first_equity = strategy_equity['equity'].iloc[0]
        strategy_equity['cumulative_return'] = (strategy_equity['equity'] / first_equity - 1) * 100  # 转为百分比

        for _, row in strategy_equity.iterrows():
            equity_data.append({
                'id': f"eq-{len(equity_data)}",
                'strategy_id': strategy_id_map.get(strategy_code, '0'),
                'trade_date': row['trade_date'],
                'equity': row['equity'],
                'cumulative_return': round(row['cumulative_return'], 4),  # 累计收益率%
                'margin_used': row['margin_used'],
                'floating_pnl': row['floating_pnl'],
                'strategies': {
                    'strategy_code': strategy_code,
                    'strategy_name': strategy_code
                }
            })

    # 3. 每日风险指标（最新一天）
    latest_date = equity_df['trade_date'].max()
    risk_data = []

    for strategy_code in equity_df['strategy_code'].unique():
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
                dm = metrics_module.daily_metrics_to_dict(daily)
                risk_data.append({
                    'strategy_code': dm['strategy_code'],
                    'margin_ratio': dm['margin_ratio'],
                    'net_exposure': dm['net_exposure'],
                    'gross_exposure': dm['gross_exposure'],
                    'top1_concentration': dm['top1_concentration'],
                    'position_count': dm['position_count'],
                    'trade_count': dm['trade_count'],
                    'turnover': dm['turnover']
                })

    # 导出为 JSON
    output = {
        'scores': scores,
        'equity': equity_data,
        'risk': risk_data,
        'meta': {
            'latest_date': latest_date,
            'strategy_count': len(scores),
            'total_equity_records': len(equity_data),
            'total_position_records': len(position_dicts),
            'total_trade_records': len(trade_dicts)
        }
    }

    # 保存到前端 public 目录
    output_path = os.path.join(base_path, 'frontend', 'public', 'data.json')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n数据已导出到: {output_path}")
    print(f"  - 策略评分: {len(scores)} 条")
    print(f"  - 权益数据: {len(equity_data)} 条")
    print(f"  - 风险数据: {len(risk_data)} 条")

    # 打印策略排名
    print("\n=== 策略排名（真实数据）===")
    print(f"{'排名':>4} {'策略':>10} {'累计收益':>10} {'夏普':>8} {'最大回撤':>10} {'胜率':>8} {'评分':>8}")
    for s in scores:
        print(f"{s['rank']:>4} {s['strategy_code']:>10} {s['total_return']*100:>9.2f}% {s['sharpe_ratio']:>8.2f} {s['max_drawdown']*100:>9.2f}% {s['win_rate']*100:>7.1f}% {s['total_score']:>8.1f}")


if __name__ == '__main__':
    main()

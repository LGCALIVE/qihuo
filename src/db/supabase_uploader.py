"""
Supabase 数据上传器
将解析的数据上传到 Supabase
"""

import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
import importlib.util

# 动态导入其他模块
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 导入 excel_parser
spec = importlib.util.spec_from_file_location(
    "excel_parser",
    os.path.join(src_dir, "parser", "excel_parser.py")
)
excel_parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(excel_parser)

# 导入 metrics
spec2 = importlib.util.spec_from_file_location(
    "metrics",
    os.path.join(src_dir, "calculator", "metrics.py")
)
metrics_module = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(metrics_module)

try:
    from supabase import create_client, Client
except ImportError:
    print("请先安装 supabase 库: pip install supabase")
    sys.exit(1)

import pandas as pd


class SupabaseUploader:
    """Supabase 数据上传器"""

    def __init__(self, url: str, key: str):
        """
        Args:
            url: Supabase 项目 URL
            key: Supabase anon/service key
        """
        self.client: Client = create_client(url, key)
        self.strategy_id_map: Dict[str, str] = {}  # strategy_code -> id

    def ensure_strategies(self, strategy_codes: List[str]) -> None:
        """确保策略记录存在"""
        for code in strategy_codes:
            # 检查是否已存在
            response = self.client.table('strategies').select('id').eq('strategy_code', code).execute()

            if response.data:
                self.strategy_id_map[code] = response.data[0]['id']
            else:
                # 创建新记录
                response = self.client.table('strategies').insert({
                    'strategy_code': code,
                    'strategy_name': code,  # 可后续更新
                }).execute()
                self.strategy_id_map[code] = response.data[0]['id']

        print(f"策略ID映射: {self.strategy_id_map}")

    def upload_daily_equity(self, equity_list: List) -> int:
        """上传每日权益数据"""
        records = []
        for eq in equity_list:
            eq_dict = excel_parser.equity_to_dict(eq)
            strategy_id = self.strategy_id_map.get(eq_dict['strategy_code'])
            if not strategy_id:
                continue

            records.append({
                'strategy_id': strategy_id,
                'trade_date': eq_dict['trade_date'],
                'prev_balance': eq_dict['prev_balance'],
                'deposit_withdraw': eq_dict['deposit_withdraw'],
                'realized_pnl': eq_dict['realized_pnl'],
                'commission': eq_dict['commission'],
                'current_balance': eq_dict['current_balance'],
                'floating_pnl': eq_dict['floating_pnl'],
                'equity': eq_dict['equity'],
                'margin_used': eq_dict['margin_used'],
                'available_funds': eq_dict['available_funds'],
                'risk_degree': eq_dict['risk_degree'],
            })

        # 分批上传（Supabase 有限制）
        batch_size = 100
        uploaded = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.client.table('daily_equity').upsert(
                    batch,
                    on_conflict='strategy_id,trade_date'
                ).execute()
                uploaded += len(batch)
            except Exception as e:
                print(f"上传权益数据失败: {e}")

        return uploaded

    def upload_positions(self, positions_list: List) -> int:
        """上传持仓数据"""
        # 先删除旧数据，再插入新数据
        records = []
        for pos in positions_list:
            pos_dict = excel_parser.position_to_dict(pos)
            strategy_id = self.strategy_id_map.get(pos_dict['strategy_code'])
            if not strategy_id:
                continue

            records.append({
                'strategy_id': strategy_id,
                'trade_date': pos_dict['trade_date'],
                'contract': pos_dict['contract'],
                'long_qty': pos_dict['long_qty'],
                'long_price': pos_dict['long_price'],
                'short_qty': pos_dict['short_qty'],
                'short_price': pos_dict['short_price'],
                'prev_settlement': pos_dict['prev_settlement'],
                'settlement': pos_dict['settlement'],
                'floating_pnl': pos_dict['floating_pnl'],
                'position_value': pos_dict['position_value'],
                'margin': pos_dict['margin'],
                'exchange': pos_dict['exchange'],
                'open_date': pos_dict['open_date'],
            })

        batch_size = 100
        uploaded = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.client.table('positions').insert(batch).execute()
                uploaded += len(batch)
            except Exception as e:
                print(f"上传持仓数据失败: {e}")

        return uploaded

    def upload_trades(self, trades_list: List) -> int:
        """上传成交数据"""
        records = []
        for trade in trades_list:
            trade_dict = excel_parser.trade_to_dict(trade)
            strategy_id = self.strategy_id_map.get(trade_dict['strategy_code'])
            if not strategy_id:
                continue

            records.append({
                'strategy_id': strategy_id,
                'trade_date': trade_dict['trade_date'],
                'contract': trade_dict['contract'],
                'trade_id': trade_dict['trade_id'],
                'trade_time': trade_dict['trade_time'],
                'direction': trade_dict['direction'],
                'offset_flag': trade_dict['offset_flag'],
                'price': trade_dict['price'],
                'quantity': trade_dict['quantity'],
                'amount': trade_dict['amount'],
                'commission': trade_dict['commission'],
                'realized_pnl': trade_dict['realized_pnl'],
                'exchange': trade_dict['exchange'],
            })

        batch_size = 100
        uploaded = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.client.table('trades').insert(batch).execute()
                uploaded += len(batch)
            except Exception as e:
                print(f"上传成交数据失败: {e}")

        return uploaded

    def upload_daily_metrics(self, equity_df: pd.DataFrame,
                             positions_list: List, trades_list: List) -> int:
        """计算并上传每日风险指标"""
        calculator = metrics_module.MetricsCalculator()

        position_dicts = [excel_parser.position_to_dict(p) for p in positions_list]
        trade_dicts = [excel_parser.trade_to_dict(t) for t in trades_list]

        records = []
        for _, row in equity_df.iterrows():
            strategy_id = self.strategy_id_map.get(row['strategy_code'])
            if not strategy_id:
                continue

            daily = calculator.calculate_daily_metrics(
                row.to_dict(),
                position_dicts,
                trade_dicts
            )
            if daily:
                dm = metrics_module.daily_metrics_to_dict(daily)
                records.append({
                    'strategy_id': strategy_id,
                    'trade_date': dm['trade_date'],
                    'margin_ratio': dm['margin_ratio'],
                    'long_exposure': dm['long_exposure'],
                    'short_exposure': dm['short_exposure'],
                    'net_exposure': dm['net_exposure'],
                    'gross_exposure': dm['gross_exposure'],
                    'total_position_value': dm['total_position_value'],
                    'top1_concentration': dm['top1_concentration'],
                    'top3_concentration': dm['top3_concentration'],
                    'position_count': dm['position_count'],
                    'trade_count': dm['trade_count'],
                    'turnover': dm['turnover'],
                })

        batch_size = 100
        uploaded = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.client.table('daily_metrics').upsert(
                    batch,
                    on_conflict='strategy_id,trade_date'
                ).execute()
                uploaded += len(batch)
            except Exception as e:
                print(f"上传每日指标失败: {e}")

        return uploaded

    def upload_strategy_scores(self, equity_df: pd.DataFrame) -> int:
        """计算并上传策略评分"""
        calculator = metrics_module.MetricsCalculator()
        records = []

        for strategy_code in equity_df['strategy_code'].unique():
            strategy_id = self.strategy_id_map.get(strategy_code)
            if not strategy_id:
                continue

            strategy_equity = equity_df[equity_df['strategy_code'] == strategy_code].copy()
            perf = calculator.calculate_performance(strategy_equity, strategy_code)

            if perf:
                pm = metrics_module.performance_to_dict(perf)
                records.append({
                    'strategy_id': strategy_id,
                    'calc_date': pm['calc_date'],
                    'total_return': pm['total_return'],
                    'annualized_return': pm['annualized_return'],
                    'sharpe_ratio': pm['sharpe_ratio'],
                    'max_drawdown': pm['max_drawdown'],
                    'calmar_ratio': pm['calmar_ratio'],
                    'win_rate': pm['win_rate'],
                    'volatility': pm['volatility'],
                    'avg_margin_ratio': pm['avg_margin_ratio'],
                    'performance_score': pm['performance_score'],
                    'risk_score': pm['risk_score'],
                    'total_score': pm['total_score'],
                })

        # 计算排名
        records.sort(key=lambda x: x['total_score'], reverse=True)
        for i, r in enumerate(records):
            r['rank'] = i + 1

        try:
            self.client.table('strategy_scores').upsert(
                records,
                on_conflict='strategy_id,calc_date'
            ).execute()
            return len(records)
        except Exception as e:
            print(f"上传策略评分失败: {e}")
            return 0


def main():
    """主函数"""
    # 从环境变量读取 Supabase 配置
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("请设置环境变量 SUPABASE_URL 和 SUPABASE_KEY")
        print("例如:")
        print("  export SUPABASE_URL='https://xxx.supabase.co'")
        print("  export SUPABASE_KEY='eyJhbGciOiJI...'")
        return

    # 解析数据
    print("解析 Excel 数据...")
    parser = excel_parser.ExcelParser('/Users/jayliu/qihuo_xianyu')
    equity_list, positions_list, trades_list = parser.parse_all()

    # 转换
    equity_dicts = [excel_parser.equity_to_dict(e) for e in equity_list]
    equity_df = pd.DataFrame(equity_dicts)

    # 上传到 Supabase
    print("\n连接 Supabase...")
    uploader = SupabaseUploader(SUPABASE_URL, SUPABASE_KEY)

    # 确保策略存在
    strategy_codes = equity_df['strategy_code'].unique().tolist()
    print(f"策略列表: {strategy_codes}")
    uploader.ensure_strategies(strategy_codes)

    # 上传数据
    print("\n上传每日权益...")
    n = uploader.upload_daily_equity(equity_list)
    print(f"  上传 {n} 条记录")

    print("\n上传持仓数据...")
    n = uploader.upload_positions(positions_list)
    print(f"  上传 {n} 条记录")

    print("\n上传成交数据...")
    n = uploader.upload_trades(trades_list)
    print(f"  上传 {n} 条记录")

    print("\n上传每日指标...")
    n = uploader.upload_daily_metrics(equity_df, positions_list, trades_list)
    print(f"  上传 {n} 条记录")

    print("\n上传策略评分...")
    n = uploader.upload_strategy_scores(equity_df)
    print(f"  上传 {n} 条记录")

    print("\n数据上传完成!")


if __name__ == '__main__':
    main()

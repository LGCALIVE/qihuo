"""
Excel 结算单解析器
解析期货逐笔对冲结算单 Excel 文件
"""

import os
import re
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import warnings

warnings.filterwarnings('ignore', category=UserWarning)


@dataclass
class DailyEquity:
    """每日权益数据"""
    strategy_code: str
    trade_date: str
    prev_balance: float
    deposit_withdraw: float
    realized_pnl: float
    commission: float
    current_balance: float
    floating_pnl: float
    equity: float
    margin_used: float
    available_funds: float
    risk_degree: float


@dataclass
class Position:
    """持仓数据"""
    strategy_code: str
    trade_date: str
    contract: str
    long_qty: int
    long_price: float
    short_qty: int
    short_price: float
    prev_settlement: float
    settlement: float
    floating_pnl: float
    position_value: float
    margin: float
    exchange: str
    open_date: str


@dataclass
class Trade:
    """成交数据"""
    strategy_code: str
    trade_date: str
    contract: str
    trade_id: str
    trade_time: str
    direction: str
    offset_flag: str
    price: float
    quantity: int
    amount: float
    commission: float
    realized_pnl: float
    exchange: str


class ExcelParser:
    """结算单 Excel 解析器"""

    def __init__(self, base_path: str):
        self.base_path = base_path

    def find_all_strategy_folders(self) -> List[str]:
        """找到所有策略文件夹"""
        folders = []
        for item in os.listdir(self.base_path):
            item_path = os.path.join(self.base_path, item)
            if os.path.isdir(item_path) and '逐笔对冲' in item:
                folders.append(item_path)
        return sorted(folders)

    def extract_strategy_code(self, folder_name: str) -> str:
        """从文件夹名提取策略代码"""
        # 格式: mgq01_2025-11-17_2025-12-10_逐笔对冲
        match = re.match(r'^([a-zA-Z0-9]+)_', os.path.basename(folder_name))
        return match.group(1) if match else folder_name

    def find_daily_files(self, folder_path: str) -> List[str]:
        """找到文件夹中的每日结算单文件"""
        files = []
        for f in os.listdir(folder_path):
            if f.startswith('核算信息_') and f.endswith('.xlsx'):
                files.append(os.path.join(folder_path, f))
        return sorted(files)

    def extract_date_from_filename(self, filename: str) -> str:
        """从文件名提取日期"""
        # 格式: 核算信息_mgq01_2025-12-10_逐笔对冲.xlsx
        # 需要提取策略代码后面的日期，不是第一个日期
        basename = os.path.basename(filename)
        # 找到所有日期，取最后一个（策略代码后面的那个）
        matches = re.findall(r'(\d{4}-\d{2}-\d{2})', basename)
        return matches[-1] if matches else None

    def parse_daily_equity(self, file_path: str, strategy_code: str) -> Optional[DailyEquity]:
        """解析每日权益数据"""
        try:
            df = pd.read_excel(file_path, sheet_name='客户交易核算日报', header=None)

            # 提取日期
            trade_date = self.extract_date_from_filename(file_path)

            # 解析资金状况 (从第10行开始)
            # 数据位置是固定的，根据之前分析的结构
            data = {}

            for i in range(9, 25):
                row = df.iloc[i]
                # 左侧数据 (列1是名称, 列3是值)
                if pd.notna(row[1]) and pd.notna(row[3]):
                    data[str(row[1]).strip()] = row[3]
                # 右侧数据 (列6是名称, 列8是值)
                if pd.notna(row[6]) and pd.notna(row[8]):
                    data[str(row[6]).strip()] = row[8]

            # 处理风险度 (去掉百分号)
            risk_degree = data.get('风险度', 0)
            if isinstance(risk_degree, str):
                risk_degree = float(risk_degree.replace('%', '')) / 100
            else:
                risk_degree = float(risk_degree) if risk_degree else 0

            return DailyEquity(
                strategy_code=strategy_code,
                trade_date=trade_date,
                prev_balance=float(data.get('上日结存', 0) or 0),
                deposit_withdraw=float(data.get('当日存取合计', 0) or 0),
                realized_pnl=float(data.get('平仓盈亏', 0) or 0),
                commission=float(data.get('当日手续费', 0) or 0),
                current_balance=float(data.get('当日结存', 0) or 0),
                floating_pnl=float(data.get('浮动盈亏', 0) or 0),
                equity=float(data.get('客户权益', 0) or 0),
                margin_used=float(data.get('保证金占用', 0) or 0),
                available_funds=float(data.get('可用资金', 0) or 0),
                risk_degree=risk_degree
            )
        except Exception as e:
            print(f"Error parsing equity from {file_path}: {e}")
            return None

    def parse_positions(self, file_path: str, strategy_code: str) -> List[Position]:
        """解析持仓明细"""
        positions = []
        try:
            df = pd.read_excel(file_path, sheet_name='持仓明细', header=None)
            trade_date = self.extract_date_from_filename(file_path)

            # 找到数据开始行（跳过表头）
            # 列定义在第10行，数据从第11行开始
            for i in range(11, len(df)):
                row = df.iloc[i]

                # 跳过合计行和空行
                contract = row[1]
                if pd.isna(contract) or contract == '合计':
                    continue

                # 解析开仓日期
                open_date_raw = row[12]
                if pd.notna(open_date_raw):
                    open_date_str = str(int(open_date_raw))
                    open_date = f"{open_date_str[:4]}-{open_date_str[4:6]}-{open_date_str[6:8]}"
                else:
                    open_date = None

                positions.append(Position(
                    strategy_code=strategy_code,
                    trade_date=trade_date,
                    contract=str(contract),
                    long_qty=int(row[3]) if pd.notna(row[3]) else 0,
                    long_price=float(row[4]) if pd.notna(row[4]) else 0,
                    short_qty=int(row[5]) if pd.notna(row[5]) else 0,
                    short_price=float(row[6]) if pd.notna(row[6]) else 0,
                    prev_settlement=float(row[7]) if pd.notna(row[7]) else 0,
                    settlement=float(row[8]) if pd.notna(row[8]) else 0,
                    floating_pnl=float(row[9]) if pd.notna(row[9]) else 0,
                    position_value=float(row[16]) if pd.notna(row[16]) else 0,
                    margin=float(row[17]) if pd.notna(row[17]) else 0,
                    exchange=str(row[18]) if pd.notna(row[18]) else '',
                    open_date=open_date
                ))

        except Exception as e:
            print(f"Error parsing positions from {file_path}: {e}")

        return positions

    def parse_trades(self, file_path: str, strategy_code: str) -> List[Trade]:
        """解析成交明细"""
        trades = []
        try:
            df = pd.read_excel(file_path, sheet_name='成交明细', header=None)
            trade_date = self.extract_date_from_filename(file_path)

            # 数据从第11行开始
            for i in range(11, len(df)):
                row = df.iloc[i]

                # 跳过合计行和空行
                contract = row[1]
                if pd.isna(contract) or contract == '合计':
                    continue

                trades.append(Trade(
                    strategy_code=strategy_code,
                    trade_date=trade_date,
                    contract=str(contract),
                    trade_id=str(row[2]) if pd.notna(row[2]) else '',
                    trade_time=str(row[3]) if pd.notna(row[3]) else '',
                    direction=str(row[4]) if pd.notna(row[4]) else '',
                    offset_flag=str(row[9]) if pd.notna(row[9]) else '',
                    price=float(row[6]) if pd.notna(row[6]) else 0,
                    quantity=int(row[7]) if pd.notna(row[7]) else 0,
                    amount=float(row[8]) if pd.notna(row[8]) else 0,
                    commission=float(row[10]) if pd.notna(row[10]) else 0,
                    realized_pnl=float(row[11]) if pd.notna(row[11]) else 0,
                    exchange=str(row[16]) if pd.notna(row[16]) else ''
                ))

        except Exception as e:
            print(f"Error parsing trades from {file_path}: {e}")

        return trades

    def parse_all(self) -> Tuple[List[DailyEquity], List[Position], List[Trade]]:
        """解析所有数据"""
        all_equity = []
        all_positions = []
        all_trades = []

        folders = self.find_all_strategy_folders()
        print(f"Found {len(folders)} strategy folders")

        for folder in folders:
            strategy_code = self.extract_strategy_code(folder)
            print(f"\nProcessing strategy: {strategy_code}")

            daily_files = self.find_daily_files(folder)
            print(f"  Found {len(daily_files)} daily files")

            for file_path in daily_files:
                # 解析权益
                equity = self.parse_daily_equity(file_path, strategy_code)
                if equity:
                    all_equity.append(equity)

                # 解析持仓
                positions = self.parse_positions(file_path, strategy_code)
                all_positions.extend(positions)

                # 解析成交
                trades = self.parse_trades(file_path, strategy_code)
                all_trades.extend(trades)

        print(f"\n总计解析:")
        print(f"  - 权益记录: {len(all_equity)}")
        print(f"  - 持仓记录: {len(all_positions)}")
        print(f"  - 成交记录: {len(all_trades)}")

        return all_equity, all_positions, all_trades


def equity_to_dict(equity: DailyEquity) -> dict:
    """转换为字典格式"""
    return {
        'strategy_code': equity.strategy_code,
        'trade_date': equity.trade_date,
        'prev_balance': equity.prev_balance,
        'deposit_withdraw': equity.deposit_withdraw,
        'realized_pnl': equity.realized_pnl,
        'commission': equity.commission,
        'current_balance': equity.current_balance,
        'floating_pnl': equity.floating_pnl,
        'equity': equity.equity,
        'margin_used': equity.margin_used,
        'available_funds': equity.available_funds,
        'risk_degree': equity.risk_degree
    }


def position_to_dict(position: Position) -> dict:
    """转换为字典格式"""
    return {
        'strategy_code': position.strategy_code,
        'trade_date': position.trade_date,
        'contract': position.contract,
        'long_qty': position.long_qty,
        'long_price': position.long_price,
        'short_qty': position.short_qty,
        'short_price': position.short_price,
        'prev_settlement': position.prev_settlement,
        'settlement': position.settlement,
        'floating_pnl': position.floating_pnl,
        'position_value': position.position_value,
        'margin': position.margin,
        'exchange': position.exchange,
        'open_date': position.open_date
    }


def trade_to_dict(trade: Trade) -> dict:
    """转换为字典格式"""
    return {
        'strategy_code': trade.strategy_code,
        'trade_date': trade.trade_date,
        'contract': trade.contract,
        'trade_id': trade.trade_id,
        'trade_time': trade.trade_time,
        'direction': trade.direction,
        'offset_flag': trade.offset_flag,
        'price': trade.price,
        'quantity': trade.quantity,
        'amount': trade.amount,
        'commission': trade.commission,
        'realized_pnl': trade.realized_pnl,
        'exchange': trade.exchange
    }


if __name__ == '__main__':
    # 测试解析
    parser = ExcelParser('/Users/jayliu/qihuo_xianyu')
    equity_list, positions_list, trades_list = parser.parse_all()

    # 打印示例数据
    if equity_list:
        print("\n示例权益数据:")
        print(equity_to_dict(equity_list[0]))

    if positions_list:
        print("\n示例持仓数据:")
        print(position_to_dict(positions_list[0]))

    if trades_list:
        print("\n示例成交数据:")
        print(trade_to_dict(trades_list[0]))

# 期货策略分析平台

基于 **Vercel + Supabase + Next.js** 的期货策略绩效分析与风险监控平台。

## 项目结构

```
qihuo_xianyu/
├── src/                          # Python 后端
│   ├── parser/                   # Excel 数据解析
│   │   └── excel_parser.py
│   ├── calculator/               # 指标计算
│   │   └── metrics.py
│   └── db/                       # 数据库
│       ├── schema.sql            # Supabase 表结构
│       └── supabase_uploader.py  # 数据上传脚本
│
├── frontend/                     # Next.js 前端
│   ├── src/
│   │   ├── app/                  # 页面
│   │   ├── components/           # 组件
│   │   ├── lib/                  # 工具库
│   │   └── types/                # 类型定义
│   ├── package.json
│   └── .env.example
│
└── *_逐笔对冲/                    # 策略数据文件夹
    └── 核算信息_*.xlsx
```

## 快速开始

### 1. 设置 Supabase

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL Editor 中执行 `src/db/schema.sql` 创建表结构
3. 复制项目 URL 和 anon key

### 2. 上传数据到 Supabase

```bash
# 安装 Python 依赖
pip install pandas openpyxl supabase

# 设置环境变量
export SUPABASE_URL='https://xxx.supabase.co'
export SUPABASE_KEY='eyJhbGciOiJI...'

# 运行数据上传脚本
python src/db/supabase_uploader.py
```

### 3. 部署前端到 Vercel

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase 配置

# 本地开发
npm run dev

# 或直接部署到 Vercel
npx vercel
```

## 功能说明

### MVP 第一期

- [x] **策略排行榜**：按综合评分排序，显示收益率、夏普比率、回撤等
- [x] **权益曲线**：多策略净值走势对比
- [x] **风险监控**：保证金占用率、敞口、集中度等风险指标
- [x] **概览卡片**：策略数量、平均收益、风险预警汇总

### 计划功能

- [ ] 行为检测：浮亏加仓、逆势加仓识别
- [ ] 风格突变：策略风格变化检测
- [ ] 相关性分析：策略间相关性矩阵
- [ ] AI 点评：大模型生成策略分析报告
- [ ] 动态权重：基于风险的配置建议

## 指标计算说明

### 绩效指标

| 指标 | 公式 |
|------|------|
| 日收益率 | (今日权益 - 昨日权益 - 存取金) / 昨日权益 |
| 年化收益率 | 累计收益率 × (252 / 交易天数) |
| 夏普比率 | (年化收益率 - 3%) / 年化波动率 |
| 最大回撤 | max((历史最高 - 当前) / 历史最高) |
| 胜率 | 盈利天数 / 总交易天数 |

### 风险指标

| 指标 | 公式 |
|------|------|
| 保证金占用率 | 保证金占用 / 客户权益 |
| 净敞口 | (多头市值 - 空头市值) / 客户权益 |
| 总敞口 | (多头市值 + 空头市值) / 客户权益 |
| 品种集中度 | 单品种持仓市值 / 总持仓市值 |

### 综合评分 (0-100)

```
绩效得分 = 收益得分(40) + 夏普得分(30) + 回撤得分(20) + 胜率得分(10)
风险得分 = 保证金得分(40) + 波动率得分(30) + 回撤得分(30)
综合评分 = 绩效得分 × 0.5 + 风险得分 × 0.5
```

## 数据格式

支持解析的 Excel 结算单格式：
- Sheet: 客户交易核算日报（权益数据）
- Sheet: 持仓明细（持仓数据）
- Sheet: 成交明细（交易数据）

## 技术栈

- **前端**: Next.js 14, React 18, Tailwind CSS, Recharts
- **后端**: Python 3, Pandas
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel

## 本地测试

如果没有配置 Supabase，前端会自动使用演示数据运行，方便快速查看效果。

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

## License

MIT

# 部署指南

## 一、Supabase 设置

### 1. 创建项目
1. 访问 https://supabase.com 注册/登录
2. 点击 "New Project" 创建新项目
3. 记下项目 URL 和 anon key（在 Settings > API 中）

### 2. 创建数据库表
1. 进入项目的 SQL Editor
2. 复制 `src/db/schema.sql` 的内容并执行

### 3. 上传数据
```bash
# 安装 Python 依赖
pip install pandas openpyxl numpy supabase

# 设置环境变量
export SUPABASE_URL='https://你的项目.supabase.co'
export SUPABASE_KEY='你的anon-key'

# 运行上传脚本
python src/db/supabase_uploader.py
```

---

## 二、Vercel 部署

### 方式一：命令行部署

```bash
cd frontend

# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（首次会创建项目）
vercel

# 设置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 重新部署生产环境
vercel --prod
```

### 方式二：GitHub 自动部署

1. 将代码推送到 GitHub
2. 在 Vercel 控制台导入 GitHub 仓库
3. 设置 Root Directory 为 `frontend`
4. 添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 点击 Deploy

---

## 三、环境变量

### 前端 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

### Python 脚本
```bash
export SUPABASE_URL='https://xxx.supabase.co'
export SUPABASE_KEY='eyJhbGciOiJI...'
```

---

## 四、数据更新流程

当有新的 Excel 数据时：

```bash
# 1. 将新的 Excel 文件放入对应策略文件夹

# 2. 运行上传脚本更新数据库
python src/db/supabase_uploader.py

# 网站会自动显示最新数据（无需重新部署）
```

---

## 五、本地开发

```bash
cd frontend

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local
# 编辑 .env.local 填入真实配置

# 启动开发服务器
npm run dev -- -p 3001
```

访问 http://localhost:3001

---

## 六、常见问题

### Q: 网站显示"本地数据"而不是"Supabase"
A: 检查环境变量是否正确配置，确保数据已上传到 Supabase

### Q: 数据上传失败
A: 确保先在 Supabase 执行了 schema.sql 创建表结构

### Q: 图表不显示
A: 检查浏览器控制台是否有错误，确保 data.json 存在或 Supabase 有数据

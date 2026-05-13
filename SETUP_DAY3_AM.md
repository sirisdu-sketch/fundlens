# Day 3 上午 — Gemini AI 解读

预计 30-50 分钟(含申请 / 验证 Gemini key)。

---

## 0. 解压覆盖

把 zip 解压到原 `fundlens/` 项目根。新增的文件:

- `web/lib/ai.ts` — context builder + Gemini 调用 + 严格 prompt
- `web/lib/ai-cache.ts` — SQLite 缓存读写
- `web/app/api/research/[code]/route.ts` — API endpoint
- `web/components/ai-research.tsx` — 客户端组件
- `web/.env.local.example` — 环境变量模板

修改的文件:
- `schema.sql` — 加 `research_contexts` 表
- `web/app/[code]/page.tsx` — 详情页插入 AI 区块
- `web/package.json` — 加 `@google/generative-ai`

---

## 1. 拿到 Gemini API Key

如果你已经有,跳过。

1. 用代理打开 https://aistudio.google.com/app/apikey
2. **Create API key** → 选一个 Google Cloud 项目(或新建)
3. 复制 key,**这一次显示后下次看不到**,存好

> 免费层:Gemini 1.5 Flash 每分钟 15 个请求,每天 1500 个请求。
> 我们每次 AI 解读约 500 token,$0 跑几个月没问题。

## 2. 配置 .env.local

```bash
cd web
cp .env.local.example .env.local
```

编辑 `.env.local`,填上 key:

```
GEMINI_API_KEY=AIzaSy...你的key
```

> ⚠️ `.env.local` 已经被 `.gitignore` 排除,**不会进 git**。但仍然不要分享 zip 给别人时带这个文件。

## 3. 装新依赖

```bash
cd web
npm install
```

会装上 `@google/generative-ai`(只是个 JS SDK,无 native 编译,很快)。

## 4. 更新 schema(加 AI 缓存表)

```bash
# 项目根目录跑
sqlite3 db/market.db < schema.sql
```

`CREATE TABLE IF NOT EXISTS` 是幂等的,跑了不会破坏现有数据。

验证表建好了:
```bash
sqlite3 db/market.db ".tables"
# 应该看到 research_contexts
```

## 5. 启动 + 测试

```bash
cd web
npm run dev
```

打开任意基金详情页(如 `http://localhost:3000/161725`),滚到最下面会看到:

> **AI 解读** | powered by Gemini
>
> [ ✦ 生成 AI 解读 ]

点这个按钮:
- 第一次:转圈 5-15 秒,然后显示 100-200 字的中文解读
- **再点同一只基金的"重新生成"**:**秒回**(缓存命中,不烧 token)
- 切到另一只基金:重新调 Gemini

## 6. 验证缓存确实在工作

```bash
sqlite3 db/market.db "SELECT code, model, length(analysis), generated_at FROM research_contexts;"
```

每生成一次会多一行。如果反复点同一只基金,行数不增加(用同样 hash 直接读)。

## 7. Commit

```bash
cd ..
git add .
git commit -m "feat(web): Gemini AI analysis with content-hash caching"
```

---

## 几个值得讲的设计细节(简历 / 面试用)

### 1. Prompt 严格约束:Gemini 只做"翻译",不做"分析"

在 `lib/ai.ts` 顶部的 `SYSTEM_PROMPT` 里写明:
- 只能用 INPUT 中的数字,不能补充外部信息
- 不能给具体买卖建议(那是规则引擎的职责)
- 禁用一组营销词("必涨"、"必跌"、"加仓" 等)
- 100-200 字硬约束

**为什么这样?** AI 解读本质是把数字翻译成人话,而不是替用户做决策。
规则引擎(`signals.ts`)管"轻仓/持有/观察/回避",Gemini 管"为什么"。**职责分离**。

### 2. context_hash 缓存:同样输入 = 同样输出

`contextHash` 把指标 round 到合理精度后哈希。这意味着:
- 同一天反复点同一只基金 → 缓存命中,0 token 消耗
- 收盘后第二天指标变了 → 重新生成
- 换模型 → 主键里有 model 字段,旧记录保留,可对比版本

**为什么用 16 位 hash 而不是完整 SHA256?** 16 位 = 64 bits,撞库概率 1/10^19,对个人项目绰绰有余,索引更小。

### 3. 双连接策略:只读 vs 读写分离

`lib/db.ts` 拿到的是 **只读** 连接(用于 prices / indicators 查询)。
`lib/ai-cache.ts` 拿到的是 **读写** 连接(只用于 AI 缓存表)。

**为什么?** Python 端写入行情和指标,Next.js 不该有权限改它们。
AI 缓存是 Next.js 自己产生的数据,它有权限。这是 **principle of least privilege**。

### 4. 客户端按需触发 vs SSR

AI 解读没有跟着页面一起 SSR,而是用 `"use client"` 组件 + 按钮触发。
**为什么?**
- AI 调用 5-15 秒,不能阻塞 SSR(整页都打不开)
- 用户可能压根不点 → 节省 token
- 缓存命中后,二次访问 < 100ms,体验已经够好

---

## 卡住怎么办

| 症状 | 解决 |
|------|------|
| 按钮按了显示"未配置 GEMINI_API_KEY" | `.env.local` 没建 / 没填 / 没重启 `npm run dev` |
| 报 `fetch failed` 或网络错误 | 代理没开,或代理没覆盖到 Node.js 进程 |
| 报 400 / safety filter | Gemini 内容审查触发,通常是输入异常,F12 看 Network 详情 |
| 报 model not found | 你的项目没启用 Gemini API,去 [Google Cloud Console](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) 启用 |
| Mac/Linux 代理不生效 | 在 `web/` 目录跑:`HTTPS_PROXY=http://127.0.0.1:7890 npm run dev` |
| 同样基金多次生成、文字总是一样 | 这是预期的!缓存命中。手动改 schema 删除该行,或换基金 |

---

## Day 3 上午完成

跑通后跟我说"AI 解读搞定",我出 **Day 3 下午**:

- **GitHub Actions CI**(Python pytest + ruff + mypy / Next.js typecheck + build + lint)
- **完整 README 简历版**(架构 Mermaid 图、技术决策表、截图区、demo 链接位)
- **Vercel 部署 + Turso 迁移**(SQLite 在 Vercel 上写不进去,Turso 是 SQLite 协议兼容的云数据库)
- **30 秒录屏建议** + GitHub repo settings 优化

这一段是真正把项目变成"简历亮点"的关键。

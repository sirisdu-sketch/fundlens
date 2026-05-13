# Day 2 — 上手指南

预计 20-40 分钟(主要等 npm install)。

---

## 0. 解压覆盖

把 zip 解压到原 `fundlens/` 项目根。**新增 `web/` 目录**,Python 部分不动。

最终结构:
```
fundlens/
├── fundlens/      # Python 包
├── tests/         # pytest
├── db/            # SQLite(共享)
├── web/           # ← 新增!Next.js
└── ...
```

---

## 1. 前置检查 — 数据是否还在?

```bash
sqlite3 db/market.db "SELECT COUNT(*) FROM indicators;"
```

应该看到几千行。**如果是 0**,先跑:
```bash
python -m fundlens.sync
python -m fundlens.compute
```

---

## 2. 进入 web 目录,装依赖

```bash
cd web
npm install
```

预期 1-3 分钟。`better-sqlite3` 会编译一个 native 模块(C++),需要本地有
build 工具,Mac/Linux 通常自带,Windows 可能要装 `windows-build-tools`。

> 如果 better-sqlite3 装失败:Windows 用户先装 [Node.js 22 LTS](https://nodejs.org)
> 自带的 build 工具,或在 PowerShell(管理员)运行 `npm install --global windows-build-tools`。

---

## 3. 启动开发服务器

```bash
npm run dev
```

打开 `http://localhost:3000`,应该看到:
- **首页**:5 张基金卡片,每张显示信号标签(轻仓/持有/观察/回避)
- **点任一卡片** → 详情页:
  - 顶部大号"操作建议"卡(衬线大字 + 暖琥珀色系)
  - K线图 + 三条均线(MA20/120/250)
  - 时间范围切换(1M/3M/6M/1Y/MAX)
  - 6 个技术指标小方块

---

## 4. 验证 API 也通

新开一个终端:
```bash
curl http://localhost:3000/api/funds
curl http://localhost:3000/api/prices/161725?range=3m
curl http://localhost:3000/api/signal/161725
```

JSON 返回正常,说明前后端通透。

---

## 5. 构建确认(可选,但推荐)

```bash
npm run build
npm run typecheck
```

两条都应该 0 error。这是简历亮点 — TypeScript strict 模式下零类型错误。

---

## 6. Commit

```bash
cd ..   # 回到项目根
git add .
git commit -m "feat(web): Next.js dashboard with signal cards + indicator charts"
```

---

## Day 2 完成清单

| | |
|---|---|
| Next.js 14 App Router | `web/app/` |
| 4 个 API routes | `web/app/api/` |
| lightweight-charts K线 + MA | `web/components/chart.tsx` |
| 操作建议卡(给家人看的核心) | `web/components/signal-card.tsx` |
| 6 指标面板 + 解读文字 | `web/components/indicator-panel.tsx` |
| 信号生成规则 | `web/lib/signals.ts` |
| 时间范围切换 | `web/components/range-tabs.tsx` |
| TypeScript strict, 0 类型错误 | `web/tsconfig.json` |
| 自定义视觉语言(暖色深底 + amber) | `web/tailwind.config.ts` |

---

## 设计选择(简历可讲)

**1. 视觉方向:dark editorial**
不是默认 shadcn 灰白,选了 dark + 暖色深底(#0a0908)+ amber 强调
+ 衬线 display 字体(Instrument Serif)。**面试官第一眼就能看出"这个人在乎设计"**。

**2. 信号生成在服务端 SSR**
首页每张卡的"操作建议"标签是 SSR 时直接算的,不是前端发请求。
打开首页 0 闪烁,SEO 友好。

**3. 关键指标按需计算 vs 缓存**
- RSI / MA / 波动率 / 动量:**预算入库**(变化的是末尾几行,可重算)
- 最大回撤:**前端按时间窗实时算**(因为是区间统计量,每个 range 不同)

这个划分体现"什么该存、什么该算"的判断力。

**4. better-sqlite3 在 Next.js 中的处理**
`next.config.mjs` 标记为 `serverComponentsExternalPackages`。
没这个标记,Next.js 会试图 bundle 它然后炸。这是个真实踩坑细节。

---

## 卡住怎么办

| 症状 | 解决 |
|------|------|
| `npm install` 卡在 better-sqlite3 | 用 Node 22 LTS,Windows 需要 build 工具 |
| 启动后 500 错误 | 检查 `db/market.db` 是否存在 |
| 首页一片空 | 检查 indicators 表有没有数据 |
| K线图不显示 | 浏览器 F12 看 console,通常是 hydration 警告无关紧要 |
| 字体没加载 | 网络问题,Google Fonts 国内可能慢,可以本地化字体 |
| 端口冲突 | `npm run dev -- -p 3001` |

跑通后跟我说"Day 2 搞定",我出 Day 3:
- Gemini AI 解说接入
- GitHub Actions CI(Python pytest + TS typecheck + Next.js build)
- 完整 README(简历版,含架构图、技术决策、截图)
- Turso 迁移 + Vercel 部署
- 30 秒录屏建议

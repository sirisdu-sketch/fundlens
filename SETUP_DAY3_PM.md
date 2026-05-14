# Day 3 下午 — 工程化包装

简历亮点最关键的一段。预计 2-4 小时。

---

## 0. 解压覆盖

把 zip 解压到原项目根。注意几个关键变更:

- `web/package.json` — SDK 换为 `@google/genai`
- `web/lib/ai.ts` — 新 SDK 调用 + Gemini 2.5 Flash + thinkingBudget: 0
- `web/lib/db-init.ts` — **新增**,应用启动自动建表
- `web/lib/db.ts` / `lib/ai-cache.ts` — 改用 ensureSchema
- `.github/workflows/ci.yml` — **新增**,CI 配置
- `README.md` — 完全重写(简历版)
- `LICENSE` — MIT

---

## 1. 升级 SDK + 验证 Gemini 2.5 还能正常调用

```bash
cd web
rm -rf node_modules package-lock.json  # 清干净
npm install
```

新 SDK 装上后,启动:

```bash
npm run dev
```

打开任意基金详情页 → 点"✦ 生成 AI 解读" → 应该正常输出。

> **关键观察**:Gemini 2.5 Flash 默认开了 thinking 模式,会扣 token + 慢。
> 我们在 `lib/ai.ts` 里通过 `thinkingConfig: { thinkingBudget: 0 }` 关闭了它,
> 因为"翻译数字"任务不需要推理链。如果想试试开 thinking 看输出质量是否提升,
> 把那一行删掉再试。

**确认缓存还工作**:点完一次后,数据库里应该多一行:
```bash
sqlite3 ../db/market.db "SELECT model, length(analysis) FROM research_contexts ORDER BY generated_at DESC LIMIT 3;"
```
应该看到 `gemini-2.5-flash`。

---

## 2. 跑一次本地 CI 预演

CI 在 GitHub 上跑前,先在本地确认一次会过:

```bash
# Python 端
cd ..  # 回到项目根
ruff check fundlens tests
pytest -v

# Web 端
cd web
npx tsc --noEmit
npx next lint
npm run build
```

5 条命令全过 → CI 上也会过。**这一步不要省,简历项目首次 CI failed 会很尴尬**。

---

## 3. 截图(简历项目里最重要的资产)

`npm run dev` 启动后,**用浏览器截 4 张图**,保存到 `docs/` 目录:

| 截图 | 保存为 | 截图内容 |
|---|---|---|
| 首页 | `docs/screenshot-home.png` | 5 张基金卡 + 信号标签 |
| 详情页全景 | `docs/screenshot-detail.png` | 顶部信号 hero + K线 + 指标 |
| AI 解读 | `docs/screenshot-ai.png` | 点过"生成"后的状态,显示一段 Gemini 输出 |
| 指标面板 | `docs/screenshot-indicators.png` | 7 个指标方块特写 |

**重要技巧**:
- 用 Chrome DevTools → toggle device toolbar → 设 1280×800,截出来比例最适合 README 展示
- 暗色界面截图,周围别有白色环境干扰,可以在 OS 暗色模式下截
- 不要带个人代理 / VPN 工具条 / 调试浮窗

截好后:
```bash
git add docs/*.png
```

README 顶部的 4 张截图占位会自动渲染。

---

## 4. 把 README 里的占位换掉

打开 `README.md` 顶部,把 `YOUR_GITHUB_USERNAME` 改成你的 GitHub 用户名。

CI badge 的 URL 会变成:
```
https://github.com/<你的用户名>/fundlens/actions/workflows/ci.yml/badge.svg
```

push 到 GitHub 之后这个 badge 会自动变成 "passing" 绿标。

---

## 5. 创建 GitHub repo + 第一次 push

```bash
# 项目根目录
git add .
git commit -m "feat: complete 3-day MVP — data layer, indicators, web UI, AI commentary, CI"
```

**用 GitHub Desktop**:
1. File → Add Local Repository → 选 `fundlens/` 目录
2. Publish repository
3. **Description**: `Personal fund analysis platform · rule-based signals + LLM commentary · built in 3 days`
4. **不要勾选 Private**(简历项目要 public 才能展示)
5. Publish

或者命令行:
```bash
gh repo create fundlens --public --source=. --description "..." --push
```

push 完后,CI 会立刻自动跑(在 Actions 页签可以看)。**第一次跑大约 2-3 分钟**,等绿标。

---

## 6. GitHub repo 包装(5 分钟,但对面试官 first impression 至关重要)

进入 repo 设置:

**About 区(右上角齿轮)**:
- Description: `Personal fund analysis platform · rule-based signals + Gemini-generated commentary`
- Website: 部署后填(下一步)
- Topics: `nextjs` `typescript` `python` `sqlite` `gemini` `fund-analysis` `quantitative` `dashboard`

**Settings → General**:
- Features:取消勾选 Wiki、Projects(没用,clutter)
- 保留 Issues(显得项目"活")

**Settings → Pages**:跳过(不需要)

**README 渲染检查**:
- 截图能正常显示
- Mermaid 架构图能渲染(GitHub 原生支持)
- Badge 都是绿的

---

## 7. 部署(选一个)

### 选项 A:Railway(简单,推荐)

Railway 有持久化卷,better-sqlite3 直接能跑,**代码一行都不用改**。

1. 注册 [Railway](https://railway.app),GitHub 授权登录
2. New Project → Deploy from GitHub repo → 选 fundlens
3. Settings → Root Directory: `web`
4. Variables: 加 `GEMINI_API_KEY`
5. Volumes: 挂载 `/app/db` (持久化 SQLite 文件)
6. Settings → Networking → Generate Domain

> ⚠️ **数据初始化**:Railway 的容器是空的,你需要在容器里跑一次 sync + compute。
> 方法:本地把 `db/market.db` 复制上去,或加一个 `railway run python -m fundlens.sync` 步骤。
> 最简单:加一个 GitHub Action 定时跑 sync,把生成的 db 文件 commit 到 repo(粗暴但能跑)。

### 选项 B:Vercel + Turso(更现代,但要改代码)

Vercel 的 serverless 没文件持久化,SQLite 不能直接用。要把 better-sqlite3 换成 `@libsql/client`(SQLite 协议兼容的云数据库)。

这条路 Phase 2 再做。**简历项目里部署到 Railway 完全够用**,不是亮点损失。

### 最简单的选项 C:不部署,本地跑 + 录屏

如果时间紧,**录一段 30 秒视频就够**了。面试官 90% 不会真点 demo 链接,看视频就够。详见下一步。

---

## 8. 30 秒录屏(强烈推荐)

用 macOS Cmd+Shift+5 / Windows Snipping Tool / OBS。**严格按这个剧本拍**:

| 时间 | 镜头 | 旁白 / 操作 |
|---|---|---|
| 0:00-0:05 | 首页 | 鼠标缓慢扫过 5 张基金卡,镜头停在"信号标签"列 |
| 0:05-0:10 | 点进白酒指数 | 详情页加载,镜头先停在顶部信号 hero 卡 |
| 0:10-0:15 | 切 1Y / MAX | 切换时间范围,K线图重新渲染,3 条 MA 也跟着变 |
| 0:15-0:20 | 滚到指标面板 | 视觉强调"价格在 MA250 上方 X%"这类解读 |
| 0:20-0:30 | 点"生成 AI 解读" | 转圈 → 文字出现 → 镜头停在解读上 |

剪到 30 秒以内,导出为 mp4。

**上传两个地方**:
- 上传到 YouTube unlisted,链接放简历项目段落
- README 顶部加一行 `**[Watch 30s demo](https://youtu.be/...)**`

---

## 9. 简历项目段落草稿

直接抄(改成你自己的 GitHub 链接):

> **FundLens · 基金透镜** | [GitHub](https://github.com/.../fundlens) | [Live demo](https://...) | [30s video](https://youtu.be/...)
>
> 个人基金分析平台。从数据采集、指标计算、信号引擎到前端可视化与 LLM 解读的完整闭环,3 天内独立完成。
>
> - **数据层**:Python + AKShare 拉取沪深开放式基金累计净值,SQLite/WAL 存储,带 100ms 限速 + 3 次指数退避重试
> - **指标层**:RSI / 多周期 MA / 最大回撤 / 年化波动率 / 动量,**13 个 pytest 用例,每个指标含手算参考值**,严格 type hints + ruff
> - **信号引擎**:5 条规则把指标映射到四档操作建议(轻仓 / 持有 / 观察 / 回避),保守优先,不预测方向
> - **前端**:Next.js 14 App Router + lightweight-charts,自定义 dark editorial 设计系统(暖色深底 + amber 强调 + Instrument Serif)。RSC SSR 信号、客户端组件按需触发 AI
> - **AI 解读**:Gemini 2.5 Flash via `@google/genai`,严格 prompt 约束(只翻译数字,禁词列表,100-200 字),**内容哈希缓存** —— 同输入零 token
> - **工程化**:TypeScript strict、双连接策略(只读 + 读写隔离)、GitHub Actions CI(Python: ruff + pytest + mypy;Web: tsc + lint + build)、MIT licensed
>
> Tech: Python 3.11 · Next.js 14 · TypeScript · SQLite · Tailwind · AKShare · Gemini API

---

## 10. 收官 commit + push

```bash
git add .
git commit -m "docs: README, screenshots, license, CI badge"
git push
```

CI 全绿 + README 截图齐全 + Live demo 链接 + 30 秒视频 = **简历级别**。

---

## 完成

3 天 30+ 小时,从 0 到一个**别人能打开**的产品。

如果还有时间,Phase 2 想加什么:
- vectorbt 回测,把"持有" vs "信号驱动" 跑历史曲线对比
- 全市场扫描器(每天找出 RSI 异常的基金)
- 因子收益归因(把累计收益拆成 beta / 行业 / alpha)
- Turso 迁移 + Vercel 部署

但这些都不要现在做。**先完成,再完美**。

# 历史变更（CHANGELOG）

按时间倒序记录 NestEdu / 启芽智教的产品与工程更新摘要。

## 2026-08-18 — 教师画像去掉结构说明小字

- 业务：画像各节不再展示「须带证据」「可展示的代表文档与推荐理由」等内部说明，标题也不再带「（可选）」。
- 技术：`ProfileAgentMarkdown` 去掉 `SECTION_HINTS` 渲染，展示标题时去掉可选标记。
- 验证：打开教师画像，各卡片只保留正式标题与正文。

## 2026-08-18 — 活动方案编辑后按最新正文入库

- 业务：自主编辑 / AI 修改后上传知识库，写入的是修改后的标题与正文，而不是生成时的快照。
- 技术：勾选列表与 `generatedPlans` 对齐；准备/确认入库时按方案 id 取最新内容；上传前刷新未保存的编辑草稿。
- 验证：`pnpm --filter ./apps/web build`；生成方案后改一处正文再入库，知识库详情应看到修改后的内容。

## 2026-08-18 — 教案/周计划知识库支持多格式上传

- 业务：活动方案与周计划知识库上传与教师成果库一致，支持 Word、PDF、PPT、Excel、图片与常见文本，不再仅限 docx。
- 技术：复用成果库格式校验；原文件走 `/api/file/upload` 再登记到教案库/周计划库（`forceKind`），生成方案仍走文本文档入库。
- 验证：`pnpm --filter ./apps/web build`；在活动方案/周计划「知识库管理」分别上传一份 PDF 或 PNG，确认进入对应分类而非成果库。

## 2026-08-18 — 活动方案可编辑 / 画像去掉格式拆解 / 首页闭环收口

- 业务：生成后的活动方案支持自主编辑与 AI 修改；教师画像不再展示「输出格式拆解」；首页成长闭环去掉未作为主路径的「录入补充」。
- 技术：预览区增加编辑表单与教案 Agent 改稿（90s、格式失败重试 1 次）；`ProfileAgentMarkdown` 直接渲染各节；闭环改为三步。
- 验证：`pnpm --filter ./apps/web build`；生成一份方案后分别点「自主编辑」保存、用「AI 修改」改一处；打开画像确认无拆解块；首页闭环为三步。

## 2026-08-13 — 活动方案左右工作台等高并内置滚动

- 业务：生成页左侧表单与右侧预览高度不一致，长方案会把整页撑开。
- 技术：两栏锁定同一高度；左侧表单、右侧预览分别内部滚动，生成/上传按钮固定在左栏底部。
- 验证：`pnpm --filter ./apps/web build`；宽屏打开活动方案生成页，确认两栏等高且右侧可滚动预览。

## 2026-08-12 — 首次登录自动创建教师成果个人文件夹

- 业务：教师首次使用时，知识库「教师成果库」下若无与手机号同名的文件夹，无法上传成果。
- 技术：新增 `ensureArchiveOwnerFolder`，通过平台 `POST /api/knowledge/category/edit` 在教师成果库下自动创建同名子文件夹；成果库列表加载与上传前均会触发 ensure。
- 验证：`pnpm --filter ./apps/web build`；用无文件夹的新手机号登录，进入成果库应自动创建文件夹并可上传。

## 2026-08-12 — 成果入库标题使用智能体解析结果

- 业务：成果解析成功后列表仍显示「企业微信截图_xxx.png」等原始文件名。
- 技术：入库 `document/text` 的 `title` 改为智能体返回的 `title`（经 `sanitizeDocTitleSegment` 清洗）；解析失败仍保留原文件名。
- 验证：重新上传证书截图，列表标题应显示证书名称。

## 2026-08-12 — 成果解析 `/api/ai` 反代补齐

- 业务：成果上传解析报「api route not found」，智能体对话未到达平台。
- 技术：Go 平台反代与 NoRoute 兜底增加 `/api/ai`（与 Vite 代理对齐）；SSE 立即 flush。
- 验证：`cd apps/api && go test ./internal/http/`；重启 Go 与 Vite 后重新上传截图。

## 2026-08-12 — 成果解析改为平台聊天附件链路（识图）

- 业务：证书/截图在平台智能体 14509 可正常解析，但 NestEdu 上传后仅显示「缺少可解析正文」。
- 技术：根因是此前仅 `POST /v1/text/generate` 传文件名+URL，智能体看不到图片；现改为与平台 SPA 一致：`file/upload`（带 `agent_id`）→ `/api/ai/chat/completions` 附件流式对话；Vite 增加 `/api/ai` 代理。
- 验证：`pnpm --filter ./apps/web build`；重启 dev 后重新上传证书截图对比平台直聊结果。

## 2026-08-12 — 修复知识库列表与入库分类不一致

- 业务：迁移知识库 10368 后，教案可生成入库但「知识库管理」列表为空。
- 技术：列表查询增加 `resolveKind`，与入库共用 `resolveLiveBusinessCategory` 动态解析分类 id/key，不再仅依赖 `.env` 旧 category_id。
- 验证：`pnpm --filter ./apps/web build`；重启 dev 后在活动方案「知识库管理」刷新列表。

## 2026-08-12 — 默认知识库迁移至 10368

- 业务：平台教案/周计划/成果库统一对接新知识库 [`10368`](https://www.zcat.cn/teach/knowledge/detail/10368)。
- 技术：`.env` / `.env.example`、`DEFAULT_KNOWLEDGE_ID`、`VITE_DEFAULT_KNOWLEDGE_ID`、Docker 构建默认值、文档与前端 fallback 同步为 `10368`；分类 ID（20806/20807/20895）保持不变。
- 验证：重启 dev 后抽测活动方案列表、周计划、成果库上传。

## 2026-08-12 — 成果库上传接入解析智能体 14509

- 业务：成果文件上传后先经智能体解析再入库；详情展示成果摘要/正文，图片可预览；解析失败明确提示人工核对，不假装成功。
- 技术：`ARCHIVE_PARSE_AGENT_PLATFORM_PROMPT` + `parseArchiveAchievement`；`uploadKnowledgeFile(archive)` 流程改为 file/upload → agent → document/text；`VITE_ARCHIVE_PARSE_AGENT_ID=14509`。
- 验证：`pnpm --filter ./apps/web build`；平台 agent 14509 需粘贴同套系统提示词。

## 2026-08-12 — 教案/周计划仅允许删除「我的」

- 业务：知识库管理中，教师只能删除本人入库的教案或周计划；「全部」列表里他人文档不再显示删除按钮。
- 技术：`isOwnedTeacherPlan` / `assertCanDeleteTeacherPlan`；`PlanManageList` / `PlanSelector` 按本人映射控制删除入口；`useTeachingResources` / `useWeeklyPlanKnowledge` 删除前二次校验。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-07 — Docker 构建改用国内 npm 镜像装 pnpm

- 业务：无。
- 技术：`docker/Dockerfile` 去掉易超时的 `corepack prepare`；`npm install -g pnpm@11.1.2` + `registry.npmmirror.com`（可用 `NPM_REGISTRY` 覆盖）。
- 验证：重新跑 Docker 镜像构建

## 2026-08-07 — 行动计划 BFF +「我的」列表复用 + 清理 scratch

- 业务：教师画像行动建议优先落库（跨设备可同步）；本地旧数据在首次成功读到空 BFF 时自动迁移。
- 技术：新增 `profile_action_bundles` 与 `/api/v1/profile-actions`；抽取 `loadMineTeacherPlans`；根目录一次性分析脚本迁至 `scripts/archive/scratch/`。
- 验证：`cd apps/api && go test ./internal/http/ ./internal/service/`；`pnpm --filter ./apps/web build`

## 2026-08-07 — BFF 鉴权收紧与错误提示统一

- 业务：自有 `/api/v1` 业务接口（除 sample）须登录且携带 `X-Uid-Hash`；画像/入库计数按本人 owner 隔离，禁止跨手机号读写。
- 技术：CORS 白名单（`CORS_ALLOWED_ORIGINS`）；反代与 DeepSeek 超时；Agent ID 改走环境变量；成果库/入库列表分页；平台映射列表省略正文；前端页统一 `getApiErrorMessage`。
- 验证：`cd apps/api && go test ./internal/http/ ./internal/service/ ./internal/config/`

## 2026-08-10 — 周计划勾选体验与成果库说明

- 业务：周计划候选池增加「已选教案」陈列（可取消/清空）、教案列表定高滚动、生成按钮 sticky；预览页增加「继续生成新周计划」，「返回重新勾选」会清空勾选；成果库标明上传不做 OCR，无正文卡片显示未解析提示。
- 技术：`PlanSelector` / `useWeeklyPlan`（`resetAll`、`startFreshWeek`）/ `teachingContext` 允许空主题保留班级周次；`PlanManageList` 增加 `emptyObjectivesHint`。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-07 — 活动方案支持自选生成份数

- 业务：活动方案生成页新增「生成份数」选择（1–5），不再强制等于已选领域个数。
- 技术：`planCount` 写入会话草稿；`buildTeachingPlanUserMessage` / `generateTeachingPlans` 以 `count` 为准，领域仅作重点约束。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-07 — 知识库平台响应改为类型化映射

- 业务：无产品行为变更；列表缺文档 id 的项不再用标题冒充 id，避免误删/误查。
- 技术：新增 `service/platform_knowledge.go`（`PlatformAPIEnvelope` / `PlatformDocument`）；list/detail/upload 统一信封解析与字段白名单；补金样 JSON 单测。
- 验证：`cd apps/api && go test ./internal/service/ -count=1`

## 2026-08-06 — 后端四层补充包与类型注释

- 业务：无行为变更。
- 技术：为 `http` / `service` / `store` / `model` 增加 `doc.go` 包说明，并在路由、知识库/智能体编排、GORM store、表实体与 DTO 等关键类型上补充中文注释。
- 验证：`cd apps/api && go test ./internal/http/ ./internal/service/ ./internal/store/ ./internal/model/`

## 2026-08-06 — 成果库上传落入个人文件夹

- 业务：修复教师成果库上传时文件误入「教师成果库」根目录、未进入手机号同名文件夹的问题。
- 技术：上传前实时解析个人文件夹 `category_id` + `category_key`；成果库对齐平台 SPA **两步入库**（先 `document/text` 不带分类，再 `document/edit` 指定 `category_id`）；跳过不可靠的 `document/file`；上传后校验落点。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-06 — 教案新增导出，周计划导出贴近样表

- 业务：活动方案知识库文档新增 Word 导出；周计划导出样式调整为更接近参考文件。
- 技术：`export-doc.ts` 新增活动方案导出模板；活动方案管理页接入导出按钮；周计划 Word 模板补齐固定表格布局、页边距与标题区排版。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-06 — AI 生成草稿会话内保留

- 业务：活动方案 / 周计划 AI 生成后，切换到其他页面再回来，生成内容与表单可自动恢复（同一浏览器标签页内）。
- 技术：`sessionStorage` 草稿（`generationDraft.ts`），按登录身份隔离；上传成功或点击「返回重新勾选」后清除。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-06 — 周计划页去掉周看板

- 业务：生成周计划后不再展示独立「周看板」区块，直接进入「周计划预览 & 编辑」。
- 技术：移除 `WeekBoard.tsx` 及生成页跳转提示条。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-06 — 前端文案去掉技术术语

- 业务：教师可见文案不再展示 MySQL、智能体 ID、category_key / .env / pnpm 等实现细节；改为「本人入库」「智能助手生成」等表述。
- 技术：调整首页/成果库统计提示、活动方案与周计划说明、画像页说明、上传确认与错误提示等。
- 验证：文案检查

## 2026-08-05 — 重写 README 项目总结

- 业务：按当前五入口产品形态重写 README（活动方案 / 周计划 / 成果库手机号隔离 / 画像 / 多格式上传与 MySQL 计数）。
- 技术：去掉过时描述（昵称隔离、年度报告主推等），对齐鉴权、知识库三类分类、请求拓扑与本地启动。
- 验证：文档更新

## 2026-08-05 — 修复成果库多格式上传「参数错误」

- 业务：成果库上传 PNG/PDF 等不再直接打错误参数的 document/file；改为先平台 `/api/file/upload`，再写入知识库。
- 技术：Vite/Go 反代补齐 `/api/file`；axios 对 FormData 去掉 Content-Type；失败时回退 `document/text`（含文件链接/解析正文）。
- 验证：`pnpm --filter ./apps/web build`

## 2026-08-05 — 成果库支持多格式文件上传

- 业务：教师成果库上传区支持 Word、PDF、PPT、Excel、图片与常见文本，不再仅限 `.docx/.doc`。
- 技术：新增 `uploadKnowledgeFile()` 走平台 `/api/knowledge/document/file`；`FileUploadCard` 可配置 accept；成果库页文案与确认弹窗适配原文件上传。
- 验证：`pnpm --filter ./apps/web build`

## 维护约定

- **每次有实质更新**（功能、修复、配置、部署相关改动）都应在本文**顶部**追加一条，不要改写历史条目。
- 条目格式见下方模板；日期用 `YYYY-MM-DD`，必要时注明构建可见版本（侧栏 `vX.Y.Z · buildId`）。
- 用业务语言写清「做了什么 / 为什么」；技术细节点到关键路径或配置即可。
- 纯文档笔误、本地调试草稿可不记；发版或合并前的一批改动可合并为一条。

```text
## YYYY-MM-DD — 一句话标题

- 业务：…
- 技术：…
- 影响 / 验证：…
```

---

## 2026-08-04 — 修复「纠正到教案库」读不到正文

- **业务**：误入成果库的活动方案点纠正时提示「内容为空」；现会从详情嵌套字段与成果库个人文件夹回退取正文；仍无正文则清理无效 MySQL 映射并提示重新生成入库。
- **技术**：`knowledge.ts` 加深 document 嵌套解析；`relocateTeacherDocs` 增加 archive 回退与 orphan 清理。
- **影响 / 验证**：部署后在「我的」再点纠正；能读到正文则迁入教案库，否则清理空壳映射后请重新生成。

## 2026-08-04 — 加固智能画像 MySQL 落库与登录回显

- **业务**：生成智能画像后写入 `profile_snapshots`；下次登录进入教师画像页自动回显上次文案。
- **技术**：登录后独立解析手机号加载快照；保存后回读校验；失败显式提示（需后端+MySQL）。
- **影响 / 验证**：`pnpm dev:backend` + MySQL；生成成功应提示已保存；刷新/重新登录应看到上次画像。

## 2026-08-03 — 入库可选：仅 MySQL / 平台+MySQL

- **业务**：活动方案与周计划确认入库时可选「仅保存到 MySQL（自己可见）」或「上传平台知识库 + MySQL」。
- **技术**：`teacher_generated_docs` 增加 `storage`/`content`；确认弹窗双按钮；「我的」直接展示 mysql 全文。
- **影响 / 验证**：需后端 AutoMigrate；仅 MySQL 文档在知识库「我的」中带「仅本人」标签，不出现在 AI101 教案库。

## 2026-08-03 — 「我的」空列表与误入成果库可一键纠正

- **业务**：MySQL 已有入库记录，但教案库「我的」为空——文档实际在成果库被隐藏。现按文档 ID 补拉，并提供「纠正到教案库/周计划库」。
- **技术**：`PlanManageList` 合并 MySQL 缺失文档；`relocateTeacherDocs` 重传业务库、更新 MySQL、删除旧文档。
- **影响 / 验证**：部署后打开活动方案 → 知识库 →「我的」，应看到补拉文档或纠正按钮；纠正成功后应出现在教案知识库管理。

## 2026-08-03 — 阻止活动方案/周计划再进教师成果库（正文手机号 + 落点校验）

- **业务**：即便标题已去掉手机号，正文 `【归属】手机号：11位` 仍会被平台智能分类进成果库手机号文件夹。
- **技术**：业务入库清洗正文 11 位号；分类 key 不与 env 混用；上传后若发现已在成果库则撤回并报错；成果库列表隐藏误入的活动方案/周计划。
- **影响 / 验证**：重新部署后从「活动方案 / 周计划」页入库；成功应出现在教案库/周计划库，并写入 MySQL。成果库页仅保留真正的教师成果文档。

## 2026-08-03 — 根治活动方案被「智能分类」进手机号文件夹

- **业务**：平台横幅「分类被删除或未匹配到有效分类」后，会按标题里的 11 位手机号匹配到「教师成果库 / 手机号」文件夹；仅改 category_id 不够。
- **技术**：入库标题改为 `姓名_活动方案_方案名.md`（不再含手机号）；手机号写入正文【归属】；上传前按分类树解析「教案知识库管理」真实 ID。
- **影响 / 验证**：须重新构建部署（`git push`  alone 不等于线上生效）。入库后应出现在「教案知识库管理」；勿点「建议智能分类」。已误入文件需在平台手动挪回。

## 2026-08-03 — 强制活动方案入库「教案知识库管理」

- **业务**：生成的活动方案曾再次落到「教师成果库 / 手机号文件夹」；现改为标题含 `_活动方案_` 或显式 `forceKind=activity` 时一律写入分类 20806。
- **技术**：`uploadKnowledgeDocument` 无条件纠正目标分类，并拒绝最终落到成果库/手机号目录。
- **影响 / 验证**：重新部署后生成并入库，应出现在「教案知识库管理」；已误入成果库的文件需在平台手动挪回。若平台点了「建议智能分类」，请勿把活动方案分到手机号文件夹。

## 2026-08-03 — 修复部署后动态分包加载失败（需二次刷新）

- **业务**：线上偶发 `Failed to fetch dynamically imported module: …/weekly-plan-*.js`，多点几次刷新才恢复；侧栏 `0701` 为构建时间戳，刷新本身不会变。
- **技术**：`index.html` 设 `Cache-Control: no-cache`；`/assets` 长期缓存；增加 chunk 加载失败自动刷新一次。
- **影响 / 验证**：重新构建部署后，旧标签页应自动恢复，无需手动连刷。

## 2026-08-03 — 活动方案/周计划按教师本人计入 MySQL 统计

- **业务**：教师入库活动方案或周计划后写入 `teacher_generated_docs`；成果库、首页、教师画像「保教活动」维度只统计当前手机号，不再用全平台知识库列表。
- **技术**：BFF `/api/v1/teacher-generated-docs`；上传成功后 `recordTeacherGeneratedUpload`；前端 stats 改读 MySQL。
- **影响 / 验证**：需 `pnpm dev:backend` + MySQL；历史已入库文档不会自动回填，需本人重新入库或后续补迁移。

## 2026-08-03 — 教师智能画像落库 MySQL（按手机号覆盖）

- **业务**：生成「智能画像解读」后写入 MySQL；登录进入教师画像页自动回显；同一手机号重新生成会删除旧画像只保留最新一份。
- **技术**：表 `profile_snapshots`（`phone` 唯一索引）；BFF `/api/v1/profile-snapshots`；前端 `api/profileSnapshot.ts` + 画像页加载/保存。
- **影响 / 验证**：需后端连上 MySQL 且 `DB_AUTO_MIGRATE=true`（或已建表）；本地可 `docker compose -f docker/docker-compose.mysql.yml up -d`。GORM 主键/索引字段已改为 `varchar`，避免 MySQL `Error 1170` 导致后端起不来、画像无法落库。

## 2026-07-30 — 修复活动方案误入教师成果库

- **业务**：生成的活动方案曾出现在「教师成果库」手机号文件夹下，应进入「教案知识库管理」。
- **技术**：活动方案上传强制带上分类 `20806`；标题含 `_活动方案_` / `_周计划_` 时若目标落在成果库或手机号文件夹会自动纠正；确认框标明入库目标。
- **影响 / 验证**：重新部署后新上传应出现在教案知识库；已误入成果库的文件需在平台侧手动挪回或删除后重传。

## 2026-07-30 — 教案库 / 周计划库分类筛选

- **业务**：
  - 教案库（活动方案知识库 + 教案候选池）：一级「大班 / 中班 / 小班」，二级「科学 / 艺术 / 语言 / 健康 / 社会」
  - 周计划库：一级「大班 / 中班 / 小班」
- **技术**：`lib/planTaxonomy.ts`；`PlanManageList` / `PlanSelector` 固定分类 chips；列表映射从标题/正文推断年级与领域；入库正文写入 `【分类】年级…；领域…` 便于后续筛选。
- **影响 / 验证**：打开知识库管理或周计划候选池，点班级/领域 chips 应只显示匹配文档；旧文档若标题或正文含班级/领域也能归类。

## 2026-07-30 — 入库文件名规范 + 教案/周计划库搜寻

- **业务**：AI 生成活动方案、周计划入库时，标题统一为 `姓名（手机号）_活动方案_方案名.md` / `姓名（手机号）_周计划_周计划名.md`（例：`王焕（17362955307）_活动方案_小狗书签变变变.md`）。教案候选池、活动方案知识库、周计划知识库增加搜寻框（本地即时过滤 + 回车/按钮触发平台关键词检索）。
- **技术**：新增 `lib/knowledgeDocTitle.ts`；活动上传 `useTeachingResources`、周计划上传 `create/index` / `useWeeklyPlanKnowledge`；`PlanSelector` / `PlanManageList`；解析周计划元数据时会剥掉前缀。
- **影响 / 验证**：登录后生成并上传，确认对话框标题应为规范名；在候选池搜手机号或方案名应能迅速定位。历史旧标题不受影响。

## 2026-07-30 — 画像页标明已接入智能体 14372

- **业务**：「智能画像解读」区域明确展示已接入平台智能体 [#14372](https://www.zcat.cn/teach/agent/config/14372)；点击「生成智能画像」即调用该 Agent。
- **技术**：默认 `PROFILE_AGENT_ID_DEFAULT = 14372` / `VITE_PROFILE_AGENT_ID`；前端按手机号文件夹注入摘要后 `POST /v1/text/generate`。
- **影响 / 验证**：登录后点击生成；平台侧请勿给该 Agent 挂载整库自动检索。

## 2026-07-30 — 修复教师画像「加载成长数据」一直闪烁

- **业务**：画像页下方成长数据区加载动画反复闪动，上方名片已能显示统计。
- **技术**：`useProfileMetrics` 默认参数写成 `= {}`，每次渲染新对象引用 → `load` 回调重建 → `useEffect` 反复请求。改为稳定常量 `EMPTY_SYSTEM_STATS`；行动建议同步按 seeds id 签名，避免多余 setState。
- **影响 / 验证**：刷新画像页后应只加载一次，随后稳定展示维度/图表（本地 `pnpm dev` 即可验证）。

## 2026-07-30 — 修复分类字段 `display_name` 未映射导致手机号文件夹找不到

- **业务**：成果库诊断已能拉到平台分类（含 `17362955307`），但仍提示「未找到与手机号对应的文件夹」。
- **技术**：平台 `category/list` 返回 `display_name` / `category_key`（无 `name`）；`NestEduKnowledgeCategoryCodec` 原先只认 `name`，5 条全被丢弃后仅靠文档反推得到 1 个「教师成果库」。现已识别 `display_name`/`displayName`，并以 `category_key` 作名称回退。
- **影响 / 验证**：重新构建部署后，诊断应见 `mappedCount: 5`（或 ≥ 手机号子文件夹数）、`archiveChildNames` 含手机号；侧栏版本号应变化。

## 2026-07-30 — 侧栏版本号 + 生产映射崩溃修复 + 变更文档

- **业务**：侧栏底部增加版本戳（如 `v0.1.0 · 20260730-xxxx` / 本地 `dev`），便于对照是否已部署最新包；成果库手机号文件夹匹配在生产 minify 后失效的问题已修。
- **技术**：
  - `apps/web/src/lib/appVersion.ts` + `AppLayout` 展示；`vite/load-merged-env.ts` / Docker 注入 `VITE_APP_VERSION`、`VITE_APP_BUILD_ID`
  - 分类映射改为 `NestEduKnowledgeCategoryCodec` 对象方法，避免与 React 压缩短名冲突导致 `mappedCount: 0`
  - 新增本文件 `CHANGELOG.md`
- **影响 / 验证**：需重新构建并部署前端后，侧栏版本变化即表示新包生效；成果库应能匹配到手机号同名文件夹。

## 2026-07-30 — 教师画像智能体接入（Agent 14372）

- **业务**：教师画像页增加「智能画像解读」：按当前登录手机号汇总教师成果库文档，注入提示词后调用专属智能体生成个人成长解读（不做教师排名）。
- **技术**：
  - 默认 `VITE_PROFILE_AGENT_ID=14372`（`agent.ts` / `.env.example` / Docker build ARG）
  - `profileAgentPrompt.ts`、`profileAgent.ts`；应用侧做手机号范围 RAG，智能体侧勿挂载整库检索
- **影响 / 验证**：Docker 须在**构建时**注入 `VITE_PROFILE_AGENT_ID`；未配置或旧包仍会提示「未配置教师画像智能体」。

## 2026-07 — 成果库对接「教师成果库」与手机号隔离

- **业务**：
  - 成果库增加「平台 · 教师成果库」与「教师录入」分区；系统统计与教师录入分源可追溯
  - 按登录用户手机号隔离：仅可见/可操作分类下**同名手机号文件夹**及其子内容（例：`17362955307`）
  - 教师画像聚合该文件夹文档 + 本地成果 + 活动/周计划统计
- **技术**：
  - 环境变量 `VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID` / `VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY`（分类约 `20895`）
  - `platformUser` 拉取 `/api/user/self`；知识库请求补齐 `X-Uid-Hash` / `X-Uid`
  - `archiveTeacherScope`、分类扁平化与文档发现回退；成果库页诊断按钮便于排查匹配问题
- **影响 / 验证**：平台需先在「教师成果库」下建**手机号同名**文件夹；本地 `pnpm dev` 与线上均依赖正确 `VITE_*` 与登录态。

## 2026-07 及更早 — Phase 0–4 产品壳与业务主链路（摘要）

- **业务**：五入口信息架构（首页 / 活动方案 / 周计划 / 成果库 / 教师画像）；活动方案与周计划工作台；成果库 CRUD；教师画像与年度报告；Phase 4 打磨（统计对齐、空态/错误态等）。
- **技术**：React + Vite 前端、Go BFF、AI101 智能体与知识库；OpenSpec 分阶段落地。
- **影响 / 验证**：详见 `AGENTS.md`「产品演进规划」与各 OpenSpec change。

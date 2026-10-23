# PhotoToDanceVideo Cloudflare Workers 部署记录与操作清单

## 当前资源（2026-10-22）

- Cloudflare 账号：已连接，域名 phototodancevideo.com 的 Zone 状态为 active。
- Worker：`photodance-web-preview` 已发布，预览首页返回 200；舞蹈模板接口当前返回 500，原因见文末故障记录。
- 预览域名：`preview.phototodancevideo.com` 已绑定预览 Worker。
- 生产 Hyperdrive：photodance-neon-production，ID 3947cd3e7a3a4df5bb1ab8b79ea22108；连接 Neon 生产库 phototodance，SQL 缓存 disabled。
- 测试 Hyperdrive：现网 Worker 仍使用旧 `preview` 配置，其 Origin 密码认证失败；新建的 `photodance-neon-preview-v2` 已通过远程预览查询，仓库绑定已切换，等待发布。预览环境禁止绑定生产库。
- Neon 测试数据库：预览分支 `br-dawn-night-ar6vcn3j` 的 `dance_test` 已直接执行 78 条初始 DDL，并验证 22 张表，但尚无 Drizzle migration journal。Neon 正式 phototodance 尚未修改。
- 私有存储：正式桶 photodance-private-prod + 预览桶 photodance-private-preview（均 WNAM）。两桶的 r2.dev 都关闭，均无公开 Custom Domain；预览 Worker 仅绑定预览桶。
- R2 Worker Binding：DANCE_PRIVATE_BUCKET 已在 wrangler.jsonc 中配置；普通私有 PUT/GET/HEAD/DELETE 走绑定，无需 S3 Access Key。向 Replicate 提供私有照片时仍要通过 S3 凭证签发限时 GET URL。
- 生成与收费：DANCE_GENERATION_ENABLED=false，未启用 Replicate 和 Stripe。

## 历史部署阻塞（GitHub 授权已解决）

以下记录描述已经解决的首次部署问题：Cloudflare Builds 当时因 GitHub 应用尚未授权，无法关联仓库 wangxiongbiao/ai-saas-starter。

### 需要在 Cloudflare Dashboard 完成的 GitHub 授权

1. 打开 https://dash.cloudflare.com ，选择当前托管 phototodancevideo.com 的账号。
2. 进入 Workers & Pages → Create / Import repository / Connect GitHub。
3. 通过 GitHub 授权 Cloudflare Builds 访问 wangxiongbiao/ai-saas-starter（仅此仓库即可）。如提示 Install Cloudflare Workers and Pages GitHub app，确认所选仓库。
4. 确认代码分支为 codex/photo-to-dance-ui；不要选择 main（main 还没有这批完整开发代码）。
5. GitHub 授权完成后可以重新让 ChatGPT 验证 Cloudflare repo connection，并继续配置自动构建；不要提前开启自动发布到主域名。

## 预览数据库隔离（必须在发布前完成）

1. Neon 项目 phototodancevideo，已有正式分支 production 与测试分支 dance-integration。
2. 测试分支上的专用数据库 dance_test 已建好；在 Neon Console → Branches → dance-integration → Connect，选择 dance_test 和 Direct connection。
3. Cloudflare → Storage & databases → Hyperdrive → Create，输入上述 Direct connection 的数据库主机、用户、密码、数据库名，创建 photodance-neon-preview。
4. **关闭 Query caching**（防止积分、任务状态读到过期数据），对 Neon PostgreSQL 使用 SSL require。限制连接数在 Neon 允许范围内。
5. 取得新 Hyperdrive 配置的 ID（不是密码），替换 wrangler.jsonc 中注释的示例数组为真实绑定：

```jsonc
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<PREVIEW_HYPERDRIVE_ID>" }],
```

6. 测试数据库已执行 Drizzle 初始化并确认 22 张业务表。后续变更请审查生成的 migration，先在测试库演练，不能对生产库盲目 db:push。仓库 CI 的 PostgreSQL 并发压力测试使用一次性容器，不会触碰 Neon 生产库。
7. 验证 Neon dance_test 中有 user、session、config、credit、ai_task 等业务表，然后才能部署预览 Worker。

> 注意：`dance_test` 的 22 张表是将 78 条初始化 DDL 直接应用到空库，**尚未创建 Drizzle migration journal**。仓库现已保存对应的 `drizzle/postgresql/0000_initial_postgresql.sql`；在测试库登记基线之前，不能对它运行 `pnpm db:migrate`，否则会重复建表。

### PostgreSQL 迁移基线操作

迁移按方言存放，PostgreSQL 的 SQL 和元数据位于 `drizzle/postgresql/`。使用 Neon **Direct** 连接和受保护的环境文件执行以下命令；不要通过 Worker Hyperdrive 运行迁移，也不要将连接串提交到仓库或贴进聊天。先确认 `DATABASE_PROVIDER=postgresql`，并运行 `pnpm db:setup`。

对已有表的 `dance_test`，先执行 `pnpm db:baseline:dance-test`。它会在事务内将初始 SQL 重放到临时 schema，比较表、列、约束和索引，默认只检查、不写日志。若显示结构一致，再显式设置 `DANCE_PG_BASELINE_APPLY=yes` 重跑同一命令；工具同时核对连接实际到达的数据库，只接受名称为 `dance_test` 或以 `_dance_test` 结尾的测试库，结构不符或已有迁移记录时拒绝登记。成功后运行 `pnpm db:migrate`，应无重复建表操作。

正式库必须先确认没有应用表和迁移日志，并让项目所有者审查 `drizzle/postgresql/0000_initial_postgresql.sql`。取得同意后才对正式库运行 `pnpm db:migrate`，由该命令建表并写入第一条迁移记录；正式库不能使用 `db:push`。本次仓库变更不表示已对 Neon 的测试库或正式库执行这些操作。

## Workers 预览部署

1. wrangler.jsonc 已设置 nodejs_compat、PostgreSQL、R2 Binding 与禁用生成的总开关。
2. 预览部署必须配置生产级 AUTH_SECRET（Cloudflare Worker Settings → Variables and Secrets，类型 Secret；本地可用 openssl rand -base64 32 生成），不要提交到 GitHub。
3. 其他服务器环境变量：DATABASE_PROVIDER=postgresql、VITE_APP_URL=https://preview.phototodancevideo.com、VITE_APP_NAME=Photo to Dance、DANCE_GENERATION_ENABLED=false。
4. 确保构建阶段 DATABASE_PROVIDER=postgresql，否则构建可能生成 SQLite Schema。Cloudflare Workers Builds build command：pnpm cf:build；deploy command：pnpm exec wrangler deploy。
5. 注意 Cloudflare Builds 可能需要单独添加运行期 Secret（AUTH_SECRET）及首次 Worker 部署绑定；在公开预览入口前检查是否加载了这些 Secret。
6. 首次部署后访问 https://preview.phototodancevideo.com 、GET /api/dance/templates；校验注册/登录、用户任务授权、私有上传与下载。
7. 不要将 Worker 绑定生产 Hyperdrive，也不要把 preview 路由设为根域 phototodancevideo.com。

### 开启舞蹈生成前的私有照片交付

Worker 的 `DANCE_PRIVATE_BUCKET` 绑定只供 Worker 内部读写。`runDanceWorker` 会把 `signedInputUrl` 生成的限时 URL 作为照片输入交给 Replicate，因此要为对应环境配置 `STORAGE_ENDPOINT`（R2 S3 API HTTPS 端点）、`STORAGE_BUCKET`、`STORAGE_ACCESS_KEY`、`STORAGE_SECRET_KEY`；密钥使用该私有桶专用的最小权限 R2 API Token，作为 Worker Secret 保存，不能放进 `wrangler.jsonc`。预览环境只使用预览桶的凭证，生产环境只使用生产桶的凭证。

先在受保护的测试终端设置上述变量和 `DANCE_R2_INTEGRATION_TEST=yes`，运行 `pnpm test:dance:r2`，确认签名 GET 成功、匿名 GET 被拒绝。然后再配置 Replicate Token、worker secret、模型、参考视频和积分，并把 `DANCE_GENERATION_ENABLED` 设为 `true`。只有 R2 绑定而没有 S3 签名配置时，模板保持不可用；删除模板门禁会使失败发生在已领取的生成任务中。

## 将来切换正式生产环境

只有在 Neon 正式库的 Drizzle Schema 迁移、登录验证、R2 私有读写、至少 20 张授权图片的 AI 生成测试、支付定价和隐私条款均通过后，才将正式 Worker 指向生产 Hyperdrive photodance-neon-production，映射根域，并单独启用功能。预览服务继续使用独立的 `dance_test` 预览分支，不混用。

## 参考

- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/hyperdrive/get-started/
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://github.com/wangxiongbiao/ai-saas-starter/pull/1

## 2026-10-21 Cloudflare Builds 真实验证

- GitHub 仓库已设为 Public，Cloudflare Builds 的 GitHub 仓库连接已建立（先前断开的问题已解决）。
- 已建立独立的 `photodance-web-preview` Worker，目前仅返回 HTTP 503 的临时占位响应，**不是可用的业务网站**。
- 该 Worker 已接入 `wangxiongbiao/ai-saas-starter` 的 `codex/photo-to-dance-ui` 分支，构建命令 `pnpm cf:build`，部署命令 `pnpm cf:preview:check && pnpm exec wrangler deploy`。
- 第一次 Cloudflare Builds 任务 `393b9e30-b394-449c-a998-5cecda355323`：代码拉取、依赖安装与完整 SSR 编译成功；**部署阶段按设计被预览 Hyperdrive 前置检查拦截**。Cloudflare 显示 build outcome=fail 属于该安全拦截，不是前端/SSR 编译失败。
- 预览数据库依然是 Neon `dance-integration / dance_test`（已初始化 22 张表）；预览 R2 使用 `photodance-private-preview`，禁止引用正式库与正式 Bucket。
- 不要用生产 Hyperdrive `3947cd3e7a3a4df5bb1ab8b79ea22108` 替代预览 Hyperdrive。预览 Hyperdrive 必须由用户在 Cloudflare 控制台输入 Neon 的 **dance_test Direct 连接信息**并关闭 Query caching；不能在代码、提交、聊天里传递 Neon 密码。
- 创建后，仅将新 Hyperdrive 的公开 ID 填入 `wrangler.jsonc` 的 `HYPERDRIVE` Binding；再将随机 `AUTH_SECRET` 保存为 Cloudflare Worker Secret，随后运行 `pnpm cf:preview:check` 和 Cloudflare Builds 重建。

## 授权恢复后新增的资源（2026-10-21）

- Cloudflare ↔ GitHub 仓库连接已验证成功。
- 独立 Worker `photodance-web-preview` 已创建，当前是仅返回 HTTP 503 的安全占位脚本，不是业务站。
- Worker 绑定自动构建到 `codex/photo-to-dance-ui`；Cloudflare Builds Build Token 及 GitHub 仓库关联已建立。
- 第一次真实 Cloudflare 构建 UUID：`393b9e30-b394-449c-a998-5cecda355323`。从 GitHub 克隆、安装依赖、SSR 编译全部通过；Deploy 阶段由 `scripts/check-cf-preview.mjs` 按设计拒绝，因为预览 Hyperdrive 尚未设置。任务整体状态为 fail，但编译成功且没有部署错误版本。
- 已直接在 Cloudflare 生成并保存独立 Worker `AUTH_SECRET`，不向聊天或 GitHub 回传密钥。
- **唯一必须的数据库接线**：在 Cloudflare Dashboard → Hyperdrive 手动创建 `photodance-neon-preview`，连接 Neon 项目 `phototodancevideo` → 分支 `dance-integration` → DB `dance_test`。使用 Direct 连接信息，SSL 必须开启、Query caching disabled。不要填生产库 `phototodance`。
- Hyperdrive 创建完成后，只需要将其不敏感的 32 位 ID 写入 `wrangler.jsonc` 中的 `HYPERDRIVE` Binding，再触发 Cloudflare Build，即可进行真正的预览站部署与 HTTP 验收。生产 Hyperdrive ID 不可用于此预览。

## 2026-10-21 预览部署成功验证

- Cloudflare Hyperdrive `preview` 已创建，配置 ID `06a96dd38c2e4566a4db40b7a65c4969`，目标 Neon `dance_test`，SSL require，SQL caching disabled。
- **重要**：该 Hyperdrive 实际连接 Neon `br-dawn-night-ar6vcn3j` 测试分支上的 `dance_test`，而不是旧 `dance-integration` 分支。已校验是独立于 `production` 的 Neon 分支，数据库已有 22 张业务表。
- GitHub 开发分支已在 `wrangler.jsonc` 引用上述 `HYPERDRIVE`，R2 绑定仍为 `photodance-private-preview`，生成保持关闭。
- Cloudflare Builds 两次真实构建及部署成功：`95f33eee-da93-4c7c-8235-5124ef35ec62` 与 `f975264e-88b0-4c5b-b26e-52927cc99e98`。Nitro/TanStack SSR 构建完成，142 个静态资源上传成功，Worker `photodance-web-preview` 已发布到 `preview.phototodancevideo.com`。
- Cloudflare API 验证 Worker 当前有 `HYPERDRIVE`、`DANCE_PRIVATE_BUCKET`、`AUTH_SECRET` 和 `ASSETS` Binding；自定义域名路由 enabled，DNS 代理 AAAA 记录存在。
- **HTTP 验收未完成**：本次执行环境的外部 DNS 解析不可用，连常规公开域名也会解析超时，无法从该环境完成首页 200、API JSON、登录与上传验证。这不代表 Cloudflare 域名本身异常。需从正常可联网浏览器检查 `https://preview.phototodancevideo.com/`、`/api/dance/templates` 及登录/素材隔离；发现错误查看 Cloudflare Workers Logs。
- 正式 `phototodancevideo.com` 与 Neon 正式数据库、R2 正式桶仍未修改，AI 生成及支付尚未开放。

## 实际部署成功：2026-10-21

- Cloudflare Hyperdrive 名称 `preview`，ID `06a96dd38c2e4566a4db40b7a65c4969`，连接 Neon 预览分支的 `dance_test`（22 张表），已关闭 SQL caching，TLS 为 Require。
- GitHub `codex/photo-to-dance-ui` 的 `wrangler.jsonc` 已绑定预览 Hyperdrive（提交 `290a586`），继续只使用 `photodance-private-preview` R2。
- Cloudflare Builds 两个针对同一提交的构建均成功，包括 SSR 编译、静态资源上传、Worker 部署和自定义域名发布。
- 当前预览地址：https://preview.phototodancevideo.com ，Cloudflare zone DNS 中已自动创建受代理记录，自定义域名指向 `photodance-web-preview`。
- 部署后查询 Worker bindings 确认：`HYPERDRIVE` → 预览 ID；`DANCE_PRIVATE_BUCKET` → 预览 Bucket；`AUTH_SECRET` → Secret。**没有使用生产数据库或生产 R2 Bucket。**
- 已通过 Cloudflare Browser Rendering 实际访问首页，返回 HTML（约 31 KB）并识别 Photo to Dance 页面内容，没有检测到应用错误页。
- 尝试使用 Browser Rendering 验证 `/api/dance/templates` 遇到浏览器服务 429 调用限流；这不等于 API 返回 429，**后端 API 登录、文件读写、模型生成、真实支付仍待单独实测**。
- `DANCE_GENERATION_ENABLED=false`，未启用真实 AI 视频任务及收费。不要把预览站当作生产上线。

## 2026-10-22 预览数据库认证故障

- 实测首页 HTTP 200、`/api/config/public` HTTP 200，`/api/dance/templates` HTTP 500。Worker 日志显示查询 `config` 时，PostgreSQL 返回 `28P01 password authentication failed for user 'phototodance_owner'`；这发生在 SQL 执行前，不能用迁移或改表来修复。
- `wrangler hyperdrive get` 显示 `preview` 的 Origin 为 Neon `dance_test` 的 `-pooler` 主机。按 Cloudflare 的 Neon 接入说明，应在 Neon 连接详情中选择正确的预览分支、`dance_test` 和角色，关闭 Neon Connection pooling，再将对应的 Direct 连接信息安全地更新到 Cloudflare Hyperdrive `preview`。不要把数据库密码写进代码、命令历史或聊天。
- 更新后重新请求 `/api/dance/templates`，确认 HTTP 200 和两个模板均返回 `enabled: false`；随后验收登录及私有文件流程。本地生成的迁移和基线脚本尚未应用到 Neon，也尚未部署新的 Worker 代码。

### 新 Hyperdrive 验证（2026-10-22）

- 新配置 `photodance-neon-preview-v2`，ID `d188ba007fec4a529f17f9bd1033bfb8`；Origin 是没有 `-pooler` 的 Neon 主机，数据库 `dance_test`，角色 `phototodance_owner`，查询缓存关闭。`wrangler.jsonc` 的 `HYPERDRIVE` 已改为此 ID。
- 使用 `wrangler dev --remote` 和新绑定请求 `/api/dance/templates`，得到 HTTP 200、`code: 0`，两个模板均为 `enabled: false`。这验证了新配置可读取预览库；尚未验证具体 Neon 分支 ID，也尚未对正式预览 Worker 执行部署。
- 正式预览域名仍运行旧绑定，预计仍返回 500。部署新绑定并复测域名后，才能将前述认证故障标记为线上已修复。

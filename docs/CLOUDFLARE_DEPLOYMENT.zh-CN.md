# PhotoToDanceVideo Cloudflare Workers 部署记录与操作清单

## 当前资源（2026-10-21）

- Cloudflare 账号：已连接，域名 phototodancevideo.com 的 Zone 状态为 active。
- Worker：仓库已增加 wrangler.jsonc 和 PostgreSQL Workers SSR 构建检查；**尚未在 Cloudflare 成功发布完整应用**。
- 预览域名：准备使用 preview.phototodancevideo.com；尚未创建正式 Worker 自定义域名路由。
- 生产 Hyperdrive：photodance-neon-production，ID 3947cd3e7a3a4df5bb1ab8b79ea22108；连接 Neon 生产库 phototodance，SQL 缓存 disabled。
- 测试 Hyperdrive：暂未配置。预览环境禁止绑定生产库，否则预览注册和测试任务会写入真实数据库。
- Neon 测试数据库：dance-integration / dance_test 已执行 Drizzle 初始迁移（78 条 DDL），并验证 22 张表。Neon 正式 phototodance 尚未修改。
- 私有存储：正式桶 photodance-private-prod + 预览桶 photodance-private-preview（均 WNAM）。两桶的 r2.dev 都关闭，均无公开 Custom Domain；预览 Worker 仅绑定预览桶。
- R2 Worker Binding：DANCE_PRIVATE_BUCKET 已在 wrangler.jsonc 中配置；普通私有 PUT/GET/HEAD/DELETE 走绑定，无需 S3 Access Key。
- 生成与收费：DANCE_GENERATION_ENABLED=false，未启用 Replicate 和 Stripe。

## 当前部署阻塞

Cloudflare Builds 通过 API 关联 GitHub 私有仓库 wangxiongbiao/ai-saas-starter 失败：账号没有完成 Cloudflare GitHub 应用授权。这个 OAuth 安装需要项目所有者在 Cloudflare/GitHub 界面中完成，不能由现有连接替代。

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

> 注意：本次测试数据库基线是将 Drizzle 生成的 78 条初始化 DDL 安全地直接应用到空库，**并未创建 Drizzle migration journal**。后续不能直接对这个库执行未经审查的初始 `pnpm db:migrate`，否则可能尝试重复创建表。应先建立受版本控制的初始迁移及正确的迁移基线，或在隔离副本验证 `db:push` 的无改动差异，之后再按审查过的迁移流程升级；生产库目前仍为空，务必走标准初始化。

## Workers 预览部署

1. wrangler.jsonc 已设置 nodejs_compat、PostgreSQL、R2 Binding 与禁用生成的总开关。
2. 预览部署必须配置生产级 AUTH_SECRET（Cloudflare Worker Settings → Variables and Secrets，类型 Secret；本地可用 openssl rand -base64 32 生成），不要提交到 GitHub。
3. 其他服务器环境变量：DATABASE_PROVIDER=postgresql、VITE_APP_URL=https://preview.phototodancevideo.com、VITE_APP_NAME=Photo to Dance、DANCE_GENERATION_ENABLED=false。
4. 确保构建阶段 DATABASE_PROVIDER=postgresql，否则构建可能生成 SQLite Schema。Cloudflare Workers Builds build command：pnpm cf:build；deploy command：pnpm exec wrangler deploy。
5. 注意 Cloudflare Builds 可能需要单独添加运行期 Secret（AUTH_SECRET）及首次 Worker 部署绑定；在公开预览入口前检查是否加载了这些 Secret。
6. 首次部署后访问 https://preview.phototodancevideo.com 、GET /api/dance/templates；校验注册/登录、用户任务授权、私有上传与下载。
7. 不要将 Worker 绑定生产 Hyperdrive，也不要把 preview 路由设为根域 phototodancevideo.com。

## 将来切换正式生产环境

只有在 Neon 正式库的 Drizzle Schema 迁移、登录验证、R2 私有读写、至少 20 张授权图片的 AI 生成测试、支付定价和隐私条款均通过后，才将正式 Worker 指向生产 Hyperdrive photodance-neon-production，映射根域，并单独启用功能。预览服务继续使用 dance-integration，不混用。

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

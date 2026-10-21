# PhotoToDanceVideo.com：Neon PostgreSQL + Cloudflare R2 部署清单

## 当前证据
GitHub CI 已配置独立 PostgreSQL 16 测试容器、并发积分事务测试；源码另含 R2 私有读写 smoke test。云端账号里实际 Neon 库和 R2 Bucket 尚未确认创建，不要将「CI 通过」理解为「生产连接已通过」。

## 1. Neon PostgreSQL
1. 打开 https://console.neon.tech 并新建 phototodancevideo-prod 项目，选择靠近应用服务器的 Region。
2. 建立生产数据库 photodance_prod，并建立独立测试数据库 dance_test；不能把生产数据放进测试数据库。
3. 点击 Neon 控制台 Connect，取 Pooled 连接串用于应用服务，Direct 连接串用于数据库迁移。两者都视为密钥，不入 Git。
4. 部署环境设置 DATABASE_PROVIDER=postgresql、DATABASE_URL=<NEON_POOLED_CONNECTION_STRING>、DB_SINGLETON_ENABLED=true、DB_MAX_CONNECTIONS=10。
5. 在经授权的迁移终端选择 Direct URL，先执行 pnpm install --frozen-lockfile；pnpm db:setup；对首次创建的空库执行 pnpm db:push；如是已有生产库，先备份并改用审查过的 migration（pnpm db:generate / pnpm db:migrate）。
6. 在隔离测试库且显式打开 DANCE_PG_INTEGRATION_TEST=yes，配置 DB_MAX_CONNECTIONS=20，运行 pnpm test:dance:postgres。该脚本有库名保护，仅接受 dance_test 或 *_dance_test。
7. 验证：16 个相同幂等任务仅扣款一次；24 个独立并发任务不能超扣；12 个重复失败回调不会重复退款。

## 2. Cloudflare R2 私有桶
1. 进入 https://dash.cloudflare.com → Storage & databases → R2 → Overview，完成首次启用及必要的计费设置。
2. 建立 photodance-private-prod bucket。Bucket Settings 中 Public Development URL (r2.dev) 必须是 Disabled；Custom Domains 不要绑定或开启。私人用户素材不可暴露到公开域名。
3. 回到 R2 Overview → Manage API Tokens，新建仅限该桶的 Object Read & Write。把 Access Key ID / Secret Access Key 保存到部署平台 Secrets，避免全账户管理权限。
4. 从 R2 Overview 读取 S3 API endpoint；普通区格式 https://<ACCOUNT_ID>.r2.cloudflarestorage.com，指定 jurisdiction 的桶需使用对应区域专用 endpoint。
5. 部署环境设置 STORAGE_ENDPOINT=<S3_ENDPOINT>、STORAGE_BUCKET=photodance-private-prod、STORAGE_REGION=auto、STORAGE_ACCESS_KEY=<ACCESS_ID>、STORAGE_SECRET_KEY=<ACCESS_SECRET>。
6. 使用同一私有桶的凭据，在受保护环境设置 DANCE_R2_INTEGRATION_TEST=yes 并运行 pnpm test:dance:r2。
7. 确保测试验证上传、HEAD、下载、预签名 GET、匿名读失败、删除；还须在 Dashboard 单独人工检查公开域名设置。
8. 结合隐私政策约定设置 Lifecycle：可按 inputs/results 分别指定保留期。未经用户确认不能直接确定具体天数。

## 3. 启用前的安全和质量门槛
- PostgreSQL 多连接事务测试通过，云端测试使用独立数据库；持续备份和恢复路径明确。
- R2 专用对象 Token 仅限一个 Bucket，r2.dev 和公开域名均关闭。
- 登录用户 A 无法访问用户 B 的素材和结果。
- 生产 Secret 存在于部署平台，不在 GitHub、聊天或日志中。
- DANCE_GENERATION_ENABLED 保持 false，直到模型效果、费用、支付和隐私验收完成。

官方资料：
- https://neon.com/docs/get-started-with-neon
- https://orm.drizzle.team/docs/drizzle-kit-migrate
- https://developers.cloudflare.com/r2/buckets/create-buckets/
- https://developers.cloudflare.com/r2/api/tokens/
- https://developers.cloudflare.com/r2/buckets/public-buckets/
- https://developers.cloudflare.com/r2/buckets/object-lifecycles/

## 实际云端资源校验（2026-10-21）

经连接的 Neon 和 Cloudflare 账号实际查询，不涉及任何 Secret：

| 资源 | 检查结果 |
|---|---|
| Neon 项目 | `phototodancevideo`，`aws-us-west-2`，PostgreSQL 17 |
| Neon 正式分支 | `production`（已有并复用） |
| 正式数据库 | `phototodance`（已有，连接与 SELECT 检查通过） |
| 真实云端独立测试分支 | `dance-integration`（新增） |
| 独立测试数据库 | `dance_test`（新增，不在正式分支） |
| Cloudflare R2 Bucket | `photodance-private-prod`（新增），WNAM Standard |
| 公开 r2.dev | Disabled（接口复核） |
| Custom Domains | 空（接口复核） |
| Cloudflare 管理 API 读写 | 临时对象 PUT/GET/DELETE 成功，之后按前缀确认无剩余对象 |
| 生命周期 | 仅发现默认七天中止未完成分段上传的规则；还未设置用户素材过期时间 |
| CORS | 无现存配置（GET 返回 404）；网页登录不需要公开 CORS |
| Neon 正式 DB Schema | 查询到 0 个表；尚未执行 Drizzle 初始化 |
| Neon 测试 DB Schema | 查询到 0 个表；尚未执行 Drizzle 初始化 |
| R2 S3 私有访问 Token | **尚未创建**；需在 Cloudflare 控制台创建限定 Bucket 的专用 Object Read & Write Token |
| 应用部署环境 Secret | 尚未配置；仅在部署平台设置，不进入代码仓库 |

**剩余步骤**：在 Neon 控制台取得连接串放入部署平台 Secret，用审查过的迁移初始化正式库及独立测试库；在 R2 控制台创建并安全保存专用 S3 密钥，配置 STORAGE_*；以这些凭证在受保护的部署/测试终端运行 `pnpm test:dance:r2`，另在隔离 Neon `dance_test` 上运行 `pnpm test:dance:postgres`。目前 GitHub CI 的 PostgreSQL 测试通过，**不等于 Neon 云端实例已完成并发验收**。

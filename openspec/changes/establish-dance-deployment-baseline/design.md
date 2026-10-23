## Context

参见 proposal.md。Worker 的普通私有桶操作通过 `DANCE_PRIVATE_BUCKET` 绑定进行，`signedInputUrl` 则通过 R2 S3 端点签发可供 Replicate 读取的 URL。Drizzle 的 schema 工作副本与迁移目录目前都被忽略；仓库同时支持多种 SQL 方言。

## Goals / Non-Goals

**Goals:** 将当前外部输入授权约束写入部署步骤，并让 PostgreSQL 初始迁移可审查、可复现，且为已建表测试库提供安全基线流程。

**Non-Goals:** 本次不改造 Replicate 文件交付接口，不公开 R2 桶，也不在未验证远端状态前运行生产迁移。

## Decisions

1. 保留模板对 S3 签名凭证的检查。R2 绑定仅在 Worker 内有效，Replicate 接收 URL 后从外部下载；直接移除凭证检查会将失败推迟到任务提交阶段。备选方案是上传文件至 Replicate 或新增短时代理端点，但这会改变文件交付与保留策略，不属于当前修复。
2. 将 Drizzle 输出目录按方言分开，仅将 PostgreSQL 迁移纳入版本控制。共用迁移目录会让 SQLite/MySQL 与 PostgreSQL 的 SQL、快照相互污染。
3. 通过已提交初始迁移初始化空库。对 `dance_test`，先在事务内用独立 schema 重放初始 SQL，比较它与当前应用 schema 的结构；完全匹配后只登记 Drizzle 日志。任何不匹配都回滚，不使用 `CREATE TABLE IF NOT EXISTS` 掩盖差异。

## Risks / Trade-offs

- [R2 密钥仍为部署依赖] → 仅赋予目标私有桶所需权限，以 Secret 配置，使用现有签名 GET 冒烟测试验证。
- [旧 `dance_test` 可能与当前 schema 不一致] → 基线工具拒绝登记并报告差异；先人工审查差异，再决定修复路径。
- [生产库并非真正空库] → 执行前核验表和迁移日志；若已有对象，停止初始迁移。

## Migration Plan

1. 生成并审查 PostgreSQL 初始 SQL、快照和迁移日志元数据，验证可在隔离空库建表。
2. 在 `dance_test` 的 Direct 连接上运行只针对该库的结构核验与基线登记；未取得连接凭证时保留此步骤为部署操作，不触碰生产库。
3. 在确认正式库为空且迁移 SQL 经审查后，使用标准 `db:migrate` 初始化正式库；部署前备份或保留可恢复快照。失败时依据事务结果恢复，不以 `db:push` 修补生产库。

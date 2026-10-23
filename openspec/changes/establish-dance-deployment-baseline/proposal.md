## Why

舞蹈模板使用私有 R2 照片作为 Replicate 输入，当前外部读取依赖 S3 预签名 URL；仅配置 Worker R2 绑定时无法安全开启模板。与此同时，测试库的表由 SQL 直接创建且没有 Drizzle 迁移日志，仓库也忽略迁移目录，后续迁移存在重复建表风险。正式库尚未初始化，应该现在建立可审查的迁移基线。

## What Changes

- 明确区分 Worker 绑定的内部文件读写与 Replicate 的外部文件读取；保留签名 URL 所需的 S3 凭证门禁，并在部署文档说明该要求及验证方法。
- 从 PostgreSQL schema 生成初始 Drizzle 迁移，将 SQL 与元数据纳入版本控制。
- 为已建表的 `dance_test` 提供核验与基线登记流程；正式空库使用初始迁移初始化。

## Capabilities

### New Capabilities

- `dance-private-input-access`: 私有照片通过限时授权交给外部 AI 服务，模板只在交付链路具备必要配置时可用。
- `postgres-migration-baseline`: PostgreSQL 初始 schema 由受版本控制的迁移建立，已存在 schema 的测试库在核验后登记相同基线。

### Modified Capabilities

无。

## Impact

涉及 `src/modules/dance/config.ts`、`src/modules/dance/private-storage.ts`、`scripts/test-dance-r2.ts`、`drizzle.config.ts`、`drizzle/`、`.gitignore` 和部署文档。不会在本次代码变更中直接改动远端生产或测试数据库。

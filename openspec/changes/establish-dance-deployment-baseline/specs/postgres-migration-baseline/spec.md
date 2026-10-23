## Purpose

让 PostgreSQL 数据库的首次建表和后续升级都由同一套受版本控制的迁移记录驱动，并避免已手工初始化的测试库在补建迁移日志时重复执行初始建表 SQL。

## ADDED Requirements

### Requirement: 可复现的 PostgreSQL 初始迁移

项目 SHALL 保存与当前 PostgreSQL schema 对应的初始迁移 SQL 和元数据；在空 PostgreSQL 库执行标准迁移命令 SHALL 建立应用表并写入迁移日志。

#### Scenario: 初始化空正式库

- **WHEN** 运维人员对确认为空的 PostgreSQL 库执行初始迁移
- **THEN** 应用表创建成功且迁移日志记录初始迁移

### Requirement: 已建表测试库的安全基线

项目 SHALL 提供针对 `dance_test` 的基线核验与登记方法，在登记前验证现有结构与初始迁移一致，且不得再次运行初始建表 SQL。

#### Scenario: 测试库结构匹配

- **WHEN** `dance_test` 中的现有结构与初始迁移一致且没有迁移日志
- **THEN** 可以只登记初始迁移记录，后续迁移从下一版本开始

#### Scenario: 测试库结构不匹配

- **WHEN** 现有结构与初始迁移不同
- **THEN** 基线登记失败且数据库结构和迁移日志保持原状

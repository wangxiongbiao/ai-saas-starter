# Photo to Dance — 开发交付检查点（2026-10-21）

## 当前落地状态

**功能代码已连接，尚未完成真实生成服务的生产验收。**

- 前端：响应式首页、模板目录、Love Options / Stateside、积分占位页、登录入口和 My Videos 真实任务视图。未配置完成的模板保持禁用。
- 私有上传：登录用户的 JPG/PNG/WebP 允许 8 MB；服务端检查 MIME/文件头，存于 S3/R2 私有空间。舞蹈业务绝不回退至公共 /uploads。
- 鉴权文件：只有素材所属用户可以从 /api/dance/file 读取自己的输入和 MP4 结果。通过应用服务器鉴权，返回禁止缓存的文件响应。
- 任务：会话校验、模板服务器端可用性与实际积分消耗校验、UUID 提交幂等键衍生稳定任务 ID、事务内创建及扣积分、SQLite 不适用于生产收费。
- Worker：PostgreSQL 领取待执行任务，向 Replicate 提交固定模板参数、记录上游任务 ID，轮询结果。成功结果转存私有存储；上游明确失败/取消则原子退款。
- 恢复策略：提交服务超时不重复发起收费任务；标记人工核查，避免双生。视频下载出错保持 processing，下次任务 tick 再试，不能把已生成的视频当作模型失败退款。
- 模板后台：新增 /admin/templates 与管理员 API，编辑固定两款模板的 Replicate 模型、参考动作 URL、提示词、单次积分和启停。配置持久化 DB，保存后实时读取，无需改源代码。发布仍需总开关、私有对象存储及 PostgreSQL。
- 自动任务：增加 GitHub Actions 每五分钟定时触发 Worker 的配置。GitHub 定时任务只从主分支运行；PR 尚未合并时不会启动生产定时调用。

## 必需生产条件（全部满足后才允许启用）

1. 生产数据库使用 **PostgreSQL**。在真实数据库和真实并发条件下测试首次扣费、余额竞争、重复回调、失败退款、Crash 恢复；不要使用 D1 的事务回调作为收费保证。
2. 设置私有 S3/R2：STORAGE_ENDPOINT、STORAGE_BUCKET、STORAGE_ACCESS_KEY、STORAGE_SECRET_KEY、STORAGE_REGION（可选）。关闭桶公开读，配置文件生命周期、删除、权限、日志及必要的 CORS。
3. 设置 REPLICATE_API_TOKEN、DANCE_WORKER_SECRET、DANCE_GENERATION_ENABLED=true。
4. 在 /admin/templates 配置经实测且已授权的模型、参考动作及正整数积分消耗，勾选发布。模型必须支持输入照片 + 固定参考动作，不得把普通图生视频当作已有动作迁移能力。
5. 如模型的输入字段不是默认的 image 与 reference_video，配置 DANCE_MODEL_IMAGE_FIELD / DANCE_MODEL_REFERENCE_FIELD，先进行沙盒验证。
6. 在 GitHub Actions 仓库 Secrets 中添加 DANCE_WORKER_URL（部署后的 HTTPS 基地址）和 DANCE_WORKER_SECRET（与服务端相同），检查工作流能执行且只能访问目标服务。
7. 采用约 20 张经授权的照片记录身份保持、动作匹配、生成时间、失败率、可接受成品比例、实际单次成本；据此确定时长、积分售价和可发布的真实演示。
8. 明确技术失败自动返还积分、非技术失败处理、输入/结果保存期限、隐私政策、退款说明、支付沙盒和售后流程。定价页在没有真实数据时不开放购买。

## 提供的接口

| 接口 | 说明 |
|---|---|
| GET /api/dance/templates | 返回可用模板与真实积分，不暴露凭证 |
| POST /api/dance/upload | 登录 + 同源 + 文件内容校验，写入私有对象存储 |
| GET /api/dance/file?key= | 文件归属鉴权后代理读取 |
| GET /api/dance/tasks | 返回当前用户的生成记录 |
| POST /api/dance/tasks | 创建幂等付费生成任务（可用模板才允许） |
| POST /api/dance/worker | Bearer Secret 认证，处理待提交和已提交任务 |
| GET/PUT /api/admin/dance/templates | 管理员查看与修改固定模板配置 |

## 验收证据边界

CI 包含安全扫描、生产构建、TypeScript 检查和 SQLite 积分/任务回归测试；SQLite 测试不能替代 PostgreSQL 多实例并发验收。上述代码变更仍未真实调用付费模型，也未实测输出质量和真实生产付款。生产部署、自动执行、私有存储密钥、收费开关目前均未经真实环境验证。

此阶段不合并 PR、不开启收费，不声明“已上线”或“已完成真实生成验收”。

# 已确认 UI 设计清单

确认日期：2026-10-20（America/New_York）。

**本目录目前只有设计清单，PNG 原图尚未写入仓库。** 当前文件执行环境不可用，图片传输待完成。此提交不表示图片已经入库，不包含账号内下载链接或文件标识。

| 页面或设计板 | 计划保存的文件名 |
| --- | --- |
| 首页 | homepage-approved-2026-10-20.png |
| 模板目录 | templates-approved-2026-10-20.png |
| 我的作品 | my-videos-approved-2026-10-20.png |
| 积分购买 | pricing-approved-2026-10-20.png |
| Love Options 修正版 | love-options-approved-2026-10-20.png |
| Stateside 修正版 | stateside-approved-2026-10-20.png |
| 手机端四屏修正版：首页、模板目录、Love Options、我的作品 | mobile-core-approved-2026-10-20.png |
| 手机端补充：Stateside、积分购买 | mobile-stateside-pricing-approved-2026-10-20.png |
| 生成器五种状态：上传后、生成中、成功、失败、积分不足 | generator-states-approved-2026-10-20.png |

机器可读清单见 [approved-assets.json](./approved-assets.json)。取得原图后按以上文件名保存到本目录，再逐项更新 repository_image_present。

## 版本与实施说明

- 首页采用已确认高清原图，保持奶油白背景、近黑色文字和黑色主按钮。
- Love Options 采用补齐竖屏预览、效果限制、时长和积分位置、FAQ 的修正版。
- Stateside 采用最后修正版：Coming soon，生成按钮禁用，不保证身份保持，不宣称已验证效果。
- 手机端四屏采用最后修正版：作品中的生成中任务为 Love Options，上传支持 JPG、PNG、WebP，并展示默认无音乐。
- 排除早期 Danceframe、旧 Love Options 内页、Stateside 初稿及手机端四屏初稿。
- 业务以 [项目规划](../PROJECT_PLAN.zh-CN.md) 为准，基础视觉以 [风格规范](../UI_STYLE_GUIDE.zh-CN.md) 为准。
- 价格、积分消耗和时长仍待确定，正式付费确认前必须展示真实消耗。
- 技术失败自动退积分；结果默认私有；输出 9:16 MP4，默认无音乐。
- 概念图片不证明真实动作还原，生成器状态板不表示已有真实任务；细节以业务规划为准。
- 模板管理后台尚未生成设计图。

## 校验记录

仅新增 Markdown 和 JSON 设计清单，不改业务代码；已人工检查文件名、版本选择和未入库状态，不含账号资源标识、下载链接或凭证。按用户指示先提交并 push；因执行环境不可用，未运行自动安全扫描或构建，不声称检查通过。

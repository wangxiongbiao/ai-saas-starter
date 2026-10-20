# Photo to Dance Video 项目规划

更新日期：2026-10-20（America/New_York）

项目域名：phototodancevideo.com

代码仓库：wangxiongbiao/ai-saas-starter

状态：已确定产品方向，尚未实现本规划中的舞蹈业务功能。

## 1. 产品定位与市场

面向全球用户，先上线英文网站。用户上传一张单人照片，选择已经测试的舞蹈模板，生成并下载竖屏舞蹈视频，无需编写提示词。

采用通用首页与独立模板页的结构：首页承接照片跳舞的通用功能需求；模板页直接提供对应舞蹈的生成能力；模板目录供用户浏览选择。所有入口共用生成器、任务系统及积分系统。

暂不按国家拆站。当地语言版本根据实际曝光、生成和购买数据决定。域名用于直观表达产品用途，不把精准匹配域名当作排名或收录保证。

## 2. 页面与关键词

| 页面 | 路径 | 关键词或用途 | 发布安排 |
| --- | --- | --- | --- |
| 首页 | `/` | photo to dance video；make photo dance；ai dance video generator | 首发 |
| 模板目录 | `/templates` | 展示所有可用舞蹈，链接各模板页 | 首发 |
| Love Options | `/templates/love-options-dance` | love options dance ai；love options ai video generator；bestie love options ai dance | 第一个实测模板，效果合格后首发 |
| Stateside | `/templates/stateside-dance` | stateside dance ai；stateside ai dance generator | 第二个模板，完成测试后上线 |
| 积分购买 | `/pricing` | 套餐、生成消耗、失败处理规则 | 首发 |
| 我的作品 | `/settings/videos` | 任务状态、结果预览、下载 | 首发 |
| 模板管理 | `/admin/templates` | 创建、编辑、排序、启停和推荐模板 | 首发管理功能 |

首页布局：生成器与动作预览、推荐模板、真实输入与输出案例、操作步骤、FAQ。移动端优先，用户能在生成前看到模板效果和费用。

模板页布局：对应示例视频、预选该动作的生成器、照片要求、效果限制、时长和积分消耗、相关模板。用户能在当前页完成操作，不必回首页重新选择。

## 3. 模板优先级

| 模板 | 当前决定 | 原因或前置条件 |
| --- | --- | --- |
| Love Options | 优先实测 | 本轮暂未发现明显专门站，已有平台模板页；全球受众线索比美国单一市场更适合继续验证 |
| Stateside | 第二个模板 | 有明确照片跳舞玩法，本轮暂未发现明显专门站；不视为已确认的新爆发词 |
| Babydoll | 备用 | 已有直接竞争；可在首批效果不合格时替换测试 |
| Chuttamalle | 暂缓 | 已有多个专门站；需区分原视频换脸与照片动作迁移 |
| Bulin 47 | 暂缓 | 英文和西班牙语均有专门站；freestyle/recast 与纯舞蹈需求有差异 |
| Shan Shen Bu / Shanshenbu | 候选保留 | 补查连写别名后发现 shanshenbudance.com，不再列为无专站机会 |
| AI Pet Dance | 第二阶段功能 | 宠物生成需要单独评估，不能由人体效果推定 |
| Single Ladies Dog Dance | 宠物阶段具体模板 | 宠物能力跑通后测试；已有竞争，不视为搜索空白 |
| Pirate Ship Crowd Dance | 撤出当前规划 | 原命名与实际玩法未核实，且多人、场景生成增加复杂度 |

“暂未发现专门站”仅描述当前公开检索结果，不代表全网没有竞争，也不代表域名可注册。平台工具页同样是竞品。

## 4. 首版功能范围

- 输入：一张单人照片，支持 JPG、PNG、WebP；文件上限、尺寸与照片要求按生成接口实测确定。
- 模板：固定参考动作和参数，用户无需写提示词。
- 输出：统一 9:16、MP4；具体时长待接口测试后确定。
- 音频：默认无音乐，生成前明确说明；用户可在发布平台添加合适音乐。
- 收费：积分包，每个模板显示固定消耗；价格待成本核算后确定。
- 技术失败自动退积分；效果不满意与技术失败的处理规则需在正式收费前明确。
- 任务后台执行，离开页面后仍可在“我的作品”查看。
- 首版暂缓多人、宠物、自定义参考动作、自由提示词，以及多个模型和画幅选项。

## 5. 生成任务与实现模块

流程：选择模板 → 上传照片 → 检查登录、照片、模板状态及积分 → 创建任务并扣积分 → 后台提交生成服务 → 查询状态或接收回调 → 保存成品 → 预览与下载。

关键约束：

1. 重复点击不得重复创建付费任务、重复扣费。
2. 扣费与任务创建应保持一致；重试和回调需要幂等处理，不能重复退款。
3. 超时先查询上游任务状态，不直接视为生成失败。
4. 结果转存到自己的存储，不能只依赖上游临时链接。
5. 用户只能访问自己的任务和素材；模板管理使用后台权限控制。
6. 上传照片与生成视频的保存期限、删除方式在上线前确定并写入隐私说明；用户结果默认私有。

复用现有账号、支付、积分、存储和后台基础，先检查现有 AI 任务模块的覆盖能力，再补充模板管理、舞蹈任务接口、作品列表、生成器及前台页面。

每个模板保存：标识和 URL、名称、封面、真实示例、介绍、照片要求、效果限制、SEO 标题及描述、FAQ、生成服务、参考动作、时长、画幅、积分消耗、草稿/上线/暂停状态、排序及首页推荐设置。

增加模板的目标流程：准备参考素材 → 实测 → 填配置 → 发布。通常无需改写生成业务代码；新能力或不同供应商接口可另行开发。

## 6. SEO 与内容原则

- 首页、模板目录和各模板页有独立标题、描述与 canonical；主要内容可在服务端渲染。
- 模板页使用真实动作示例和有用说明，不仅替换关键词或堆砌介绍字数。
- 首页精选推荐，目录展示全部上线模板；相关模板按玩法关联推荐。
- 面包屑中的 Templates 指向真实目录页。
- sitemap 只收录公开且可用的页面；用户作品和后台不作为公开搜索落地页。
- 示例视频和封面使用稳定可访问地址；VideoObject 如使用，应与真实视频一致，包含 uploadDate 等必要属性，不承诺视频富结果。
- SoftwareApplication 等结构化数据根据实际产品和适用要求填写，不虚构评分或评论。
- 确实提供免费生成时才使用 Free 文案。英文网站优先，不批量发布未验证的多语言页面。

## 7. 分阶段开发与验收

| 阶段 | 交付物 | 验收标准 |
| --- | --- | --- |
| 1：生成验证 | Love Options 参考动作、生成服务接入与测试记录 | 使用约 20 张经授权、不同构图的照片记录身份保持、动作还原、失败情况、耗时和成本；不只展示最佳样例 |
| 2：交易闭环 | 上传、积分、生成任务、失败退款、结果保存与下载 | 普通用户能完成一次真实操作；验证重复提交、超时、重复回调和跨用户访问 |
| 3：英文首发 | 首页、目录、Love Options、购买、作品页及模板管理 | 手机端可操作，效果和价格说明清楚，演示和下载可用 |
| 4：模板扩展 | Stateside 模板和独立页面 | 实测合格后发布，验证模板配置可以复用业务流程 |

成品成本按“总生成支出 ÷ 可接受视频数量”估算，再加入重试、存储、支付及退款支出决定售价。竞品价格仅供参考。

仅文档修改不需要重新运行应用构建；后续业务代码修改按仓库要求执行安全扫描与构建验证。

## 8. 运营验证与待决事项

记录模板浏览、照片上传、发起生成、成功生成、失败、下载、购买和复购。结合 Search Console 的查询词、国家、曝光和点击，以及每个模板的实际毛利，决定保留、优化或扩展。

待确定：生成服务、时长、照片限制、积分售价、退款细则、素材保存期限及部署配置。这些都需要真实接口和成品测试，不在本规划中预设。

当前证据边界：AI 制作长尾的搜索量、全球七天增长和付费需求均未验证。Google Trends 非官方接口多次返回 429，不据此判断无需求，也不编造增长率。Love Options 的近一个月地区数据来自歌曲词，不等于 AI 制作长尾需求或流量占比。

## 9. 调研来源与复核记录

以下为截至 2026-10-20 的参考资料；竞品陈述不作为独立流量或销量证明。

- [Love Options 全球近一个月 Google Trends](https://trends.google.com/trends/explore?geo=&date=today+1-m&q=love+options)：仅歌曲词地区相对兴趣，不能证明 AI 制作需求。
- [SBS：Love Options 重新进入榜单](https://news.sbs.co.kr/english/article.do?cooper=SBSNEWSAMP&news_id=N1008773370)：2026-09-28，歌曲传播证据，不是近七天 AI 搜索增长证据。
- [AI Dance：Love Options 模板](https://aidanceapp.com/templates/love-options-dance)
- [MakeViral：Love Options 模板](https://www.makeviral.ai/templates/love-options-ai-dance)
- [AI Dance：Stateside 模板](https://aidanceapp.com/templates/stateside-dance)
- [FIKKU：Stateside 生成页](https://fikku.com/zara-larsson-stateside-dance)
- [Shanshenbu Dance 专门站](https://shanshenbudance.com/)：补查 shanshenbu 连写形式后发现，纠正此前“暂未发现专门站”的判断；搜索已检索到页面，直接正文抓取曾失败。
- [Google 排名系统说明](https://developers.google.com/search/docs/appearance/ranking-systems-guide)
- [Google 视频 SEO 指南](https://developers.google.com/search/docs/appearance/video)
- [Google VideoObject 指南](https://developers.google.com/search/docs/appearance/structured-data/video)

本文件记录当前产品与开发决策；具体功能进度以后续代码和验收记录为准。

# 农户端 UI 差距分析报告

> 基准：`xiaomanhe-xiaochengxu/pages/farmer/`（UI 更完整）
> 待补全：`frontend-app/src/App.tsx`（MP 后缀组件）+ `farmer-parity.css` / `miniprogram-parity.css` / `styles.css`
> 说明：App.tsx 中非 MP 后缀旧组件（FarmerHome/FarmerShop/Farming/Environment/Community/FarmerSubPage 等）为死代码，已忽略。
> 优先级定义：P0=功能缺失/占位页/核心数据 mock（阻断上线）；P1=有接口未接/死按钮/emoji 图标/主要布局差异；P2=文案/空态/加载态/次要视觉差异。

## 0. 全局结论（先读）

1. **配色 token 已对齐**：`farmer-parity.css` 定义了 `--farmer-green:#234d3c`、`--farmer-page:#f7f7f0`、`--farmer-card:#fffdf8`、`--farmer-ink:#263a2f` 等，与小程序 `farmer-theme.wxss` 主色一致。差距不在配色，而在 **图标、数据、功能完整性**。
2. **图标体系未迁移**：小程序已全量替换为 `/images/ui-v2/icons/` 线稿图标（首页/店铺/环境/我的等 18 页 + tabbar），APP 农户端所有 MP 组件仍用 emoji（📷🌱🎤⚠️🛠️🌤️🏪🏢🛒📸🔍💬💰🚚🎧📦☁️🌾🌡️📅🤖🔔📍💎⚙️ 等）。这是贯穿全端的 **P1 批量问题**。
3. **后端接口已就绪但未接**：`api/index.ts` 已提供 `fetchEnvironmentAlerts`、`fetchTechExperts`、`analyzeDisease`、`fetchWeather(含 forecast)` 等，但对应组件未使用，数据仍是硬编码 mock。
4. **三大整页占位/缺失（P0）**：语音助手（`FarmerVoiceAssistantMP` 整页"服务尚未接入"）、拍照识别三阶段流程、小程序 `my-orders`「我的工单」页在 APP 完全无对应页面。

---

## 1. 首页 home（tab）

**小程序** `home.wxml` / **APP** `FarmerHomeMP` (App.tsx:2179)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 1.1 | home.wxml:9-34 深绿问候区（hero-farm.jpg 背景+渐变遮罩+hero-caption） | App.tsx:2206-2215 `home-top-card` | APP 无背景图/遮罩/hero-caption，问候文案为硬编码"下午好，农友"，小程序为动态 `{{greeting}}` | P1 | 补背景图 `hero-farm.jpg` + 渐变遮罩 + 动态问候语 |
| 1.2 | home.wxml:28-31 通知铃铛（hasNewNotice 红点 + isLoggedIn 条件） | App.tsx:2210 `🔔` 按钮 | APP 用 emoji 🔔，无未读红点，无登录条件 | P2 | 换铃铛线稿图标 + 未读红点 |
| 1.3 | home.wxml:136-156 AI智能决策卡（`{{aiAdvice}}` 真实内容 + chips + AI对话按钮） | App.tsx:2248-2252 `decision-card` | APP 内容为占位文案"当前展示农事建议体验样板…服务尚未接入"，chips 为"示例内容/服务尚未接入"，按钮是"查看服务状态" | P0 | 接 AI 决策数据源，按钮改为「AI对话」跳 chat |
| 1.4 | home.wxml:273-342 拍照识别三阶段弹窗（拍照/症状描述/识别结果+处理建议） | App.tsx:2240 拍照识别直接 `onPage('voiceAssistant')` | APP 无拍照识别流程，跳到的是占位页 | P0 | 实现拍照/上传 + 症状描述 + `analyzeDisease` 结果展示 |
| 1.5 | home.wxml:187-255 + 418-490 AI 全屏/面板/悬浮球三态聊天（露露助手） | App.tsx:4145 `FarmerVoiceAssistantMP` 为占位页；有 `FarmerFloatingAssistant` 悬浮球 | APP 悬浮球跳转到占位页，无聊天 UI/消息流/快捷问题/打字指示器 | P0 | 复用消费端 AI 对话能力，实现农户端露露聊天（全屏+面板+悬浮球） |
| 1.6 | home.wxml:345-411 天气全屏详情（当前/体感/能见度/六宫格/预报/农事建议） | App.tsx:4069 `FarmerWeatherPageMP` 全部硬编码 | APP 天气页数据全 mock，未接 `fetchWeather` | P0 | `FarmerWeatherPageMP` 接 `fetchWeather` 返回 |
| 1.7 | home.wxml:259-270 通知弹窗（notices 列表） | App.tsx:2210 铃铛仅 `setNoticeRead(true)` | APP 无通知弹窗 | P2 | 补通知列表弹窗 |
| 1.8 | home.wxml:159-176 农事提醒（`{{reminders}}` 动态） | App.tsx:2185-2189 `reminders` 3 条硬编码 | APP reminders 硬编码 | P1 | 接农事提醒接口（或与 farming 任务联动） |

---

## 2. 店铺 shop（tab）

**小程序** `shop.wxml` / **APP** `FarmerShopMP` (App.tsx:2269)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 2.1 | shop.wxml:37-57 功能4宫格（客户聊天/收益钱包/物流管理/售后客服，聊天带未读角标） | App.tsx:2332-2338 `shop-func-grid` 5项 | APP 多"订单管理"入口（合理），但聊天未读角标是硬编码 `<em>3</em>` | P2 | 聊天角标接会话未读数 |
| 2.2 | shop.wxml:60-69 云店铺卡（`{{adoptionData.totalOrders}}` 动态认养数） | App.tsx:2340-2346 硬编码"6 个进行中认养" | APP 认养数硬编码 | P1 | 接 `fetchFarmerAdoptionOrders` 取 totalOrders |
| 2.3 | shop.wxml:171-221 商品上传弹窗（图片4张多选+名称+价格+单位picker+分类picker+描述） | App.tsx:2371-2378 upload sheet 仅名称/价格/说明，无图片/单位/分类 | APP 上传表单严重简化，无图片上传、单位/分类选择 | P0 | 补图片多选、单位/分类 picker，`createFarmerProduct` 需带 category/unit |
| 2.4 | shop.wxml:135-168 钱包弹窗（累计/本月/待结算/已提现 + 最近交易列表 + 去提现） | App.tsx:2379 wallet 仅 3 行 ShopRows | APP 钱包无最近交易、无提现按钮 | P1 | 补钱包明细结构 |
| 2.5 | shop.wxml:279-337 物流弹窗（统计+订单列表+进度条+安排发货/查看详情） | App.tsx:2379 logistics 仅 2 行 ShopRows | APP 物流管理无统计/进度/发货操作 | P1 | 复用 `shipFarmerOrder` 做发货，补物流进度 |
| 2.6 | shop.wxml:340-395 售后弹窗（电话客服/在线客服 + 工单列表 + 立即处理） | App.tsx:2379 afterSale 仅 2 行 ShopRows | APP 售后无客服入口、无工单处理 | P1 | 补电话/在线客服入口 + 工单列表 |
| 2.7 | shop.wxml:114-132 客户聊天弹窗（会话列表+未读） | App.tsx:2379 chat 仅 3 行 ShopRows | APP 客户聊天简化 | P1 | 接 `fetchConversations` 展示会话列表 |
| 2.8 | shop.wxml:224-276 品种筛选弹窗（分类+状态 tag + 结果提示） | App.tsx:2379 filter 仅 2 行蔬菜/水果 | APP 筛选无状态维度、无结果提示 | P2 | 补状态筛选 + 结果计数 |

---

## 3. 环境 environment（tab）

**小程序** `environment.wxml` / **APP** `EnvironmentMP` (App.tsx:2552)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 3.1 | environment.wxml:32-84 + 349-391 视频监控（MJPEG 实时帧、加载/错误态、全屏、云台控制、摄像头列表切换） | App.tsx:2618-2626 `env-video-card` 静态 `<img>` | APP 无实时视频流，无全屏/云台/摄像头切换 | P0 | 若后端有 MJPEG 流则接；否则保留占位但需明确"摄像头待连接"态 |
| 3.2 | environment.wxml:89-128 环境总览（温度/PH/湿度/光照 + 趋势 + 状态） | App.tsx:2628-2642 4 项硬编码 | APP 总览数据硬编码，未接环境接口 | P1 | 接 `fetchEnvironmentStations` 返回的读数 |
| 3.3 | environment.wxml:200-216 异常信息（`{{alerts}}` 动态，横向滚动） | App.tsx:2680-2689 3 条硬编码 | APP 未使用已提供的 `fetchEnvironmentAlerts` | P1 | 接 `fetchEnvironmentAlerts` |
| 3.4 | environment.wxml:219-312 传感器详细数据 10 项（`{{sensors.*}}` 动态） | App.tsx:2691-2707 10 项硬编码 | APP 传感器数据硬编码 | P1 | 接环境接口传感器字段 |
| 3.5 | environment.wxml:315-332 自动化任务（`{{autoTasks}}` + 开关 toggle） | App.tsx:2709-2716 3 条硬编码，开关无 onClick | APP 自动任务硬编码且开关死 | P1 | 接自动化任务接口 + 开关交互 |
| 3.6 | environment.wxml:131-142 + 419-446 滴灌系统 + 滴灌设备管理弹窗 | App.tsx:2644-2646 仅静态 `env-drip-card` | APP 无滴灌设备弹窗 | P1 | 补滴灌设备管理弹窗 |
| 3.7 | environment.wxml:394-416 设备管理弹窗（全部设备开关） | App.tsx:2666-2678 设备直接点击 toggle，无"全部设置"弹窗 | APP 无设备管理弹窗 | P2 | 补设备管理弹窗 |
| 3.8 | environment.wxml:335-344 刷新按钮 + 时间戳 | App.tsx:2629 仅"🔄 更新 10:32"硬编码 | APP 刷新时间硬编码，无真实刷新 | P2 | 补刷新逻辑 + 动态更新时间 |
| 3.9 | environment.wxml:15-29 基地选择条（`switchStation` 切换基地） | App.tsx:2608-2616 `env-station-info` 无切换 | APP 基地不可切换（仅取 stations[0]） | P2 | 补基地切换 |

---

## 4. 农事 farming（tab）

**小程序** `farming.wxml` / **APP** `FarmingMP` (App.tsx:2387)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 4.1 | farming.wxml:12-35 日历（年月切换 prevMonth/nextMonth、真实当月天数、任务点） | App.tsx:2415-2421 硬编码 `leadingBlank=1`、`monthDays=30`、`taskDays=[3,8,13...]` | APP 日历为固定 30 天，‹›按钮无功能，任务点硬编码 | P1 | 实现真实月份日历 + 月切换 + 按任务日期打点 |
| 4.2 | farming.wxml:42-58 选中日期卡（动态日期/星期/任务统计） | App.tsx:2474-2477 硬编码"农历五月初三…" | APP 选中日期卡文案硬编码 | P1 | 动态显示选中日期 + 农历/节气 |
| 4.3 | farming.wxml:61-64 农历 + 节气条（`currentLunar`/`currentSolarTerm`） | App.tsx:2479-2483 硬编码"🌤️晴26°C/湿度68%/花果期" | APP 农历条混入天气，无真实农历节气 | P2 | 接农历/节气计算 |
| 4.4 | farming.wxml:78-85 空状态（无任务日期提示 + 添加按钮） | App.tsx 无 | APP 无空状态 | P2 | 补无任务空态 |
| 4.5 | farming.wxml:88-111 AI 推荐（仅今天显示，可采纳） | App.tsx:2491-2502 2 条硬编码，始终显示 | APP AI 推荐硬编码、无日期条件 | P2 | 接 AI 推荐 + 仅今日显示 |
| 4.6 | farming.wxml:143-167 添加任务弹窗（名称/时间/类型三选一） | App.tsx:2537-2547 名称/时间/类型（自由文本） | APP 任务类型是自由 input，小程序是"日常/重要/紧急"三选 | P2 | 类型改三选 chip |

---

## 5. 我的 my（tab）

**小程序** `my.wxml` / **APP** `Profile role="farmer"` (App.tsx:3181, 3228-3439 分支)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 5.1 | my.wxml:8-33 登录态（头像+钻石徽章+姓名+ID+位置+设置） / 36-48 未登录态（登录引导） | App.tsx:3283-3294 硬编码"👨🌾张大叔 / FM20240088 / 云南省昆明市" | APP 无登录/未登录态区分，用户信息硬编码 | P0 | 接 `fetchCurrentUser`，补未登录引导 |
| 5.2 | my.wxml:53-68 stats-bar（识别次数/作物档案/使用天数） | App.tsx:3296-3302 识别156/使用365 硬编码 | APP 识别次数、使用天数硬编码 | P1 | 接用户统计接口 |
| 5.3 | my.wxml:74-109 作物档案横向滚动（照片/渐变+状态+产量） | App.tsx:3304-3321 已接 `fetchFarmerCrops`，但无照片/渐变背景 | APP 作物卡用 `img src={crop.photo}`（后端 photo 为空） | P2 | 无照片时用渐变底色 + 图标 |
| 5.4 | my.wxml:112-131 历史识别记录 | App.tsx:3323-3337 `farmerHistory` 硬编码 mock | APP 历史识别记录 mock | P1 | 接识别记录接口 |
| 5.5 | my.wxml:148-179 今日速览4宫格（天气/待办/设备/提醒，动态数值） | App.tsx:3344-3352 待办5项/设备6/6/提醒4条 硬编码 | APP 今日速览数值硬编码 | P1 | 接任务/设备/预警接口取数 |
| 5.6 | my.wxml:182-200 设备快捷（`quickDevices` + switch toggle） | App.tsx:3354-3364 `quickDevices` 本地 state 4 个硬编码 | APP 设备快捷未接后端 | P1 | 接 `fetchEnvironmentDevices` |
| 5.7 | my.wxml:203-231 明日天气卡 + 农事提醒列表 | App.tsx:3366-3379 硬编码 | APP 明日天气、农事提醒硬编码 | P2 | 接天气接口 |
| 5.8 | my.wxml:29-32 设置入口 `goSettings` | App.tsx:3293 `fmy-settings` 按钮无 onClick | APP 设置按钮是死按钮 | P0 | 绑定 `onOpenFarmerPage('farmerSettings')` |

---

## 6. 社区 community（子页）

**小程序** `community.wxml` / **APP** `CommunityMP` (App.tsx:2721)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 6.1 | community.wxml:14-17 tab-bar（热门/最新带线稿图标） | App.tsx:2757 `🔥热门/🕐最新` emoji | APP tab 用 emoji | P2 | 换线稿图标 |
| 6.2 | community.wxml:24-29 语音按钮长按录音（bindlongpress/bindtouchend） | App.tsx:2760 `onMouseDown/onMouseUp` 模拟，松开发送固定文案 | APP 录音是假实现（塞固定文案），且 mouse 事件不适配触屏 | P1 | 用 touch 事件，接真实录音 |
| 6.3 | community.wxml:80-93 操作栏（点赞 toggleLike + 评论 + 查看） | App.tsx:2765 footer `🤍/💬/👁️` 无 onClick | APP 点赞/评论/查看均无交互；`likeCommunityPost` API 已存在未用 | P1 | 绑定点赞调 `likeCommunityPost`，评论展开 |
| 6.4 | community.wxml:96-106 评论展开区（commentList） | App.tsx 无 | APP 无评论展开 | P1 | 补评论列表展示 |
| 6.5 | community.wxml:69-77 语音条（播放 + 波形） | App.tsx:2765 仅静态 `▶ ▬▬▬` | APP 语音条无播放 | P2 | 接音频播放 |
| 6.6 | community.wxml:111-118 加载更多"已经到底了" + 空态 | App.tsx 无 | APP 无加载更多/空态 | P2 | 补空态与到底提示 |
| 6.7 | community.wxml:48-108 帖子卡（等级 badge 样式） | App.tsx:2765 等级用 `em` 简单显示 | APP 等级 badge 无视觉区分 | P2 | 等级 badge 样式对齐 |

---

## 7. 我的作物 my-crops（子页）

**小程序** `my-crops.wxml` / **APP** `FarmerCropsPageMP` (App.tsx:3601)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 7.1 | my-crops.wxml:41-44 loading 态 | App.tsx:3604-3608 无 loading 态 | APP 缺加载态 | P2 | 补 loading |
| 7.2 | my-crops.wxml:137-218 添加弹窗（名称/图标选择emoji-grid/日期/日期/面积/健康状态/位置） | App.tsx:3621 名称/日期/日期/位置 | APP 无图标选择、健康状态、面积 | P1 | 补图标选择 + 健康状态 + 面积 |
| 7.3 | my-crops.wxml:47-54 空态"暂无作物登记 + 添加按钮" | App.tsx:3618 "还没有作物档案 + 右下角添加" | 文案基本一致，APP 有图 | P2 | 保持 |

---

## 8. 作物详情 crop-detail（子页）

**小程序** `crop-detail.wxml` / **APP** `FarmerCropDetailPageMP` (App.tsx:3626)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 8.1 | crop-detail.wxml:41-55 SVG 进度环（stroke-dasharray 动画） | App.tsx:3637 `progress-ring` 仅数字+% | APP 进度环无 SVG 描边动画 | P2 | 用 SVG 圆环 |
| 8.2 | crop-detail.wxml:25 品种（`crop.variety`） | App.tsx:3637 无品种字段 | APP 缺品种 | P2 | 补品种字段 |
| 8.3 | crop-detail.wxml:151-166 智能提醒（warnings 列表） | App.tsx 无 | APP 缺智能提醒块 | P1 | 补预警列表 |
| 8.4 | crop-detail.wxml:169-193 当前环境（温度/湿度/PH/光照 + 刷新） | App.tsx:3642 仅 4 项 env-grid-detail（静态） | APP 环境项是静态的重复信息 | P1 | 接环境接口 + 刷新 |
| 8.5 | crop-detail.wxml:196-203 操作按钮（拍照诊断/AI农事助手） | App.tsx 无 | APP 缺底部操作按钮 | P1 | 补拍照诊断/AI助手入口 |
| 8.6 | crop-detail.wxml:125-148 农事记录（日期盒+动作 tag+描述） | App.tsx:3641 3 条简单文本 | APP 农事记录结构简化 | P2 | 补记录时间线结构 |
| 8.7 | App.tsx:3630 数据源 | crop-detail.wxml 按 `crop.id` 取详情 | APP 取 `list[0]`，未按 ID 定位 | P1 | 按 crop.id 传参定位 |

---

## 9. 语音助手 voice-assistant（子页）【P0 整页占位】

**小程序** `voice-assistant.wxml` / **APP** `FarmerVoiceAssistantMP` (App.tsx:4145)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 9.1 | voice-assistant.wxml:20-24 说明卡 + 27-76 两个选项（AI语音助手/屏幕阅读，各带特性标签+开启按钮） | App.tsx:4147-4153 整页"服务尚未接入…不会生成病害诊断" | **APP 整个语音助手功能缺失**，仅占位文案 | P0 | 实现功能选择页：AI 语音对话（可复用消费端 DeepSeek 对话）+ 屏幕阅读 |
| 9.2 | 小程序 AI 语音聊天 / 屏幕阅读能力 | App.tsx 无 | APP 无语音输入/播报/朗读能力 | P0 | 接麦克风 + TTS，或至少实现 AI 文本对话 |

---

## 10. 预警中心 warning-center（子页）

**小程序** `warning-center.wxml` / **APP** `FarmerWarningPageMP` (App.tsx:3647)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 10.1 | warning-center.wxml:124-178 设备预警卡（当前值/阈值/diff 参数对比布局） | App.tsx:3721-3747 统一卡片，参数行简单 | APP 设备卡无"当前值 vs 安全阈值 vs 超出/低于"对比视觉 | P1 | 设备卡补参数对比布局 |
| 10.2 | warning-center.wxml:180-221 作物卡（处理建议框） | App.tsx:3739 advice 简单 `<div>` | APP 处理建议无独立样式框 | P2 | 建议框样式 |
| 10.3 | warning-center.wxml:91-122 卡片左侧等级颜色条 | App.tsx:3722 仅 `<i/>` 小色条 | 差异小 | P2 | 保持 |
| 10.4 | App.tsx:3648-3650 status 维度（待处理/处理中/已处理） | 小程序无此维度（只有分类 tab） | APP 多了状态维度，是增强，保留 | - | 保留 |
| 10.5 | App.tsx:3743 "查看详情"按钮 | warning-center.wxml:119 卡片可点击查看详情 | APP 查看详情无跳转 | P2 | 补详情跳转或移除死按钮 |

---

## 11. 认养中心 adoption-center（子页）

**小程序** `adoption-center.wxml` / **APP** `FarmerAdoptionOrdersMP` (App.tsx:3753)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 11.1 | adoption-center.wxml:16-34 头部渐变 + 线稿背景图标 | App.tsx:3785-3796 `📦🚚☁️` emoji 背景 | APP 头部用 emoji 背景 | P1 | 换线稿图标背景 |
| 11.2 | adoption-center.wxml:129-137 联系认养人 / 查看生长 按钮（bindtap） | App.tsx:3821-3822 按钮无 onClick | APP 联系认养人、查看生长是死按钮 | P1 | 绑定拨号 / 生长详情 |
| 11.3 | adoption-center.wxml:156-159 底部认养模式提示文案 | App.tsx 无 | APP 缺底部提示 | P2 | 补提示 |
| 11.4 | 其余结构（统计卡/分类/订单卡/发货弹窗） | App.tsx 已接 `fetchFarmerAdoptionOrders` + `shipFarmerAdoptionOrder` | 基本一致 | - | 保持 |

---

## 12. 我的设备 my-device（子页）

**小程序** `my-device.wxml` / **APP** `FarmerDevicePageMP` (App.tsx:3843)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 12.1 | App.tsx:3873-3883 设备统计卡（在线/启用+添加） | my-device.wxml 无统计卡 | APP 多了统计卡，是增强 | - | 保留 |
| 12.2 | my-device.wxml:87-92 添加按钮（addNewDevice） | App.tsx:3915-3924 添加弹窗（监测站/摄像头/扫码3选项） | APP 添加是弹窗3选项，小程序是按钮 | 差异小 | 保持 |
| 12.3 | my-device.wxml:43-49 switch 颜色 `#34A853` | App.tsx:3906 `md-big-switch` | 视觉等价 | - | 保持 |
| 12.4 | 数据源 | App.tsx 接 `fetchFarmerDevices` + `setFarmerDeviceEnabled` | 基本一致 | - | 保持 |

---

## 13. 技术支持 tech-support（子页）

**小程序** `tech-support.wxml` / **APP** `FarmerTechSupportMP` (App.tsx:3929)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 13.1 | tech-support.wxml:36-56 快捷统计（设备/无人机/农机/专家 4 项计数） | App.tsx:3995-3999 `tech-sla-row`（2h/96%/24h） | 结构完全不同：小程序是分类计数，APP 是 SLA 指标 | P1 | 补分类统计，或保留 SLA 但需真实数据 |
| 13.2 | tech-support.wxml:59-233 折叠式 section（设备报修/无人机/农机/专家，可展开） | App.tsx:4001-4052 tab 布局（服务项目/专家顾问/服务工单） | 布局差异大：小程序是纵向折叠分类，APP 是三 tab | P1 | 对齐折叠分类布局（或明确保留 tab 作为增强） |
| 13.3 | App.tsx:3974-3978 `experts` 硬编码 | tech-support.wxml:187-231 专家列表 | APP 未使用 `fetchTechExperts` API，专家硬编码 | P1 | 接 `fetchTechExperts` |
| 13.4 | App.tsx:3979-3983 `orders` 3 条硬编码 | 小程序有独立 my-orders 页 | APP 工单硬编码且无独立"我的工单"页 | P0 | 见 §15 |
| 13.5 | tech-support.wxml:236-274 联系平台（电话咨询/在线客服/提交工单） | App.tsx 无 | APP 缺联系平台卡片 | P1 | 补电话/在线客服/工单入口 |
| 13.6 | tech-support.wxml:283-305 报修表单（故障类型选择） | App.tsx:4054-4064 预约 sheet（地块/描述/时间，无故障类型） | APP 报修/预约表单合并简化 | P1 | 拆分报修（故障类型）与预约（面积/联系人/电话）表单 |
| 13.7 | tech-support.wxml:308-347 预约表单（日期/面积/联系人/电话/地址/备注） | App.tsx 预约 sheet 仅 3 字段 | APP 预约字段缺失 | P1 | 补全预约字段 |

---

## 14. 天气详情 weather-detail（子页）

**小程序** `weather-detail.wxml` / **APP** `FarmerWeatherPageMP` (App.tsx:4069)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 14.1 | weather-detail.wxml:5-16 切换城市（changeCity） | App.tsx:4093 "切换基地"按钮无 onClick | APP 切换功能死按钮 | P1 | 绑定切换 |
| 14.2 | weather-detail.wxml 全部 `{{current}}/{{aqi}}/{{forecast}}/{{lifeIndex}}` 动态 | App.tsx:4070-4140 全部硬编码（hours/days/fieldRisks/指数） | APP 天气页 100% mock，未接 `fetchWeather`（含 forecast） | P0 | 接 `fetchWeather`，渲染真实当前/预报 |
| 14.3 | App.tsx:4085-4131 地块气象风险 + 农事指数 | 小程序为"农事生活指数" | APP 多了地块风险（增强），指数结构略不同 | P2 | 保留地块风险，指数接数据 |

---

## 15. 我的工单 my-orders【APP 整页缺失】

**小程序** `my-orders.wxml`（报修工单 + 服务预约 双 tab） / **APP 无对应组件**

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 15.1 | my-orders.wxml:18-25 双 tab（报修工单/服务预约） | App.tsx `FarmerPage` 类型 (121行) 无 `myOrders` | APP 完全无"我的工单"页，`FarmerTechSupportMP` 的"服务工单"tab 是 3 条 mock | P0 | 新增 `FarmerWorkOrdersMP` 页面 + `FarmerPage` 加 `myOrders`，注册到 `FarmerSubPageMP` |

---

## 16. 订单 orders / 订单详情 order-detail（子页）

**小程序** `orders.wxml` + `order-detail.wxml` / **APP** `FarmerOrdersMP` (App.tsx:3482)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 16.1 | orders.wxml:16 状态 tab（`tabs` 切换） | App.tsx:3528 无状态 tab | APP 无状态筛选 tab | P1 | 补状态 tab（全部/待发货/已发货等） |
| 16.2 | orders.wxml:17-22 + order-detail.wxml 订单详情页（收货信息/商品/金额/物流/发货表单） | App.tsx:3477 `farmerOrderDetail` 与 `farmerOrders` 都渲染 `FarmerOrdersMP` | APP 无独立订单详情页 | P1 | 实现 `FarmerOrderDetailMP`（收货信息 + 发货表单） |
| 16.3 | orders.wxml:25 分页"查看更多"（loadMore） | App.tsx 无分页 | APP 无分页 | P2 | 补分页 |
| 16.4 | orders.wxml:19 测试订单标识 | App.tsx 无 | APP 无测试订单标识 | P2 | 补测试标识 |
| 16.5 | orders.wxml:13-14 登录态/失败态 | App.tsx:3529-3530 仅 loading/空态 | APP 缺登录态/失败态 | P2 | 补登录/失败态 |

---

## 17. 位置地图 location-map（子页）

**小程序** `location-map.wxml` / **APP** `FarmerLocationMapMP` (App.tsx:4157)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 17.1 | location-map.wxml:12-15 明确"地图服务尚未接入"占位 | App.tsx:4160-4161 静态 map-card + 4 条基地列表 | 小程序诚实占位，APP 展示基地列表（均无真地图） | P2 | 统一为占位提示 + 基地列表 |

---

## 18. 设置 settings（子页）

**小程序** 设置页（`my.wxml:29` goSettings 跳转） / **APP** `FarmerSettingsMP` (App.tsx:3564)

| # | 小程序位置 | APP 位置 | 差异 | 优先级 | 建议 |
|---|---|---|---|---|---|
| 18.1 | 小程序设置页（含个人信息/通用设置/修改密码，任务 #35/#41/#42/#44 已实现） | App.tsx:3564-3599 静态列表，5 行 + 关于，均无 onClick | APP 设置页是纯静态，无任何跳转/交互，用户信息硬编码"耘露农户" | P1 | 接个人信息（昵称/城市，任务 #12/#13 已实现后端），各行绑定跳转 |

---

## 19. 农户端 UI 差距汇总表

| 页面 | 差距数 | 最高优先级 |
|---|---|---|
| 首页 home | 8 | P0 |
| 店铺 shop | 8 | P0 |
| 环境 environment | 9 | P0 |
| 农事 farming | 6 | P1 |
| 我的 my | 8 | P0 |
| 社区 community | 7 | P1 |
| 我的作物 my-crops | 3 | P1 |
| 作物详情 crop-detail | 7 | P1 |
| 语音助手 voice-assistant | 2 | **P0** |
| 预警中心 warning-center | 5 | P1 |
| 认养中心 adoption-center | 4 | P1 |
| 我的设备 my-device | 4 | P2 |
| 技术支持 tech-support | 7 | P0 |
| 天气详情 weather-detail | 3 | P0 |
| 我的工单 my-orders | 1 | **P0（整页缺失）** |
| 订单 orders/order-detail | 5 | P1 |
| 位置地图 location-map | 1 | P2 |
| 设置 settings | 1 | P1 |
| **合计** | **89** | **P0** |

### P0 优先清单（阻断上线，共 10 项）

1. 语音助手整页占位 → 实现功能选择 + AI 对话（§9）
2. 拍照识别三阶段流程缺失（§1.4）
3. 首页 AI 智能决策卡 mock（§1.3）
4. 天气详情整页 mock，未接 `fetchWeather`（§14.2）
5. 环境实时视频监控缺失（§3.1）
6. 我的工单页整页缺失（§15）
7. 我的页用户信息硬编码，未接登录态（§5.1）
8. 我的页设置按钮死按钮（§5.8）
9. 店铺商品上传无图片/单位/分类（§2.3）
10. 技术支持工单 mock，缺联系平台与报修/预约表单（§13.4/§13.5/§13.6）

### 全端批量建议（一次性修复收益最大）

- **emoji → 线稿图标**：APP 所有农户端 MP 组件将 emoji 替换为与小程序 `/images/ui-v2/icons/` 对应的 SVG/PNG 线稿图标（`/assets/miniprogram/farmer-icons/` 已有部分素材）。涉及约 50+ 处。
- **统一"体验样板"提示**：小程序各页顶部有 `farmer-demo-note`，APP 仅在部分页有 `farmer-sample-note`/`farmer-sub-sample-note`，文案不统一。

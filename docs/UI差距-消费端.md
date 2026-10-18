# 消费端 UI 差距分析（小程序 vs React APP）

> 参照基准：`xiaomanhe-xiaochengxu/pages/consumer/`
> 待补全：`frontend-app/src/App.tsx`
> 样式：小程序 `styles/sevenfresh.wxss`（品牌青 #118B7B 主题） / APP `src/miniprogram-parity.css`、`consumer-parity.css`

## 全局结论

1. **主色基本一致**：小程序消费端实际用七鲜青 `#118B7B`、页面底 `#F4F7F6`、卡片 `#FFFFFF`（`styles/sevenfresh.wxss:25-38`），与 APP `consumer-parity.css` 的 `--consumer-green:#118b7b`、`--consumer-page:#f4f7f6` 一致。价格色略有差异：小程序 `#E34445`（红），APP `#d76a45`（橙）。
2. **APP 存在大量死代码**：`Trace`（App.tsx:1262-1409）与 `AdoptV2`（App.tsx:1436-1675 及 1677+）有多个并列 `return`，只有第一个 `return` 生效，后面的大段 UI 是死代码，导致实际渲染远落后于小程序。
3. **命名不一致**：AI 助手小程序叫「小露」，APP 叫「AI 小满」；Tab「个人中心」在 APP 叫「我的」。
4. **核心 tab 差距最大**：adopt（云认养）与 trace（溯源）两页功能缺失最严重；home 缺轮播/智慧农业/地域内容流三大块。

---

## 一、首页 home

小程序 `pages/consumer/home/home.wxml`（122 行） vs APP `ConsumerHome`（App.tsx:852-877）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| 轮播 Banner 缺失：小程序 `home.wxml:15-26` 用后端 `banners` 渲染 swiper（自动播放、标题+CTA），APP `App.tsx:868` 只有一张静态 `hero-farm.jpg` | P0 | 用 `fetchBanners()` 返回的 `banners` 渲染轮播，替换静态 hero |
| 智慧农业服务块缺失：小程序 `home.wxml:42-55` 有「耘露智慧·数字农业」服务 grid（smartServices），APP 完全没有 | P1 | 新增 smart services grid 区块 |
| 地域特色内容流缺失：小程序 `home.wxml:58-102` 有按定位推荐的 regionFeed（文旅/美食/文化横滑卡片 + 加载态），APP 完全没有 | P0 | 接定位+`regionFeed` 接口，新增地域内容流区块 |
| 分类金刚区写死：小程序 `home.wxml:28-40` 分类 entrances 来自后端（带图片，失败回退 ui-v2 图标），APP `App.tsx:856-861` 写死 8 个静态项+本地图标 | P1 | 改用后端分类数据驱动，保留图标兜底 |
| 加载骨架屏缺失：小程序 `home.wxml:7-12` 有 skeleton 骨架屏，APP `App.tsx:873` 只有文字「正在加载商品…」 | P2 | 加骨架屏或至少分组 placeholder |
| 错误态结构简单：小程序 `home.wxml:13` 有标题+说明+「重新加载」+可选「前往登录」，APP `App.tsx:870` 只有一行 error+重试 | P1 | 补齐错误态标题/说明/登录引导 |
| 商品卡片快捷加购「+」缺失：小程序 `home.wxml:114` 每张卡有 `+` 快捷加购，APP `App.tsx:873` 卡片无加购按钮 | P1 | 商品卡加 `+` 快捷加购 |

---

## 二、商城 mall

小程序 `pages/consumer/mall/mall.wxml`（18 行） vs APP `Mall`（App.tsx:884-1042）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| 分页加载缺失：小程序 `mall.wxml:8,12` 有 `loadMore` 触底加载 +「已经到底了」尾，APP 一次性渲染全部无分页 | P1 | 加 `scrolltolower`/触底分页加载 |
| 下拉刷新缺失：小程序 `mall.wxml:8` 有 `refresher-enabled` 下拉刷新，APP 无 | P1 | 加下拉刷新 |
| 价格排序不完整：小程序 `mall.wxml:7` 价格支持 升/降序（↑↓），APP `App.tsx:911` 只有单向升序 | P2 | 价格排序支持升/降切换 |
| 底部购物车入口条缺失：小程序 `mall.wxml:14` 有固定「购物车·按农户分别结算」bar，APP 无 | P1 | 加底部购物车入口 bar |
| 骨架屏/空态文案差异：小程序 `mall.wxml:9-11` 有骨架列表+分类空态文案，APP 用 `market-empty`（PackageSearch 图标）可接受但文案不同 | P2 | 统一空态文案 |
| 分类「全部」下拉：小程序 `mall.wxml:4` 有「全部⌄」重置按钮，APP 无对应 | P2 | 加「全部」快捷入口 |

---

## 三、溯源 trace（差距最大之一）

小程序 `pages/consumer/trace/trace.wxml`（126 行） vs APP `Trace`（App.tsx:1044-1411，实际渲染 1195-1260「trace-clone-page」）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| **双 Tab 结构缺失**：小程序 `trace.wxml:12-21` 有「生命周期追溯 / 扫码溯源」两个 tab，APP 只有单页 | P0 | 增加双 tab 切换结构 |
| **扫码溯源缺失**：小程序 `trace.wxml:64-88` 有扫码框（wx.scanCode）+ 手动输批次号查询，APP 仅输入框无扫码 | P0 | 接扫码能力（相机/扫码），保留手动输入 |
| 生长环境监控缺失：小程序 `trace.wxml:26-37` 有温度/湿度/光照/土壤pH 实时环境 grid，APP 无 | P1 | 新增生长环境卡片（接 env 接口） |
| 扫码历史缺失：小程序 `trace.wxml:90-100` 有「近期扫码记录」，APP 无 | P1 | 本地存扫码历史并展示 |
| 溯源结果卡片缺失：小程序 `trace.wxml:102-123` 有采摘时间/基地编号/产地/检测机构/区块链哈希 + 认证徽章（有机/农残/上链），APP 无此结构 | P1 | 补齐溯源结果字段与认证徽章 |
| 死代码：APP `Trace` 在 App.tsx:1259 有第一个 `return`，1262-1409 的「trace-page-red」（扫码验真/检测报告/核心检测/产地实时环境/报告弹层）是死代码永不渲染 | P0 | 清理死代码，把有效功能合并进实际渲染的 UI |
| mock 数据写死：APP `App.tsx:1056-1110` traceProductProfiles/evidence/metrics 全是硬编码（日期 2026.06.09 等） | P1 | 改为后端溯源接口返回 |
| 文案差异：小程序头部「每一份农货，都有来处」，APP「这批货，可以放心买」等（死代码内）不一致 | P2 | 对齐头部文案 |

---

## 四、云认养 adopt（差距最大）

小程序 `pages/consumer/adopt/adopt.wxml`（250 行，功能完整） vs APP `AdoptV2`（App.tsx:1413-1435 实际渲染「mp-adopt-page」，1436-1675 及 1677+ 为死代码）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| **后端认养方案未展示**：小程序 `adopt.wxml:52-91` 渲染后端 `filteredPackages`（tags/倒计时/承包期/产出/位置/价格/进度），APP 实际渲染 `App.tsx:1431` 只有 2 个写死样板卡，后端 `projects`（adopts）只在死代码里引用 | P0 | 让 `AdoptV2` 直接用 `projects` 渲染真实认养卡片 |
| 农场实时环境缺失：小程序 `adopt.wxml:26-44` 有温度/湿度/光照/土壤pH/空气质量 env 面板，APP 无 | P1 | 新增 env 面板（接环境接口） |
| 分类筛选缺失：小程序 `adopt.wxml:52-57` 有 全部/时令蔬菜/蜂蜜/粮油 筛选，APP 无 | P1 | 加项目分类筛选 |
| 认养流程缺失：小程序 `adopt.wxml:93-101` 有「认养流程」步骤卡，APP 无 | P2 | 加流程步骤卡 |
| 农技专家入口缺失：小程序 `adopt.wxml:103-110` 有「农技专家在线」咨询入口，APP 无 | P1 | 加专家咨询入口 |
| **我的认养缺失**：小程序 `adopt.wxml:113-154` 有 stats 统计（认养/浇水/巡查/收获）+ 认养卡片（浇水/巡查/分享操作 + milestones），APP「我的认养」tab 只有空态样板 | P0 | 接 `fetchAdoptionOrders` 渲染我的认养列表+操作 |
| 成就徽章缺失：小程序 `adopt.wxml:156-182` 有成就徽章（解锁/进度），APP 无 | P2 | 加徽章模块 |
| 农事日历缺失：小程序 `adopt.wxml:184-196` 有农事日历，APP 无 | P2 | 加农事日历 |
| 规格弹窗缺失：小程序 `adopt.wxml:199-248` 有选规格弹窗（生长时间线/生长阶段/规格参数/确认认养），APP 无 | P1 | 补规格选择弹窗 |
| 死代码：APP `AdoptV2` App.tsx:1426 第一个 return 生效，1559/1677 的「adopt-clone-page」和「adopt-v2-page」（cropMap/能量/浇水/直播/成长日记）是死代码 | P0 | 清理死代码，把成长日记/浇水/直播合并进真实 UI |
| 兜底文案：APP `App.tsx:1434` 明确写「真实农场、认养下单…尚未接入」，与小程序完整功能矛盾 | P0 | 移除「未接入」提示，接真实接口 |

---

## 五、购物车 cart

小程序 `pages/consumer/cart/cart.wxml`（12 行） vs APP `CartPage`（App.tsx:4847-4902）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| **按农户分组缺失**：小程序 `cart.wxml:7` 按 `farmerId` 分组（组头+每组独立结算「结算这家农货」），APP 是平铺列表 | P0 | 按农户分组渲染 + 分组结算 |
| 收货地区入口缺失：小程序 `cart.wxml:2` 顶部有地区选择，APP 无 | P1 | 加地区选择 |
| 管理模式缺失：小程序 `cart.wxml:2,7` 有「管理/完成」切换批量移除，APP 只有单条删除 | P2 | 加管理模式 |
| 不可购买原因提示缺失：小程序 `cart.wxml:7` 有「当前数量不可购买」原因，APP 无 | P2 | 加不可购提示 |
| 结算前校验/失效提示缺失：小程序 `cart.wxml:5` 有 stale 失效提示，APP 无 | P2 | 加失效数据提示 |
| 为你推荐缺失：小程序 `cart.wxml:8` 有推荐商品流，APP 无 | P2 | 加推荐流 |
| 删除确认弹窗缺失：小程序 `cart.wxml:10` 有「移除这份农货？」确认弹窗，APP `App.tsx:4889` 直接删除 | P1 | 加删除确认 |
| 复选框只读：APP `App.tsx:4882` checkbox `readOnly` 无勾选逻辑，小程序为分组全选/结算 | P1 | 实现勾选与全选逻辑 |

---

## 六、个人中心 my

小程序 `pages/consumer/my/my.wxml`（5 行，密集结构） vs APP `Profile`（App.tsx:3198-3226 consumer 分支）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| **积分会员入口缺失**：小程序 `my.wxml:1` 顶部有「会员」图标入口（goMember），APP 无（且无 member 页） | P1 | 加会员入口 + member 页 |
| 消息未读角标缺失：小程序 `my.wxml:1` 消息图标带未读数角标，APP 无 | P1 | 加未读角标 |
| 浏览足迹入口缺失：小程序 `my.wxml:1` 有「足迹」入口，APP 无（无 footprints 页） | P1 | 加足迹入口 + footprints 页 |
| 订单状态计数缺失：小程序 `my.wxml:3` 待付款/待发货/待收货 带数量角标，APP `App.tsx:3209-3214` 无计数 | P1 | 接订单计数接口加角标 |
| 「客服售后」入口：小程序订单区有「客服售后」5 项（待付款/待发货/待收货/客服售后/全部订单），APP 只有 4 项（待付款/待发货/待收货/评价售后）+全部订单 | P2 | 对齐订单快捷入口（含客服售后） |
| **我的收藏缺失**：小程序 `my.wxml:4` 服务网格有「我的收藏」（goFavorites），APP 常用功能无收藏 | P1 | 加收藏入口 + favorites 页 |
| 服务网格形态差异：小程序用彩色圆形图标网格（8 项：认养/客服/地址/收藏/消息/购物车/设置/农户订单），APP 用列表行 6 项 | P2 | 视觉对齐为圆形图标网格 |
| **为你推荐缺失**：小程序 `my.wxml:5` 有「为你推荐」商品流，APP 无 | P2 | 加推荐商品流 |
| 昵称写死：小程序显示真实 `profile.nickname`，APP `App.tsx:3204` 写死「耘露用户」 | P1 | 显示登录用户昵称 |
| 退出登录位置：小程序在 my 页底部「退出当前账户」，APP 在设置页 | P2 | 在 my 页也提供退出入口 |

---

## 七、商品详情 product-detail

小程序 `pages/consumer/product-detail/product-detail.wxml`（19 行） vs APP `ProductDetail`（App.tsx:4700-4845）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| **图片轮播缺失**：小程序 `product-detail.wxml:5` 多图 swiper 画廊（含图片计数），APP `App.tsx:4749` 单张大图 | P1 | 用 `images[]` 渲染轮播画廊 |
| **联系商家入口缺失**：小程序 `product-detail.wxml:6` 有卖家卡片（店铺名/自营标签/「联系商家」），APP 无卖家卡 | P0 | 加卖家卡 + 联系商家（接会话） |
| 预购/待上架状态缺失：小程序 `product-detail.wxml:6-7` 有「暂未上架·敬请期待」+ 上架提醒，APP 无预购态 | P1 | 加预购态与上架提醒 |
| 数量选择缺失：小程序 `product-detail.wxml:11,16` 有数量 sheet（加减数量+上限），APP 用 3 个写死规格按钮替代、无数量选择 | P1 | 加数量选择 sheet |
| 溯源详情展开缺失：小程序 `product-detail.wxml:9` 可展开「商品来源」（编号/产地/农户），APP 只有溯源跳转按钮 | P2 | 加商品来源展开 |
| **假社交证明/评价写死**：APP `App.tsx:4764`「12分钟前 赵** 拼单成功」、`4815-4821` 好评率 98.6%/复购等全是写死假数据 | P0 | 删除假评价/假拼单，改接真实评价或留空 |
| 底部栏差异：小程序 4 按钮（购物车/小露/加入购物车/立即购买），APP 5 按钮（客服/收藏/购物车/加入购物车/立即拼单），「立即拼单」文案与小程序「立即购买」不一致 | P2 | 对齐底部按钮与文案 |
| 收藏按钮无状态：小程序收藏有红心 toggle，APP `App.tsx:4838` 收藏只是 toast | P1 | 接收藏接口+红心状态 |

---

## 八、底部 TabBar

小程序 `app.json` + `custom-tab-bar/index.js` vs APP `consumerTabs`（App.tsx:124-130）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| **Tab 名称不一致**：小程序「小露」「个人中心」，APP「AI 小满」「我的」 | P0 | 统一为「小露」「个人中心」 |
| 图标不一致：小程序用 `images/sevenfresh/*.png` 图标，APP 用 lucide-react（Home/Sprout/Bot/ShoppingCart/UserRound） | P2 | 换用小程序同款 png 图标 |

---

## 九、AI 助手（小露）

小程序 `pages/consumer/assistant/assistant.wxml`（10 行） vs APP `AiPanel`（App.tsx:5387-5446）

| 差异点 | 优先级 | 建议改法 |
|---|---|---|
| **助手名不一致**：小程序「小露」，APP「AI 小满」「小满 AI」 | P0 | 全局统一为「小露」 |
| 快捷场景缺失：小程序 `assistant.wxml:9` 有横滑场景 chips（找商品/当季尝鲜/产品溯源/我的认养/我的订单/常见问题），APP 只有 3 条 quickPrompts | P1 | 加横滑场景 chips |
| 商品卡片回复缺失：小程序 `assistant.wxml:6` 回复可带商品卡片（图+名+价+跳转），APP 纯文本回复 | P2 | AI 回复支持商品卡片 |
| 新对话入口缺失：小程序 `assistant.wxml:2` 有「+ 新对话」按钮，APP 无 | P2 | 加新对话按钮 |

---

## 十、缺失页面清单（小程序有、APP 无对应）

| 小程序页面 | 内容 | 优先级 | 建议改法 |
|---|---|---|---|
| `member` | 积分会员（积分/权益/签到） | P1 | 新增会员页（后端已有积分会员接口） |
| `favorites` | 我的收藏 | P1 | 新增收藏页（后端已有收藏接口） |
| `footprints` | 浏览足迹 | P2 | 新增足迹页（后端已有足迹接口） |
| `profile-edit` | 资料编辑（昵称/性别等） | P1 | 新增资料编辑页 |
| `seasonal` | 时令推荐 | P2 | 可并入 home |
| `region` | 地域选择/切换 | P1 | 新增地区选择页（home 地区入口已埋点但未接） |
| `farm-detail` | 农场详情 | P2 | 认养详情中补充 |
| `adoption-detail` / `adoption-diary` / `adoption-delivery` / `adoption-result` / `my-adoptions` | 认养详情/日记/配送/结果/我的认养完整流 | P0 | 补齐认养全流程子页（后端已有认养订单/生长记录接口） |
| `search` | 独立搜索页 | P2 | 可并入 mall |

---

## 消费端 UI 差距汇总表

| 页面 | 差距数 | 最高优先级 |
|---|---|---|
| 首页 home | 7 | P0 |
| 商城 mall | 6 | P1 |
| 溯源 trace | 7 | P0 |
| 云认养 adopt | 10 | P0 |
| 购物车 cart | 9 | P0 |
| 个人中心 my | 10 | P1 |
| 商品详情 product-detail | 8 | P0 |
| TabBar | 2 | P0 |
| AI 助手 | 4 | P0 |
| 缺失页面 | 10（另计） | P0 |
| **合计** | **63 + 10 缺失页** | **P0** |

### 优先修复顺序建议

1. **P0 命名 + 假数据**：统一「小露」命名；删 ProductDetail 假评价/假拼单。
2. **P0 adopt/trace 死代码清理 + 真实数据接入**：`AdoptV2` 与 `Trace` 存在并列 `return` 死代码，先把死代码里的有效功能（成长日记/浇水/扫码/检测报告）合并进实际渲染 UI，再让 adopt 页直接用后端 `projects`。
3. **P0 补缺失页**：认养全流程子页（my-adoptions/adoption-diary/delivery/result）+ 购物车按农户分组。
4. **P1 补 home 三大块**（轮播/智慧农业/地域内容流）与 my 页入口（会员/收藏/足迹/角标）。
5. **P2 视觉与文案微调**：价格色、骨架屏、Tab 图标、文案对齐。

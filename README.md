# 日历闹钟

解决 iPhone 自带闹钟的两个痛点：

1. **支持中国法定节假日**：「法定工作日」闹钟会自动跳过春节、国庆等假期，调休的周六/周日照常响；「法定休息日」反之。
2. **支持未来时间段**：可以设置某个未来日期的单次闹钟，或只在「12月1日 至 1月31日」这类时间段内生效的重复闹钟。

无服务器，闹钟和节假日数据都保存在手机本地的 SQLite 数据库中。

## 功能

| 重复方式 | 说明 |
| --- | --- |
| 仅一次 | 指定任意未来日期 |
| 法定工作日 | 周一至周五 + 调休上班日 − 法定节假日 |
| 法定休息日 | 周末 + 法定节假日 − 调休上班日 |
| 每周 | 选择星期几 |
| 每天 | |
| 每隔几天 | 从指定日期起每 N 天 |

除「仅一次」外，都可以设置**生效时间段**（开始 / 结束日期，可只填一个）。编辑页底部会预览接下来 6 次的响铃时间，方便核对。

## 节假日数据维护

在 App 的 **设置 → 节假日数据** 中维护：

- 按年份查看、编辑放假区间和调休上班日，保存时会校验（日期格式、调休日是否落在周末、日期是否重复等）
- 「+ 添加 XXXX 年」新建年份
- 「从 JSON 导入」：粘贴一个或多个年份的 JSON，格式如下

```json
{
  "year": 2026,
  "source": "国办发明电〔2025〕7号",
  "holidays": [{ "name": "春节", "start": "2026-02-15", "end": "2026-02-23" }],
  "workdays": [{ "date": "2026-02-14", "name": "春节调休" }]
}
```

App 内置了 2025、2026 年的数据（[config/holidays/](config/holidays/)），首次启动时导入数据库，之后以数据库为准。国务院办公厅通常在每年 11 月前后发布次年的安排，届时在 App 里添加即可，不需要重新安装。

没有配置的年份，「法定工作日 / 休息日」会按普通的周一至周五 / 周末来算，首页和设置页会给出提示。

## 安装到 iPhone（不需要 Mac / Xcode）

两种方式任选其一。

### 方式一：GitHub Actions 构建 + Windows 侧载（免费 Apple ID 即可）

1. 把仓库推到 GitHub，在 **Actions → Build iOS (unsigned IPA) → Run workflow** 手动触发（推送 `v*` 标签也会自动触发）。构建在 GitHub 的 macOS 机器上进行，约 15～25 分钟。
2. 构建完成后，在该次运行页面下载 `calendar-clock-unsigned-ipa`，解压得到 `.ipa`。
3. 在 Windows 上安装 [Sideloadly](https://sideloadly.io/)（需要先安装 iTunes 和 iCloud 的非微软商店版本），用数据线连接 iPhone，拖入 `.ipa`，填写自己的 Apple ID 后点 Start。
4. 在 iPhone 上：**设置 → 通用 → VPN 与设备管理** 信任你的 Apple ID；iOS 16 及以上还需在 **设置 → 隐私与安全性 → 开发者模式** 中打开开发者模式。

> 免费 Apple ID 签名的 App **7 天后会失效**，需要用 Sideloadly 重新签一次（数据不会丢失，Sideloadly 也支持自动续签）。如果 Bundle ID `com.cwjxfh.calendarclock` 被占用，可以在 Sideloadly 的高级选项中修改，或在构建时设置环境变量 `APP_BUNDLE_ID`。

### 方式二：EAS 云构建（需要付费 Apple Developer 账号，签名 1 年有效）

```bash
npm i -g eas-cli
eas login                 # Expo 账号
eas init                  # 生成 projectId，按提示写入 app.config.ts 的 extra.eas，或设置环境变量 EAS_PROJECT_ID
eas device:create         # 生成链接，在 iPhone 上打开以登记设备 UDID
pnpm build:ios            # 云端构建，过程中按提示登录 Apple 账号，证书由 EAS 自动管理
```

构建完成后用 iPhone 扫描终端里的二维码即可安装。

### 首次打开

请允许通知。建议在 **设置 → 通知 → 日历闹钟** 中打开「时间敏感通知」，这样专注模式下也能提醒。

## 工作原理与限制

本 App 用**本地通知**来响铃。

- **iOS 最多只能同时挂 64 个待发送的本地通知。** App 会把所有闹钟最近的约 60 次响铃排上（滚动窗口），每次打开 App、回到前台、修改闹钟或节假日时都会重新排。窗口快用完时会推送一条「请打开一次闹钟 App」的提醒。设置页会显示已经排到了哪一天。
- **通知铃声只响一次（不超过 30 秒）**，不会像系统闹钟那样一直响，也没有贪睡；**手机静音时不会出声**（只有震动和横幅）。这是 iOS 对第三方 App 的限制。
- 单次闹钟响过之后，下次打开 App 时会自动关闭；时间段结束的闹钟也会自动关闭。

## 跨平台

- 排程与节假日逻辑（[lib/schedule.ts](lib/schedule.ts)、[lib/cn-calendar.ts](lib/cn-calendar.ts)、[lib/date-utils.ts](lib/date-utils.ts)）是纯 TypeScript，不依赖任何平台 API。
- 数据层（[lib/db/](lib/db/)）通过一个很小的 `SqlDb` 接口访问 SQLite，App 中用 `expo-sqlite`，测试中用 Node 内置的 `node:sqlite`。
- 平台相关代码集中在 [lib/notifications.ts](lib/notifications.ts)。Android 已配置高优先级通知渠道和精确闹钟权限；`pnpm build:android` 可通过 EAS 构建 APK，直接安装，无需开发者账号。
- Web 端不支持本地通知和 SQLite 持久化，仅用于开发调试界面。

## 开发

需要 Node.js 22.13+（单元测试使用内置的 `node:sqlite`）和 pnpm 9。

```bash
pnpm install
pnpm start    # 启动开发服务器，可用 Expo Go 扫码在 iPhone 上调试
pnpm test     # 单元测试：排程、节假日、数据库读写
pnpm check    # TypeScript 类型检查
```

目录结构：

```
app/                 页面（expo-router）
  (tabs)/index.tsx   闹钟列表
  (tabs)/settings.tsx 设置
  alarm/             闹钟编辑、铃声选择
  holidays/          节假日按年编辑、JSON 导入
components/          通用组件
config/holidays/     内置节假日种子数据
lib/db/              SQLite 结构、迁移、读写
lib/schedule.ts      排程引擎
lib/cn-calendar.ts   法定工作日/休息日判断与校验
lib/notifications.ts 系统通知
```

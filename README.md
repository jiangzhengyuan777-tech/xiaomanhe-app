# 小满合 App

小满合移动 App 前端工程，基于 React、TypeScript、Vite 与 Capacitor，包含消费者端和农户端界面。

## 本地开发

```bash
npm ci
npm run dev
```

## 构建 Web 资源

```bash
npm run build
```

## Android 工程

Android 原生工程位于 `android/`。本地需要安装 Android Studio 和 Android SDK；`android/local.properties`、Gradle 构建目录、生成的 Web 资源和 APK 不纳入版本控制。

## API 配置

开发代理默认连接本机 `127.0.0.1:3000` 与 `127.0.0.1:8080`。可通过 `VITE_MOBILE_API_PROXY_TARGET` 配置移动端 API 代理目标；客户端 API 地址可用 `VITE_API_BASE_URL` 和 `VITE_MOBILE_API_BASE_URL` 覆盖。不要将密钥或生产凭据提交到仓库。

当前仓库只包含 App 前端；后端服务和小程序代码分别维护。

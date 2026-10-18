import { defineConfig } from 'vite';

// 移动端 API（小程序后端）公网地址。浏览器开发调试走 /api 代理到此；安卓打包后由 CapacitorHttp 直连（见 src/api/index.ts 的 API_BASE 逻辑）。
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'https://www.chunfenmengya.cn';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      // 小程序后端：context-path=/api，控制器映射 /v1，故完整前缀 /api/v1。
      // 浏览器开发时请求 /api/v1/... 转发到线上；安卓原生环境不走此代理。
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
      },
      // 后端上传图片静态资源（/images/uploads/**）同样走线上。
      '/images': {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});

import { defineConfig } from 'vite';

const mobileApiTarget = process.env.VITE_MOBILE_API_PROXY_TARGET || 'http://127.0.0.1:8080';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      // 后台 4.0 Spring Boot 移动端接口。生产由 Nginx 使用同一路径转发。
      '/app-api/mobile': {
        target: mobileApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/app-api\/mobile/, '/api/mobile')
      },
      '/app-api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/app-api/, '/api')
      }
    }
  }
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: '0.0.0.0',  // 监听所有网络接口
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 获取客户端真实IP
            const clientIP = req.connection.remoteAddress ||
                            req.socket.remoteAddress ||
                            (req.connection.socket ? req.connection.socket.remoteAddress : null);

            if (clientIP) {
              // 清理IPv6格式的IPv4地址 (::ffff:192.168.1.100 -> 192.168.1.100)
              const cleanIP = clientIP.replace(/^::ffff:/, '');
              proxyReq.setHeader('X-Forwarded-For', cleanIP);
              proxyReq.setHeader('X-Real-IP', cleanIP);
            }
          });
        },
      },
    },
  },
})
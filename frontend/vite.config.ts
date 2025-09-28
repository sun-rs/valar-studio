import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:5173',
]

const parseOrigins = (raw?: string | string[]) => {
  if (!raw) {
    return [...DEFAULT_ALLOWED_ORIGINS]
  }

  const values = Array.isArray(raw) ? raw : raw.split(',')
  const cleaned = values
    .map((item) => item.trim())
    .filter(Boolean)

  return cleaned.length > 0 ? cleaned : [...DEFAULT_ALLOWED_ORIGINS]
}

const toUniqueHosts = (origins: string[]) => {
  const hosts = origins
    .map((origin) => {
      try {
        if (!origin.includes('://')) {
          return origin.replace(/:\d+$/, '')
        }
        return new URL(origin).hostname
      } catch (error) {
        return origin
      }
    })
    .filter(Boolean)

  return Array.from(new Set(hosts))
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const allowedOrigins = parseOrigins(env.APP_ALLOWED_ORIGINS)
  const allowedHosts = toUniqueHosts(allowedOrigins)

  const port = Number(env.VITE_PORT || env.FRONTEND_PORT) || 3001
  const host = env.VITE_HOST || '0.0.0.0'
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: [
        'Dockerfile',
        '*.md',
        '*.yml',
        '*.yaml',
        '*.txt',
        '*.log',
        '*.env',
        '*.sh',
        '*.py',
        '*.sql',
        '*.xml',
        '*.toml',
        '*.ini'
      ]
    },
    server: {
      port,
      host,
      allowedHosts,
      watch: {
        ignored: [
          '**/Dockerfile*',
          '**/docker-compose*.yml',
          '**/.git/**',
          '**/*.md',
          '**/*.txt',
          '**/*.log',
          '**/.env*',
          '**/*.sh',
          '**/*.py',
          '**/*.sql',
          '**/*.xml',
          '**/*.toml',
          '**/*.ini',
          '**/requirements.txt',
          '**/.gitignore',
          '**/.dockerignore',
          '**/LICENSE*',
          '**/SECURITY*',
          '**/README*'
        ]
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const clientIP =
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                req.connection?.socket?.remoteAddress ||
                null

              if (clientIP) {
                const cleanIP = clientIP.replace(/^::ffff:/, '')
                proxyReq.setHeader('X-Forwarded-For', cleanIP)
                proxyReq.setHeader('X-Real-IP', cleanIP)
              }
            })
          },
        },
      },
    },
  }
})

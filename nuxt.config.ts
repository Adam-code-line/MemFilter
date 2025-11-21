// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: '忆滤',
      meta: [{ name: 'description', content: '信息过载时代的认知减负工具' }],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content', '@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@nuxtjs/mdc'],

  css: ['~/assets/css/main.css', 'cherry-markdown/dist/cherry-markdown.css'],

  ui: {
    fonts: false,
  },

  // 确保组件自动导入
  components: true,

  // 路由重定向配置
  nitro: {
    routeRules: {
      '/login': { redirect: '/auth/login' },
      '/signup': { redirect: '/auth/signup' },
    },
  },

  runtimeConfig: {
    mysql: {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : undefined,
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    },
    session: {
      cookieName: process.env.AUTH_SESSION_COOKIE,
      tokenExpiresInSeconds: process.env.AUTH_SESSION_TTL
        ? Number(process.env.AUTH_SESSION_TTL)
        : undefined,
    },
    ingestion: {
      tianApiKey: process.env.TIAN_API_KEY,
      // 前端页面轮询间隔（默认 1 分钟）
      // 可通过环境变量 INGESTION_POLL_INTERVAL 配置
      schedulerInterval: process.env.INGESTION_SCHEDULER_INTERVAL
        ? Number(process.env.INGESTION_SCHEDULER_INTERVAL)
        : 10 * 60 * 1000,
    },
    ai: {
      baseUrl: process.env.AI_API_BASE_URL,
      apiKey: process.env.AI_API_KEY,
      defaultModel: process.env.AI_DEFAULT_MODEL,
      temperature: process.env.AI_TEMPERATURE ? Number(process.env.AI_TEMPERATURE) : undefined,
    },
    public: {
      aiModels: (process.env.AI_AVAILABLE_MODELS || '')
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean),
      aiDefaultModel: process.env.AI_DEFAULT_MODEL,
      aiTemperature: process.env.AI_TEMPERATURE ? Number(process.env.AI_TEMPERATURE) : undefined,
      ingestion: {
        // 后端爬虫任务间隔（默认 10 分钟）
        // 可通过环境变量 INGESTION_SCHEDULER_INTERVAL 配置
        pollInterval: process.env.INGESTION_POLL_INTERVAL
          ? Number(process.env.INGESTION_POLL_INTERVAL)
          : 60 * 1000,
      },
    },
  },

  imports: {
    dirs: ['~/composables', '~/composables/**'],
  },

  vite: {
    optimizeDeps: {
      include: ['cherry-markdown', 'echarts'],
    },
  },
})

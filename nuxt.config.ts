// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  app: {
    head: {
      title: '忆滤',
      meta: [
        { name: 'description', content: '信息过载时代的认知减负工具' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  css: [
    '~/assets/css/main.css',
    'cherry-markdown/dist/cherry-markdown.css'
  ],

  ui: {
    fonts: false
  },

  // 确保组件自动导入
  components: true,

  // 路由重定向配置
  nitro: {
    routeRules: {
      '/login': { redirect: '/auth/login' },
      '/signup': { redirect: '/auth/signup' }
    }
  },

  runtimeConfig: {
    mysql: {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : undefined,
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD
    },
    session: {
      cookieName: process.env.AUTH_SESSION_COOKIE,
      tokenExpiresInSeconds: process.env.AUTH_SESSION_TTL ? Number(process.env.AUTH_SESSION_TTL) : undefined
    },
    ingestion: {
      tianApiKey: process.env.TIAN_API_KEY
    },
    ai: {
      baseUrl: process.env.AI_API_BASE_URL,
      apiKey: process.env.AI_API_KEY,
      defaultModel: process.env.AI_DEFAULT_MODEL,
      temperature: process.env.AI_TEMPERATURE ? Number(process.env.AI_TEMPERATURE) : undefined
    },
    public: {
      aiModels: (process.env.AI_AVAILABLE_MODELS || '')
        .split(',')
        .map(segment => segment.trim())
        .filter(Boolean),
      aiDefaultModel: process.env.AI_DEFAULT_MODEL,
      aiTemperature: process.env.AI_TEMPERATURE ? Number(process.env.AI_TEMPERATURE) : undefined
    }
  },

  imports: {
    dirs: [
      '~/composables',
      '~/composables/**'
    ]
  }

})
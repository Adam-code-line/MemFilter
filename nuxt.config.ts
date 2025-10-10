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

  css: ['~/assets/css/main.css'],

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
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE || 'memfilter',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '123456'
    },
    session: {
      cookieName: process.env.AUTH_SESSION_COOKIE || 'memfilter-auth-session',
      tokenExpiresInSeconds: Number(process.env.AUTH_SESSION_TTL || 60 * 60 * 24 * 7)
    }
  },

  imports: {
    dirs: [
      '~/composables',
      '~/composables/**'
    ]
  }

})
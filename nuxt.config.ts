// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/ui',
  ],

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false
  },

  // 确保组件自动导入
  components: true,

})

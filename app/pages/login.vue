<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Login',
  setup() {
    // 登录逻辑
  }
})
</script>

<template>
  <div>
    <h1>登录</h1>
    <form @submit.prevent="handleLogin">
      <div>
        <label for="username">用户名</label>
        <input type="text" id="username" v-model="username" />
      </div>
      <div>
        <label for="password">密码</label>
        <input type="password" id="password" v-model="password" />
      </div>
      <button type="submit">登录</button>
    </form>
  </div>
</template>
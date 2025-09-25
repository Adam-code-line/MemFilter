<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Signup',
  setup() {
    // 注册逻辑
  }
})
</script>

<template>
  <div>
    <h1>注册</h1>
    <form @submit.prevent="handleSignup">
      <div>
        <label for="username">用户名</label>
        <input type="text" id="username" v-model="username" />
      </div>
      <div>
        <label for="email">邮箱</label>
        <input type="email" id="email" v-model="email" />
      </div>
      <div>
        <label for="password">密码</label>
        <input type="password" id="password" v-model="password" />
      </div>
      <button type="submit">注册</button>
    </form>
  </div>
</template>

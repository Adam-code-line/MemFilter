<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Footer',
  setup() {
    // 页脚逻辑
  }
})
</script>

<template>
  <footer class="footer">
    <div class="container">
      <p>&copy; 2024 MemFilter. All rights reserved.</p>
      <nav>
        <ul>
          <li><a href="/about">关于我们</a></li>
          <li><a href="/privacy">隐私政策</a></li>
          <li><a href="/terms">服务条款</a></li>
          <li><a href="/contact">联系我们</a></li>
        </ul>
      </nav>
    </div>
  </footer>
</template>
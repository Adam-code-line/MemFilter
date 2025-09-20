<template>

  <div>
    <CommonFloatingContainer>
      <CommonFloatingCard
      :title="page?.title"
      icon="🎉"
    />
  </CommonFloatingContainer>
  </div>
</template>

<script lang="ts" setup>

useHead({
  title: "忆滤 MemFilter"
})

const {data: page} = await useAsyncData('index', () => queryCollection('index').first())

</script>

<style>

</style>
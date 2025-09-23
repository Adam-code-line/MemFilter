<template>
    <div v-if="page" class="py-8 px-4 sm:px-6 lg:px-8">
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
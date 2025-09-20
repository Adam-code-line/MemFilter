<template>
  <USeparator
      class="h-px"
  />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #left>

      
    </template>

    <template #right>
      <UButton
          to="https://github.com/Adam-code-line/MemFilter"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="MemFilter on GitHub"
          color="neutral"
          variant="ghost"
      />
    </template>
  </UFooter>
</template>

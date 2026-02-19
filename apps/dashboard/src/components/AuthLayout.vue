<script setup lang="ts">
defineProps<{
  titleId: string
}>()
</script>

<template>
  <main class="auth-layout" id="main-content" tabindex="-1">
    <section class="auth-card panel" :aria-labelledby="titleId">
      <slot />
    </section>
  </main>
</template>

<style scoped lang="scss">
.auth-layout {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.auth-card {
  width: min(420px, 100%);
  padding: 1.25rem;
}
</style>

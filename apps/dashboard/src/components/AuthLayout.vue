<!--

Copyright 2026 Stefano Babini

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

-->

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

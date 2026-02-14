<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const localError = ref<string | null>(null)

async function onSubmit(): Promise<void> {
  localError.value = null

  try {
    await authStore.signUp({
      name: name.value,
      email: email.value,
      password: password.value
    })
    await router.push('/')
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Registration failed'
  }
}
</script>

<template>
  <main class="auth-layout" id="main-content" tabindex="-1">
    <section class="auth-card panel" aria-labelledby="register-title">
      <h1 id="register-title">Create account</h1>
      <p class="auth-subtitle">Register to access the ByteRoute dashboard.</p>

      <form class="auth-form" @submit.prevent="onSubmit">
        <label for="name">Name</label>
        <InputText id="name" v-model="name" autocomplete="name" required />

        <label for="email">Email</label>
        <InputText id="email" v-model="email" type="email" autocomplete="email" required />

        <label for="password">Password</label>
        <Password
          id="password"
          v-model="password"
          :feedback="false"
          toggleMask
          inputClass="auth-password-input"
          required
        />

        <p v-if="localError || authStore.error" class="auth-error">{{ localError || authStore.error }}</p>

        <Button type="submit" :loading="authStore.loading" label="Register" />
      </form>

      <p class="auth-footer">
        Already have an account?
        <router-link to="/login">Sign in</router-link>
      </p>
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

.auth-subtitle {
  margin: 0.5rem 0 1rem;
  color: var(--p-text-muted-color);
}

.auth-form {
  display: grid;
  gap: 0.65rem;
}

.auth-error {
  color: var(--p-red-500);
  font-size: 0.9rem;
}

.auth-footer {
  margin-top: 1rem;
  font-size: 0.95rem;
}

:deep(.auth-password-input) {
  width: 100%;
}
</style>

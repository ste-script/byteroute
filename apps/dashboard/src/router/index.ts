import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/connections',
      name: 'connections',
      component: () => import('@/views/ConnectionsView.vue')
    },
    {
      path: '/statistics',
      name: 'statistics',
      component: () => import('@/views/StatisticsView.vue')
    }
  ]
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.hydrated && !authStore.isAuthenticated) {
    try {
      await authStore.restoreSession()
    } catch (error) {
      // restoreSession already sets hydrated=true in its finally block.
      // Swallow unexpected errors here so navigation is never aborted by a
      // backend hiccup (the user will simply land on /login).
      console.error('[router] restoreSession failed:', error)
    }
  }

  const authenticated = authStore.isAuthenticated
  const isPublic = Boolean(to.meta.public)

  if (!isPublic && !authenticated) {
    return { name: 'login' }
  }

  if (isPublic && authenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router

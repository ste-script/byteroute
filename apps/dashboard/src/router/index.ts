import { createRouter, createWebHistory } from 'vue-router'

async function hasActiveSession(): Promise<boolean> {
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const url = apiBase ? `${apiBase}/auth/me` : '/auth/me'

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    })
    return response.ok
  } catch {
    return false
  }
}

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
  const authenticated = await hasActiveSession()
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

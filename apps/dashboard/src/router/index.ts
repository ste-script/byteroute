/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
    },
    {
      path: '/history-search',
      name: 'history-search',
      component: () => import('@/views/HistorySearchView.vue')
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

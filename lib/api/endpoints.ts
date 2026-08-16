/**
 * ЄДИНЕ місце, де описані маршрути API вебсистеми RehaFlow.
 *
 * Перевірено на живому сервері:
 *   GET /api/baas            -> { name: 'RehaFlow API', mobileReady: true }
 *   GET /api/baas/auth/me    -> 401 { error: 'Не авторизовано' }  (розділ auth існує)
 *
 * Якщо у вебсистемі назви маршрутів інші — правити ТІЛЬКИ цей файл,
 * решта застосунку залишається без змін.
 */
export const endpoints = {
  root: '/',

  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/auth/me',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    forgotPassword: '/auth/forgot-password',
  },

  devices: {
    register: '/devices/register',
    heartbeat: '/devices/heartbeat',
    list: '/devices',
    pushToken: '/devices/push-token',
    remove: (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}`,
  },

  patients: {
    list: '/patients',
    detail: (id: string) => `/patients/${encodeURIComponent(id)}`,
    prescriptions: (id: string) => `/patients/${encodeURIComponent(id)}/prescriptions`,
    tasks: (id: string) => `/patients/${encodeURIComponent(id)}/tasks`,
    history: (id: string) => `/patients/${encodeURIComponent(id)}/history`,
    documents: (id: string) => `/patients/${encodeURIComponent(id)}/documents`,
  },

  prescriptions: {
    list: '/prescriptions',
    create: '/prescriptions',
    detail: (id: string) => `/prescriptions/${encodeURIComponent(id)}`,
  },

  tasks: {
    list: '/tasks',
    detail: (id: string) => `/tasks/${encodeURIComponent(id)}`,
    claim: (id: string) => `/tasks/${encodeURIComponent(id)}/claim`,
    start: (id: string) => `/tasks/${encodeURIComponent(id)}/start`,
    complete: (id: string) => `/tasks/${encodeURIComponent(id)}/complete`,
    cancel: (id: string) => `/tasks/${encodeURIComponent(id)}/cancel`,
  },

  history: '/history',

  shifts: {
    current: '/shifts/current',
    start: '/shifts/start',
    end: '/shifts/end',
    list: '/shifts',
  },
} as const;

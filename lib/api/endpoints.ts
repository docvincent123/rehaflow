/**
 * ЄДИНЕ місце, де описані маршрути API вебсистеми RehaFlow.
 * Mobile використовує тільки існуючі маршрути; ADMIN залишається web-only.
 */
export const endpoints = {
  root: '/',

  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/auth/me',
    logout: '/auth/logout',
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

export const Rol = {
  RIDER: 'RIDER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const

export type Rol = typeof Rol[keyof typeof Rol]

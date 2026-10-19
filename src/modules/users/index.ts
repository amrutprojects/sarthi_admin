/* Public API of the users module. Other modules import only from here (npm run check:boundaries). */
export { default as UsersTab } from './components/UsersTab';
export { userKeys, useUsers } from './hooks/useUsers';
export type { User } from './types/user.types';

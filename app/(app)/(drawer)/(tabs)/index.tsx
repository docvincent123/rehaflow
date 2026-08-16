import { Redirect } from 'expo-router';

import { useUserRole } from '@/lib/store/authStore';

/** Стартовий екран залежить від ролі, отриманої з backend. */
export default function RoleHomeRedirect() {
  const role = useUserRole();
  return <Redirect href={role === 'NURSE' ? '/tasks' : '/patients'} />;
}

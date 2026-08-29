import { ClipboardList, Home, Stethoscope, Users } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { canCreatePrescription, canSeeTaskQueue } from '@/lib/permissions';
import { navColors } from '@/lib/theme';
import { useUserRole } from '@/lib/store/authStore';

export default function TabsLayout() {
  const role = useUserRole();
  const canWorkTasks = canSeeTaskQueue(role);
  const showPrescriptions = canCreatePrescription(role);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: navColors.background },
        tabBarPosition: 'top',
        tabBarStyle: {
          backgroundColor: navColors.surface,
          borderBottomColor: navColors.border,
          borderBottomWidth: 1,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
          height: 58,
          paddingTop: 4,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: navColors.accent,
        tabBarInactiveTintColor: navColors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
        tabBarItemStyle: { paddingHorizontal: 2, minWidth: 80 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Огляд', tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 20} /> }} />
      <Tabs.Screen name="patients" options={{ title: 'Пацієнти', tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 20} /> }} />
      <Tabs.Screen name="prescriptions" options={{ title: 'Призначення', href: showPrescriptions ? undefined : null, tabBarIcon: ({ color, size }) => <Stethoscope color={color} size={size ?? 20} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Завдання', href: canWorkTasks ? undefined : null, tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size ?? 20} /> }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

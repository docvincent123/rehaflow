import { ClipboardList, History, Stethoscope, User, Users } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { canCreatePrescription, canSeeTaskQueue } from '@/lib/permissions';
import { navColors } from '@/lib/theme';
import { useUserRole } from '@/lib/store/authStore';

export default function TabsLayout() {
  const role = useUserRole();
  const showTasks = canSeeTaskQueue(role);
  const showPrescriptions = canCreatePrescription(role);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: navColors.background },
        tabBarStyle: {
          backgroundColor: navColors.surface,
          borderTopColor: navColors.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
          height: 62,
          paddingTop: 6,
        },
        tabBarActiveTintColor: navColors.accent,
        tabBarInactiveTintColor: navColors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Завдання',
          href: showTasks ? undefined : null,
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size ?? 24} />,
        }}
      />

      <Tabs.Screen
        name="patients"
        options={{
          title: 'Пацієнти',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 24} />,
        }}
      />

      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Призначення',
          href: showPrescriptions ? undefined : null,
          tabBarIcon: ({ color, size }) => <Stethoscope color={color} size={size ?? 24} />,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'Історія',
          tabBarIcon: ({ color, size }) => <History color={color} size={size ?? 24} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 24} />,
        }}
      />
    </Tabs>
  );
}

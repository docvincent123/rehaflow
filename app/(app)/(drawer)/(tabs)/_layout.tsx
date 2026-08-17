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
        // Navigation is at the TOP so it does not compete with the Android
        // system navigation/back area at the bottom of the phone.
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
          height: 56,
          paddingTop: 4,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: navColors.accent,
        tabBarInactiveTintColor: navColors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarItemStyle: { paddingHorizontal: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Завдання',
          href: showTasks ? undefined : null,
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size ?? 20} />,
        }}
      />

      <Tabs.Screen
        name="patients"
        options={{
          title: 'Пацієнти',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 20} />,
        }}
      />

      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Призначення',
          href: showPrescriptions ? undefined : null,
          tabBarIcon: ({ color, size }) => <Stethoscope color={color} size={size ?? 20} />,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'Історія',
          tabBarIcon: ({ color, size }) => <History color={color} size={size ?? 20} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 20} />,
        }}
      />
    </Tabs>
  );
}

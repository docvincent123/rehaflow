import Drawer from 'expo-router/drawer';
import { useEffect } from 'react';

import { AppDrawerContent } from '@/components/AppDrawerContent';
import { navColors } from '@/lib/theme';
import { useCurrentUser } from '@/lib/store/authStore';
import { useTasksQuery } from '@/lib/hooks/useRehaflowData';
import { configureTaskAlerts, syncTaskSummary } from '@/lib/notifications/taskAlerts';

export default function DrawerLayout() {
  const user = useCurrentUser();
  const tasksQuery = useTasksQuery();

  useEffect(() => {
    if (user?.role !== 'NURSE') return;
    void configureTaskAlerts();
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'NURSE') return;
    void syncTaskSummary(tasksQuery.data ?? []);
  }, [user?.role, tasksQuery.data]);

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { backgroundColor: navColors.background, width: 300 },
        sceneStyle: { backgroundColor: navColors.background },
        swipeEdgeWidth: 48,
        overlayColor: 'rgba(0,0,0,0.55)',
      }}
    />
  );
}

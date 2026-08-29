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
  const canWorkTasks = user?.role === 'NURSE' || user?.role === 'REHAB_SPECIALIST';

  useEffect(() => {
    if (!canWorkTasks) return;
    void configureTaskAlerts();
  }, [canWorkTasks]);

  useEffect(() => {
    if (!canWorkTasks) return;
    void syncTaskSummary(tasksQuery.data ?? []);
  }, [canWorkTasks, tasksQuery.data]);

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

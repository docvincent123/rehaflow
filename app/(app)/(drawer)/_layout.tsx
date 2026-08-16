import Drawer from 'expo-router/drawer';

import { AppDrawerContent } from '@/components/AppDrawerContent';
import { navColors } from '@/lib/theme';

export default function DrawerLayout() {
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

import { DrawerActions } from '@react-navigation/native';
import { Menu } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useNavigation } from 'expo-router';

import { navColors } from '@/lib/theme';

/** Кнопка виклику бокового меню у синій верхній панелі. */
export function DrawerMenuButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Відкрити меню"
      hitSlop={12}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      className="min-h-11 min-w-11 items-center justify-center pl-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Menu color={navColors.headerForeground} size={24} />
    </Pressable>
  );
}

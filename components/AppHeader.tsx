import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, Menu } from 'lucide-react-native';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import type { ReactNode } from 'react';

import { goBackOrReplace } from '@/lib/navigation';
import { navColors } from '@/lib/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** 'menu' — бокове меню, 'back' — повернення назад. */
  leading?: 'menu' | 'back';
  backFallback?: '/patients' | '/tasks';
  right?: ReactNode;
}

/** Синя верхня панель RehaFlow. */
export function AppHeader({
  title,
  subtitle,
  leading = 'menu',
  backFallback = '/patients',
  right,
}: AppHeaderProps) {
  const navigation = useNavigation();

  return (
    <View className="bg-header flex-row items-center gap-2 px-2 py-2.5">
      {leading === 'menu' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Відкрити меню"
          hitSlop={10}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="h-11 w-11 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Menu color={navColors.headerForeground} size={24} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={10}
          onPress={() => goBackOrReplace(backFallback)}
          className="h-11 w-11 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <ArrowLeft color={navColors.headerForeground} size={24} />
        </Pressable>
      )}

      <View className="flex-1">
        <Text className="text-header-foreground text-lg font-semibold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-header-foreground/80 text-[11px]" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}
    </View>
  );
}

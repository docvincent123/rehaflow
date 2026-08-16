import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Сторінку не знайдено' }} />
      <View className="bg-background flex-1 items-center justify-center gap-3 px-6">
        <Text className="text-foreground text-center text-lg font-semibold">
          Такого екрана немає
        </Text>
        <Link href="/">
          <Text className="text-link text-base font-medium">На головний екран</Text>
        </Link>
      </View>
    </>
  );
}

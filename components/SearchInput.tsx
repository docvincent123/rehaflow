import { TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { navColors } from '@/lib/theme';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChangeText, placeholder }: SearchInputProps) {
  return (
    <View className="border-field-border bg-field min-h-12 flex-row items-center gap-2 rounded-xl border px-3">
      <Search color={navColors.muted} size={18} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Пошук пацієнта'}
        placeholderTextColorClassName="accent-muted"
        className="text-foreground flex-1 py-3 text-base"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Пошук"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Очистити пошук"
          onPress={() => onChangeText('')}
          hitSlop={10}
          className="p-1"
        >
          <X color={navColors.muted} size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

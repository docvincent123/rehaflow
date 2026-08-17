import { Pressable, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { navColors } from '@/lib/theme';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

/** Compact search control so it does not take over the patient screen. */
export function SearchInput({ value, onChangeText, placeholder }: SearchInputProps) {
  return (
    <View className="border-field-border bg-field h-10 flex-row items-center gap-2 rounded-lg border px-2.5">
      <Search color={navColors.muted} size={16} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Пошук'}
        placeholderTextColorClassName="accent-muted"
        className="text-foreground flex-1 py-1 text-sm"
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
          hitSlop={8}
          className="p-1"
        >
          <X color={navColors.muted} size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

import { Pressable, ScrollView, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

export interface PickerOption<T extends string> {
  value: T;
  label: string;
}

interface OptionPickerProps<T extends string> {
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/** Великі touch targets замість компактного dropdown — зручно в палаті. */
export function OptionPicker<T extends string>({
  options,
  value,
  onChange,
  label,
}: OptionPickerProps<T>) {
  return (
    <View className="gap-2">
      {label ? <Text className="text-muted text-sm font-medium">{label}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              className={cn(
                'min-h-12 justify-center rounded-xl border px-4 py-3',
                selected ? 'border-accent bg-accent/20' : 'border-field-border bg-field',
              )}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Text
                className={cn('text-sm', selected ? 'text-foreground font-semibold' : 'text-muted')}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface SegmentedProps<T extends string> {
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
}

/** Верхні сегментовані вкладки (Нові / В роботі / Завершені). */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  counts,
}: SegmentedProps<T>) {
  return (
    <View className="border-border bg-background flex-row border-b">
      {options.map((option) => {
        const selected = option.value === value;
        const count = counts?.[option.value];
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'min-h-12 flex-1 flex-row items-center justify-center gap-1.5 border-b-2 px-2 py-3',
              selected ? 'border-accent bg-surface' : 'border-transparent',
            )}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text
              className={cn(
                'text-[13px]',
                selected ? 'text-foreground font-semibold' : 'text-muted',
              )}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {count !== undefined && count > 0 ? (
              <View className="bg-accent rounded-full px-1.5 py-0.5">
                <Text className="text-accent-foreground text-[10px] font-bold">{count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Горизонтальні вкладки для розділів картки пацієнта. */
export function ChipTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'min-h-11 justify-center rounded-full border px-4',
              selected ? 'border-accent bg-accent' : 'border-border bg-surface',
            )}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text
              className={cn(
                'text-[13px]',
                selected ? 'text-accent-foreground font-semibold' : 'text-muted',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

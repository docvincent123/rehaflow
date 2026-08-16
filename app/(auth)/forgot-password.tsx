import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { FieldError, Input, Label, TextField } from 'heroui-native';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { z } from 'zod';

import { Banner } from '@/components/ScreenState';
import { errorMessage } from '@/lib/api/errors';
import { goBackOrReplace } from '@/lib/navigation';
import { navColors } from '@/lib/theme';
import { requestPasswordReset } from '@/lib/api/auth';
import { useIsOnline } from '@/lib/store/networkStore';

const schema = z.object({
  email: z.string().trim().min(1, 'Введіть email').email('Некоректний email'),
});

type ResetForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const online = useIsOnline();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ResetForm) => {
    setError(null);
    if (!online) {
      setError('Немає з’єднання з сервером');
      return;
    }
    setStatus('sending');
    try {
      await requestPasswordReset(values.email);
      setStatus('sent');
    } catch (caught) {
      setError(errorMessage(caught));
      setStatus('idle');
    }
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="grow px-6 py-safe-offset-8"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => goBackOrReplace('/login')}
          hitSlop={10}
          className="min-h-11 w-11 items-start justify-center"
        >
          <ArrowLeft color={navColors.headerForeground} size={24} />
        </Pressable>

        <View className="gap-2 pt-4 pb-6">
          <Text className="text-foreground text-2xl font-bold">Відновлення пароля</Text>
          <Text className="text-muted text-sm">
            Вкажіть робочий email. Адміністратор центру отримає запит на скидання пароля.
          </Text>
        </View>

        <View className="border-border bg-surface gap-4 rounded-2xl border p-5">
          {error ? <Banner tone="danger" message={error} /> : null}
          {status === 'sent' ? (
            <Banner tone="success" message="Запит надіслано. Очікуйте на новий пароль" />
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField isInvalid={Boolean(fieldState.error)}>
                <Label>Email</Label>
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="likar@rehaflow.ua"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          <Pressable
            accessibilityRole="button"
            disabled={status === 'sending'}
            onPress={() => void handleSubmit(onSubmit)()}
            className="bg-accent min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
            style={({ pressed }) => ({ opacity: pressed || status === 'sending' ? 0.75 : 1 })}
          >
            {status === 'sending' ? <ActivityIndicator color={navColors.headerForeground} /> : null}
            <Text className="text-accent-foreground text-base font-bold">Надіслати запит</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

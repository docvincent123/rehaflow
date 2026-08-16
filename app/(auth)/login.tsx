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
import { Description, FieldError, Input, Label, TextField } from 'heroui-native';
import { Link } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import { Banner } from '@/components/ScreenState';
import { errorMessage } from '@/lib/api/errors';
import { navColors } from '@/lib/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Введіть email').email('Некоректний email'),
  password: z.string().min(1, 'Введіть пароль'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const online = useIsOnline();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    if (!online) {
      setServerError('Немає з’єднання з сервером. Вхід можливий лише онлайн');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="grow justify-center px-6 py-safe-offset-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-1 pb-8">
          <View className="bg-header mb-3 h-14 w-14 items-center justify-center rounded-2xl">
            <Text className="text-header-foreground text-xl font-bold">R</Text>
          </View>
          <Text className="text-foreground text-3xl font-bold">RehaFlow</Text>
          <Text className="text-muted text-sm">Доступ для лікарів та медичних сестер</Text>
        </View>

        <View className="border-border bg-surface gap-4 rounded-2xl border p-5">
          {serverError ? <Banner tone="danger" message={serverError} /> : null}
          {online ? null : <Banner tone="warning" message="Немає з’єднання з сервером" />}

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
                  autoComplete="username"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField isInvalid={Boolean(fieldState.error)}>
                <Label>Пароль</Label>
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={() => void handleSubmit(onSubmit)()}
                />
                <Description>Пароль не зберігається на пристрої</Description>
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          <Pressable
            accessibilityRole="button"
            disabled={submitting || formState.isSubmitting}
            onPress={() => void handleSubmit(onSubmit)()}
            className="bg-accent min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
            style={({ pressed }) => ({ opacity: pressed || submitting ? 0.75 : 1 })}
          >
            {submitting ? <ActivityIndicator color={navColors.headerForeground} /> : null}
            <Text className="text-accent-foreground text-base font-bold">Увійти</Text>
          </Pressable>

          <Link href="/forgot-password" asChild>
            <Pressable
              accessibilityRole="link"
              className="min-h-11 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text className="text-link text-sm font-medium">Забули пароль?</Text>
            </Pressable>
          </Link>
        </View>

        <Text className="text-muted pt-6 text-center text-[11px]">
          Доступ надає адміністратор центру. Після декількох невдалих спроб акаунт тимчасово
          блокується сервером.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react-native';
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
  const [showPassword, setShowPassword] = useState(false);

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
        contentContainerClassName="grow justify-center px-5 py-safe-offset-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5">
          <View className="mb-6 flex-row items-center gap-3">
            <View className="bg-header h-12 w-12 items-center justify-center rounded-2xl">
              <Text className="text-header-foreground text-lg font-bold">R</Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-2xl font-bold">RehaFlow</Text>
              <Text className="text-muted text-xs">Мобільне робоче місце реабілітаційного центру</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className="bg-success-soft rounded-full px-3 py-1.5"><Text className="text-success text-[11px] font-semibold">Лікарі</Text></View>
            <View className="bg-accent-soft rounded-full px-3 py-1.5"><Text className="text-accent text-[11px] font-semibold">Медсестри</Text></View>
            <View className="bg-surface rounded-full border border-border px-3 py-1.5"><Text className="text-muted text-[11px] font-semibold">Робота онлайн</Text></View>
          </View>
        </View>

        <View className="border-border bg-surface gap-4 rounded-3xl border p-5 shadow-sm">
          {serverError ? <Banner tone="danger" message={serverError} /> : null}
          {online ? null : <Banner tone="warning" message="Немає з’єднання з сервером" />}

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField isInvalid={Boolean(fieldState.error)}>
                <Label>Email</Label>
                <View className="relative">
                  <View className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                    <Mail color={navColors.muted} size={18} />
                  </View>
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
                    className="pl-10"
                  />
                </View>
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
                <View className="relative">
                  <View className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                    <LockKeyhole color={navColors.muted} size={18} />
                  </View>
                  <Input
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Введіть пароль"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={() => void handleSubmit(onSubmit)()}
                    className="pr-12 pl-10"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                    onPress={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl"
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    {showPassword ? (
                      <EyeOff color={navColors.muted} size={19} />
                    ) : (
                      <Eye color={navColors.muted} size={19} />
                    )}
                  </Pressable>
                </View>
                <Description>Пароль можна показати кнопкою з оком. Він не зберігається на пристрої.</Description>
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          <Pressable
            accessibilityRole="button"
            disabled={submitting || formState.isSubmitting}
            onPress={() => void handleSubmit(onSubmit)()}
            className="bg-accent min-h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5 py-4"
            style={({ pressed }) => ({ opacity: pressed || submitting ? 0.75 : 1 })}
          >
            {submitting ? <ActivityIndicator color={navColors.headerForeground} /> : null}
            <Text className="text-accent-foreground text-base font-bold">Увійти в RehaFlow</Text>
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

        <Text className="text-muted pt-5 text-center text-[11px] leading-4">
          Доступ надає адміністратор центру. Після невдалих спроб входу акаунт може бути тимчасово заблокований сервером.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

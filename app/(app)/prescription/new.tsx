import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { FieldError, Input, Label, Radio, RadioGroup, Separator, TextField } from 'heroui-native';
import { isValid, parse } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, LoadingState } from '@/components/ScreenState';
import { InfoRow, SectionCard } from '@/components/SectionCard';
import { OptionPicker } from '@/components/OptionPicker';
import { PRESCRIPTION_TYPES, type PrescriptionType } from '@/lib/api/types';
import { SearchInput } from '@/components/SearchInput';
import { canCreatePrescription } from '@/lib/permissions';
import { filterPatients } from '@/lib/api/patients';
import { navColors } from '@/lib/theme';
import { useCreatePrescriptionAction, useOfflineNotice } from '@/lib/hooks/useActions';
import { usePatientsQuery } from '@/lib/hooks/useRehaflowData';
import { useUserRole } from '@/lib/store/authStore';

const schema = z
  .object({
    type: z.enum([
      'MANIPULATION',
      'INJECTION',
      'PROCEDURE',
      'MEDICATION',
      'EXAMINATION',
      'PHYSIOTHERAPY',
      'OTHER',
    ]),
    title: z.string().trim().min(2, 'Вкажіть назву призначення'),
    details: z.string().trim().optional(),
    date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Формат дати: дд.мм.рррр'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Формат часу: гг:хх'),
    priority: z.enum(['NORMAL', 'URGENT']),
  })
  .superRefine((values, ctx) => {
    const parsed = parse(`${values.date} ${values.time}`, 'dd.MM.yyyy HH:mm', new Date());
    if (!isValid(parsed)) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: 'Некоректна дата або час' });
    }
  });

type FormValues = z.infer<typeof schema>;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export default function NewPrescriptionScreen() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const role = useUserRole();
  const patientsQuery = usePatientsQuery();
  const { submit, submitting } = useCreatePrescriptionAction();
  const offlineMessage = useOfflineNotice();

  const [patientId, setPatientId] = useState<string | undefined>(params.patientId);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{
    tone: 'success' | 'danger' | 'info';
    message: string;
  } | null>(null);
  const [created, setCreated] = useState(false);

  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);
  const patient = patients.find((item) => item.id === patientId);
  const filtered = useMemo(() => filterPatients(patients, search), [patients, search]);

  const now = new Date();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'MANIPULATION',
      title: '',
      details: '',
      date: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      priority: 'NORMAL',
    },
  });

  if (!canCreatePrescription(role)) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="Нове призначення" leading="back" />
        <View className="p-4">
          <Banner
            tone="danger"
            message="Створення лікарських призначень доступне лише лікарю або адміністратору"
          />
        </View>
      </View>
    );
  }

  const onSubmit = async (values: FormValues) => {
    if (!patientId) {
      setNotice({ tone: 'danger', message: 'Виберіть пацієнта' });
      return;
    }
    const scheduled = parse(`${values.date} ${values.time}`, 'dd.MM.yyyy HH:mm', new Date());

    const outcome = await submit({
      patientId,
      patientName: patient?.fullName,
      roomId: patient?.roomId,
      roomNumber: patient?.roomNumber,
      bedId: patient?.bedId,
      bedNumber: patient?.bedNumber,
      type: values.type,
      title: values.title,
      details: values.details && values.details.length > 0 ? values.details : undefined,
      scheduledAt: scheduled.toISOString(),
      priority: values.priority,
    });

    if (outcome.status === 'done') {
      setCreated(true);
      setNotice({ tone: 'success', message: 'Призначення успішно створено' });
      reset();
      return;
    }
    if (outcome.status === 'queued') {
      setNotice({ tone: 'info', message: offlineMessage });
      return;
    }
    setNotice({ tone: 'danger', message: outcome.message });
  };

  if (created) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="Нове призначення" leading="back" />
        <View className="gap-4 p-4">
          <Banner tone="success" message="Призначення успішно створено" />
          <Text className="text-muted text-sm">
            Завдання надіслано медичним сестрам, які зараз на зміні. Запис одразу доступний у
            вебсистемі RehaFlow.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setCreated(false);
              setNotice(null);
            }}
            className="bg-accent min-h-14 items-center justify-center rounded-xl px-5 py-4"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-accent-foreground text-base font-bold">
              Створити ще призначення
            </Text>
          </Pressable>
          {patientId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.replace({ pathname: '/patient/[id]', params: { id: patientId } })
              }
              className="border-border min-h-12 items-center justify-center rounded-xl border px-5 py-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Text className="text-foreground text-sm font-medium">До картки пацієнта</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // Крок 1 — вибір пацієнта, якщо його не передано з картки.
  if (!patientId) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="Виберіть пацієнта" leading="back" />
        <View className="px-4 pt-4">
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Пошук: ПІБ, палата, ліжко, ID"
          />
        </View>

        {patientsQuery.isLoading ? (
          <LoadingState label="Завантаження пацієнтів…" />
        ) : (
          <ScrollView contentContainerClassName="gap-3 px-4 pb-10 pt-4">
            {filtered.length === 0 ? <EmptyState title="Пацієнтів не знайдено" /> : null}
            {filtered.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => setPatientId(item.id)}
                className="border-border bg-surface min-h-[68px] justify-center rounded-2xl border px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="text-foreground text-[15px] font-semibold">{item.fullName}</Text>
                <Text className="text-muted text-[13px]">
                  Палата {item.roomNumber ?? '—'} • Ліжко {item.bedNumber ?? '—'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Нове призначення" leading="back" />

      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-12 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {notice ? <Banner tone={notice.tone} message={notice.message} /> : null}

        <SectionCard title="Пацієнт">
          <InfoRow label="ПІБ" value={patient?.fullName ?? patientId} />
          <InfoRow label="Палата" value={patient?.roomNumber ?? '—'} />
          <InfoRow label="Ліжко" value={patient?.bedNumber ?? '—'} />
          {!params.patientId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPatientId(undefined)}
              className="mt-2 min-h-11 items-start justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text className="text-link text-sm font-medium">Змінити пацієнта</Text>
            </Pressable>
          ) : null}
        </SectionCard>

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SectionCard title="Тип призначення">
              <OptionPicker<PrescriptionType>
                options={PRESCRIPTION_TYPES}
                value={field.value}
                onChange={field.onChange}
              />
            </SectionCard>
          )}
        />

        <SectionCard title="Деталі призначення">
          <View className="gap-4">
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <TextField isInvalid={Boolean(fieldState.error)}>
                  <Label>Назва</Label>
                  <Input
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Внутрішньом’язова ін’єкція"
                  />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />

            <Controller
              control={control}
              name="details"
              render={({ field }) => (
                <TextField>
                  <Label>Деталі</Label>
                  <Input
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Препарат, доза, спосіб введення"
                    multiline
                    numberOfLines={3}
                  />
                </TextField>
              )}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="date"
                  render={({ field, fieldState }) => (
                    <TextField isInvalid={Boolean(fieldState.error)}>
                      <Label>Дата</Label>
                      <Input
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="дд.мм.рррр"
                        keyboardType="numbers-and-punctuation"
                      />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="time"
                  render={({ field, fieldState }) => (
                    <TextField isInvalid={Boolean(fieldState.error)}>
                      <Label>Час</Label>
                      <Input
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="гг:хх"
                        keyboardType="numbers-and-punctuation"
                      />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
              </View>
            </View>
          </View>
        </SectionCard>

        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <SectionCard title="Пріоритет">
              <RadioGroup
                value={field.value}
                onValueChange={(value: string) => field.onChange(value)}
              >
                <RadioGroup.Item value="NORMAL">
                  <View className="flex-1">
                    <Label>Звичайний</Label>
                  </View>
                  <Radio>
                    <Radio.Indicator>
                      <Radio.IndicatorThumb />
                    </Radio.Indicator>
                  </Radio>
                </RadioGroup.Item>

                <Separator />

                <RadioGroup.Item value="URGENT">
                  <View className="flex-1">
                    <Label>Терміновий</Label>
                  </View>
                  <Radio>
                    <Radio.Indicator className="border-urgent">
                      <Radio.IndicatorThumb className="bg-urgent" />
                    </Radio.Indicator>
                  </Radio>
                </RadioGroup.Item>
              </RadioGroup>
            </SectionCard>
          )}
        />

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void handleSubmit(onSubmit)()}
          className="bg-accent min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
          style={({ pressed }) => ({ opacity: pressed || submitting ? 0.75 : 1 })}
        >
          {submitting ? <ActivityIndicator color={navColors.headerForeground} /> : null}
          <Text className="text-accent-foreground text-base font-bold">НАДІСЛАТИ</Text>
        </Pressable>

        <Text className="text-muted text-center text-[11px]">
          Після надсилання завдання отримають медсестри, які зараз на зміні
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

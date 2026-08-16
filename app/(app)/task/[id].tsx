import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Input, Label, TextField } from 'heroui-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { Banner, ErrorState, LoadingState } from '@/components/ScreenState';
import { InfoRow, SectionCard } from '@/components/SectionCard';
import { StatusPill, UrgentPill } from '@/components/StatusPill';
import { canClaimTask, canCompleteTask } from '@/lib/permissions';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatTime, priorityLabel, roomBedLine } from '@/lib/format';
import { navColors } from '@/lib/theme';
import { useCurrentUser } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { useOfflineNotice, useTaskActions } from '@/lib/hooks/useActions';
import { useTaskQuery } from '@/lib/hooks/useRehaflowData';

type Notice = { tone: 'success' | 'danger' | 'info'; message: string } | null;

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const role = user?.role ?? null;
  const online = useIsOnline();
  const query = useTaskQuery(id);
  const { claim, start, complete, pendingAction } = useTaskActions();
  const offlineMessage = useOfflineNotice();

  const [notice, setNotice] = useState<Notice>(null);
  const [completing, setCompleting] = useState(false);
  const [comment, setComment] = useState('');

  const task = query.data;

  if (query.isLoading && !task) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="Завдання" leading="back" backFallback="/tasks" />
        <LoadingState label="Завантаження завдання…" />
      </View>
    );
  }

  if (!task) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="Завдання" leading="back" backFallback="/tasks" />
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      </View>
    );
  }

  const isMine = Boolean(user?.id) && task.claimedById === user?.id;
  const isOpen = task.status === 'AVAILABLE' || task.status === 'CREATED';
  const takenByOther = !isMine && Boolean(task.claimedById) && task.status !== 'COMPLETED';

  const applyOutcome = (
    outcome: { status: 'done' } | { status: 'queued' } | { status: 'error'; message: string },
    successMessage: string,
  ) => {
    if (outcome.status === 'done') {
      setNotice({ tone: 'success', message: successMessage });
      setCompleting(false);
      setComment('');
      return;
    }
    if (outcome.status === 'queued') {
      // Успіх НЕ показуємо — сервер ще не підтвердив дію.
      setNotice({ tone: 'info', message: offlineMessage });
      setCompleting(false);
      return;
    }
    setNotice({ tone: 'danger', message: outcome.message });
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Медичне завдання" leading="back" backFallback="/tasks" />

      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        <View className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="text-foreground flex-1 text-[20px] font-bold">{task.title}</Text>
            {task.priority === 'URGENT' ? <UrgentPill /> : null}
          </View>
          <StatusPill status={task.status} />
        </View>

        {notice ? <Banner tone={notice.tone} message={notice.message} /> : null}

        {takenByOther ? (
          <Banner
            tone="warning"
            message={
              task.claimedByName
                ? `Завдання вже виконується медсестрою ${task.claimedByName}`
                : 'Завдання вже виконується іншою медсестрою'
            }
          />
        ) : null}

        {!online ? <Banner tone="warning" message="Офлайн. Дані можуть бути неактуальні" /> : null}

        <SectionCard title="Пацієнт">
          <Pressable
            accessibilityRole="button"
            disabled={!task.patientId}
            onPress={() => {
              if (task.patientId) {
                router.push({ pathname: '/patient/[id]', params: { id: task.patientId } });
              }
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Text className="text-foreground text-[17px] font-semibold">{task.patientName}</Text>
            <Text className="text-muted pt-1 text-sm">
              {roomBedLine(task.roomNumber, task.bedNumber)}
            </Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="Призначення">
          <InfoRow label="Тип" value={task.typeLabel ?? '—'} />
          <InfoRow label="Назва" value={task.title} />
          {task.details ? <InfoRow label="Деталі" value={task.details} /> : null}
          <InfoRow label="Час" value={formatTime(task.scheduledAt)} />
          <InfoRow label="Дата" value={formatDateTime(task.scheduledAt)} />
          <InfoRow
            label="Пріоритет"
            value={priorityLabel(task.priority)}
            valueClassName={task.priority === 'URGENT' ? 'text-urgent' : undefined}
          />
          <InfoRow label="Лікар" value={task.doctorName ?? '—'} />
          <InfoRow label="Створено" value={formatDateTime(task.createdAt)} />
        </SectionCard>

        {task.status === 'COMPLETED' ? (
          <SectionCard title="Виконання">
            <InfoRow label="Виконала" value={task.claimedByName ?? '—'} />
            <InfoRow label="Час виконання" value={formatDateTime(task.completedAt)} />
            <InfoRow label="Коментар" value={task.comment ?? '—'} />
          </SectionCard>
        ) : null}

        {task.status === 'CANCELLED' ? <Banner tone="danger" message="Завдання скасовано" /> : null}

        {/* Дії медсестри. Лікар бачить завдання лише для перегляду. */}
        {isOpen && canClaimTask(role) ? (
          <Pressable
            accessibilityRole="button"
            disabled={pendingAction !== null}
            onPress={() =>
              void claim(task).then((outcome) =>
                applyOutcome(outcome, 'Завдання закріплено за вами'),
              )
            }
            className="bg-accent min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
            style={({ pressed }) => ({ opacity: pressed || pendingAction ? 0.75 : 1 })}
          >
            {pendingAction === 'claim' ? (
              <ActivityIndicator color={navColors.headerForeground} />
            ) : null}
            <Text className="text-accent-foreground text-base font-bold">ВЗЯТИ ЗАВДАННЯ</Text>
          </Pressable>
        ) : null}

        {isMine && task.status === 'CLAIMED' ? (
          <Pressable
            accessibilityRole="button"
            disabled={pendingAction !== null}
            onPress={() =>
              void start(task).then((outcome) =>
                applyOutcome(outcome, 'Завдання переведено у виконання'),
              )
            }
            className="border-urgent bg-urgent/20 min-h-14 items-center justify-center rounded-xl border px-5 py-4"
            style={({ pressed }) => ({ opacity: pressed || pendingAction ? 0.75 : 1 })}
          >
            <Text className="text-urgent text-base font-bold">РОЗПОЧАТИ ВИКОНАННЯ</Text>
          </Pressable>
        ) : null}

        {isMine && canCompleteTask(role) && task.status !== 'COMPLETED' && !completing ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setNotice(null);
              setCompleting(true);
            }}
            className="bg-state-done min-h-14 items-center justify-center rounded-xl px-5 py-4"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-success-foreground text-base font-bold">ПОЗНАЧИТИ ВИКОНАНИМ</Text>
          </Pressable>
        ) : null}

        {completing ? (
          <SectionCard title="Завершення завдання">
            <TextField>
              <Label>Коментар</Label>
              <Input
                value={comment}
                onChangeText={setComment}
                placeholder="Наприклад: без ускладнень"
                multiline
                numberOfLines={3}
              />
            </TextField>

            <View className="flex-row gap-2 pt-3">
              <Pressable
                accessibilityRole="button"
                disabled={pendingAction !== null}
                onPress={() =>
                  void complete(task, comment).then((outcome) =>
                    applyOutcome(outcome, 'Завдання виконано'),
                  )
                }
                className="bg-state-done min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
                style={({ pressed }) => ({ opacity: pressed || pendingAction ? 0.75 : 1 })}
              >
                {pendingAction === 'complete' ? (
                  <ActivityIndicator color={navColors.headerForeground} />
                ) : null}
                <Text className="text-success-foreground text-base font-bold">ПІДТВЕРДИТИ</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCompleting(false)}
                className="border-border min-h-14 items-center justify-center rounded-xl border px-4 py-4"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="text-foreground text-sm font-medium">Скасувати</Text>
              </Pressable>
            </View>
          </SectionCard>
        ) : null}

        {!canClaimTask(role) && task.status !== 'COMPLETED' ? (
          <Text className="text-muted text-center text-[12px]">
            Виконання завдань доступне лише медичним сестрам
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

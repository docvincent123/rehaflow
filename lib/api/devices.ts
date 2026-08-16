import { endpoints } from './endpoints';
import { apiRequest } from './http';
import { mapDeviceSession, mapShift } from './mappers';
import { pickCollection, pickEntity } from './normalize';
import type { DeviceSession, Shift } from './types';
import { getDeviceMeta } from '@/lib/device';
import { Platform } from 'react-native';

/** Реєстрація пристрою — у вебсистемі відображається біля акаунта. */
export async function registerDevice(): Promise<void> {
  const device = getDeviceMeta();
  if (!device) return;

  await apiRequest(endpoints.devices.register, {
    method: 'POST',
    body: {
      deviceId: device.deviceId,
      model: device.model,
      os: device.osVersion ? `${device.os} ${device.osVersion}` : device.os,
      platform: Platform.OS,
      appVersion: device.appVersion,
      lastSeenAt: new Date().toISOString(),
    },
  });
}

export async function sendDeviceHeartbeat(): Promise<void> {
  const device = getDeviceMeta();
  if (!device) return;

  await apiRequest(endpoints.devices.heartbeat, {
    method: 'POST',
    body: { deviceId: device.deviceId, lastSeenAt: new Date().toISOString() },
  });
}

export async function fetchDevices(): Promise<DeviceSession[]> {
  const payload = await apiRequest(endpoints.devices.list);
  const currentId = getDeviceMeta()?.deviceId;
  return pickCollection(payload, ['devices', 'sessions'])
    .map((item) => mapDeviceSession(item, currentId))
    .filter((item) => item.deviceId);
}

export async function registerPushToken(token: string): Promise<void> {
  const device = getDeviceMeta();
  await apiRequest(endpoints.devices.pushToken, {
    method: 'POST',
    body: {
      deviceId: device?.deviceId,
      pushToken: token,
      platform: Platform.OS,
      provider: 'expo',
    },
  });
}

export async function fetchCurrentShift(): Promise<Shift | null> {
  const payload = await apiRequest(endpoints.shifts.current);
  return mapShift(pickEntity(payload, ['shift', 'currentShift']));
}

export async function startShift(): Promise<Shift | null> {
  const device = getDeviceMeta();
  const payload = await apiRequest(endpoints.shifts.start, {
    method: 'POST',
    body: {
      startedAt: new Date().toISOString(),
      deviceId: device?.deviceId,
      device: device?.label,
    },
  });
  return mapShift(pickEntity(payload, ['shift']));
}

export async function endShift(): Promise<Shift | null> {
  const device = getDeviceMeta();
  const payload = await apiRequest(endpoints.shifts.end, {
    method: 'POST',
    body: {
      endedAt: new Date().toISOString(),
      deviceId: device?.deviceId,
      device: device?.label,
    },
  });
  return mapShift(pickEntity(payload, ['shift']));
}

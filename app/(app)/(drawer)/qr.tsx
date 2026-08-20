import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Camera, CheckCircle2, QrCode, RotateCcw } from 'lucide-react-native';

import { AppHeader } from '@/components/AppHeader';
import { Banner } from '@/components/ScreenState';
import { navColors } from '@/lib/theme';

function resolvePatientId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed?.patientId) return String(parsed.patientId);
    if (parsed?.id) return String(parsed.id);
  } catch {
    // plain-text QR is supported below
  }
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/patient\/([^/]+)/i) || url.search.match(/[?&]patientId=([^&]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // not a URL
  }
  if (/^[A-Za-z0-9_-]{6,}$/.test(text)) return text;
  return null;
}

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) return;
  }, [permission?.granted]);

  const handleScan = ({ data }: { data: string }) => {
    if (locked) return;
    const patientId = resolvePatientId(data);
    if (!patientId) {
      setMessage('QR знайдено, але в ньому немає коректного ID пацієнта.');
      setLocked(true);
      return;
    }
    setLocked(true);
    router.replace({ pathname: '/patient/[id]', params: { id: patientId } });
  };

  if (!permission) {
    return <View className="bg-background flex-1" />;
  }

  if (!permission.granted) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="QR-сканер" leading="back" />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <View className="bg-accent-soft h-20 w-20 items-center justify-center rounded-3xl"><QrCode color={navColors.accent} size={40} /></View>
          <Text className="text-foreground text-center text-xl font-bold">Доступ до камери</Text>
          <Text className="text-muted max-w-sm text-center text-sm">Дозвольте камері сканувати QR-код, розміщений на ліжку або біля палати.</Text>
          <Pressable onPress={() => void requestPermission()} className="bg-accent min-h-12 rounded-xl px-6 py-3"><Text className="text-accent-foreground text-sm font-bold">Дозволити камеру</Text></Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-black flex-1">
      <AppHeader title="Сканувати ліжко" subtitle="Наведіть камеру на QR-код" leading="back" />
      <View className="flex-1">
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={locked ? undefined : handleScan}
        />
        <View className="flex-1 items-center justify-center px-7">
          <View style={styles.frame} />
          <View className="mt-8 rounded-2xl bg-black/65 px-5 py-4">
            <View className="flex-row items-center gap-2"><Camera color="#fff" size={17} /><Text className="text-white text-sm font-semibold">QR ліжка</Text></View>
            <Text className="mt-1 text-center text-xs text-white/75">Після сканування відкриється картка пацієнта</Text>
          </View>
        </View>
        {message ? (
          <View className="absolute inset-x-4 bottom-8 rounded-2xl bg-white px-4 py-4">
            <View className="flex-row items-start gap-3"><CheckCircle2 color={navColors.danger} size={20} /><Text className="text-foreground flex-1 text-sm">{message}</Text></View>
            <Pressable onPress={() => { setMessage(null); setLocked(false); }} className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3"><RotateCcw color={navColors.headerForeground} size={16} /><Text className="text-accent-foreground text-sm font-bold">Сканувати ще раз</Text></Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 28,
    backgroundColor: 'transparent',
  },
});

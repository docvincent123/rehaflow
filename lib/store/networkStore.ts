import { addEventListener, fetch as fetchNetworkState } from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  online: boolean;
  hasChecked: boolean;
  setOnline: (online: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  online: true,
  hasChecked: false,
  setOnline: (online) => set({ online, hasChecked: true }),
}));

function isOnline(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): boolean {
  if (state.isConnected !== true) return false;
  // isInternetReachable === null означає "ще перевіряється" — не вважаємо офлайном.
  return state.isInternetReachable !== false;
}

/** Підписка на стан мережі. Повертає функцію відписки. */
export function subscribeToNetwork(): () => void {
  const { setOnline } = useNetworkStore.getState();

  void fetchNetworkState()
    .then((state) => setOnline(isOnline(state)))
    .catch(() => setOnline(true));

  return addEventListener((state) => {
    setOnline(isOnline(state));
  });
}

export const useIsOnline = () => useNetworkStore((state) => state.online);

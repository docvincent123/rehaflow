import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { endShift, startShift } from '@/lib/api/devices';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { useIsOnline } from '@/lib/store/networkStore';

/** Початок і кінець зміни. Підтвердження виконується UI перед викликом. */
export function useShiftActions() {
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (mode: 'start' | 'end') => {
    if (!online) {
      setError('Немає з’єднання. Час зміни фіксується лише на сервері');
      return false;
    }
    setPending(mode);
    setError(null);
    try {
      if (mode === 'start') await startShift();
      else await endShift();
      await queryClient.invalidateQueries({ queryKey: queryKeys.shift });
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    } finally {
      setPending(null);
    }
  }, [online, queryClient]);

  const begin = useCallback(() => run('start'), [run]);
  const finish = useCallback(() => run('end'), [run]);

  return { begin, finish, pending, error };
}

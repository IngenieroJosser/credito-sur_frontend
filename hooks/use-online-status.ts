import { useState, useEffect } from 'react';
import { checkRealConnectivity } from '@/lib/offline/connectivity';

/**
 * Hook para detectar el estado de la conexión a internet REAL.
 * A diferencia de navigator.onLine, hace un ping a /api/ping
 * para confirmar que hay acceso real a internet.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Verificar conectividad real al montar
    checkRealConnectivity().then(setIsOnline);

    const handleOnline = async () => {
      // navigator.onLine dice online, pero confirmamos con ping real
      const real = await checkRealConnectivity();
      setIsOnline(real);
    };

    const handleOffline = () => {
      // offline es siempre confiable — sin internet seguro
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

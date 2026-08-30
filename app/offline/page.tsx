'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Pagina de respaldo offline. next-pwa la precachea y la sirve cuando una
 * navegacion (F5 / apertura directa) no esta en cache y no hay red. Reintenta
 * volver a la app en cuanto vuelve la conexion.
 */
export default function OfflinePage() {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const alVolver = () => {
      setOnline(true);
      router.back();
    };
    const alCaer = () => setOnline(false);
    window.addEventListener('online', alVolver);
    window.addEventListener('offline', alCaer);
    return () => {
      window.removeEventListener('online', alVolver);
      window.removeEventListener('offline', alCaer);
    };
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      <div style={{ fontSize: 56 }}>📴</div>
      <h1 style={{ fontSize: 22, margin: 0 }}>Sin conexión</h1>
      <p style={{ maxWidth: 360, color: '#94a3b8', lineHeight: 1.5 }}>
        Esta pantalla no estaba guardada para uso sin conexión. Vuelve a una
        pantalla que ya hayas abierto, o reconéctate para cargarla.
      </p>
      <button
        onClick={() => router.back()}
        style={{
          marginTop: 8,
          padding: '10px 18px',
          borderRadius: 10,
          border: 'none',
          background: '#2563eb',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Volver
      </button>
      <span style={{ fontSize: 12, color: online ? '#22c55e' : '#f59e0b' }}>
        {online ? 'Conexión restablecida' : 'Esperando conexión…'}
      </span>
    </div>
  );
}

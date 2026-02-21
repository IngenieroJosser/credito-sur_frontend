import { apiClient } from '@/lib/api/apiClient';
import { apiRequest } from '@/lib/api/api';
import { restoreOfflineSession } from '@/lib/auth/offlineAuth';
import { offlineQueue } from './offlineQueue';
import { offlineStore, OfflineCliente, OfflinePrestamo, OfflineCuota, OfflineRuta } from './offlineDb';
import { trackOfflineEvent } from './offlineAnalytics';

const MAX_RETRIES = 3;

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; description: string; error: string }>;
}

// ─── Procesar cola de operaciones pendientes ─────────────────────

export const syncManager = {
  // Procesar todas las operaciones pendientes
  async processQueue(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

    if (!navigator.onLine) return result;

    const pending = await offlineQueue.getPending();
    const failed = await offlineQueue.getFailed();

    // Reintentar fallidos con menos de MAX_RETRIES
    const retryable = failed.filter((item) => item.retries < MAX_RETRIES);
    const allToProcess = [...pending, ...retryable];

    for (const item of allToProcess) {
      result.processed++;
      await offlineQueue.updateStatus(item.id, 'syncing');

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        let requestData: any = item.data;
        const headers: Record<string, string> = {
          Accept: 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        // Soporte para archivos (Multimedia)
        if (item.file) {
          const formData = new FormData();
          formData.append('file', item.file, item.fileName || 'upload');
          
          if (item.data && typeof item.data === 'object') {
            Object.entries(item.data as Record<string, any>).forEach(([key, value]) => {
              formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
            });
          }
          requestData = formData;
          // El navegador pondrá el Content-Type adecuado para FormData
        } else {
          headers['Content-Type'] = 'application/json';
        }

        await apiClient.request({
          method: item.method,
          url: item.endpoint,
          data: requestData,
          headers,
          timeout: 30000,
        });

        // Éxito: eliminar de la cola
        await offlineQueue.remove(item.id);
        result.succeeded++;
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || 'Error desconocido';

        // Si es 401, no reintentar (token expirado)
        if (err?.response?.status === 401) {
          await offlineQueue.updateStatus(item.id, 'failed', 'Token expirado. Inicie sesión nuevamente.');
        } else {
          await offlineQueue.updateStatus(item.id, 'failed', errorMsg);
        }

        result.failed++;
        result.errors.push({ id: item.id, description: item.description, error: errorMsg });
        await trackOfflineEvent('error', { errorMessage: errorMsg });
      }
    }

    // Track sync completion
    const duration = Date.now() - startTime;
    await trackOfflineEvent('sync', {
      duration,
      recordCount: result.processed,
      success: result.failed === 0,
    });

    return result;
  },

  // ─── Descargar datos para uso offline ────────────────────────

  async downloadClientes(): Promise<number> {
    if (!navigator.onLine) {
      console.warn('[Offline Sync] Sin conexión a internet, omitiendo descarga de clientes');
      return 0;
    }

    try {
      let token = localStorage.getItem('token');
      if (!token) {
        const restored = restoreOfflineSession();
        token = restored?.token || null as any;
        if (!token) {
          console.warn('[Offline Sync] No hay token de autenticación disponible');
          return 0;
        }
      }

      console.log('[Offline Sync] Iniciando descarga de clientes...');
      const data = await apiRequest<any>('GET', '/clients', undefined, { timeout: 30000, cacheTTL: 0 });

      const clientes: OfflineCliente[] = (Array.isArray(data) ? data : data.clientes || []).map((c: any) => ({
        id: c.id,
        codigo: c.codigo || '',
        dni: c.dni || '',
        nombres: c.nombres || '',
        apellidos: c.apellidos || '',
        telefono: c.telefono || '',
        direccion: c.direccion || null,
        correo: c.correo || null,
        nivelRiesgo: c.nivelRiesgo || 'MEDIO',
        rutaId: c.rutaId || undefined,
        prestamosActivos: c.prestamosActivos || 0,
        montoTotal: c.montoTotal || 0,
        montoMora: c.montoMora || 0,
      }));

      await offlineStore.saveMany('clientes', clientes);
      await trackOfflineEvent('download', { storeName: 'clientes', recordCount: clientes.length });
      console.log(`[Offline Sync] Descarga de clientes completada: ${clientes.length} registros`);
      return clientes.length;
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || 'Error desconocido';
      const statusCode = err?.statusCode || err?.response?.status || 'N/A';
      
      console.error('[Offline Sync] Error descargando clientes:', {
        message: errorMessage,
        statusCode,
        error: err,
        stack: err?.stack,
      });
      
      // Si es un error de red, no lanzar excepción para evitar que detenga otras descargas
      if (statusCode === 0 || err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        console.warn('[Offline Sync] Error de red al descargar clientes. El servidor puede no estar disponible.');
      }
      
      return 0;
    }
  },

  async downloadPrestamos(): Promise<number> {
    if (!navigator.onLine) return 0;

    try {
      let token = localStorage.getItem('token');
      if (!token) {
        const restored = restoreOfflineSession();
        token = restored?.token || null as any;
        if (!token) return 0;
      }

      const data = await apiRequest<any>('GET', '/loans?limit=500', undefined, { timeout: 30000, cacheTTL: 0 });

      const prestamosRaw = data.prestamos || [];
      const prestamos: OfflinePrestamo[] = prestamosRaw.map((p: any) => ({
        id: p.id,
        numeroPrestamo: p.numeroPrestamo || '',
        clienteId: p.clienteId || '',
        clienteNombre: p.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : '',
        monto: Number(p.monto) || 0,
        montoTotal: Number(p.montoTotal) || 0,
        saldoPendiente: Number(p.saldoPendiente) || 0,
        tasaInteres: Number(p.tasaInteres) || 0,
        plazoMeses: p.plazoMeses || 0,
        frecuenciaPago: p.frecuenciaPago || 'MENSUAL',
        estado: p.estado || 'PENDIENTE',
        cantidadCuotas: p.cantidadCuotas || 0,
        fechaInicio: p.fechaInicio || '',
        fechaFin: p.fechaFin || '',
      }));

      await offlineStore.saveMany('prestamos', prestamos);
      await trackOfflineEvent('download', { storeName: 'prestamos', recordCount: prestamos.length });

      // Guardar cuotas de cada préstamo
      const allCuotas: OfflineCuota[] = [];
      for (const p of prestamosRaw) {
        if (p.cuotas && Array.isArray(p.cuotas)) {
          for (const c of p.cuotas) {
            allCuotas.push({
              id: c.id,
              prestamoId: p.id,
              numeroCuota: c.numeroCuota || 0,
              fechaVencimiento: c.fechaVencimiento || '',
              monto: Number(c.monto) || 0,
              montoCapital: Number(c.montoCapital) || 0,
              montoInteres: Number(c.montoInteres) || 0,
              montoInteresMora: Number(c.montoInteresMora) || 0,
              estado: c.estado || 'PENDIENTE',
              montoPagado: Number(c.montoPagado) || 0,
              fechaPago: c.fechaPago || null,
            });
          }
        }
      }

      if (allCuotas.length > 0) {
        await offlineStore.saveMany('cuotas', allCuotas);
        await trackOfflineEvent('download', { storeName: 'cuotas', recordCount: allCuotas.length });
      }

      return prestamos.length;
    } catch (err) {
      console.error('[Offline Sync] Error descargando préstamos:', err);
      return 0;
    }
  },

  async downloadRutas(): Promise<number> {
    if (!navigator.onLine) return 0;

    try {
      let token = localStorage.getItem('token');
      if (!token) {
        const restored = restoreOfflineSession();
        token = restored?.token || null as any;
        if (!token) return 0;
      }

      const data = await apiRequest<any>('GET', '/routes', undefined, { timeout: 30000, cacheTTL: 0 });

      const rutasRaw = Array.isArray(data) ? data : data.data || [];
      const rutas: OfflineRuta[] = rutasRaw.map((r: any) => ({
        id: r.id,
        codigo: r.codigo || '',
        nombre: r.nombre || '',
        zona: r.zona || '',
        activa: r.activa ?? true,
        cobradorId: r.cobradorId || '',
        supervisorId: r.supervisorId || null,
      }));

      await offlineStore.saveMany('rutas', rutas);
      await trackOfflineEvent('download', { storeName: 'rutas', recordCount: rutas.length });
      return rutas.length;
    } catch (err) {
      console.error('[Offline Sync] Error descargando rutas:', err);
      return 0;
    }
  },

  // Descargar todos los datos para uso offline
  async downloadAll(): Promise<{ clientes: number; prestamos: number; rutas: number }> {
    const [clientes, prestamos, rutas] = await Promise.all([
      this.downloadClientes(),
      this.downloadPrestamos(),
      this.downloadRutas(),
    ]);
    return { clientes, prestamos, rutas };
  },

  // Obtener estado de sincronización
  async getStatus(): Promise<{
    isOnline: boolean;
    pendingOps: number;
    failedOps: number;
    lastSync: Record<string, string | undefined>;
    recordCounts: Record<string, number>;
  }> {
    const [pendingOps, failedOps, clientesMeta, prestamosMeta, rutasMeta, clientesCount, prestamosCount, cuotasCount, rutasCount] =
      await Promise.all([
        offlineQueue.countPending(),
        offlineQueue.countFailed(),
        offlineStore.getSyncMeta('clientes'),
        offlineStore.getSyncMeta('prestamos'),
        offlineStore.getSyncMeta('rutas'),
        offlineStore.count('clientes'),
        offlineStore.count('prestamos'),
        offlineStore.count('cuotas'),
        offlineStore.count('rutas'),
      ]);

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingOps,
      failedOps,
      lastSync: {
        clientes: clientesMeta?.lastSyncAt,
        prestamos: prestamosMeta?.lastSyncAt,
        rutas: rutasMeta?.lastSyncAt,
      },
      recordCounts: {
        clientes: clientesCount,
        prestamos: prestamosCount,
        cuotas: cuotasCount,
        rutas: rutasCount,
      },
    };
  },
};

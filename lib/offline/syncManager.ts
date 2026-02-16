import { apiClient } from '@/lib/api/apiClient';
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

        await apiClient.request({
          method: item.method,
          url: item.endpoint,
          data: item.data,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          timeout: 15000,
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
    if (!navigator.onLine) return 0;

    try {
      const token = localStorage.getItem('token');
      const response = await apiClient.get('/clients', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });

      const data = response.data;
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
      return clientes.length;
    } catch (err) {
      console.error('[Offline Sync] Error descargando clientes:', err);
      return 0;
    }
  },

  async downloadPrestamos(): Promise<number> {
    if (!navigator.onLine) return 0;

    try {
      const token = localStorage.getItem('token');
      const response = await apiClient.get('/loans?limit=500', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });

      const data = response.data;
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
      const token = localStorage.getItem('token');
      const response = await apiClient.get('/routes', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });

      const data = response.data;
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

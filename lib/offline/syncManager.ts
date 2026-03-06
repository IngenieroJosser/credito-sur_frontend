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

        // Éxito: marcar como completado
        await offlineQueue.updateStatus(item.id, 'completed');
        result.succeeded++;

        // Eliminar permanentemente tras 3 segundos (para que el usuario vea el check)
        setTimeout(async () => {
          await offlineQueue.remove(item.id);
        }, 3000);
      } catch (err: any) {
        const status = err?.response?.status;
        const errorMsg = err?.response?.data?.message || err?.message || 'Error desconocido';

        // Si es 401, no reintentar (token expirado) pero no lo borramos (esperamos login)
        if (status === 401) {
          await offlineQueue.updateStatus(item.id, 'failed', 'Token expirado. Inicie sesión nuevamente.');
        } else {
          // Si es un status distinto de 401, incrementamos el contador de reintentos
          const newRetries = (item.retries || 0) + 1;
          const isFatal = status === 409 || status === 400 || status === 403 || status === 404 || newRetries >= MAX_RETRIES;
          
          if (isFatal) {
            // Es un fallo definitivo, tratamos de enviarlo al Pipeline de Fallos Centralizado
            try {
              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              await apiClient.request({
                method: 'POST',
                url: '/sync-conflicts/report-failed',
                data: {
                  entidad: item.type || 'desconocido',
                  operacion: item.method,
                  datos: typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {}),
                  errorMotivo: errorMsg,
                  statusCode: status || 0,
                  endpoint: item.endpoint
                },
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  ...(token && { Authorization: `Bearer ${token}` }),
                }
              });
              
              // Se reportó exitosamente al servidor. Ya podemos borrarlo seguro.
              await offlineQueue.remove(item.id);
            } catch (reportErr) {
              // Si falla el reporte (ej. no hay internet), actualizamos su estado y reintentos para que intente reportarlo después
              await offlineQueue.updateStatus(item.id, 'failed', `Fallo definitivo. Pendiente de reporte al servidor. Error: ${errorMsg}`);
            }
          } else {
            // Aún le quedan reintentos, solo actualizamos el error
            // (La función de actualizar debería también incrementar el retries en offlineQueue)
            await offlineQueue.updateStatus(item.id, 'failed', errorMsg);
          }
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

      await offlineStore.saveMany('clientes', clientes, true);
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

      // Filtrar para guardar solo préstamos activos o en mora (excluir FINALIZADO, ARCHIVADO, RECHAZADO, etc.)
      const prestamosFiltrados = prestamos.filter(p => 
        p.estado === 'ACTIVO' || 
        p.estado === 'VENCIDO' || 
        p.estado === 'EN_MORA' || 
        p.estado === 'PENDIENTE'
      );

      await offlineStore.saveMany('prestamos', prestamosFiltrados, true);
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

      await offlineStore.saveMany('rutas', rutas, true);
      await trackOfflineEvent('download', { storeName: 'rutas', recordCount: rutas.length });
      return rutas.length;
    } catch (err) {
      console.error('[Offline Sync] Error descargando rutas:', err);
      return 0;
    }
  },

  async downloadProductos(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const data = await apiRequest<any>('GET', '/inventory', undefined, { timeout: 30000, cacheTTL: 0 });
      const productos = (Array.isArray(data) ? data : data.data || []).map((p: any) => ({
        id: String(p.id),
        codigo: p.codigo || '',
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        categoria: p.categoria || 'General',
        stock: p.stock || 0,
        costo: p.costo || 0,
        activo: p.activo ?? true,
      }));
      await offlineStore.saveMany('productos', productos, true);
      await trackOfflineEvent('download', { storeName: 'productos', recordCount: productos.length });
      return productos.length;
    } catch (err) {
      console.error('[Offline Sync] Error descargando productos:', err);
      return 0;
    }
  },

  async downloadCajas(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const data = await apiRequest<any>('GET', '/accounting/cajas', undefined, { timeout: 30000, cacheTTL: 0 });
      const cajas = (Array.isArray(data) ? data : data.data || []).map((c: any) => ({
        id: c.id,
        codigo: c.codigo || '',
        nombre: c.nombre || '',
        tipo: c.tipo || 'RUTA',
        responsable: c.responsable || '',
        saldo: Number(c.saldo) || 0,
        estado: c.estado || 'CERRADA',
      }));
      await offlineStore.saveMany('cajas', cajas, true);
      await trackOfflineEvent('download', { storeName: 'cajas', recordCount: cajas.length });
      return cajas.length;
    } catch (err) {
      console.error('[Offline Sync] Error descargando cajas:', err);
      return 0;
    }
  },

  async downloadUsuarios(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const data = await apiRequest<any>('GET', '/usuarios', undefined, { timeout: 30000, cacheTTL: 0 });
      const usuarios = (Array.isArray(data) ? data : data.data || []).map((u: any) => ({
        id: u.id,
        nombres: u.nombres || '',
        apellidos: u.apellidos || '',
        correo: u.correo || '',
        rol: u.rol || 'COBRADOR',
        estado: u.estado || 'ACTIVO',
      }));
      await offlineStore.saveMany('usuarios', usuarios, true);
      await trackOfflineEvent('download', { storeName: 'usuarios', recordCount: usuarios.length });
      return usuarios.length;
    } catch (err) {
      console.error('[Offline Sync] Error descargando usuarios:', err);
      return 0;
    }
  },

  // Limpiar todos los datos locales para forzar una resincronización limpia
  async clearLocalData(): Promise<void> {
    await offlineStore.clearAll();
    console.log('[Offline Sync] Datos locales limpiados');
  },

  // Descargar todos los datos para uso offline
  async downloadAll(): Promise<{ clientes: number; prestamos: number; rutas: number; productos: number; cajas: number; usuarios: number }> {
    try {
      const [clientes, prestamos, rutas, productos, cajas, usuarios] = await Promise.all([
        this.downloadClientes(),
        this.downloadPrestamos(),
        this.downloadRutas(),
        this.downloadProductos(),
        this.downloadCajas(),
        this.downloadUsuarios(),
      ]);
      return { clientes, prestamos, rutas, productos, cajas, usuarios };
    } catch (err) {
      console.error('[Offline Sync] Error critico en downloadAll:', err);
      return { clientes: 0, prestamos: 0, rutas: 0, productos: 0, cajas: 0, usuarios: 0 };
    }
  },

  // Obtener estado de sincronización
  async getStatus(): Promise<{
    isOnline: boolean;
    pendingOps: number;
    failedOps: number;
    lastSync: Record<string, string | undefined>;
    recordCounts: Record<string, number>;
  }> {
    const [
      pendingOps, 
      failedOps, 
      clientesMeta, 
      prestamosMeta, 
      rutasMeta, 
      productosMeta,
      cajasMeta,
      usuariosMeta,
      clientesCount, 
      prestamosCount, 
      cuotasCount, 
      rutasCount,
      productosCount,
      cajasCount,
      usuariosCount
    ] =
      await Promise.all([
        offlineQueue.countPending(),
        offlineQueue.countFailed(),
        offlineStore.getSyncMeta('clientes'),
        offlineStore.getSyncMeta('prestamos'),
        offlineStore.getSyncMeta('rutas'),
        offlineStore.getSyncMeta('productos'),
        offlineStore.getSyncMeta('cajas'),
        offlineStore.getSyncMeta('usuarios'),
        offlineStore.count('clientes'),
        offlineStore.count('prestamos'),
        offlineStore.count('cuotas'),
        offlineStore.count('rutas'),
        offlineStore.count('productos'),
        offlineStore.count('cajas'),
        offlineStore.count('usuarios'),
      ]);

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingOps,
      failedOps,
      lastSync: {
        clientes: clientesMeta?.lastSyncAt,
        prestamos: prestamosMeta?.lastSyncAt,
        rutas: rutasMeta?.lastSyncAt,
        productos: productosMeta?.lastSyncAt,
        cajas: cajasMeta?.lastSyncAt,
        usuarios: usuariosMeta?.lastSyncAt,
      },
      recordCounts: {
        clientes: clientesCount,
        prestamos: prestamosCount,
        cuotas: cuotasCount,
        rutas: rutasCount,
        productos: productosCount,
        cajas: cajasCount,
        usuarios: usuariosCount,
      },
    };
  },
};

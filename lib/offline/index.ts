export { getOfflineDb, offlineStore } from './offlineDb';
export type {
  OfflineCliente,
  OfflinePrestamo,
  OfflineCuota,
  OfflineRuta,
  OfflineQueueItem,
  SyncMeta,
} from './offlineDb';

export { offlineQueue, enqueuePago, enqueueClienteUpdate } from './offlineQueue';

export { syncManager } from './syncManager';
export type { SyncResult } from './syncManager';

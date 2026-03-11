/**
 * @deprecated Importa desde '@/services/prestamos-service' directamente.
 * Este archivo existe solo por compatibilidad hacia atrás y será eliminado.
 *
 * El servicio canónico es prestamosService en prestamos-service.ts
 * Para las operaciones de mora (loansService_), usar el endpoint /reports/prestamos-mora
 */
export {
  prestamosService as loansService,
  type EstadisticasPrestamos as LoansStatistics,
  type RespuestaPrestamos as LoansResponse,
  type FiltrosPrestamos as LoansFilters,
  type Cuota,
  type Prestamo as Loan,
} from '@/services/prestamos-service';

import { prestamosService } from '@/services/prestamos-service';
import type { FiltrosPrestamos, Prestamo } from '@/services/prestamos-service';

/** @deprecated usa prestamosService.obtenerPrestamos directamente */
export const loansServiceExt = {
  ...prestamosService,
  getLoans: (f?: FiltrosPrestamos) => prestamosService.obtenerPrestamos(f),
  deleteLoan: (id: string, _userId?: string) => prestamosService.archivarPrestamo(id, { motivo: 'Archivado por usuario' }),
};

// Re-exportar loansService enriquecido (sobrescribe el re-export anterior)
export { loansServiceExt as loansServiceFull };

// Tipos específicos de mora que no están en prestamos-service — mantenidos aquí por ahora
export type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
export type EstadoPrestamoMora = 'EN_MORA' | 'INCUMPLIDO' | 'PERDIDA';

export interface ClienteInfo {
  nombre: string;
  documento: string;
  telefono: string;
  direccion: string;
}

export interface CuentaMora {
  id: string;
  numeroPrestamo: string;
  cliente: ClienteInfo;
  diasMora: number;
  montoMora: number;
  montoTotalDeuda: number;
  cuotasVencidas: number;
  ruta: string;
  cobrador: string;
  nivelRiesgo: NivelRiesgo;
  estado: EstadoPrestamoMora;
  ultimoPago?: string;
}

export interface PrestamosMoraFiltros {
  busqueda?: string;
  nivelRiesgo?: NivelRiesgo;
  rutaId?: string;
  cobradorId?: string;
}

export interface TotalesMora {
  totalMora: number;
  totalDeuda: number;
  totalCasosCriticos: number;
  totalRegistros: number;
}

export interface PrestamosMoraResponse {
  prestamos: CuentaMora[];
  totales: TotalesMora;
  total: number;
  pagina: number;
  limite: number;
}

export interface EstadisticasMora {
  totalPrestamosMora: number;
  casosCriticos: number;
  moraAcumulada: number;
  deudaTotal: number;
}

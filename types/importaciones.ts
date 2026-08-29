export interface ErrorValidacion {
  hoja: string;
  fila: number;
  campo: string;
  mensaje: string;
  valor: any;
}

export interface AdvertenciaValidacion {
  hoja: string;
  fila: number;
  campo: string;
  mensaje: string;
  valor: any;
}

export interface ResumenHoja {
  totalFilas: number;
  filasValidas: number;
  filasConError: number;
}

/** Un movimiento que hará la confirmación, con su motivo y su cifra. */
export interface MovimientoPrevisto {
  fila: number;
  hoja?: string;
  numeroPrestamo?: string;
  ccCliente?: string;
  tipo: 'EFECTIVO' | 'ARTICULO';
  concepto: string;
  porque: string;
  salidaEfectivo: number;
  entradaEfectivo: number;
  unidadesInventario: number;
}

/** Vista previa de lo que la confirmación le hará a la caja y al inventario. */
export interface ImpactoCaja {
  hayMovimientos: boolean;
  creditosHistoricos: number;
  creditosOperativos: number;
  totalSalida: number;
  totalEntrada: number;
  unidadesInventario: number;
  cajaOficinaEncontrada: boolean;
  nombreCaja: string;
  saldoCajaOficina: number;
  alcanzaElSaldo: boolean;
  faltante: number;
  movimientos: MovimientoPrevisto[];
}

export interface ResultadoValidacion {
  tipo: 'clientes-creditos' | 'inventario';
  archivo: string;
  resumen: {
    totalFilas: number;
    filasValidas: number;
    filasConError: number;
    advertencias: number;
    porHoja: Record<string, ResumenHoja>;
  };
  impactoCaja?: ImpactoCaja;
  clientes?: any[];
  creditos?: any[];
  articulos?: any[];
  precios?: any[];
  errores: ErrorValidacion[];
  advertencias: AdvertenciaValidacion[];
}

export interface ResultadoConfirmacionInventario {
  loteId: string;
  estado: string;
  articulosCreados: number;
  articulosActualizados: number;
  articulosOmitidos: number;
  preciosActualizados: number;
  preciosCreados: number;
  preciosOmitidos: number;
  preciosContadoCreados: number;
  mensajes: string[];
  resumen: ResultadoValidacion['resumen'];
}

export interface ResultadoConfirmacionClientesCreditos {
  loteId: string;
  clientesCreados: number;
  clientesActualizados: number;
  clientesOmitidos: number;
  clientesAsignadosARuta: number;
  creditosHistoricosCreados: number;
  creditosOperativosCreados: number;
  creditosOmitidos: number;
  creditosNoSoportados: number;
  creditosActualizados: number;
  creditosAvanzados: number;
  cuotasPagadasImportadas: number;
  transaccionesCreadas: number;
  asientosCreados: number;
  cuotasCreadas: number;
  mensajes: string[];
  resumen: ResultadoValidacion['resumen'];
}

export interface LoteImportacion {
  id: string;
  tipo: string;
  estado: string;
  nombreArchivo: string;
  totalFilas: number;
  filasConError: number;
  advertencias: number;
  creadoEn: string;
  confirmadoEn: string | null;
  creadoPor: string | null;
  clientesCreados: number;
  prestamosCreados: number;
  sePuedeDeshacer: boolean;
  razonNoSePuedeDeshacer: string | null;
}

export interface ResultadoReversionLote {
  loteId: string;
  parcial: boolean;
  clientesEliminados: number;
  prestamosEliminados: number;
  cuotasEliminadas: number;
  asientosReversados: number;
  transaccionesReversadas: number;
  stockDevuelto: number;
  mensajes: string[];
}

/** Un credito concreto de una importacion, para poder revisarlo antes de deshacerlo. */
export interface CreditoDeLote {
  id: string;
  numeroPrestamo: string;
  tipo: string;
  cliente: string;
  cedula: string;
  articulo: string | null;
  monto: number;
  cuotaInicial: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: string;
  fechaCredito: string | null;
  /** Lo que volveria a la caja si se deshace este credito. */
  devolucionACaja: number;
  movioCaja: boolean;
  sePuedeDeshacer: boolean;
  razonNoSePuedeDeshacer: string | null;
}

export interface DetalleLoteImportacion {
  id: string;
  tipo: string;
  estado: string;
  nombreArchivo: string;
  creadoEn: string;
  confirmadoEn: string | null;
  creadoPor: string | null;
  creditos: CreditoDeLote[];
  totales: {
    creditos: number;
    deshacibles: number;
    bloqueados: number;
    devolucionACaja: number;
    articulosADevolver: number;
  };
  sePuede: boolean;
  razon: string | null;
}

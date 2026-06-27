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
  articulosOmitidos: number;
  preciosCreados: number;
  preciosOmitidos: number;
  resumen: ResultadoValidacion['resumen'];
}

export interface ResultadoConfirmacionClientesCreditos {
  loteId: string;
  clientesCreados: number;
  clientesOmitidos: number;
  creditosHistoricosCreados: number;
  creditosOperativosCreados: number;
  creditosOmitidos: number;
  creditosNoSoportados: number;
  transaccionesCreadas: number;
  asientosCreados: number;
  cuotasCreadas: number;
  mensajes: string[];
  resumen: ResultadoValidacion['resumen'];
}

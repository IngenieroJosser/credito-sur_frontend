export const FRECUENCIAS = ['DIARIO', 'SEMANAL', 'QUINCENAL', 'MENSUAL'] as const;
type Frecuencia = (typeof FRECUENCIAS)[number];
export type Interpretacion = 'PRECIO_TOTAL' | 'FINANCIADO';
type Valor = string | number | boolean;
export type MetodoVerificacion = 'TARJETA_FISICA' | 'SALDO_CARTERA';
type Evidencia<T> = { valor: T; evidencia: string };
type CampoFila = { referencia: string; campo: string; evidencia: string };

export interface DecisionesHistoricas {
  version: number;
  versiones: { preparador: string; esquema: number; reglas: string };
  fuentes: { cartera: string; inventario: string };
  responsable?: string;
  aprobadasEn?: string;
  reglas: {
    fechaCorteCartera?: Evidencia<string>;
    cerosIniciales?: Evidencia<true>;
    montoArticulo?: Evidencia<Interpretacion>;
    cuotasPorFrecuencia?: Evidencia<true>;
    cuotasPorFrecuenciaIndividual?: Partial<Record<Frecuencia, Evidencia<true>>>;
  };
  filas: (CampoFila & { valor: Valor; metodoVerificacion?: MetodoVerificacion })[];
  rechazos?: CampoFila[];
}

export interface CasoHistorico {
  referencia: string;
  tipo: 'CLIENTE' | 'DINERO' | 'CREDITO_ARTICULO' | 'ARTICULO';
  hoja: string;
  fila: number;
  conciliacion?: 'NO_AUTORIZADA' | MetodoVerificacion;
  condiciones?: 'SIN_VERIFICAR' | 'VERIFICADAS';
  consistencia?: 'NO_CALCULABLE' | 'CONSISTENTE' | 'DIFERENCIA';
  escenarios?: ({ tipo: 'precio' | 'financiado' } & Record<
    'precio' | 'inicial' | 'financiado' | 'total' | 'cuota' | 'abonado' | 'saldo', Valor | null
  >)[];
  excepciones: {
    campo: string;
    motivo: string;
    sugerencia?: string;
    candidatos?: { referencia: string; campo: 'cliente_ref' | 'articulo_ref'; etiqueta: string }[];
    original: Valor | null;
    propuesta: Valor | null;
  }[];
}

export interface ExpedienteHistorico {
  id: string;
  estado: 'EN_REVISION' | 'IMPORTADO' | 'REVERTIDO';
  revision: number;
  actualizadoEn: string;
  huellaCartera: string;
}

export interface RevisionHistoricaResultado {
  expediente: ExpedienteHistorico;
  casos: CasoHistorico[];
  total: number;
  huella: string;
  decisiones: DecisionesHistoricas;
  vistaIntegral?: VistaIntegral & { seleccion?: SeleccionHistorica };
}

export interface VistaIntegral {
  conteos: { inventario: number; clientes: number; dinero: number; articulos: number };
  totalErrores: number;
  totalAdvertencias: number;
  errores: AvisoIntegral[];
  advertencias: AvisoIntegral[];
  filasPorResolver: number;
  cuadre: boolean;
}
export type ValidacionLibroIntegral = RevisionHistoricaResultado | {
  operativa: VistaIntegral & {
    confirmable: boolean;
    impactoCaja?: { hayMovimientos: boolean; totalSalida: number; totalEntrada: number; unidadesInventario: number };
  };
};

interface AvisoIntegral { hoja: string; fila: number; campo: string; mensaje: string }
export interface SeleccionHistorica { inventario: string[]; clientes: string[]; referencias: string[] }

export interface CreditoHistoricoDePrueba {
  id: string;
  numeroPrestamo: string;
  tipoPrestamo: 'EFECTIVO' | 'ARTICULO';
  saldoPendiente: number;
}

export interface SimulacionHistorica {
  soloSimulacion: true;
  saldoAnterior: number;
  saldoProyectado: number;
  capital: number;
  interes: number;
  cuotasAfectadas: number;
}

export function archivoDecisiones(decisiones: DecisionesHistoricas) {
  return new File([JSON.stringify(decisiones, null, 2)], 'decisiones-historicas.json', {
    type: 'application/json',
  });
}

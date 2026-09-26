import { EstadoVisita, PeriodoRuta, VisitaRuta, mapNivelRiesgo } from '@/lib/types/cobranza';
import type { PagoParcial, PrestamoParcial } from '@/types/domain';
import type { CuotaOperativa } from '@/lib/types/cobranza';

/**
 * Un pago tal como le llega al historial.
 *
 * No es el `Pago` del backend a secas: por aqui pasan tambien los pagos
 * aplanados que arman otras pantallas y los que salen de la cola offline,
 * que traen el nombre del cliente y su direccion al nivel del pago en vez de
 * dentro de `cliente`. Cada lectura va defendida con `?.` y una cadena de
 * alternativas, asi que el tipo describe lo que el codigo acepta, no lo que
 * el backend promete.
 *
 * Se declara aqui y no en `Pago` a proposito: `Pago` es el contrato del
 * backend y no debe engordar con las formas de cada pantalla.
 */
export type PagoHistorial = PagoParcial & {
  clienteNombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  montoPagado?: number | null;
  tipoPrestamo?: string | null;
  frecuenciaPago?: string | null;
  cuotaId?: string | null;
  cuota?: CuotaOperativa | null;
  cliente?: (Partial<import("@/types/domain").Cliente> & { nombre?: string | null }) | null;
};

/**
 * Normaliza el periodo de ruta
 */
const normalizePeriodoRuta = (raw: any): any => {
  const v = String(raw || '').toUpperCase()
  if (v === 'DIARIO' || v === 'DIA') return 'DIA'
  if (v === 'SEMANAL' || v === 'SEMANA') return 'SEMANA'
  if (v === 'QUINCENAL' || v === 'QUINCENA') return 'QUINCENA'
  if (v === 'MENSUAL' || v === 'MES') return 'MES'
  return 'DIA'
}

/**
 * Helper central para construir historial operativo de ruta
 * Este builder fusiona visitas históricas + pagos reales del día
 * para asegurar que el historial refleje todos los pagos, incluso de clientes
 * que ya no están en la lista visible (por ejemplo, porque completaron su cuota)
 */

export const getPagoMontoHistorial = (pago: PagoHistorial): number => {
  return Number(
    pago?.montoTotal ??
    pago?.montoPagado ??
    pago?.valor ??
    pago?.monto ??
    0,
  )
}

export const getPagoHistorialKey = (pago: PagoHistorial): string => {
  return String(
    pago?.prestamoId ||
    pago?.prestamo?.id ||
    pago?.clienteId ||
    pago?.cliente?.id ||
    pago?.numeroPago ||
    pago?.id ||
    '',
  ).trim()
}

export const buildVisitaHistorialFromPago = (
  pago: PagoHistorial,
  fechaClave: string,
  rutaCobradorId: string,
): VisitaRuta => {
  // El `|| {}` mete un objeto vacio en la union y el compilador deja de ver
  // los campos. Se anota el tipo de lo que estas tres variables contienen.
  const cliente: NonNullable<PagoHistorial['cliente']> =
    pago?.cliente || pago?.prestamo?.cliente || {}
  const prestamo: PrestamoParcial = pago?.prestamo || {}
  const monto = getPagoMontoHistorial(pago)

  const clienteNombre =
    pago?.clienteNombre ||
    cliente?.nombre ||
    `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim() ||
    'Cliente'

  const cuota: CuotaOperativa = pago?.cuota || {}

  return {
    id: `pago-historial-${pago?.id || pago?.numeroPago || getPagoHistorialKey(pago)}`,
    cliente: clienteNombre,
    direccion: cliente?.direccion || pago?.direccion || 'Sin dirección registrada',
    telefono: cliente?.telefono || pago?.telefono || '',
    horaSugerida: '08:00 AM',

    montoCuota: Number(
      pago?.montoCuotaEsperado ??
      cuota?.montoCuota ??
      cuota?.montoNominal ??
      monto,
    ),
    montoCuotaNormal: Number(
      pago?.montoCuotaEsperado ??
      cuota?.montoCuota ??
      cuota?.montoNominal ??
      monto,
    ),
    montoCuotaPendiente: 0,
    saldoTotal: Number(
      prestamo?.saldoPendiente ??
      pago?.saldoNuevo ??
      pago?.nuevoSaldo ??
      0,
    ),

    estado: 'pagado' as EstadoVisita,
    estadoVisita: 'pagado',
    notasVisita: undefined,

    proximaVisita: fechaClave,
    targetVencimiento:
      cuota?.fechaVencimiento ||
      cuota?.fechaVencimientoProrroga ||
      fechaClave,

    ordenVisita: 9999,
    prioridad: 'media',
    nivelRiesgo: mapNivelRiesgo(cliente?.nivelRiesgo),

    cobradorId: String(pago?.cobradorId || rutaCobradorId || ''),
    periodoRuta: normalizePeriodoRuta(
      prestamo?.frecuenciaPago ||
      pago?.frecuenciaPago ||
      'DIARIO',
    ) as PeriodoRuta,

    clienteId: String(pago?.clienteId || cliente?.id || ''),
    prestamoId: String(pago?.prestamoId || prestamo?.id || ''),
    cuotaId: String(pago?.cuotaId || cuota?.id || ''),
    cuotaObjetivoId: String(pago?.cuotaId || cuota?.id || ''),
    cuotaObjetivoPrestamoId: String(pago?.cuotaId || cuota?.id || ''),

    cuotaObjetivo: cuota,
    proximaCuota: prestamo?.proximaCuota,
    cuotaActual: Number(cuota?.numeroCuota || pago?.cuotaNumero || 0) || undefined,
    cuotasTotales: Number(prestamo?.cantidadCuotas || 0) || undefined,

    tipoPrestamo:
      String(prestamo?.tipo || pago?.tipoPrestamo || '').toUpperCase() === 'ARTICULO'
        ? 'ARTICULO'
        : 'EFECTIVO',

    articuloNombre:
      String(prestamo?.tipo || pago?.tipoPrestamo || '').toUpperCase() === 'ARTICULO'
        ? 'Artículo'
        : 'Préstamo',

    recaudadoDelDia: monto,
    diasMora: 0,
  }
}

export const mergePagosDelDiaIntoHistorialDia = ({
  fechaClave,
  diaBase,
  pagosDelDia,
  rutaCobradorId,
}: {
  fechaClave: string
  diaBase: any
  pagosDelDia: any[]
  rutaCobradorId: string
}) => {
  const pagos = Array.isArray(pagosDelDia) ? pagosDelDia : []
  const visitasBase = Array.isArray(diaBase?.visitas) ? diaBase.visitas : []

  if (pagos.length === 0) {
    return diaBase
  }

  const visitasByKey = new Map<string, any>()

  for (const visita of visitasBase) {
    const key = String(
      visita?.prestamoId ||
      visita?.clienteId ||
      visita?.id ||
      '',
    ).trim()

    if (key) visitasByKey.set(key, visita)
  }

  for (const pago of pagos) {
    const key = getPagoHistorialKey(pago)
    const monto = getPagoMontoHistorial(pago)

    if (!key || monto <= 0) continue

    const existente = visitasByKey.get(key)

    if (existente) {
      visitasByKey.set(key, {
        ...existente,
        estado: 'pagado',
        estadoVisita: 'pagado',
        recaudadoDelDia: Math.max(
          Number(existente?.recaudadoDelDia || 0),
          monto,
        ),
        montoCuotaPendiente: 0,
      })
      continue
    }

    visitasByKey.set(
      key,
      buildVisitaHistorialFromPago(pago, fechaClave, rutaCobradorId),
    )
  }

  const visitasFusionadas = Array.from(visitasByKey.values())

  // Calcular gestionados por pago real
  const gestionadosPorPago = new Set(
    pagos
      .map(getPagoHistorialKey)
      .filter(Boolean),
  ).size

  // Calcular visitados considerando múltiples estados
  const visitados = Math.max(
    visitasFusionadas.filter((v) => {
      const estado = String(v?.estado || v?.estadoVisita || '').toLowerCase()
      return estado === 'pagado' || estado === 'gestionado' || Number(v?.recaudadoDelDia || 0) > 0
    }).length,
    gestionadosPorPago,
  )

  // Calcular recaudo por pagos y por visitas
  const recaudoPorPagos = pagos.reduce(
    (acc, pago) => acc + getPagoMontoHistorial(pago),
    0,
  )

  const recaudoPorVisitas = visitasFusionadas.reduce(
    (acc, v) => acc + Number(v?.recaudadoDelDia || 0),
    0,
  )

  const recaudo = Math.max(recaudoPorPagos, recaudoPorVisitas)

  const total = visitasFusionadas.length

  return {
    ...diaBase,
    visitas: visitasFusionadas,
    resumen: {
      ...(diaBase?.resumen || {}),
      total,
      visitados,
      recaudo,
      efectividad: total > 0 ? Math.round((visitados / total) * 100) : 0,
    },
  }
}

/**
 * Filtra pagos del día por ruta operativa con fallbacks
 * Prioridad: rutaId > prestamoId > clienteId > cobradorId
 */
export const filterPagosDelDiaByRuta = ({
  pagosData,
  fechaClave,
  rutaOperativaId,
  prestamosRuta,
  rutaCobradorId,
  isPagoForHistorialFecha,
}: {
  pagosData: any[]
  fechaClave: string
  rutaOperativaId: string
  prestamosRuta: Set<string>
  rutaCobradorId?: string
  isPagoForHistorialFecha: (pago: PagoHistorial, fecha: string) => boolean
}): any[] => {
  return (Array.isArray(pagosData) ? pagosData : []).filter((p) => {
    if (!isPagoForHistorialFecha(p, fechaClave)) return false;

    const pagoRutaId = String(
      p?.rutaId ||
      p?.ruta?.id ||
      p?.metadata?.rutaId ||
      p?.datosSolicitud?.rutaId ||
      '',
    ).trim();

    // Fuente primaria: la ruta operativa del pago
    if (rutaOperativaId && pagoRutaId) {
      return pagoRutaId === rutaOperativaId;
    }

    // Fallback para pagos antiguos sin rutaId
    const prestamoId = String(p?.prestamoId || p?.prestamo?.id || '').trim();

    if (prestamosRuta.size > 0 && prestamoId) {
      return prestamosRuta.has(prestamoId);
    }

    const cobradorMatch = rutaCobradorId
      ? String(p?.cobradorId || p?.cobrador?.id || '') === rutaCobradorId
      : true;

    return cobradorMatch;
  });
}

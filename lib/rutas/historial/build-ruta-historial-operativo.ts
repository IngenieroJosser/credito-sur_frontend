import { EstadoVisita, PeriodoRuta, VisitaRuta, mapNivelRiesgo } from '@/lib/types/cobranza';
import type { PagoParcial, PrestamoParcial } from '@/types/domain';
import type { CuotaOperativa } from '@/lib/types/cobranza';
import { frecuenciaToPeriodoRuta } from '@/lib/rutas-core'

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
  /**
   * La ruta del pago llega en cuatro sitios distintos segun de donde venga: en la raiz, en
   * la ruta anidada, en el `metadata` de la transaccion o en el `datosSolicitud` de la
   * aprobacion. La cascada que las lee estaba sobre un `any[]`, asi que ninguno de los
   * cuatro nombres se comprobaba.
   */
  metadata?: { rutaId?: string | null } | null;
  datosSolicitud?: { rutaId?: string | null } | null;
};

/**
 * Normaliza el periodo de ruta
 */


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
    periodoRuta: frecuenciaToPeriodoRuta(
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
  // El dia del historial: sus visitas y su resumen, que es lo unico que se lee de el.
  // `VisitaRuta[]` y no la forma parcial: las visitas del dia las arma
  // `mapDailyVisitsResponseToVisitas`, que devuelve visitas completas. El resumen se
  // reenvia sin leerlo campo por campo.
  diaBase: { visitas?: VisitaRuta[]; resumen?: Record<string, unknown> } | null
  pagosDelDia: PagoHistorial[]
  rutaCobradorId: string
}) => {
  const pagos = Array.isArray(pagosDelDia) ? pagosDelDia : []
  const visitasBase = Array.isArray(diaBase?.visitas) ? diaBase.visitas : []

  if (pagos.length === 0) {
    return diaBase
  }

  const visitasByKey = new Map<string, VisitaRuta>()

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
  pagosData: PagoHistorial[]
  fechaClave: string
  rutaOperativaId: string
  prestamosRuta: Set<string>
  rutaCobradorId?: string
  isPagoForHistorialFecha: (pago: PagoHistorial, fecha: string) => boolean
  // El retorno se infiere: es el mismo arreglo filtrado, asi que `PagoHistorial[]`. Antes
  // decia `any[]`, que perdia el tipo que el propio parametro ya declaraba.
}) => {
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

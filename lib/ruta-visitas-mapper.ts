import type { PeriodoRuta } from '@/lib/types/cobranza'
import {
  computeDiasMoraFromCuotas,
  computeMontoExigibleHastaHoyFromCuotas,
  computeMontoNominalHastaHoyFromCuotas,
  getBogotaDateKey,
  isVisitaExigibleHoy,
  normalizeDateKey,
  resolveFechaEfectivaCuota,
} from '@/lib/rutas-core'

// ============================================================================
// Mapper central de Ruta: asignaciones -> visitas (modelo liviano)
//
// Objetivo:
// - Centralizar la lógica que decide:
//   - qué clientes/préstamos aparecen hoy en la ruta
//   - cómo se calcula el estado (pendiente / en_mora / pagado)
//   - cómo se calcula el monto exigible del día (incluyendo mora)
//   - cómo se resuelve la fecha efectiva de vencimiento (prórroga)
//
// Importante:
// - Este archivo NO hace llamadas a servicios: consume la estructura ya cargada
//   (asignación -> cliente -> préstamos -> cuotas).
// - La salida es "Lite" a propósito: cada vista (cobrador/supervisor/admin)
//   puede enriquecer con más datos después (pagos, cuotas real-time, etc.).
// ============================================================================

export type EstadoVisita = 'pendiente' | 'en_mora' | 'pagado' | 'en_prorroga'

export type VisitaRutaLite = {
  id: string
  cliente: string
  direccion: string
  telefono: string
  horaSugerida: string
  montoCuota: number
  saldoTotal: number
  estado: EstadoVisita
  proximaVisita: any
  targetVencimiento?: any
  ordenVisita: number
  prioridad: any
  nivelRiesgo: any
  cobradorId: string
  periodoRuta: PeriodoRuta
  clienteId: string
  prestamoId?: string
  cuotaActual?: number
  cuotasTotales?: number
  diasMora?: number
  tipoPrestamo?: any
  articuloNombre?: string
  pendienteAprobacion?: boolean
  enProrroga?: boolean
  fechaProrroga?: any
  fechaOriginalVencimiento?: any
  apareceHoy?: boolean
}

const toPeriodo = (f: string): PeriodoRuta => {
  // Mapea la frecuencia de pago del préstamo (backend) al PeriodoRuta (frontend).
  const ff = String(f || '').toUpperCase()
  if (ff === 'SEMANAL') return 'SEMANA'
  if (ff === 'QUINCENAL') return 'QUINCENA'
  if (ff === 'MENSUAL') return 'MES'
  return 'DIA'
}

const toNivel = (r: string) => {
  // Normalización simple de nivel de riesgo para mantener compatibilidad
  // con el criterio existente en las vistas.
  if (r === 'AMARILLO') return 'leve'
  if (r === 'ROJO') return 'moderado'
  if (r === 'LISTA_NEGRA') return 'critico'
  return 'bajo'
}

const isPagada = (c: any) => {
  // Predicado defensivo para estados "pagada".
  const e = String(c?.estado || '').toUpperCase()
  return e === 'PAGADA' || e === 'PAGADO'
}

const isAnulada = (c: any) => {
  // Predicado defensivo para estados "anulada".
  const e = String(c?.estado || '').toUpperCase()
  return e === 'ANULADA' || e === 'ANULADO'
}

const getCuotaEffectiveVtoKey = (c: any): string => {
  // Obtiene la llave de vencimiento efectiva de una cuota (YYYY-MM-DD).
  //
  // Regla:
  // - Si hay prórroga, se usa la fecha prorrogada.
  // - Si no, la fechaVencimiento normal.
  // - Siempre se normaliza con normalizeDateKey para comparar de forma segura.
  if (!c) return ''
  const raw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
  if (!raw) return ''
  return normalizeDateKey(String(raw))
}

export const mapAsignacionesToVisitasLite = (params: {
  asignaciones: any[]
  hoyKey?: string
  cobradorId: string
}): VisitaRutaLite[] => {
  // Construye visitas por cada asignación. Si el cliente tiene préstamos activos,
  // se genera una visita por préstamo; si no, se genera una visita "vacía" (prestamo=null)
  // para mantener la semántica existente.
  const asignaciones = Array.isArray(params.asignaciones) ? params.asignaciones : []
  const hoyKey = params.hoyKey ?? getBogotaDateKey(new Date())

  const visitasRaw: VisitaRutaLite[] = asignaciones.flatMap((asig: any, index: number) => {
    const cliente = asig?.cliente || {}

    const prestamos = Array.isArray(cliente?.prestamos) ? cliente.prestamos : []
    const prestamosValidos = prestamos.filter((p: any) => p && (p.estado === 'ACTIVO' || p.estado === 'EN_MORA' || p.estado === 'PAGADO' || p.estado === 'PENDIENTE_APROBACION'))
    const lista = prestamosValidos.length > 0 ? prestamosValidos : [null]

    return lista.flatMap((prestamo: any, subIdx: number) => {
      const cuotas = Array.isArray(prestamo?.cuotas) ? prestamo.cuotas : []
      const cuotasOrdenadas = [...cuotas].sort((a: any, b: any) => {
        const ak = getCuotaEffectiveVtoKey(a)
        const bk = getCuotaEffectiveVtoKey(b)
        if (ak && bk) return ak.localeCompare(bk)
        return 0
      })

      const proxima = cuotasOrdenadas.find((c: any) => c && !isPagada(c) && !isAnulada(c)) || (prestamo?.proximaCuota ?? null)
      const dueKey = getCuotaEffectiveVtoKey(proxima)
      const fechaEfectiva = proxima ? (resolveFechaEfectivaCuota(proxima) || String((proxima as any)?.fechaVencimiento || '')) : ''

      const frecuencia = String(prestamo?.frecuenciaPago || 'DIARIO').toUpperCase()
      const periodoRuta = toPeriodo(frecuencia)

      const diasMora = computeDiasMoraFromCuotas(cuotasOrdenadas as any, hoyKey, frecuencia)

      const tieneMora = (() => {
        const byCuotas = cuotasOrdenadas.some((c: any) => {
          if (!c || isPagada(c) || isAnulada(c)) return false
          const vtoKey = getCuotaEffectiveVtoKey(c)
          return !!vtoKey && !!hoyKey && vtoKey < hoyKey
        })
        if (byCuotas) return true

        // Fallback defensivo: si no hay cuotas cargadas, inferir mora comparando
        // la fecha efectiva de la próxima cuota (si existe) contra hoyKey.
        // Esto evita que un préstamo aparezca como "pendiente" cuando ya pasó
        // el vencimiento pero el payload no trae cuotas.
        const proxKey = dueKey ? normalizeDateKey(String(dueKey)) : ''
        return !!proxKey && !!hoyKey && proxKey < hoyKey
      })()

      // Regla de aparición (apareceHoy):
      // - Si está en mora, aparece siempre.
      // - Si es periodo DIA, aparece siempre.
      // - Si no, aparece cuando la próxima visita (llave) coincide con hoyKey.

      const apareceHoy = isVisitaExigibleHoy(
        {
          estado: tieneMora ? 'en_mora' : 'pendiente',
          periodoRuta,
          proximaVisita: dueKey,
        },
        hoyKey,
      )

      if (!apareceHoy) return []

      const esArticulo = prestamo?.tipo === 'ARTICULO' || prestamo?.tipoPrestamo === 'ARTICULO'

      const montoNominalProxima = Number((proxima as any)?.montoNominal ?? (proxima as any)?.monto ?? 0)
      const montoNominalPrestamo = Number((prestamo as any)?.valorCuota ?? (prestamo as any)?.montoCuota ?? 0)
      const montoCuotaBase = esArticulo
        ? Math.max(montoNominalProxima, montoNominalPrestamo)
        : (montoNominalPrestamo > 0 ? montoNominalPrestamo : montoNominalProxima)
      const montoCuota = esArticulo
        ? (() => {
          const montoNominal = computeMontoNominalHastaHoyFromCuotas(cuotasOrdenadas as any, hoyKey)
          return montoNominal > 0 ? Math.max(montoNominal, montoCuotaBase) : montoCuotaBase
        })()
        : montoCuotaBase

      // Regla de montoCuota:
      // - Si hay cuotas vencidas/no pagadas hasta hoy, se acumulan (mora) y se cobra ese total.
      // - Si no hay mora, se usa el monto nominal de la próxima cuota.

      const saldoTotalToken = Number(prestamo?.saldoPendiente || 0)

      let estado: EstadoVisita = 'pendiente'
      if (saldoTotalToken <= 0) estado = 'pagado'
      else if (tieneMora) estado = 'en_mora'

      // Nota:
      // - La vista puede sobre-escribir este estado con pagos del día (recaudo) o
      //   información más actualizada del backend (enriquecimiento posterior).

      const nombreCredito = esArticulo ? (prestamo?.articulo || prestamo?.descripcionArticulo || 'Artículo') : 'Préstamo'

      const estadoCuota = String((proxima as any)?.estado || '').toUpperCase()
      const enProrroga = estadoCuota === 'PRORROGADA' || !!(proxima as any)?.fechaVencimientoProrroga
      const fechaProrroga = (proxima as any)?.fechaVencimientoProrroga
      const fechaOriginalVencimiento = (proxima as any)?.fechaVencimiento

      return [{
        id: prestamo?.id ? `${asig.id || `asig-${hoyKey}-${index}`}-${prestamo.id}` : (asig.id || `asig-${hoyKey}-${index}-${subIdx}`),
        cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente',
        direccion: cliente.direccion || 'Sin dirección registrada',
        telefono: cliente.telefono || '',
        horaSugerida: asig.horaSugerida || '08:00 AM',
        montoCuota,
        saldoTotal: saldoTotalToken,
        estado,
        proximaVisita: fechaEfectiva || (proxima as any)?.fechaVencimiento || hoyKey,
        targetVencimiento: (proxima as any)?.fechaVencimiento,
        ordenVisita: asig.ordenVisita || index + 1,
        prioridad: (cliente.nivelRiesgo === 'ROJO' ? 'alta' : 'media'),
        nivelRiesgo: toNivel(cliente.nivelRiesgo || 'VERDE'),
        cobradorId: params.cobradorId,
        periodoRuta,
        clienteId: cliente.id || asig.clienteId || '',
        prestamoId: prestamo?.id,
        cuotaActual: (proxima as any)?.numeroCuota,
        cuotasTotales: prestamo?.cantidadCuotas,
        diasMora,
        tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
        articuloNombre: nombreCredito,
        pendienteAprobacion: prestamo?.estado === 'PENDIENTE_APROBACION',
        enProrroga,
        fechaProrroga,
        fechaOriginalVencimiento,
        apareceHoy,
      }]
    })
  })

  return visitasRaw
}

import { useCallback, useEffect, useRef, useState } from 'react'

import { useRutaHistorial } from '@/hooks/useRutaHistorial'
import {
  buildHistorialDiaFromBackend,
  isPagoForHistorialFecha,
  normalizeVisitaHistorial,
} from '@/lib/ruta-historial'
import {
  filterPagosDelDiaByRuta,
  mergePagosDelDiaIntoHistorialDia,
} from '@/lib/rutas/historial/build-ruta-historial-operativo'
import { enrichRutaHistorialRiesgo } from '@/lib/rutas/historial/enrich-ruta-historial-riesgo'
import type { VisitaRuta } from '@/lib/types/cobranza'
import { pagosService } from '@/services/pagos-service'
import { rutasService } from '@/services/rutas-service'
import {
  obtenerSaldoDisponibleRuta,
} from '@/services/contabilidad-service'
import { RolUsuario } from '@/types/enums'
import { getBogotaDateKey } from '@/lib/rutas-core'
import type { Pago } from '@/types/domain'

export type UseRutaHistorialOperativoProps = {
  rutaId?: string
  cobradorId?: string
  actorId?: string
  actorRol?: RolUsuario | string
  getVisitasHoy: () => VisitaRuta[]
  initialDays?: number
  preferLoadDayForToday?: boolean
}

export const useRutaHistorialOperativo = ({
  rutaId,
  cobradorId,
  actorId,
  getVisitasHoy,
  initialDays = 30,
  preferLoadDayForToday = false,
}: UseRutaHistorialOperativoProps) => {
  const [pagosCache, setPagosCache] = useState<Pago[]>([])
  const pagosCacheRef = useRef<Pago[]>([])

  useEffect(() => {
    pagosCacheRef.current = pagosCache
  }, [pagosCache])

  useEffect(() => {
    if (!rutaId) return

    const loadPagos = async () => {
      try {
        // Acotado al cobrador de la ruta. Esta caché alimenta `fetchPagos` de
        // `useRutaHistorial`, y sus dos usos descartan acto seguido todo pago
        // de otro cobrador (`p.cobradorId === cobradorIdActual`), así que el
        // resultado es el mismo sin bajarse los de toda la financiera.
        //
        // Cubre varios días a la vez (la ventana del historial), así que aquí
        // no sirve `fechaOperativa`: eso es para `loadDay`, que sí pide uno.
        const pagosResp = await pagosService.obtenerPagos({
          ...(cobradorId ? { cobradorId } : {}),
          limit: 5000,
        })
        const pagosData = (pagosResp)?.pagos || pagosResp || []
        setPagosCache(Array.isArray(pagosData) ? pagosData : [])
        pagosCacheRef.current = Array.isArray(pagosData) ? pagosData : []
      } catch {
        setPagosCache([])
        pagosCacheRef.current = []
      }
    }

    void loadPagos()
  }, [rutaId, cobradorId])

  const loadDay = useCallback(async (fechaClave: string) => {
    if (!rutaId) {
      return {
        resumen: {
          recaudo: 0,
          gastos: 0,
          efectividad: 0,
          visitados: 0,
          total: 0,
        },
        visitas: [],
        loaded: true,
      }
    }

    try {
      const visitasResp = await rutasService.obtenerVisitasDelDia(rutaId, fechaClave)
      const saldoRuta = await obtenerSaldoDisponibleRuta(rutaId, fechaClave)

      // Solo los pagos del día que se está mirando. Antes se pedía el historial
      // completo (`limit: 5000`, 25 peticiones con la base llena) para después
      // descartar en el navegador todo lo que no fuera de esta fecha.
      const pagosResp = await pagosService.obtenerPagos({
        fechaOperativa: fechaClave,
        limit: 5000,
      })
      const pagosData = (pagosResp)?.pagos || pagosResp || []

      // Habia una rama de respaldo que leia `visitasResp.resumen.obligaciones`. Ahi no
      // esta: el backend pone `obligaciones` en la RAIZ de la respuesta, al mismo nivel
      // que `visitas` y `resumen` (`routes.service.ts:4606-4638`). Esa lectura valia
      // siempre `undefined`, la rama nunca se alcanzaba (la comprobacion de la raiz va
      // primero y gana) y cuando no habia obligaciones se caia igual a `visitas`.
      const obligaciones = Array.isArray(visitasResp?.obligaciones)
        ? visitasResp.obligaciones
        : Array.isArray(visitasResp?.visitas)
          ? visitasResp.visitas
          : []

      const prestamosRuta: Set<string> = new Set(
        obligaciones
          .map((o) =>
            String(
              o?.prestamoId ||
              o?.prestamo?.id ||
              o?.prestamoObjetivoId ||
              '',
            ).trim(),
          )
          .filter(Boolean),
      )

      const pagosDelDia = filterPagosDelDiaByRuta({
        pagosData,
        fechaClave,
        rutaOperativaId: rutaId,
        prestamosRuta,
        rutaCobradorId: cobradorId || actorId,
        isPagoForHistorialFecha,
      })

      const diaBase = buildHistorialDiaFromBackend({
        fechaClave,
        visitasResp,
        saldo: saldoRuta,
        pagosDelDia,
      })

      const diaMerged = mergePagosDelDiaIntoHistorialDia({
        fechaClave,
        diaBase,
        pagosDelDia,
        rutaCobradorId: cobradorId || actorId || '',
      })

      // Aplicar enrich de riesgo histórico
      const hoy = new Date()
      const hoyBogotaKey = getBogotaDateKey(hoy) ||
        `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
      const visitasHoy = getVisitasHoy()

      const visitasEnriquecidas = await enrichRutaHistorialRiesgo({
        visitas: diaMerged?.visitas || [],
        fechaClave,
        hoyBogotaKey,
        visitasHoy,
      })

      const visitasNormalizadas = visitasEnriquecidas.map(normalizeVisitaHistorial)

      return {
        ...diaMerged,
        visitas: visitasNormalizadas,
        // El resumen ya fue reconciliado por buildHistorialDiaFromBackend y
        // mergePagosDelDiaIntoHistorialDia. Volver a sumarlo desde tarjetas
        // puede contar dos veces una misma gestión cuando hay más de una forma
        // de la obligación en la respuesta.
        resumen: diaMerged?.resumen,
      }
    } catch {
      return {
        resumen: {
          recaudo: 0,
          gastos: 0,
          efectividad: 0,
          visitados: 0,
          total: 0,
        },
        visitas: [],
        loaded: true,
      }
    }
  }, [
    rutaId,
    cobradorId,
    actorId,
    getVisitasHoy,
  ])

  return useRutaHistorial({
    rutaId,
    cobradorId,
    getVisitasHoy,
    fetchPagos: async () => pagosCacheRef.current,
    loadDay,
    initialDays,
    preferLoadDayForToday,
  })
}

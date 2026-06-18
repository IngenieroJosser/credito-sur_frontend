import { useCallback, useEffect, useRef, useState } from 'react'

import { useRutaHistorial } from '@/hooks/useRutaHistorial'
import {
  buildHistorialDiaFromBackend,
  isPagoForHistorialFecha,
} from '@/lib/ruta-historial'
import {
  filterPagosDelDiaByRuta,
  mergePagosDelDiaIntoHistorialDia,
} from '@/lib/rutas/historial/build-ruta-historial-operativo'
import type { VisitaRuta } from '@/lib/types/cobranza'
import { pagosService } from '@/services/pagos-service'
import { rutasService } from '@/services/rutas-service'
import {
  obtenerSaldoCajaSupervisor,
  obtenerSaldoDisponibleRuta,
} from '@/services/contabilidad-service'
import { RolUsuario } from '@/types/enums'

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
  actorRol,
  getVisitasHoy,
  initialDays = 30,
  preferLoadDayForToday = false,
}: UseRutaHistorialOperativoProps) => {
  const [pagosCache, setPagosCache] = useState<any[]>([])
  const pagosCacheRef = useRef<any[]>([])

  useEffect(() => {
    pagosCacheRef.current = pagosCache
  }, [pagosCache])

  useEffect(() => {
    if (!rutaId) return

    const loadPagos = async () => {
      try {
        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
        const pagosData = (pagosResp as any)?.pagos || pagosResp || []
        setPagosCache(Array.isArray(pagosData) ? pagosData : [])
        pagosCacheRef.current = Array.isArray(pagosData) ? pagosData : []
      } catch {
        setPagosCache([])
        pagosCacheRef.current = []
      }
    }

    void loadPagos()
  }, [rutaId])

  const obtenerSaldoSegunRol = useCallback(async (fechaClave: string): Promise<any> => {
    const esSupervisor = String(actorRol || '').toUpperCase() === 'SUPERVISOR'

    if (esSupervisor && actorId) {
      return obtenerSaldoCajaSupervisor(actorId, fechaClave)
    }

    if (rutaId) {
      return obtenerSaldoDisponibleRuta(rutaId, fechaClave)
    }

    return null
  }, [actorId, actorRol, rutaId])

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
      const saldo = await obtenerSaldoSegunRol(fechaClave)

      const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
      const pagosData = (pagosResp as any)?.pagos || pagosResp || []

      const obligacionesRuta = Array.isArray((visitasResp as any)?.resumen?.obligaciones)
        ? (visitasResp as any).resumen.obligaciones
        : []

      const obligaciones = Array.isArray((visitasResp as any)?.obligaciones)
        ? (visitasResp as any).obligaciones
        : obligacionesRuta.length > 0
          ? obligacionesRuta
          : Array.isArray((visitasResp as any)?.visitas)
            ? (visitasResp as any).visitas
            : []

      const prestamosRuta: Set<string> = new Set(
        obligaciones
          .map((o: any) =>
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
        saldo,
        pagosDelDia,
      })

      return mergePagosDelDiaIntoHistorialDia({
        fechaClave,
        diaBase,
        pagosDelDia,
        rutaCobradorId: cobradorId || actorId || '',
      })
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
    obtenerSaldoSegunRol,
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

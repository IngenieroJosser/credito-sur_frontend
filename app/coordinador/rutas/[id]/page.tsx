'use client'

import { logger } from '@/lib/logger'



import { use, useState } from 'react'

import RutaClient from '../../../admin/rutas/[id]/ruta-client'

const isUuid = (value?: string | null) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  )
}

import {

  CheckCircle2,

  XCircle,

  Banknote,

  ArrowLeft,

  Save,

  Search,

  FileText as FileTextIcon,

  History,

  Loader2,

  User,

  Fingerprint,

  Star,

  CalendarDays,

  Phone,

  MapPin,

  Calendar,

  ChevronDown,

  Plus,

  CreditCard

} from 'lucide-react'

import { formatCOPInputValue, formatCurrency, formatMilesCOP } from '@/lib/utils'

import Link from 'next/link'

import { useParams } from 'next/navigation'

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { Cliente, clientesService } from '@/services/clientes-service'

import { rutasService } from '@/services/rutas-service'

import { EstadoVisita, VisitaRuta, HistorialDia, mapNivelRiesgo, mapFrecuenciaToPeriodo } from '@/lib/types/cobranza'

import {

    StaticVisitaItem,

    SeleccionClienteModal,

    Portal,

    MODAL_Z_INDEX

} from '@/components/dashboards/shared/CobradorElements'

import ReprogramarModal from '@/components/cobranza/ReprogramarModal'

import PagoModal from '@/components/cobranza/PagoModal'

import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'

import AnimacionCarga from '@/components/ui/AnimacionCarga'

import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'

import { creditosService } from '@/services/creditos-service'

import { useNotification } from '@/components/providers/NotificationProvider'

import { useAuth } from '@/hooks/useAuth'

import { prestamosService } from '@/services/prestamos-service'

import { pagosService } from '@/services/pagos-service'

import { computeRutaHoyUiStatsFromVisitas, resolveRutaHoyKpiStats, getBogotaDateKey, isVisitaExigibleHoy, normalizeDateKey, shouldExcludeVisitaFromOperationalMeta,
  shouldIncludeVisitaInRutaHoyKpis, toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import { isPagoCierrePendiente, mergeVisitasPreservingLocalRecaudo, sumMontoTotalPagosByBogotaDateKey } from '@/lib/ruta-recaudos'
import { mapDailyVisitsResponseToVisitas as mapDailyVisitsResponseToVisitasShared, type MapMode } from '@/lib/rutas/map-daily-visits-to-visitas'
import { ordenarVisitasRutaActual } from '@/lib/rutas/ordenar-visitas-ruta'

import { exportService } from '@/services/export-service'

import { obtenerSaldoDisponibleRuta } from '@/services/contabilidad-service'



import { useRealtimeData } from '@/hooks/useRealtimeData'



// Interfaces de datos

interface ClienteRuta {

  id: string

  nombre: string

  direccion: string

  telefono: string

  cuota: number

  saldoPendiente: number

  diasMora: number

  estadoVisita: 'PENDIENTE' | 'VISITADO_PAGO' | 'VISITADO_NO_PAGO'

  horaVisita?: string

}



export default function CoordinadorRutaDetallePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  return <RutaClient initialRuta={null} rutaId={params.id} />
}

const LegacyDetalleRutaPage = () => {

  const { showNotification } = useNotification()

  const { user: currentUser } = useAuth()

  const params = useParams()

  // Manejo seguro del ID de la ruta

  const rutaId = params?.id ? decodeURIComponent(params.id as string) : 'Desconocida'



  // Estado de carga

  const [isLoading, setIsLoading] = useState(true)

  const [clientes, setClientes] = useState<ClienteRuta[]>([])



  const progreso = {

    total: clientes.length,

    visitados: clientes.filter(c => c.estadoVisita !== 'PENDIENTE').length,

    recaudado: 150000

  }



  const porcentajeProgreso = progreso.total > 0 ? (progreso.visitados / progreso.total) * 100 : 0



  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)

  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })

  const [searchQuery, setSearchQuery] = useState('')

  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'>('TODOS')



  const [rutaActual, setRutaActual] = useState<{

    id?: string;

    nombre: string | null;

    activa: boolean;

    codigo?: string;

    cobrador?: string;

    cobradorId?: string;

    nivelRiesgo?: string;

    estadisticas?: any;

  } | null>(null)



  const [visitasCobrador, setVisitasCobrador] = useState<VisitaRuta[]>([])

  const visitasCobradorRef = useRef<VisitaRuta[]>([])

  useEffect(() => {
    visitasCobradorRef.current = visitasCobrador
  }, [visitasCobrador])

  const totalRecaudadoHoy = visitasCobrador.reduce((acc, current) => acc + (current.recaudadoDelDia || 0), 0)



  const [estadoCuentaVisita, setEstadoCuentaVisita] = useState<VisitaRuta | null>(null)

  const [pagoVisita, setPagoVisita] = useState<{visita: VisitaRuta, tipo: 'PAGO' | 'ABONO'} | null>(null)

  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)

  const [clienteDetalle, setClienteDetalle] = useState<VisitaRuta | null>(null)

  const [showClienteSelector, setShowClienteSelector] = useState(false)

  const [showNuevoCreditoModal, setShowNuevoCreditoModal] = useState(false)

  const [selectedClienteForCredito, setSelectedClienteForCredito] = useState<VisitaRuta | null>(null)



  const [showHistory, setShowHistory] = useState(false)

  const [showMisClientes, setShowMisClientes] = useState(false)

  const [historialRutas, setHistorialRutas] = useState<Record<string, HistorialDia> | null>(null)

  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)



  const [misCreditos, setMisCreditos] = useState<VisitaRuta[]>([])

  const [loadingMisCreditos, setLoadingMisCreditos] = useState(false)



  const cargarMisCreditos = useCallback(async () => {

    const cobradorId = rutaActual?.cobradorId

    if (!cobradorId || !rutaId) return

    try {

      setLoadingMisCreditos(true)

      const resp = await rutasService.obtenerVisitasDelDia(rutaId, getBogotaDateKey(new Date()))
      setMisCreditos(ordenarVisitasRutaActual(mapDailyVisitsResponseToVisitasCoordinador(resp, cobradorId)))

    } catch (e: any) {

      console.error('Error cargando mis clientes (ruta coordinador):', e)

      showNotification('error', 'No se pudieron cargar las obligaciones operativas de la ruta.', 'Error')

    } finally {

      setLoadingMisCreditos(false)

    }

  }, [rutaActual?.cobradorId, rutaId, showNotification])



  useEffect(() => {

    if (!showMisClientes) return

    cargarMisCreditos()

  }, [showMisClientes, cargarMisCreditos])



  // Tiempo real: recarga visitas COMPLETAS cuando se registran pagos/préstamos,

  // para que las cuotas de todos los clientes se reflejen sin recargar la página.

  useRealtimeData(['pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas'], async () => {

    // Recargar la lista principal de visitas (cuotas pueden haber cambiado)

    await cargarRuta();

    // Recargar misCreditos solo si el panel está abierto

    if (showMisClientes) {

      await cargarMisCreditos();

    }

  })



  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})

  const toggleGrupo = useCallback(

    (key: string) => setGruposColapsados((prev) => ({ ...prev, [key]: !prev[key] })),

    [],

  )



  const historyDates = useMemo(() => {

    if (!historialRutas) return [];

    return Object.keys(historialRutas).sort((a, b) => b.localeCompare(a));

  }, [historialRutas]);



  const getEstadoClasses = useCallback((estado: EstadoVisita) => {

    switch (estado) {

      case 'pagado':

        return 'bg-emerald-50 text-emerald-700 border-emerald-500/30'

      case 'pendiente':

        return 'bg-orange-50 text-orange-700 border-orange-500/30'

      case 'ausente':

        return 'bg-amber-50 text-amber-700 border-amber-200'

      case 'en_mora':

        return 'bg-rose-50 text-rose-700 border-rose-500/30'

      default:

        return 'bg-slate-50 text-slate-700 border-slate-300'

    }

  }, [])



  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {

    switch (prioridad) {

      case 'alta':

        return '#f97316'

      case 'media':

        return '#08557f'

      default:

        return '#94a3b8'

    }

  }, [])



  const getRiesgoBadgeClasses = (riesgo: string) => {

    switch (riesgo) {

        case 'PELIGRO_MINIMO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';

        case 'LEVE_RETRASO': return 'bg-blue-100 text-blue-800 border-blue-200';

        case 'PRECAUCION': return 'bg-yellow-100 text-yellow-800 border-yellow-200';

        case 'RIESGO_MODERADO': return 'bg-amber-100 text-amber-800 border-amber-200';

        case 'ALTO_RIESGO': return 'bg-rose-100 text-rose-800 border-rose-200';

        default: return 'bg-slate-100 text-slate-800 border-slate-200';

    }

  }



  const getRiesgoLabel = (riesgo: string) => {

      if (!riesgo) return 'Desconocido'

      return riesgo.replace('_', ' ');

  }





  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {

    setClienteDetalle(visita);

  }, [setClienteDetalle]);

  const mapDailyVisitsResponseToVisitasCoordinador = useCallback((resp: any, cobradorId: string): VisitaRuta[] => {
    const hoyBogotaKey = getBogotaDateKey(new Date())
    return ordenarVisitasRutaActual(mapDailyVisitsResponseToVisitasShared({
      resp,
      hoyBogotaKey,
      rutaData: { cobradorId },
      initialRuta: { cobradorId },
      modo: 'LIVE' as MapMode,
      fechaOperativa: hoyBogotaKey,
    }))
  }, [])



  // ---------------------------------------------------------------------------

  // cargarRuta – carga visitas completas y KPIs desde el backend.

  // useCallback estable para ser reutilizado en el hook de tiempo real.

  // ---------------------------------------------------------------------------

  const cargarRuta = useCallback(async () => {

    if (!rutaId || rutaId === 'Desconocida') return;

    try {

        const ruta = await rutasService.obtenerRutaPorId(rutaId);

        if (ruta && ruta.asignaciones) {

            let visitasDaily: VisitaRuta[] = []
            try {
              const visitasResp = await rutasService.obtenerVisitasDelDia(ruta.id, getBogotaDateKey(new Date()))
              visitasDaily = mapDailyVisitsResponseToVisitasCoordinador(visitasResp, ruta.cobradorId)
            } catch (dailyError) {
              console.warn('No se pudo cargar daily-visits de coordinador, usando detalle de ruta:', dailyError)
            }

            const visitas = visitasDaily.length > 0 ? visitasDaily : ruta.asignaciones.map((asig: any, index: number) => {

               const cliente = asig.cliente || {};

               const prestamos = cliente.prestamos || [];

               const prestamoActivo = prestamos.find((p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA') || prestamos[0] || {};



               const proximaCuota = prestamoActivo.proximaCuota || {};

               const saldoTotal = asig.cliente?.prestamos?.reduce((sum: number, p: any) => sum + Number(p.saldoPendiente || 0), 0) || 0;



               let estado: EstadoVisita = 'pendiente';

               if (proximaCuota.estado === 'VENCIDA') estado = 'en_mora';

               else if (proximaCuota.estado === 'PAGADA') estado = 'pagado';

               else if (!prestamoActivo.id) estado = 'pendiente';



               return {

                id: asig.id || `asig-${index}`,

                cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente Sin Nombre',

                direccion: cliente.direccion || 'Sin dirección registrada',

                telefono: cliente.telefono || '',

                horaSugerida: asig.horaSugerida || '08:00 AM',

                montoCuota: Number(proximaCuota.monto || 0),

                saldoTotal: Number(saldoTotal),

                estado: estado,

                proximaVisita: proximaCuota.fechaVencimiento || '9999-12-31T00:00:00.000Z',

                targetVencimiento: proximaCuota.fechaVencimiento || undefined,

                ordenVisita: asig.ordenVisita || index + 1,

                prioridad: (asig.prioridad?.toLowerCase()) || (estado === 'en_mora' ? 'alta' : 'media'),

                nivelRiesgo: (() => {

                   const r = cliente.nivelRiesgo || 'VERDE';

                   if (r === 'VERDE') return 'bajo';

                   if (r === 'AMARILLO') return 'precaucion' as any;

                   if (r === 'ROJO') return 'moderado';

                   if (r === 'LISTA_NEGRA') return 'critico';

                   return 'bajo';

                })(),

                cobradorId: ruta.cobradorId,

                periodoRuta: (() => {

                   const f = prestamoActivo.frecuenciaPago || 'DIARIO';

                   if (f === 'DIARIO') return 'DIA';

                   if (f === 'SEMANAL') return 'SEMANA';

                   if (f === 'QUINCENAL') return 'QUINCENA';

                   if (f === 'MENSUAL') return 'MES';

                   return 'DIA';

                })(),

                clienteId: cliente.id,

                prestamoId: prestamoActivo.id,

                cuotasTotales: prestamoActivo.cantidadCuotas,

                tipoPrestamo: prestamoActivo.tipo === 'ARTICULO' ? 'ARTICULO' : 'EFECTIVO',

                articuloNombre: prestamoActivo.tipo === 'ARTICULO' ? (prestamoActivo.articulo || 'Artículo') : 'Préstamo',

               };

            });



            // Enriquecer con cuotas

            const visitasEnriquecidas = await Promise.all(visitas.map(async (v: any) => {

                if (!v.prestamoId) return v;

                try {

                   const cuotas = await prestamosService.obtenerCuotas(v.prestamoId);

                   const pendiente = cuotas.find(c => c.estado !== 'PAGADA');



                   if (pendiente) {

                       const montoReal = Number(pendiente.monto || (pendiente.montoCapital + pendiente.montoInteres) || 0);
                       const montoNormal = Number(
                         (v as any).montoCuotaNormal ??
                         (pendiente as any).montoNominal ??
                         (pendiente as any).montoCuota ??
                         pendiente.monto ??
                         v.montoCuota ??
                         0,
                       )
                       const montoPendiente = Math.max(0, montoReal - Number((pendiente as any).montoPagado || 0))

                       return {

                         ...v,

                         montoCuota: montoNormal,
                         montoCuotaNormal: montoNormal,
                         montoCuotaPendiente: montoPendiente > 0 ? montoPendiente : (v as any).montoCuotaPendiente,

                         proximaVisita: (pendiente.estado === 'PRORROGADA' && pendiente.fechaVencimientoProrroga)

                           ? pendiente.fechaVencimientoProrroga

                           : (pendiente.fechaVencimiento || v.proximaVisita),

                         cuotaActual: pendiente.numeroCuota,

                         cuotasTotales: cuotas.length,

                         enProrroga: pendiente.estado === 'PRORROGADA' || !!pendiente.fechaVencimientoProrroga,

                         fechaProrroga: pendiente.fechaVencimientoProrroga || undefined,

                         fechaOriginalVencimiento: pendiente.fechaVencimiento || undefined,

                         cuotaId: pendiente?.id || (v as any)?.cuotaId,
                         cuotaObjetivoId: pendiente?.id || (v as any)?.cuotaObjetivoId,
                         cuotaObjetivoPrestamoId: pendiente?.id || (v as any)?.cuotaObjetivoPrestamoId,
                         proximaCuota: pendiente,
                         cuotaObjetivo: pendiente,

                       };

                   }



                   const p = await prestamosService.obtenerPrestamoPorId(v.prestamoId);
                   const pAny = p as any;

                   const proxima = (pAny.proximaCuota ?? {}) as any;
                   const cuotaIdFromP = String(proxima?.id || pAny?.cuotaObjetivo?.id || pAny?.cuotaId || (v as any)?.cuotaId || '').trim();

                   const montoP = Number(proxima.montoCuota || proxima.montoNominal || proxima.monto || p.montoCuota || p.valorCuota || 0);


                   return {

                     ...v,

                     montoCuota: montoP > 0 ? montoP : v.montoCuota,

                     proximaVisita: proxima.fechaVencimiento || v.proximaVisita,

                     cuotaId: cuotaIdFromP,
                     cuotaObjetivoId: cuotaIdFromP,
                     cuotaObjetivoPrestamoId: cuotaIdFromP,
                     cuotaObjetivo: proxima || pAny?.cuotaObjetivo,
                     proximaCuota: proxima,

                   };

                } catch (e) {

                   return v;

                }

            }));



            // Enriquecer recaudo

            const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const hoyStr = toLocalKey(new Date());



            const withRecaudo = await Promise.all(visitasEnriquecidas.map(async (v: any) => {

              if (!v.clienteId) return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };

              try {

                const pagosResp = await pagosService.obtenerPagos({ clienteId: v.clienteId, limit: 100 });

                const pagosCalc = (pagosResp?.pagos || []);



                const totalHoy = sumMontoTotalPagosByBogotaDateKey(
                  pagosCalc,
                  hoyStr,
                  { includeCierrePendiente: false },
                );



                const totalHistorico = pagosCalc.reduce((sum: number, p: any) => {

                  return sum + Number(p.montoTotal || 0);

                }, 0);



                return { ...v, recaudadoDelDia: totalHoy, recaudadoTotalClient: totalHistorico };

              } catch {

                return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };

              }

            }));



            const ajustarEstadoConPago = (v: any): EstadoVisita => {

              if (Number(v.saldoTotal || 0) <= 0) return 'pagado';

              const saldoHoy = Number(v.recaudadoDelDia || 0);

              const cuota = Number((v as any).montoCuotaPendiente ?? v.montoCuota ?? 0);

              if (saldoHoy >= (cuota - 1) && saldoHoy > 0) return 'pagado';

              const proximaC = v.proximaVisita ? (v.proximaVisita.includes('T') ? v.proximaVisita.split('T')[0] : v.proximaVisita) : '';

              if (proximaC === hoyStr && saldoHoy >= (cuota - 1)) return 'pagado';

              return v.estado;

            }



            const finalesBackend = ordenarVisitasRutaActual(
              withRecaudo.map(v => ({ ...v, estado: ajustarEstadoConPago(v) })),
            );
            const finales = mergeVisitasPreservingLocalRecaudo(visitasCobradorRef.current as any, finalesBackend as any) as any[];



            const cobranzaDia = finales.reduce((acc: number, curr: any) => acc + (curr.recaudadoDelDia || 0), 0)
            const hoyBogota = getBogotaDateKey(new Date());
            const finalesKpiHoy = finales
              .filter(v => shouldIncludeVisitaInRutaHoyKpis(v, hoyBogota))
              .filter(v => !shouldExcludeVisitaFromOperationalMeta(v));
            const statsHoy = computeRutaHoyUiStatsFromVisitas(finalesKpiHoy as any[], 0);
            const rExtra = ruta as any;
            const recaudoBackendHoy = Math.max(
              Number(rExtra?.cobranzaDelDia || 0),
              Number(rExtra?.estadisticas?.cobranzaDelDia || 0),
            )
            const metaBackendHoy = Math.max(
              Number(rExtra?.metaDelDia || 0),
              Number(rExtra?.estadisticas?.metaDelDia || 0),
            )
            const statsRutaHoy = resolveRutaHoyKpiStats(
              { ...statsHoy, recaudo: Math.max(Number(statsHoy.recaudo || 0), cobranzaDia) },
              {
                recaudo: recaudoBackendHoy,
                meta: metaBackendHoy,
                eficiencia: rExtra?.estadisticas?.avanceDiario,
              },
              { preferUi: Array.isArray(finalesKpiHoy) },
            )
            const recaudoDia = statsRutaHoy.recaudo
            const metaDia = statsRutaHoy.meta;
            const progresoAvance = statsRutaHoy.eficiencia



            setRutaActual({

              id: ruta.id,

              nombre: ruta.nombre,

              activa: ruta.activa,

              codigo: rExtra.codigo,

              cobrador: rExtra.cobrador?.nombres ? `${rExtra.cobrador.nombres} ${rExtra.cobrador.apellidos || ''}` : rExtra.cobrador || 'Desconocido',

              cobradorId: ruta.cobradorId,

              nivelRiesgo: rExtra.nivelRiesgo || 'VERDE',

              estadisticas: {
                ...(rExtra.estadisticas || {}),

                cobranzaDelDia: recaudoDia,

                metaDelDia: metaDia,

                pendienteDelDia: statsRutaHoy.pendiente,

                avanceDiario: progresoAvance > 100 ? 100 : progresoAvance,

              }

            });



            const finalesFiltradas = finales.filter(v => {
              if (searchQuery || showMisClientes || showHistory) return true;
              return isVisitaExigibleHoy(v, hoyBogota);
            });

            setVisitasCobrador(ordenarVisitasRutaActual(finalesFiltradas));
            setClientes(finalesFiltradas.map((v: any) => ({

                id: v.id,

                nombre: v.cliente,

                direccion: v.direccion,

                telefono: v.telefono,

                cuota: v.montoCuota,

                saldoPendiente: v.saldoTotal,

                diasMora: 0,

                estadoVisita: 'PENDIENTE',

            })));

        }

    } catch (error) {

        console.error('Error cargando ruta', error);

    }

  }, [rutaId]);



  // Cargar datos al montar

  useEffect(() => {

    const inicializar = async () => {

      await cargarRuta();

      setIsLoading(false);

    };

    inicializar();

  }, [cargarRuta]);



  // Prefill historial keys for últimos 30 días (lazy fetch per día al expandir)

  useEffect(() => {

    if (!showHistory || !rutaActual?.nombre) return;

    if (historialRutas && Object.keys(historialRutas).length > 0) return;

    const hoy = new Date();

    const prefill: Record<string, HistorialDia> = {};

    for (let i = 0; i < 30; i++) {

        const d = new Date(hoy);

        d.setDate(hoy.getDate() - i);

      const yyyy = d.getFullYear();

      const mm = String(d.getMonth() + 1).padStart(2, '0');

      const dd = String(d.getDate()).padStart(2, '0');

      const key = `${yyyy}-${mm}-${dd}`;

      prefill[key] = {

          resumen: { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 },

          visitas: [],

          loaded: false

      };

    }

    setHistorialRutas(prefill);

  }, [showHistory, rutaActual?.nombre, rutaId]);



  const getLocalIsoKey = (date: Date | string) => {

    try {

      if (!date) return '';

      const d = typeof date === 'string' ? new Date(date) : date;

      if (isNaN(d.getTime())) return '';

      const yyyy = d.getFullYear();

      const mm = String(d.getMonth() + 1).padStart(2, '0');

      const dd = String(d.getDate()).padStart(2, '0');

      return `${yyyy}-${mm}-${dd}`;

    } catch (e) { return ''; }

  };



  const cargarHistorialFecha = useCallback(async (fechaClave: string) => {

    if (!rutaId || rutaId === 'Desconocida') return;

    try {

      const visitasResp = await rutasService.obtenerVisitasDelDia(rutaId, fechaClave);

      const saldo = await obtenerSaldoDisponibleRuta(rutaId, fechaClave);

      const pagosResp = await pagosService.obtenerPagos({ limit: 1000 });

      const pagosData = (pagosResp as any)?.pagos || pagosResp || [];



      const normalize = (s: string) => (s || '').toLowerCase().replace(/^ruta\s+/i, '').trim();

      const rutaNombreNorm = normalize(rutaActual?.nombre || '');



      const pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {

        const raw = p.fechaPago || p.creadoEn;

        if (!raw) return false;
        if (isPagoCierrePendiente(p)) return false;



        const key = getLocalIsoKey(raw);

        const cobradorMatch = rutaActual?.cobradorId ? (p.cobradorId === rutaActual.cobradorId) : true;

        const matchRuta = p.rutaId === rutaId ||

                          normalize(p.ruta) === rutaNombreNorm ||

                          (p.ruta && normalize(p.ruta).includes(rutaNombreNorm)) ||

                          (rutaNombreNorm && normalize(p.ruta).includes(rutaNombreNorm));



        return key === fechaClave && cobradorMatch && (matchRuta || !p.ruta); // Fallback if no route specified

      });



      const recaudadoPorCliente: Record<string, number> = {};

      for (const p of pagosDelDia) {

        const cid = p.clienteId || (p.cliente?.id);

        if (!cid) continue;

        recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + Number(p.montoTotal || 0);

      }



      const existentes = new Set();

      const visitas: VisitaRuta[] = ((visitasResp as any)?.visitas || []).map((item: any, index: number) => {

        const cliente = item.cliente || {};

        const prestamos = item.prestamos || [];

        const prestamoActivo = prestamos.find((p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA' || p.estado === 'PAGADO') || prestamos[0] || {};

        const proximaCuota = prestamoActivo?.proximaCuota || {};

        const saldoTotal = Number(prestamoActivo?.saldoPendiente || 0);



        const recDia = cliente.id ? (recaudadoPorCliente[cliente.id] || 0) : 0;

        const montoCuota = Number(proximaCuota?.monto || 0);



        if (cliente.id) existentes.add(cliente.id);



        let estado: EstadoVisita = 'pendiente';

        if (proximaCuota?.estado === 'PAGADA' || (recDia > 0 && recDia >= (montoCuota - 1)) || saldoTotal <= 0) {

            estado = 'pagado';

        } else if (proximaCuota?.estado === 'VENCIDA') {

            estado = 'en_mora';

        }



        return {

          id: item.asignacionId || `hist-${fechaClave}-${index}`,

          cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente Sin Nombre',

          direccion: cliente.direccion || 'Sin dirección registrada',

          telefono: cliente.telefono || '',

          horaSugerida: '08:00 AM',

          montoCuota,

          saldoTotal,

          estado,

          proximaVisita: proximaCuota?.fechaVencimiento || fechaClave,

          ordenVisita: item.ordenVisita || index + 1,

          prioridad: (cliente.nivelRiesgo === 'ROJO' ? 'alta' : 'media'),

          nivelRiesgo: (() => {

            const r = cliente.nivelRiesgo || 'VERDE';

            return mapNivelRiesgo(r);

          })(),

          cobradorId: '',

          periodoRuta: (() => {

            const f = prestamoActivo?.frecuenciaPago || 'DIARIO';

            if (f === 'DIARIO') return 'DIA';

            if (f === 'SEMANAL') return 'SEMANA';

            if (f === 'QUINCENAL') return 'QUINCENA';

            if (f === 'MENSUAL') return 'MES';

            return 'DIA';

          })() as any,

          clienteId: cliente.id,

          recaudadoDelDia: recDia,

          recaudadoTotalClient: recDia

        };

      });



      // Agregar gestiones fuera de ruta (Sintéticas)

      const sinteticos: VisitaRuta[] = (pagosDelDia || []).flatMap((p: any, i: number) => {

        const cid = p.clienteId || (p.cliente?.id);

        if (!cid || existentes.has(cid)) return [];

        const nombre = p.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : 'Cliente';

        return [{

            id: `pago-${p.id || i}-${fechaClave}`,

            cliente: nombre || 'Cliente fuera de ruta',

            direccion: p.cliente?.direccion || 'Sin dirección',

            telefono: p.cliente?.telefono || '',

            horaSugerida: '08:00 AM',

            montoCuota: 0,

            saldoTotal: 0,

            estado: 'pagado',

            proximaVisita: fechaClave,

            ordenVisita: visitas.length + i + 1,

            prioridad: 'media',

            cobradorId: '',

            periodoRuta: 'DIA',

            clienteId: cid,

            recaudadoDelDia: Number(p.montoTotal || 0),

            recaudadoTotalClient: Number(p.montoTotal || 0)

        }];

      });



      const todasVisitas = [...visitas, ...sinteticos];

      const esperado = todasVisitas.reduce((sum, v) => sum + (v.montoCuota || 0), 0);

      const recaudoDia = pagosDelDia.reduce((s: number, p: any) => s + Number(p.montoTotal || 0), 0);



      const resumen = {

        recaudo: recaudoDia,

        gastos: Number(saldo?.gastosDelDia ?? 0),

        efectividad: esperado > 0 ? Math.round((recaudoDia / esperado) * 100) : (recaudoDia > 0 ? 100 : 0),

        visitados: todasVisitas.filter(v => (v.recaudadoDelDia || 0) > 0 || v.estado === 'pagado').length,

        total: todasVisitas.length

      };



      setHistorialRutas((prev) => ({

        ...(prev || {}),

        [fechaClave]: { resumen, visitas: todasVisitas, loaded: true }

      }));

    } catch (e) {

      console.error("Error cargando historial de fecha:", e);

    }

  }, [rutaId, rutaActual?.nombre]);



  useEffect(() => {

    if (!showHistory || !rutaId) return;

    const hoy = getLocalIsoKey(new Date());

    const existing = (historialRutas || {})[hoy];

    if (!existing || (!existing.loaded)) {

      cargarHistorialFecha(hoy);

    }

  }, [showHistory, rutaId, historialRutas, cargarHistorialFecha]);



  const handleAbrirEstadoCuenta = useCallback((visita: VisitaRuta) => {

    setEstadoCuentaVisita(visita)

  }, [setEstadoCuentaVisita])



  // Agrupar visitas por frecuencia de pago

  const { visitasAgrupadas, totalMostradas } = useMemo(() => {

    let filtradas = visitasCobrador.filter(v =>

      (v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||

      v.direccion.toLowerCase().includes(searchQuery.toLowerCase()))

    );



    // FILTRO CRÍTICO: Si ya pagó, no debe aparecer en la lista de gestión pendiente

    filtradas = filtradas.filter(v => v.estado !== 'pagado');



    // Aplicar filtro de periodo

    if (periodoRutaFiltro !== 'TODOS') {

        filtradas = filtradas.filter(v => v.periodoRuta === periodoRutaFiltro);

    }



    const isTodayOrMora = (dateStr: string) => {
      if (!dateStr) return true;
      const f = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [year, month, day] = f.split('-').map(Number);
      if (!year || !month || !day) return true;
      const d = new Date(year, month - 1, day, 0, 0, 0, 0);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return d.getTime() <= hoy.getTime();
    };



    const filterByDate = (v: any) => searchQuery || isTodayOrMora(v.proximaVisita);



    const ordenadas = ordenarVisitasRutaActual(filtradas);

    const agrupar = {

      MES: ordenadas.filter(v => v.periodoRuta === 'MES' && filterByDate(v)),

      QUINCENA: ordenadas.filter(v => v.periodoRuta === 'QUINCENA' && filterByDate(v)),

      SEMANA: ordenadas.filter(v => v.periodoRuta === 'SEMANA' && filterByDate(v)),

      DIA: ordenadas.filter(v => v.periodoRuta === 'DIA' && filterByDate(v)),

    }



    return { visitasAgrupadas: agrupar, totalMostradas: filtradas.length };

  }, [visitasCobrador, searchQuery, periodoRutaFiltro]);



  const handleGuardarGasto = (e: React.FormEvent) => {

    e.preventDefault()

    const horaActual = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    logger.log('Guardando gasto:', { ...nuevoGasto, hora: horaActual })

    setIsGastoModalOpen(false)

    setNuevoGasto({ tipo: 'OPERATIVO', descripcion: '', valor: '' })

  }



  if (isLoading) {

    return <AnimacionCarga texto="Cargando detalle de ruta..." />

  }



  return (

    <div className="min-h-screen bg-slate-50 relative pb-20">

      <div className="fixed inset-0 pointer-events-none">

        <div className="absolute inset-0 bg-slate-50"></div>

      </div>



      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">

        <header className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

               <Link href="/coordinador/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">

                  <ArrowLeft className="h-5 w-5 text-slate-600" />

               </Link>

               <div>

                 <div className="flex items-center gap-3">

                    <h1 className="text-3xl font-bold tracking-tight">

                        <span className="text-blue-600">Ruta </span>

                        <span className="text-orange-500">{(rutaActual?.nombre || 'Diaria').replace(/^Ruta\s+/i, '')}</span>

                    </h1>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiesgoBadgeClasses(rutaActual?.nivelRiesgo || '')}`}>

                        {getRiesgoLabel(rutaActual?.nivelRiesgo || '')}

                    </span>

                 </div>

                 <p className="text-slate-500 font-medium text-sm">

                   {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} • {rutaActual?.codigo || rutaId} • {rutaActual?.cobrador || 'Sin Cobrador'}

                 </p>

              </div>

            </div>

          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">

               <div className="flex justify-between items-end mb-4">

                <div>

                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recaudado Hoy</p>

                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(rutaActual?.estadisticas?.cobranzaDelDia || 0)}</div>

                  <p className="text-xs text-slate-400 mt-1">Meta: {formatCurrency(rutaActual?.estadisticas?.metaDelDia || 0)}</p>

                </div>

              </div>

              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">

                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${rutaActual?.estadisticas?.avanceDiario || 0}%` }} />

              </div>

            </div>

          </div>

        </header>



        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">

              <div className="flex flex-col md:flex-row gap-4">

                <div className="flex-1 buscador-3d">

                  <Search className="icon h-4 w-4" />

                  <input

                    type="text"

                    placeholder="Buscar cliente, dirección..."

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                    className="buscador-3d-input"

                  />

                </div>

              </div>



              {/* Filtros de Periodo (Estilo Admin/Cobrador) */}

              {!showHistory && !showMisClientes && (

                <div className="mt-4 pt-4 border-t border-slate-200">

                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>

                    <div className="flex gap-2 overflow-x-auto pb-1">

                      {(

                        [

                          { key: 'TODOS' as const, label: 'Todo' },

                          { key: 'DIA' as const, label: 'Día' },

                          { key: 'SEMANA' as const, label: 'Semanal' },

                          { key: 'QUINCENA' as const, label: 'Quincenal' },

                          { key: 'MES' as const, label: 'Mensual' },

                        ]

                      ).map((item) => (

                        <button

                          key={item.key}

                          onClick={() => setPeriodoRutaFiltro(item.key)}

                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${

                            periodoRutaFiltro === item.key

                              ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'

                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                          }`}

                        >

                          {item.label}

                        </button>

                      ))}

                    </div>

                  </div>

                </div>

              )}

        </div>



        <div className="flex gap-2">

            <button

              onClick={() => { setShowClienteSelector(true); }}

              className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-95"

            >

              <FileTextIcon className="h-4 w-4 text-slate-400" />

              Ver Estado de Cuenta

            </button>

            <button

              onClick={() => {

                setSelectedClienteForCredito(null)

                setShowNuevoCreditoModal(true)

              }}

              className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-95"

            >

              <Plus className="h-4 w-4 text-slate-400" />

              Nuevo Crédito

            </button>

            <button

              onClick={() => {

                setShowHistory(!showHistory)

                setShowMisClientes(false)

              }}

              className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${

                showHistory ? 'bg-slate-900 text-white shadow-slate-900/20' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'

              }`}

            >

              <History className="h-4 w-4" />

              Historial

            </button>



            <button

              onClick={() => {

                setShowHistory(false)

                setShowMisClientes(false)

              }}

              className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${

                !showHistory && !showMisClientes ? 'bg-slate-900 text-white shadow-slate-900/20' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'

              }`}

            >

              <MapPin className="h-4 w-4" />

              Mi Ruta

            </button>



            <button

              onClick={() => {

                setShowMisClientes(true)

                setShowHistory(false)

              }}

              className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${

                showMisClientes ? 'bg-slate-900 text-white shadow-slate-900/20' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'

              }`}

            >

              <User className="h-4 w-4" />

              Mis clientes

            </button>

        </div>



        {showHistory ? (

           <div className="space-y-4 animate-in fade-in">

              <div className="flex items-center justify-between px-1">

                <h3 className="font-bold text-slate-900 text-lg">Historial de Rutas</h3>

                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Últimos 30 días</div>

              </div>



              {historyDates.length > 0 ? (

                 <div className="space-y-3">

                    {historyDates.map(date => {

                       const data = historialRutas![date];

                       const isExpanded = selectedHistoryDate === date;

                       const [y, m, d] = date.split('-');

                       const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));

                       const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });



                       const jornadaEtiqueta = (data.resumen as any).jornadaEtiqueta;
                       const jornadaEtiquetaColor = (data.resumen as any).jornadaEtiquetaColor || 'bg-slate-100 text-slate-700 border-slate-200';



                       return (

                         <div key={date}

                              className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200

                                ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}

                              `}

                         >

                           {/* Header (Clickable) */}

                           <div

                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"

                             onClick={async () => {

                               if (!isExpanded && (!data.visitas || data.visitas.length === 0)) {

                                 await cargarHistorialFecha(date);

                               }

                               setSelectedHistoryDate(isExpanded ? null : date);

                             }}

                           >

                             <div className="flex items-center gap-3">

                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm

                                    ${isExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}

                                `}>

                                   {d}

                                </div>



                                <div>

                                   <div className="font-bold text-slate-900 capitalize flex items-center gap-2">

                                      {dayName}

                                      {jornadaEtiqueta && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${jornadaEtiquetaColor}`}>{jornadaEtiqueta}</span>}

                                   </div>

                                   <div className="text-xs text-slate-500">

                                      Recaudo: <b>${formatMilesCOP(data.resumen.recaudo)}</b>

                                   </div>

                                </div>

                             </div>

                             <div className="flex items-center gap-3">

                                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${data.resumen.efectividad >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>

                                  {data.resumen.efectividad}%

                                </div>

                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />

                             </div>

                           </div>



                           {/* Body (Expanded) */}

                           {isExpanded && (

                              <div className="border-t border-slate-100 bg-white p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">

                                 {/* Mini Resumen */}

                                 <div className="grid grid-cols-3 gap-2">

                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">

                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Recaudo</div>

                                        <div className="text-xs font-black text-slate-700">${formatMilesCOP(data.resumen.recaudo)}</div>

                                    </div>

                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">

                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Gastos</div>

                                        <div className="text-xs font-black text-rose-600">${formatMilesCOP(data.resumen.gastos)}</div>

                                    </div>

                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">

                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Visitados</div>

                                        <div className="text-xs font-black text-blue-600">{data.resumen.visitados}/{data.resumen.total}</div>

                                    </div>

                                 </div>



                                 <div className="space-y-3">

                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1">

                                       <span>Clientes Gestionados hoy</span>

                                       <span>Estado</span>

                                    </div>

                                    {!data.loaded ? (

                                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">

                                        <Loader2 className="w-6 h-6 animate-spin mb-2 opacity-20" />

                                        <span className="text-xs font-medium">Cargando detalles...</span>

                                      </div>

                                    ) : data.visitas.length === 0 ? (

                                      <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">

                                         <History className="w-8 h-8 text-slate-300 mb-2 opacity-30" />

                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">No se registraron visitas ni pagos programados para este día</span>

                                      </div>

                                    ) : (

                                      data.visitas.map((v: any) => (

                                        <StaticVisitaItem

                                            key={v.id}

                                            visita={v}

                                            allowClick={false}

                                            onVerCliente={handleAbrirClienteInfo}

                                            getEstadoClasses={getEstadoClasses}

                                            getPrioridadColor={getPrioridadColor}

                                        />

                                      ))

                                    )}

                                 </div>

                              </div>

                           )}

                         </div>

                       )

                    })}

                 </div>

              ) : (

                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">

                    <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />

                    <p className="font-bold text-slate-400">No hay información de historial disponible.</p>

                </div>

              )}

           </div>

        ) : (



         <div>

              <div className="flex flex-col gap-4 mb-4">

                <div className="flex items-center justify-between">

                  <h3 className="font-bold text-slate-900 text-lg">Visitas del Día</h3>

                </div>



                 <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">

                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-500/20 text-emerald-700">

                        <div className="w-2h-2 rounded-full bg-emerald-500"></div>

                        <span>Mínimo</span>

                    </div>

                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-500/20 text-blue-700">

                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>

                        <span>Leve</span>

                    </div>

                    <div className="flex items-center gap-2 px-2 py-1 bg-yellow-50 rounded-lg border border-yellow-500/20 text-yellow-700">

                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>

                        <span>Precaución</span>

                    </div>

                    <div className="flex items-center gap-2 px-2 py-1 bg-orange-50 rounded-lg border border-orange-500/20 text-orange-700">

                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>

                        <span>Moderado</span>

                    </div>

                    <div className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-lg border border-red-500/20 text-red-700">

                        <div className="w-2 h-2 rounded-full bg-red-500"></div>

                        <span>Crítico</span>

                    </div>

                 </div>

              </div>



              <div className="space-y-10">

                {Object.entries({

                    MES: 'Mensual',

                    QUINCENA: 'Quincenal',

                    SEMANA: 'Semanal',

                    DIA: 'Diario'

                }).map(([key, label]) => {

                    const visitas = visitasAgrupadas[key as keyof typeof visitasAgrupadas];

                    if (visitas.length === 0) return null;

                    const estaColapsado = !!gruposColapsados[key];



                    return (

                        <div key={key} className="space-y-4">

                            <button

                              type="button"

                              onClick={() => toggleGrupo(key)}

                              className="w-full flex items-center gap-4 group"

                            >

                                <div className="h-px flex-1 bg-slate-200"></div>

                                <span className="flex items-center gap-2 text-[11px] font-black text-[#08557f] uppercase tracking-[0.25em] bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm whitespace-nowrap select-none group-hover:bg-blue-100/60 transition-colors">

                                    {label}

                                    <span className="ml-1 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full">{visitas.length}</span>

                                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${estaColapsado ? '' : 'rotate-180'}`} />

                                </span>

                                <div className="h-px flex-1 bg-slate-200"></div>

                            </button>



                            {!estaColapsado && (

                              <div className="space-y-4">

                                  {visitas.map((visita) => (

                                                                            <StaticVisitaItem

                                          key={visita.id}

                                          visita={visita}

                                          allowClick={false}

                                          onVerCliente={handleAbrirClienteInfo}

                                          getEstadoClasses={getEstadoClasses}

                                          getPrioridadColor={getPrioridadColor}

                                          actions={

                                            <button

                                                onClick={(e) => { e.stopPropagation(); handleAbrirEstadoCuenta(visita); }}

                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-[#08557f] border border-[#08557f]/20 hover:bg-blue-50 transition-all shadow-sm active:scale-95 font-bold text-[11px]"

                                            >

                                                <FileTextIcon className="h-3.5 w-3.5" />

                                                Estado

                                            </button>

                                          }

                                      />

                                  ))}

                              </div>

                            )}

                        </div>

                    )

                })}



                {totalMostradas === 0 && (

                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400">

                        <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />

                        <p className="font-medium">No se encontraron visitas para mostrar en este modo</p>

                    </div>

                )}

              </div>

         </div>

        )}

      </div>



      {isGastoModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsGastoModalOpen(false)}>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">

              <h3 className="font-bold text-lg text-slate-900">

                <span className="text-blue-600">Registrar</span> <span className="text-orange-500">Gasto</span>

              </h3>

              <button onClick={() => setIsGastoModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">

                <XCircle className="h-6 w-6" />

              </button>

            </div>



            <form onSubmit={handleGuardarGasto} className="p-6 space-y-4">

              <div className="space-y-2">

                <label className="text-sm font-bold text-slate-700">Tipo de Gasto</label>

                <select

                  required

                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"

                  value={nuevoGasto.tipo}

                  onChange={e => setNuevoGasto({...nuevoGasto, tipo: e.target.value})}

                >

                  <option value="OPERATIVO">OPERATIVO</option>

                  <option value="TRANSPORTE">TRANSPORTE</option>

                  <option value="OTRO">OTRO</option>

                </select>

              </div>



              <div className="space-y-2">

                <label className="text-sm font-bold text-slate-700">Descripción</label>

                <textarea

                  required

                  rows={2}

                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"

                  placeholder="Detalles del gasto..."

                  value={nuevoGasto.descripcion}

                  onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})}

                />

              </div>



              <div className="space-y-2">

                <label className="text-sm font-bold text-slate-700">Valor</label>

                <div className="relative">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>

                  <input

                    type="text"

                    inputMode="numeric"

                    required

                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"

                    placeholder="0"

                    value={nuevoGasto.valor}

                    onChange={e => setNuevoGasto({ ...nuevoGasto, valor: formatCOPInputValue(e.target.value) })}

                  />

                </div>

              </div>



              <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3 border border-blue-100">

                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 mt-0.5">

                  <Banknote className="h-4 w-4" />

                </div>

                <div className="text-xs text-blue-800">

                  <p className="font-bold mb-0.5">Nota Importante</p>

                  <p>Este gasto quedará en estado <strong>Pendiente de Aprobación</strong> hasta que el supervisor lo valide.</p>

                </div>

              </div>



              <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">

                <button type="button" onClick={() => setIsGastoModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">

                  Cancelar

                </button>

                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">

                  <Save className="h-4 w-4" />

                  <span>Guardar</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {estadoCuentaVisita && (

        <EstadoCuentaModal visita={estadoCuentaVisita} onClose={() => setEstadoCuentaVisita(null)} />

      )}



      {pagoVisita && (

        <PagoModal

          visita={pagoVisita.visita}

          tipo={pagoVisita.tipo}

          onClose={() => setPagoVisita(null)}

          onConfirm={(monto, metodo) => {

            setPagoVisita(null)

          }}

        />

      )}



      {visitaReprogramar && (

        <ReprogramarModal

            visita={visitaReprogramar}

            onClose={() => setVisitaReprogramar(null)}

            onConfirm={async (fecha, motivo, cuotaId) => {

                const cuotaIdFinal = String(
                  cuotaId || 
                  (visitaReprogramar as any)?.cuotaId || 
                  (visitaReprogramar as any)?.cuotaObjetivoId || 
                  (visitaReprogramar as any)?.cuotaObjetivo?.id || 
                  (visitaReprogramar as any)?.proximaCuota?.id || 
                  ''
                ).trim();

                console.log('[REPROGRAMACION DEBUG]', {
                  prestamoId: visitaReprogramar.prestamoId,
                  clienteId: visitaReprogramar.clienteId,
                  cuotaId,
                  cuotaIdFinal,
                  fecha,
                  motivo,
                })

                try {

                  if (!visitaReprogramar?.prestamoId) {

                    showNotification('error', 'Falta el ID del préstamo para reprogramar', 'Error');

                    return;

                  }

                  if (!cuotaIdFinal) {
                    showNotification('error', 'No se pudo identificar la cuota a reprogramar.', 'Error');
                    return;
                  }

                  await prestamosService.solicitarReprogramacionCuota({
                    prestamoId: visitaReprogramar.prestamoId,
                    cuotaId: cuotaIdFinal,
                    nuevaFecha: fecha,
                    motivo,
                  });



                  showNotification('success', 'Solicitud de reprogramación enviada correctamente', 'Éxito');

                  setVisitaReprogramar(null);

                  try {
                    await cargarRuta();
                    if (showMisClientes) {
                      await cargarMisCreditos();
                    }
                  } catch {}

                } catch (e: any) {
                  const message =
                    e?.response?.data?.message ??
                    e?.data?.message ??
                    e?.message ??
                    'Error al solicitar reprogramación.'

                  console.error('Error reprogramando cuota (coordinador):', {
                    message,
                    error: e,
                    response: e?.response,
                    data: e?.response?.data || e?.data,
                  })

                  showNotification('error', Array.isArray(message) ? message[0] : message, 'Error')
                }

            }}

        />

      )}



      {showClienteSelector && (

        <SeleccionClienteModal

          visitas={visitasCobrador}

          onSelect={(visita) => {

            setShowClienteSelector(false)

            handleAbrirEstadoCuenta(visita)

          }}

          onClose={() => setShowClienteSelector(false)}

        />

      )}



      {clienteDetalle && (

        <ClienteDetalleModal

          visita={clienteDetalle}

          onClose={() => setClienteDetalle(null)}

        />

      )}



      {showNuevoCreditoModal && (

        <CrearCreditoModal

          isOpen={showNuevoCreditoModal}

          defaultClienteId={selectedClienteForCredito?.clienteId || undefined}

          onClose={() => {

            setShowNuevoCreditoModal(false);

            setSelectedClienteForCredito(null);

          }}

          onConfirm={async (data: any) => {

            try {

              const esContado = Boolean((data as any).ventaContado);

              const payload: any = {

                clienteId: data.clienteCreditoId,

                tipoPrestamo: data.creditType === 'prestamo' ? 'EFECTIVO' : 'ARTICULO',

                monto: data.monto || 0,

                tasaInteres: esContado ? 0 : (data.tasaInteres || 0),

                tasaInteresMora: 2.0,

                plazoMeses: data.plazoMeses || 1,

                cantidadCuotas: data.cantidadCuotas || data.cuotas || data.cuotasTotales || 0,

                cuotas: data.cuotas || data.cantidadCuotas || data.cuotasTotales || 0,

                frecuenciaPago: esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO'),

                fechaInicio: data.fechaInicio || toBogotaDateTimeOffsetIso(new Date()),
                fechaPrimerCobro: esContado ? undefined : data.fechaPrimerCobro,

                creadoPorId: currentUser?.id,

                cuotaInicial: data.cuotaInicialArticulo || 0,

                notas: data.creditType === 'articulo'

                  ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}: ${data.articuloNombre || ''}`

                  : (data.notas || ''),

                tipoAmortizacion: data.tipoInteres || 'INTERES_SIMPLE',

                esContado: esContado

              };



              if (data.creditType === 'articulo') {

                payload.productoId = data.articuloId;

                payload.precioProductoId = esContado ? undefined : data.precioProductoId;

              }



              const prestamo = await prestamosService.crearPrestamo(payload);



              if (data.creditType === 'articulo' && prestamo?.id && !esContado) {

                try {

                  await exportService.exportContrato(prestamo.id);

                } catch (err) {

                  console.error('Error generando contrato:', err);

                }

              }



              // Asignar cliente a la ruta automáticamente
              const clienteIdFinal = String(
                prestamo?.clienteId ||
                  prestamo?.cliente?.id ||
                  prestamo?.cliente?.clienteId ||
                  data?.clienteId ||
                  data?.clienteCreditoId ||
                  data?.cliente?.id ||
                  '',
              ).trim()

              const cobradorResponsableId = String(rutaActual?.cobradorId || '').trim()

              if (rutaActual?.id && cobradorResponsableId && clienteIdFinal) {
                if (!isUuid(rutaActual.id)) {
                  console.warn('[Crear crédito coordinador] rutaId inválido para asignación:', {
                    rutaId: rutaActual.id,
                  })
                } else if (!isUuid(clienteIdFinal)) {
                  console.warn('[Crear crédito coordinador] clienteId inválido para asignación:', {
                    clienteIdFinal,
                    dataClienteCreditoId: data?.clienteCreditoId,
                    dataClienteId: data?.clienteId,
                    prestamoClienteId: prestamo?.clienteId,
                    prestamo,
                  })
                } else if (!isUuid(cobradorResponsableId)) {
                  console.warn('[Crear crédito coordinador] cobradorId inválido para asignación:', {
                    cobradorResponsableId,
                    rutaActual,
                  })
                } else {
                  try {
                    await rutasService.asignarCliente(
                      rutaActual.id,
                      clienteIdFinal,
                      cobradorResponsableId,
                    );
                  } catch (assignError) {
                    console.error('Error al asignar cliente a la ruta:', assignError);
                  }
                }
              }



              showNotification('success', 'Crédito creado (Pendiente de Aprobación) y cliente vinculado a la ruta', 'Operación completada');

              try {

                await cargarRuta();

              } catch {}

              setShowNuevoCreditoModal(false);

              setSelectedClienteForCredito(null);

            } catch (error) {

              console.error('Error al crear crédito:', error);

              showNotification('error', 'No se pudo crear el crédito', 'Error');

            }

          }}

        />

      )}

    </div>

  )

}



/**

 * Formatea una fecha UTC para evitar saltos de día por zona horaria

 */

function formatDateUTC(dateStr: string) {

  if (!dateStr) return '---'

  const key = normalizeDateKey(dateStr)
  if (!key) return String(dateStr)

  const date = new Date(`${key}T12:00:00-05:00`)
  if (isNaN(date.getTime())) return key

  const day = date.getDate()

  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

  const month = monthNames[date.getMonth()]

  const year = date.getFullYear()

  return `${day} de ${month} de ${year}`

}



function ClienteDetalleModal({ visita, onClose }: { visita: VisitaRuta; onClose: () => void }) {

  const [loading, setLoading] = useState(true)

  const [clienteCompleto, setClienteCompleto] = useState<any>(null)



  useEffect(() => {

    async function loadInfo() {

      try {

        setLoading(true)

        if (visita.clienteId) {

          const res: any = await clientesService.obtenerPorId(visita.clienteId)

          // Calcular score dinámico igual que getAllClients en el backend

          let score = res.puntaje || 100

          const prestamosEnMora = (res.prestamos || []).filter((p: any) => p.estado === 'EN_MORA')

          const prestamosActivos = (res.prestamos || []).filter((p: any) => p.estado === 'ACTIVO')

          if (prestamosEnMora.length > 0) {

            score -= 20

          } else if (prestamosActivos.length > 0) {

            score += 5

          }

          // Ajuste por último pago

          const pagos = res.pagos || []

          if (pagos.length > 0) {

            const diasDesdeUltimoPago = Math.floor(

              (Date.now() - new Date(pagos[0].fechaPago).getTime()) / (1000 * 60 * 60 * 24)

            )

            if (diasDesdeUltimoPago > 30) score -= 10

            else if (diasDesdeUltimoPago <= 7) score += 5

          }

          score = Math.max(0, Math.min(100, score))

          setClienteCompleto({ ...res, score })

        }

      } catch (e) {

        console.error("Error al cargar detalle del cliente", e)

      } finally {

        setLoading(false)

      }

    }

    loadInfo()

  }, [visita.clienteId])



  const r = visita.nivelRiesgo;

  const riesgoColor =

    r === 'minimo' ? 'text-emerald-600 bg-emerald-50' :

    r === 'leve' ? 'text-blue-600 bg-blue-50' :

    r === 'moderado' ? 'text-orange-600 bg-orange-50' :

    r === 'critico' ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50';



  const riesgoLabel =

    r === 'minimo' ? 'Peligro Mínimo' :

    r === 'leve' ? 'Leve Retraso' :

    r === 'moderado' ? 'Riesgo Moderado' :

    r === 'critico' ? 'Alto Riesgo' : 'Riesgo Desconocido';



  // Contar préstamos activos (no pagados ni cancelados)

  const prestamosActivosCount = useMemo(() => {

    if (!clienteCompleto?.prestamos) return 0;

    return clienteCompleto.prestamos.filter((p: any) =>

      p.estado !== 'PAGADO' && p.estado !== 'CANCELADO' && p.estado !== 'RECHAZADO'

    ).length;

  }, [clienteCompleto]);



  return (

    <div

      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"

      onClick={onClose}

    >

      <div

        className="bg-white sm:rounded-[2.5rem] rounded-t-3xl shadow-2xl w-full sm:max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[92vh]"

        onClick={(e) => e.stopPropagation()}

      >

        {/* Handle visual para móvil */}

        <div className="flex justify-center pt-3 pb-1 sm:hidden">

          <div className="w-10 h-1 rounded-full bg-slate-200" />

        </div>



        {/* Header */}

        <div className="px-5 sm:px-8 pt-4 sm:pt-8 pb-3 sm:pb-4 flex justify-between items-center shrink-0">

          <div>

            <h3 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight">Expediente</h3>

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Detalle Administrativo</p>

          </div>

          <button

            onClick={onClose}

            className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"

          >

            <XCircle className="h-6 w-6" />

          </button>

        </div>



        {/* Contenido scrollable */}

        <div className="px-5 sm:px-8 pb-6 sm:pb-8 space-y-5 overflow-y-auto flex-1">

          {loading ? (

            <div className="py-16 flex flex-col items-center justify-center gap-4">

              <Loader2 className="w-10 h-10 text-[#08557f] animate-spin" />

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</p>

            </div>

          ) : (

            <>

              {/* Perfil Header */}

              <div className="text-center space-y-2">

                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center text-slate-200 border border-slate-100">

                  <User className="w-8 h-8 sm:w-10 sm:h-10" />

                </div>

                <div>

                  <h4 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">{visita.cliente}</h4>

                  <div className="flex justify-center gap-2 mt-1">

                    <span className={`${riesgoColor} text-[9px] font-black px-3 py-1 rounded-full uppercase border border-current/10`}>

                      {riesgoLabel}

                    </span>

                  </div>

                </div>

              </div>



              {/* Grid de datos — 1 col en muy pequeño, 2 en sm */}

              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">

                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100">

                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">

                    <Fingerprint className="w-3 h-3" />

                    <span className="text-[9px] font-black uppercase">Cédula / DNI</span>

                  </div>

                  <p className="text-sm font-black text-slate-900">{clienteCompleto?.dni || '---'}</p>

                </div>



                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100">

                  <div className="flex items-center gap-1.5 mb-2 text-slate-400">

                    <Star className="w-3 h-3" />

                    <span className="text-[9px] font-black uppercase">Score Crediticio</span>

                  </div>

                  <div className="flex items-center justify-between mb-1">

                    <span className={`text-xl font-black ${

                      ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 80 ? 'text-emerald-600' :

                      ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 60 ? 'text-amber-500' :

                      ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 40 ? 'text-amber-600' :

                      'text-rose-600'

                    }`}>

                      {clienteCompleto?.score ?? clienteCompleto?.puntaje ?? '—'}

                      <span className="text-xs font-bold text-slate-400">/100</span>

                    </span>

                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${

                      ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :

                      ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200' :

                      ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' :

                      'text-rose-700 bg-rose-50 border-rose-200'

                    }`}>

                      {((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 80 ? 'Bueno' :

                       ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 60 ? 'Regular' :

                       ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 40 ? 'Precaución' : 'Bajo'}

                    </span>

                  </div>

                  <div className="relative pt-1">

                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">

                      <div

                        className={`h-full rounded-full transition-all duration-300 ${

                          ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 80 ? 'bg-emerald-500' :

                          ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 60 ? 'bg-amber-500' :

                          ((clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0) >= 40 ? 'bg-amber-600' :

                          'bg-rose-500'

                        }`}

                        style={{ width: `${Math.min(100, (clienteCompleto?.score ?? clienteCompleto?.puntaje) || 0)}%` }}

                      />

                    </div>

                    <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-bold">

                      <span>0</span><span>50</span><span>100</span>

                    </div>

                  </div>

                </div>



                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100">

                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">

                    <CalendarDays className="w-3 h-3" />

                    <span className="text-[9px] font-black uppercase">Miembro Desde</span>

                  </div>

                  <p className="text-sm font-black text-slate-900 uppercase">

                    {clienteCompleto?.creadoEn ? formatDateUTC(clienteCompleto.creadoEn) : '---'}

                  </p>

                </div>



                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100">

                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">

                    <History className="w-3 h-3" />

                    <span className="text-[9px] font-black uppercase">Préstamos</span>

                  </div>

                  <p className="text-sm font-black text-[#08557f]">{prestamosActivosCount} Activos</p>

                </div>

              </div>



              {/* Contacto y Ubicación */}

              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-blue-50 border border-blue-100">

                <h5 className="text-[10px] font-black text-[#08557f] uppercase tracking-widest mb-3">Referencias / Contacto</h5>

                <div className="space-y-3">

                  <div className="flex items-center gap-3">

                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#08557f] shadow-sm shrink-0">

                      <Phone className="w-4 h-4" />

                    </div>

                    <div>

                      <p className="text-[9px] font-bold text-blue-400 uppercase">WhatsApp / Tel</p>

                      <a

                        href={`tel:${clienteCompleto?.telefono || visita.telefono}`}

                        className="text-sm font-black text-slate-900 hover:text-[#08557f] transition-colors"

                        onClick={(e) => e.stopPropagation()}

                      >

                        {clienteCompleto?.telefono || visita.telefono}

                      </a>

                    </div>

                  </div>

                  <div className="flex items-start gap-3">

                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#08557f] shadow-sm shrink-0">

                      <MapPin className="w-4 h-4" />

                    </div>

                    <div className="min-w-0">

                      <p className="text-[9px] font-bold text-blue-400 uppercase">Referencia de Ubicación</p>

                      <p className="text-xs font-bold text-slate-700 leading-tight break-words">

                        {clienteCompleto?.referencia || visita.direccion || 'Sin referencias adicionales.'}

                      </p>

                    </div>

                  </div>

                </div>

              </div>



              {/* Fotografías del cliente (si existen) */}

              {(clienteCompleto?.archivos || []).filter((a: any) => {

                const url = String(a.url || a.path || a.ruta || '')

                return /(jpg|jpeg|png|gif|webp)$/i.test(url) || String(a.tipoArchivo || '').startsWith('image/')

              }).length > 0 && (

                <div className="space-y-2">

                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotografías</p>

                  <div className="grid grid-cols-2 gap-2">

                    {(clienteCompleto.archivos as any[]).filter((a) => {

                      const url = String(a.url || a.path || a.ruta || '')

                      return /(jpg|jpeg|png|gif|webp)$/i.test(url) || String(a.tipoArchivo || '').startsWith('image/')

                    }).map((archivo: any, idx: number) => {

                      const rawUrl = archivo.url || archivo.path || archivo.ruta || ''

                      const fullUrl = rawUrl.startsWith('http') ? rawUrl

                        : `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${rawUrl}`

                      const label = archivo.tipoContenido === 'CEDULA_FRONTAL' ? 'Cédula — frente'

                        : archivo.tipoContenido === 'CEDULA_REVERSO' ? 'Cédula — reverso'

                        : archivo.tipoContenido === 'FOTO_VIVIENDA' ? 'Foto vivienda'

                        : archivo.tipoContenido === 'FOTO_PERFIL' ? 'Foto perfil'

                        : archivo.nombreOriginal || 'Foto'

                      return (

                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">

                          <div className="px-2 py-1 text-[9px] font-bold text-slate-500 border-b border-slate-200 truncate">{label}</div>

                          <img src={fullUrl} alt={label} className="w-full h-28 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />

                        </div>

                      )

                    })}

                  </div>

                </div>

              )}



              <button

                onClick={onClose}

                className="w-full rounded-2xl bg-[#08557f] py-4 text-sm font-black text-white hover:bg-[#063a58] shadow-xl shadow-[#08557f]/20 transition-all uppercase tracking-widest active:scale-[0.98]"

              >

                Cerrar Expediente

              </button>

            </>

          )}

        </div>

      </div>

    </div>

  )

}



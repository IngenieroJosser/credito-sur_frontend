'use client'

import { logger } from '@/lib/logger'



import { useState, useCallback, useMemo, useEffect } from 'react'

import {

  CheckCircle2,

  X,

  XCircle,

  Search,

  Filter,

  Wallet,

  DollarSign,

  Calendar,

  FileText as FileTextIcon,

  ArrowLeft as ArrowLeftIcon,

  ChevronRight,

  TrendingUp,

  Sparkles,

  MapPin,

  AlertCircle,

  UserPlus,

  Plus,

  User,

  Phone,

  CreditCard,

  Fingerprint,

  CalendarDays,

  Star,

  History,

  Loader2,

  ChevronDown,

  FileDown

} from 'lucide-react'



import { formatCurrency } from '@/lib/utils'

import Link from 'next/link'

import { useRouter } from 'next/navigation'

import { RutaDetalleMock } from '@/lib/rutas-data'

import { routesService } from '@/services/routes-service'

import { rutasService } from '@/services/rutas-service'

import { clientesService } from '@/services/clientes-service'

import { useNotification } from '@/components/providers/NotificationProvider'



import PagoModal from '@/components/cobranza/PagoModal'

import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'

import ReprogramarModal from '@/components/cobranza/ReprogramarModal'

import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'

import { StaticVisitaItem, SeleccionClienteModal, Portal } from '@/components/dashboards/shared/CobradorElements'

import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'

import { useAuth } from '@/hooks/useAuth'

import ConfirmModal from '@/components/ui/ConfirmModal'

import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'

import { creditosService } from '@/services/creditos-service'

import { prestamosService } from '@/services/prestamos-service'

import { pagosService } from '@/services/pagos-service'

import { FrecuenciaPago } from '@/types/enums'

import { obtenerSaldoDisponibleRuta } from '@/services/contabilidad-service'

import { HistorialDia } from '@/lib/types/cobranza'

import { exportService } from '@/services/export-service'

import { toast } from 'sonner'

import { useRealtimeData } from '@/hooks/useRealtimeData'



interface GastoRuta {

  id: string

  tipo: 'OPERATIVO' | 'TRANSPORTE' | 'OTRO'

  descripcion: string

  valor: number

  hora: string

}



interface RutaClientProps {

  initialRuta: RutaDetalleMock | null;

  rutaId?: string;

}



type RutaClientLoadedProps = {

  initialRuta: RutaDetalleMock;

  rutaData: RutaDetalleMock;

  rutaId?: string;

  rutaCompletada: boolean;

  setRutaCompletada: React.Dispatch<React.SetStateAction<boolean>>;

  currentUser: any;

  onRutaRefresh?: () => Promise<void> | void;

};



const RutaClientLoaded = ({

  initialRuta,

  rutaData,

  rutaId,

  rutaCompletada,

  setRutaCompletada,

  currentUser,

  onRutaRefresh,

}: RutaClientLoadedProps) => {

  const { showNotification } = useNotification()

  const router = useRouter()



  // No mocks. Use backend data or empty state managed by modals.

  const [gastos] = useState<GastoRuta[]>([])



  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)

  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })

  // const [searchQuery, setSearchQuery] ... used in render

  const [searchQuery, setSearchQuery] = useState('')

  const [showFilters, setShowFilters] = useState(false) // Used in render toggle

  // rutaCompletada is owned by the parent wrapper (RutaClient) to keep hook order stable

  const [showClienteSelector, setShowClienteSelector] = useState(false)

  const [showNewClientModal, setShowNewClientModal] = useState(false)

  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false)

  const [selectedClienteForCredito, setSelectedClienteForCredito] = useState<VisitaRuta | null>(null)

  const [defaultClienteId, setDefaultClienteId] = useState<string | null>(null)

  const [showCrearCreditoPrompt, setShowCrearCreditoPrompt] = useState(false)

  const [isExportingPdf, setIsExportingPdf] = useState(false)



  // Estados para filtros y historial (Portados de VistaCobrador)

  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'>('TODOS')

  const [showHistory, setShowHistory] = useState(false)

  const [showMisClientes, setShowMisClientes] = useState(false)

  const [historialRutas, setHistorialRutas] = useState<any>(null)

  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')

  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)

  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null)

  const [historyFrecuenciaFiltro, setHistoryFrecuenciaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'>('TODOS')



  // Grupos colapsables en la vista principal de la ruta (por defecto todos abiertos)

  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})

  const toggleGrupo = (key: string) =>

    setGruposColapsados(prev => ({ ...prev, [key]: !prev[key] }))



  const historyDates = useMemo(() => {

    if (!historialRutas) return [];

    return Object.keys(historialRutas).sort((a, b) => b.localeCompare(a));

  }, [historialRutas]);



  // Prefill historial keys for últimos 30 días (lazy fetch per día al expandir)

  useEffect(() => {

    if (!showHistory || !rutaData?.id) return;

    if (historialRutas && Object.keys(historialRutas).length > 0) return;

    const hoy = new Date();

    const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const prefill: Record<string, HistorialDia> = {};

    for (let i = 0; i < 30; i++) {

        const d = new Date(hoy);

        d.setDate(hoy.getDate() - i);

        prefill[toKey(d)] = {

            resumen: { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 },

            visitas: [],

            loaded: false

        };

    }

    setHistorialRutas(prefill);



    const cargarResumenRecaudos = async () => {

      try {

        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 });

        const pagosData = (pagosResp as any)?.pagos || pagosResp || [];

        setHistorialRutas((prev: any) => {

          if (!prev) return prev;

          const next = { ...prev };

          const keys = Object.keys(next);

          for (const k of keys) {

            if (!next[k].loaded) {

              next[k].resumen.recaudo = 0;

              next[k].resumen.visitados = 0;

            }

          }

           for (const p of pagosData) {

            const raw = p.fechaPago || p.creadoEn;

            if (!raw) continue;

            const dStr = typeof raw === 'string' ? raw.split('T')[0] : new Date(raw).toISOString().split('T')[0];

            const pk = dStr;

            const cobradorMatch = initialRuta?.cobradorId ? (p.cobradorId === initialRuta.cobradorId) : true;

            if (next[pk] && !next[pk].loaded && cobradorMatch) {

               next[pk].resumen.recaudo += Number(p.montoTotal || 0);

               // En vista "Meses", el conteo de "cobros" no puede depender de visitas lazy-load.

               next[pk].resumen.visitados = Number(next[pk].resumen.visitados || 0) + 1;

            }

          }

          return next;

        });

      } catch (e) { logger.warn('Error precargando montos de historial', e); }

    };

    cargarResumenRecaudos();

  }, [showHistory, rutaData?.id]);



  const cargarHistorialFecha = useCallback(async (fechaClave: string) => {

    if (!rutaData?.id) return;

    let visitasResp: any = null;

    let saldo: any = null;

    let pagosDelDia: any[] = [];

    

    try {

      visitasResp = await rutasService.obtenerVisitasDelDia(rutaData.id, fechaClave);

    } catch(e) { logger.warn(`[Admin Historial ${fechaClave}] visitas falló:`, e); }



    try {

      saldo = await obtenerSaldoDisponibleRuta(rutaData.id, fechaClave);

    } catch(e) { logger.warn(`[Admin Historial ${fechaClave}] saldo falló:`, e); }



    try {

      const pagosResp = await pagosService.obtenerPagos({ limit: 5000 });

      const pagosData = (pagosResp as any)?.pagos || pagosResp || [];

      

      const toKey = (raw: string) => {

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

        try { const d2 = new Date(raw); return `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}-${String(d2.getDate()).padStart(2,'0')}`; } catch { return ''; }

      };



      pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {

        const raw = p.fechaPago || p.creadoEn;

        const cobradorMatch = initialRuta?.cobradorId ? (p.cobradorId === initialRuta.cobradorId) : true;

        return raw && toKey(raw) === fechaClave && cobradorMatch;

      });

    } catch(e) { logger.warn(`[Admin Historial ${fechaClave}] pagos falló:`, e); }



    try {

      const recaudadoPorCliente: Record<string, number> = {};

      for (const p of pagosDelDia) {

        const cid = p.clienteId || (p.cliente?.id);

        if (!cid) continue;

        recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + Number(p.montoTotal || 0);

      }



      const existentes = new Set<string>();

      const visitas: VisitaRuta[] = (visitasResp?.visitas || []).reduce((acc: VisitaRuta[], item: any, index: number) => {

        const cliente = item.cliente || {};

        

        // Evitar duplicados si el backend llegara a enviarlos

        if (cliente.id && existentes.has(cliente.id)) return acc;

        if (cliente.id) existentes.add(cliente.id);



        const prestamos = item.prestamos || [];

        const prestamoActivo = prestamos.find((p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA' || p.estado === 'PAGADO') || prestamos[0] || {};

        const proximaCuota = prestamoActivo?.proximaCuota || {};

        const saldoTotalToken = Number(prestamoActivo?.saldoPendiente || 0);

        

        const recDia = cliente.id ? (recaudadoPorCliente[cliente.id] || 0) : 0;

        const montoCuota = Number(proximaCuota?.monto || 0);

        

        let estado: EstadoVisita = 'pendiente';

        if (proximaCuota?.estado === 'PAGADA' || (recDia > 0 && recDia >= (montoCuota - 1)) || saldoTotalToken <= 0) {

            estado = 'pagado';

        } else if (proximaCuota?.estado === 'VENCIDA') {

            estado = 'en_mora';

        }



        acc.push({

          id: item.asignacionId || `hist-${fechaClave}-${index}`,

          cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente Sin Nombre',

          direccion: cliente.direccion || 'Sin dirección registrada',

          telefono: cliente.telefono || '',

          horaSugerida: '08:00 AM',

          montoCuota,

          saldoTotal: saldoTotalToken,

          estado,

          proximaVisita: proximaCuota?.fechaVencimiento || fechaClave,

          ordenVisita: item.ordenVisita || index + 1,

          prioridad: (cliente.nivelRiesgo === 'ROJO' ? 'alta' : 'media'),

          nivelRiesgo: (() => {

            const r = cliente.nivelRiesgo || 'VERDE';

            if (r === 'VERDE') return 'bajo';

            if (r === 'AMARILLO') return 'leve';

            if (r === 'ROJO') return 'moderado';

            if (r === 'LISTA_NEGRA') return 'critico';

            return 'bajo';

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

          clienteId: cliente.id || '',

          recaudadoDelDia: recDia,

          recaudadoTotalClient: recDia,

          cuotaActual: proximaCuota?.numeroCuota,

          cuotasTotales: prestamoActivo?.cantidadCuotas,

          enProrroga: proximaCuota?.enProrroga,

          fechaProrroga: proximaCuota?.fechaVencimiento

        });



        return acc;

      }, []);



      const sinteticos: VisitaRuta[] = (pagosDelDia || []).flatMap((p: any, i: number) => {

        const cid = p.clienteId || (p.cliente?.id);

        if (!cid || existentes.has(cid)) return [];

        return [{

            id: `pago-${p.id || i}-${fechaClave}`,

            cliente: p.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : 'Cliente fuera de ruta',

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

      const recaudoDia = Number(saldo?.recaudoDelDia ?? 0) > 0 ? Number(saldo?.recaudoDelDia ?? 0) : pagosDelDia.reduce((s: number, p: any) => s + Number(p.montoTotal || 0), 0);

      

      const resumen = {

        recaudo: recaudoDia,

        gastos: Number(saldo?.gastosDelDia ?? 0),

        efectividad: esperado > 0 ? Math.round((recaudoDia / esperado) * 100) : (recaudoDia > 0 ? 100 : 0),

        visitados: todasVisitas.filter(v => (v.recaudadoDelDia || 0) > 0 || v.estado === 'pagado').length,

        total: todasVisitas.length

      };



      const gestionadas = todasVisitas.filter(v => (v.recaudadoDelDia || 0) > 0 || v.estado === 'pagado');



      setHistorialRutas((prev: any) => ({

        ...(prev || {}),

        [fechaClave]: { resumen, visitas: gestionadas, loaded: true }

      }));

    } catch (e) {

      console.error("Error procesando datos del historial (Admin):", e);

    } finally {

      // Siempre asegurarse de no dejarlo colgando

      setHistorialRutas((prev: any) => {

          if ((prev || {})[fechaClave]?.loaded) return prev;

          return {

             ...(prev || {}),

             [fechaClave]: { 

                resumen: { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 }, 

                visitas: [], 

                loaded: true 

             }

          };

      });

    }

  }, [initialRuta]);



  useEffect(() => {

    if (!showHistory || !initialRuta?.id) return;

    const hoy = new Date().toISOString().split('T')[0];

    const existing = (historialRutas || {})[hoy];

    if (!existing || (!existing.loaded)) {

      cargarHistorialFecha(hoy);

    }

  }, [showHistory, rutaId, historialRutas, cargarHistorialFecha]);  // === Mapeo de asignaciones a modelo de UI (VisitaRuta) ===
  // === Mapeo de asignaciones a modelo de UI (VisitaRuta) ===
  const mapearAsignacionesAVisitas = useCallback((data: any) => {
    const asignaciones = data?.asignaciones || data?.asignacionesRuta;
    if (!asignaciones || !Array.isArray(asignaciones)) return [];

    const toPeriodo = (f: string) => {
      if (f === 'SEMANAL') return 'SEMANA';
      if (f === 'QUINCENAL') return 'QUINCENA';
      if (f === 'MENSUAL') return 'MES';
      return 'DIA';
    };

    const toNivelRiesgo = (r: string) => {
      if (r === 'AMARILLO') return 'precaucion' as any;
      if (r === 'ROJO') return 'moderado';
      if (r === 'LISTA_NEGRA') return 'critico';
      return 'bajo';
    };

    let globalIndex = 0;
    const idsProcesados = new Set<string>();

    const firstPass = (asignaciones as any[]).flatMap((asig: any) => {
      if (!asig.cliente) return [];

      const prestamosValidos: any[] = (asig.cliente?.prestamos || []).filter(
        (p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA' || p.estado === 'PAGADO' || p.estado === 'PENDIENTE_APROBACION'
      );

      const lista = prestamosValidos.length > 0 ? prestamosValidos : [null];

      return lista.flatMap((prestamo: any) => {
        const idx = globalIndex++;
        const uniqueKey = prestamo ? `loan-${prestamo.id}` : `client-${asig.cliente.id}`;
        
        if (idsProcesados.has(uniqueKey)) return [];
        idsProcesados.add(uniqueKey);

        const proximaCuota = prestamo?.cuotas?.[0];
        const esArticulo = prestamo?.tipo === 'ARTICULO' || prestamo?.tipoPrestamo === 'ARTICULO';
        const esPendienteAprobacion = prestamo?.estado === 'PENDIENTE_APROBACION';

        const cuotaEnProrroga = proximaCuota?.estado === 'PRORROGADA';
        const extension = prestamo?.extensiones?.[0];
        const hayProrroga = cuotaEnProrroga || !!extension;

        const fechaProrrogaFecha =
          (cuotaEnProrroga && proximaCuota?.fechaVencimientoProrroga)
            ? proximaCuota.fechaVencimientoProrroga
            : extension?.nuevaFechaVencimiento ?? null;

        const fechaEfectiva = fechaProrrogaFecha
          ?? proximaCuota?.fechaVencimiento
          ?? new Date().toISOString().split('T')[0];

        return [{
          id: prestamo ? `${asig.id}-${prestamo.id}` : (asig.id || `temp-${idx}`),
          cliente: `${asig.cliente?.nombres || ''} ${asig.cliente?.apellidos || ''}`.trim() || 'Cliente Desconocido',
          direccion: asig.cliente?.direccion || 'Sin dirección registrada',
          telefono: asig.cliente?.telefono || '',
          horaSugerida: asig.horaSugerida || '08:00 AM',
          montoCuota: Number(proximaCuota?.monto || (prestamo?.montoCuota) || 0),
          saldoTotal: Number(prestamo?.saldoPendiente || (prestamo?.monto) || 0),
          estado: (esPendienteAprobacion ? 'pendiente' : (hayProrroga ? 'en_prorroga' : (asig.estado?.toLowerCase() || 'pendiente'))) as any,
          proximaVisita: fechaEfectiva,
          ordenVisita: asig.ordenVisita || idx + 1,
          prioridad: (asig.prioridad?.toLowerCase() as any) || 'media',
          cobradorId: initialRuta?.cobradorId || '',
          periodoRuta: toPeriodo(prestamo?.frecuenciaPago || 'DIARIO') as any,
          nivelRiesgo: toNivelRiesgo(asig.cliente?.nivelRiesgo || 'VERDE') as any,
          clienteId: asig.cliente?.id || '',
          prestamoId: prestamo?.id || '',
          tipoPrestamo: (esArticulo ? 'ARTICULO' : 'EFECTIVO') as any,
          articuloNombre: esArticulo ? (prestamo?.articulo || prestamo?.descripcionArticulo || undefined) : undefined,
          enProrroga: hayProrroga,
          fechaProrroga: fechaProrrogaFecha ?? undefined,
          fechaOriginalVencimiento: cuotaEnProrroga ? (proximaCuota?.fechaVencimiento || undefined) : undefined,
          cuotaActual: proximaCuota?.numeroCuota,
          cuotasTotales: prestamo?.cantidadCuotas,
          pendienteAprobacion: esPendienteAprobacion
        }];
      });
    });

    const clientesConPrestamo = new Set(firstPass.filter(v => v.prestamoId).map(v => v.clienteId));
    return firstPass.filter(v => {
      if (!v.prestamoId && clientesConPrestamo.has(v.clienteId)) return false;
      return true;
    }) as VisitaRuta[];
  }, [initialRuta?.cobradorId]);

  const [visitasCobrador, setVisitasCobrador] = useState<VisitaRuta[]>(() => mapearAsignacionesAVisitas(initialRuta));

  // Mantener visitas actualizadas cuando cambian los datos de la ruta (WebSocket)
  useEffect(() => {
    if (rutaData) {
      setVisitasCobrador(mapearAsignacionesAVisitas(rutaData));
    }
  }, [rutaData, mapearAsignacionesAVisitas]);





  // Cargar historial de pagos para enriquecer las visitas

  useEffect(() => {

    if (visitasCobrador.length === 0) return;

    

    // Verificamos si ya fueron enriquecidas (usando recaudadoTotalClient como flag)

    if (visitasCobrador.some(v => v.recaudadoTotalClient !== undefined)) return;



    const enriquecerConPagos = async () => {

      const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const hoyStr = toLocalKey(new Date());



      const actualizadas = await Promise.all(visitasCobrador.map(async (v: any) => {

        if (!v.clienteId) return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };

        try {

          // 1. Obtener Recaudos

          const pagosResp = await pagosService.obtenerPagos({ clienteId: v.clienteId, limit: 100 });

          const pagosCalc = (pagosResp?.pagos || []);

          

          const totalHoy = pagosCalc.reduce((sum: number, p: any) => {

            const raw = p.fechaPago || p.creadoEn;

            const f = raw ? (raw.includes('T') ? raw.split('T')[0] : raw) : '';

            return f === hoyStr ? sum + Number(p.montoTotal || 0) : sum;

          }, 0);

          

          const totalHistorico = pagosCalc.reduce((sum: number, p: any) => sum + Number(p.montoTotal || 0), 0);



          let ultimoPagoDate = 0;

          pagosCalc.forEach((p: any) => {

            const d = new Date(p.fechaPago || p.creadoEn).getTime();

            if (!isNaN(d) && d > ultimoPagoDate) ultimoPagoDate = d;

          });

          

          // 2. Obtener Cuotas para actualizar fecha y monto real

          let montoCuotaReal = v.montoCuota;

          let fechaReal = v.proximaVisita;

          

          if (v.prestamoId) {

            const cuotas = await prestamosService.obtenerCuotas(v.prestamoId);

            const pendiente = cuotas.find((c: any) => c.estado !== 'PAGADA');

            if (pendiente) {

               montoCuotaReal = Number(pendiente.monto || (pendiente.montoCapital + pendiente.montoInteres) || 0);

               const esProrroga = pendiente.estado === 'PRORROGADA'

               fechaReal = (esProrroga && pendiente.fechaVencimientoProrroga)

                 ? pendiente.fechaVencimientoProrroga

                 : (pendiente.fechaVencimiento || v.proximaVisita);

               // Actualizar número de cuota

               v.cuotaActual = pendiente.numeroCuota;

               v.cuotasTotales = cuotas.length; // Assuming cuotas.length gives total number of installments

               // Propagar prórroga al estado de la visita

               if (esProrroga) {

                 (v as any).enProrroga = true;

                 (v as any).fechaProrroga = pendiente.fechaVencimientoProrroga || undefined;

                 (v as any).fechaOriginalVencimiento = pendiente.fechaVencimiento || undefined;

               }

            }

          }



          // 3. Determinar Estado Final

          let nuevoEstado = v.estado;

          const cuotaComparar = montoCuotaReal > 0 ? montoCuotaReal : v.montoCuota;

          const cobroSuficiente = totalHoy >= (cuotaComparar - 1);

          

          if (Number(v.saldoTotal || 0) <= 0 || (cobroSuficiente && totalHoy > 0)) {

            nuevoEstado = 'pagado';

          }



          return { 

            ...v, 

            recaudadoDelDia: totalHoy, 

            recaudadoTotalClient: totalHistorico, 

            fechaUltimoPago: ultimoPagoDate,

            montoCuota: cuotaComparar,

            proximaVisita: fechaReal,

            estado: nuevoEstado 

          };

        } catch (error) {

          console.error("Error en enriquecerConPagos (Admin):", error);

          return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0, fechaUltimoPago: 0 };

        }

      }));

      setVisitasCobrador(actualizadas);

    };



    enriquecerConPagos();

  }, [visitasCobrador]);



  // Agrupar visitas por frecuencia de pago

  const { visitasAgrupadas, totalMostradas, exportarRutaDiariaCSV, exportarRutaDiariaPDF } = useMemo(() => {

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);



    let filtradas = visitasCobrador.filter(v => 
      (v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())) &&
      v.estado !== 'pagado'
    );



    // Aplicar filtro de periodo

    if (periodoRutaFiltro !== 'TODOS') {

        filtradas = filtradas.filter(v => v.periodoRuta === periodoRutaFiltro);

    }



    filtradas.sort((a: any, b: any) => {

      // 1. Los "pagados" van al final

      if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;

      if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;

      

      // 2. Ordenar por fechaUltimoPago (más antigua primero, es decir, el que más tiempo lleva sin pagar va arriba)

      if (a.fechaUltimoPago !== b.fechaUltimoPago) {

        return (a.fechaUltimoPago || 0) - (b.fechaUltimoPago || 0);

      }

      

      // 3. Fallback a ordenVisita

      return a.ordenVisita - b.ordenVisita;

    });



    const exportarRutaDiariaCSV = async () => {

      try {

        await exportService.exportOperationalReport('excel', {

          rutaId: initialRuta.id,

          startDate: new Date().toISOString().split('T')[0],

        } as any);

      } catch (e) {

        toast.error('No se pudo exportar el reporte de ruta a Excel');

        console.error('Error exportando ruta CSV:', e);

      }

    }

  

    const exportarRutaDiariaPDF = async () => {

      try {

        await exportService.exportOperationalReport('pdf', {

          rutaId: initialRuta.id,

          startDate: new Date().toISOString().split('T')[0],

        } as any);

      } catch (e) {

        toast.error('No se pudo exportar el reporte de ruta a PDF');

        console.error('Error exportando ruta PDF:', e);

      }

    }



    const isTodayOrMora = (dateStr: string) => {

      if (!dateStr) return true;

      const d = new Date(dateStr);

      const hoy = new Date();

      hoy.setHours(0, 0, 0, 0);

      d.setHours(0, 0, 0, 0);

      return d.getTime() <= hoy.getTime();

    };



    const filterByDate = (v: any) => searchQuery || v.estado === 'en_mora' || isTodayOrMora(v.proximaVisita);



    const agrupar = {
      MES: filtradas.filter(v => v.periodoRuta === 'MES' && filterByDate(v) && v.estado !== 'pagado'),
      QUINCENA: filtradas.filter(v => v.periodoRuta === 'QUINCENA' && filterByDate(v) && v.estado !== 'pagado'),
      SEMANA: filtradas.filter(v => v.periodoRuta === 'SEMANA' && filterByDate(v) && v.estado !== 'pagado'),
      DIA: filtradas.filter(v => v.periodoRuta === 'DIA' && filterByDate(v) && v.estado !== 'pagado'),
    }



    return { visitasAgrupadas: agrupar, totalMostradas: filtradas.length,

      exportarRutaDiariaCSV,

      exportarRutaDiariaPDF

    };

  }, [visitasCobrador, searchQuery, periodoRutaFiltro]);



  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)

  const [accionPendiente, setAccionPendiente] = useState<'PAGO' | 'ABONO' | 'REPROGRAMAR' | 'ESTADO_CUENTA' | null>(null)

  

  const [estadoCuentaVisita, setEstadoCuentaVisita] = useState<VisitaRuta | null>(null)

  const [pagoVisita, setPagoVisita] = useState<{visita: VisitaRuta, tipo: 'PAGO' | 'ABONO'} | null>(null)

  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)

  const [detalleVisita, setDetalleVisita] = useState<VisitaRuta | null>(null)



  const getEstadoClasses = useCallback((estado: EstadoVisita) => {

    switch (estado) {

      case 'pagado': return 'bg-emerald-50 text-emerald-700 border-emerald-500/30'

      case 'pendiente': return 'bg-orange-50 text-orange-700 border-orange-500/30'

      case 'en_mora': return 'bg-rose-50 text-rose-700 border-rose-500/30'

      case 'ausente': return 'bg-slate-50 text-slate-600 border-slate-300'

      case 'reprogramado': return 'bg-blue-50 text-blue-700 border-blue-500/30'

      default: return 'bg-slate-50 text-slate-700 border-slate-300'

    }

  }, [])



  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {

    switch (prioridad) {

      case 'alta': return '#ef4444'

      case 'media': return '#f59e0b'

      default: return '#10b981'

    }

  }, [])



  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => setDetalleVisita(visita), [setDetalleVisita])

  const handleAbrirPago = useCallback((visita: VisitaRuta) => setPagoVisita({ visita, tipo: 'PAGO' }), [setPagoVisita])

  const handleAbrirAbono = useCallback((visita: VisitaRuta) => setPagoVisita({ visita, tipo: 'ABONO' }), [setPagoVisita])

  const handleAbrirEstadoCuenta = useCallback((visita: VisitaRuta) => setEstadoCuentaVisita(visita), [setEstadoCuentaVisita])



  const handleGuardarGasto = (e: React.FormEvent) => {

    e.preventDefault()

    setIsGastoModalOpen(false)

    setNuevoGasto({ tipo: 'OPERATIVO', descripcion: '', valor: '' })

  }

  

  const handleActivarRuta = async () => {

    if (!initialRuta) return;

    try {

      await routesService.toggleActive(initialRuta.id);

      setRutaCompletada(!rutaCompletada);

      showNotification('success', `Ruta ${!rutaCompletada ? 'activada' : 'desactivada'} correctamente`, 'Éxito');

    } catch (error) {

      console.error('Error toggling route:', error);

      showNotification('error', 'No se pudo cambiar el estado de la ruta', 'Error');

    }

  }



  // Clases de riesgo para el badge superior

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

      return riesgo.replace('_', ' ');

  }



  const { estadisticas, nivelRiesgo } = initialRuta;

  const porcentajeProgreso = estadisticas.avanceDiario || 0;



  const [misCreditos, setMisCreditos] = useState<VisitaRuta[]>([])

  const [loadingMisCreditos, setLoadingMisCreditos] = useState(false)



  const cargarMisCreditos = useCallback(async () => {

    if (!initialRuta?.cobradorId) return

    try {

      setLoadingMisCreditos(true)

      const resp = await rutasService.obtenerCreditosAsignadosACobrador(initialRuta.cobradorId)

      const raw = (resp as any)?.data

      const filas = Array.isArray(raw) ? raw : []

      if (!Array.isArray(raw)) {

        console.warn('Mis clientes: respuesta inesperada en obtenerCreditosAsignadosACobrador', resp)

      }

      const mapped: VisitaRuta[] = filas.map((row: any, idx: number) => {

        const c = row?.cliente || {}

        const p = row?.prestamo || {}

        const prox = p?.proximaCuota || null

        const esArticulo = p?.tipo === 'ARTICULO'

        const toNivel = (nivel: string) => {

          if (nivel === 'VERDE') return 'bajo'

          if (nivel === 'AMARILLO') return 'precaucion'

          if (nivel === 'ROJO') return 'moderado'

          if (nivel === 'LISTA_NEGRA') return 'critico'

          return 'bajo'

        }

        return {

          id: `${row?.asignacionId || 'asig'}-${p?.id || idx}`,

          cliente: `${c?.nombres || ''} ${c?.apellidos || ''}`.trim() || 'Cliente',

          direccion: c?.direccion || 'Sin dirección registrada',

          telefono: c?.telefono || '',

          horaSugerida: '08:00 AM',

          montoCuota: Number(prox?.monto || 0),

          saldoTotal: Number(p?.saldoPendiente || 0),

          estado: 'pendiente' as any,

          proximaVisita: row?.prestamo?.fechaEfectiva || prox?.fechaVencimiento || new Date().toISOString().split('T')[0],

          ordenVisita: Number(row?.ordenVisita || idx + 1),

          prioridad: 'media' as any,

          nivelRiesgo: toNivel(c?.nivelRiesgo || 'VERDE') as any,

          cobradorId: initialRuta.cobradorId,

          periodoRuta: (() => {

            const f = p?.frecuenciaPago || 'DIARIO'

            if (f === 'DIARIO') return 'DIA'

            if (f === 'SEMANAL') return 'SEMANA'

            if (f === 'QUINCENAL') return 'QUINCENA'

            if (f === 'MENSUAL') return 'MES'

            return 'DIA'

          })() as any,

          clienteId: c?.id || '',

          prestamoId: p?.id || '',

          tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',

          articuloNombre: esArticulo ? (p?.articulo || 'Artículo') : 'Préstamo',

        } as any

      })

      setMisCreditos(mapped)

    } catch (e: any) {

      console.error('Error cargando mis clientes (ruta admin):', e)

      toast.error('No se pudieron cargar los clientes asignados.')

    } finally {

      setLoadingMisCreditos(false)

    }

  }, [initialRuta?.cobradorId])



  useEffect(() => {

    if (!showMisClientes) return

    cargarMisCreditos()

  }, [showMisClientes, cargarMisCreditos])





  return (

    <div className="min-h-screen bg-slate-50 relative pb-20">

      <div className="fixed inset-0 pointer-events-none">

        <div className="absolute inset-0 bg-slate-50"></div>

      </div>



      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">

        <header className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

               <Link href="/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">

                  <ArrowLeftIcon className="h-5 w-5 text-slate-600" />

               </Link>

               <div>

                 <div className="flex items-center gap-3">

                    <h1 className="text-3xl font-bold tracking-tight">

                        <span className="text-blue-600">Ruta </span>

                        <span className="text-orange-500">{(initialRuta.nombre || '').replace(/^Ruta\s+/i, '')}</span>

                    </h1>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiesgoBadgeClasses(nivelRiesgo)}`}>

                        {getRiesgoLabel(nivelRiesgo)}

                    </span>

                    

                 </div>

                 <p className="text-slate-500 font-medium text-sm">

                   {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} • {initialRuta.codigo} • {initialRuta.cobrador}

                 </p>

              </div>

            </div>

          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">

               <div className="flex justify-between items-end mb-4">

                <div>

                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recaudado Hoy</p>

                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(estadisticas.cobranzaDelDia)}</div>

                  <p className="text-xs text-slate-400 mt-1">Meta: {formatCurrency(estadisticas.metaDelDia)}</p>

                </div>

              </div>

              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">

                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${porcentajeProgreso}%` }} />

              </div>

            </div>

          </div>

        </header>



        {/* Action Bar & Filtros */}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">

              <div className="flex flex-col md:flex-row gap-4 mb-4">

                <div className="relative flex-1">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

                  <input

                    type="text"

                    placeholder="Buscar cliente..."

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"

                  />

                </div>

              </div>



              {/* Botones de Acción y Navegación (Estilo Cobrador) */}

              <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">

                  <button 

                    onClick={() => {

                      setShowHistory(false)

                      setShowMisClientes(false)

                    }}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${

                      !showHistory 

                        ? 'bg-[#08557f] text-white border-[#08557f]' 

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <MapPin className="h-4 w-4" />

                    <span className="hidden md:inline">Ver Ruta Actual</span>

                  </button>



                  <button 

                    onClick={() => setShowHistory(true)}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${

                      showHistory 

                        ? 'bg-[#08557f] text-white border-[#08557f]' 

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <History className="h-4 w-4" />

                    <span className="hidden md:inline">Historial</span>

                  </button>



                  <button

                    onClick={() => {

                      setShowMisClientes(true)

                      setShowHistory(false)

                    }}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${

                      showMisClientes

                        ? 'bg-[#08557f] text-white border-[#08557f]'

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <User className="h-4 w-4" />

                    <span className="hidden md:inline">Mis clientes</span>

                  </button>



                  {!rutaCompletada && !showHistory && (

                    <button 

                      type="button"

                      onClick={handleActivarRuta}

                      className="px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors"

                    >

                      <CheckCircle2 className="h-4 w-4" />

                      <span className="hidden md:inline">Activar Ruta</span>

                    </button>

                  )}



                  {(currentUser?.rol === 'SUPER_ADMINISTRADOR' || currentUser?.rol === 'ADMIN') && !showHistory && (

                    <div className="flex gap-2">

                        <button

                        onClick={() => setShowNewClientModal(true)}

                        className="px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors"

                        >

                        <UserPlus className="h-4 w-4 text-slate-400" />

                        <span className="hidden md:inline">Crear Cliente</span>

                        </button>



                        <button 

                        onClick={() => {

                            setSelectedClienteForCredito(null)

                            setShowCrearCreditoModal(true)

                        }}

                        className="px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors"

                        >

                        <Plus className="h-4 w-4 text-slate-400" />

                        <span className="hidden md:inline">Crear Crédito</span>

                        </button>

                    </div>

                  )}

                  

              </div>



              {/* Filtros de Periodo (Estilo Cobrador Exacto) */}

              {!showHistory && !showMisClientes && (

                <div className="mt-4 pt-4 border-t border-slate-200">

                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>

                    <div className="flex gap-2 overflow-x-auto pb-1 items-center">

                      <button

                        type="button"

                        onClick={async () => {

                          setIsExportingPdf(true)

                          try {

                            await exportService.exportRutaCobrador('pdf', initialRuta.id)

                          } finally {

                            setIsExportingPdf(false)

                          }

                        }}

                        disabled={isExportingPdf}

                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"

                        title="Exportar ruta como PDF"

                      >

                        {isExportingPdf ? (

                          <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />

                        ) : (

                          <FileDown className="w-3 h-3" />

                        )}

                        PDF

                      </button>

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

        

         {/* Contenido Principal: Lista o Historial */}

         <div className="space-y-6">

            

            {showHistory ? (

              // ========================= VISTA HISTORIAL =========================

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">

                      <div className="flex items-center gap-3">

                          <History className="h-6 w-6 text-[#08557f]" />

                          <h3 className="font-bold text-slate-900 text-xl">

                              Historial de la Ruta

                          </h3>

                      </div>

                  </div>



                <div className="space-y-4 animate-in fade-in">

                   <div className="flex items-center justify-between px-1">

                     <h3 className="font-bold text-slate-900 text-lg">Historial de Rutas</h3>

                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Últimos 30 días</div>

                   </div>



                   {/* Toggle DIAS | MESES + Filtro de Frecuencia */}

                   <div className="flex flex-col gap-3 mb-3">

                     <div className="flex items-center gap-2">

                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">VISTA:</span>

                       <button onClick={() => setHistoryViewMode('DAYS')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${historyViewMode === 'DAYS' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>Dias</button>

                       <button onClick={() => setHistoryViewMode('MONTHS')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${historyViewMode === 'MONTHS' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>Meses</button>

                     </div>

                     {/* Chips de frecuencia para filtrar clientes dentro del historial */}

                     <div className="flex items-center gap-2 flex-wrap">

                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">COBROS:</span>

                       {([

                         { key: 'TODOS' as const, label: 'Todos' },

                         { key: 'DIA' as const, label: 'Diarios' },

                         { key: 'SEMANA' as const, label: 'Semanales' },

                         { key: 'QUINCENA' as const, label: 'Quincenales' },

                         { key: 'MES' as const, label: 'Mensuales' },

                       ]).map(f => (

                         <button

                           key={f.key}

                           onClick={() => setHistoryFrecuenciaFiltro(f.key)}

                           className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${

                             historyFrecuenciaFiltro === f.key

                               ? 'bg-[#08557f] text-white border-[#08557f] shadow-md'

                               : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'

                           }`}

                         >

                           {f.label}

                         </button>

                       ))}

                     </div>

                   </div>



                   {historyDates.length > 0 ? (

                      <div className="space-y-3">



                        {/* === VISTA MESES === */}

                        {historyViewMode === 'MONTHS' && (() => {

                          const byMonth: Record<string, string[]> = {};

                          for (const date of historyDates) {

                            const [y, mi] = date.split('-');

                            const mk = `${y}-${mi}`;

                            if (!byMonth[mk]) byMonth[mk] = [];

                            byMonth[mk].push(date);

                          }

                          const monthKeys = Object.keys(byMonth).sort().reverse();

                          return (

                            <div className="space-y-4">

                              {monthKeys.map(monthKey => {

                                const [my, mNum] = monthKey.split('-');

                                const monthObj = new Date(parseInt(my), parseInt(mNum)-1, 1);

                                const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

                                const daysInMonth = byMonth[monthKey];

                                const isMonthExpanded = selectedHistoryMonth === monthKey;

                                const monthRecaudo = daysInMonth.reduce((sum, d2) => sum + ((historialRutas as any)[d2]?.resumen?.recaudo || 0), 0);

                                const monthPagados = daysInMonth.reduce((sum, d2) => {

                                  const dayData = (historialRutas as any)[d2];

                                  const cobrosFromPagos = Number(dayData?.resumen?.visitados || 0);

                                  if (cobrosFromPagos > 0) return sum + cobrosFromPagos;

                                  return sum + (((dayData?.visitas) || []).filter((v: any) => v.estado === 'pagado').length);

                                }, 0);

                                return (

                                  <div key={monthKey} className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${isMonthExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}`}>

                                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedHistoryMonth(isMonthExpanded ? null : monthKey)}>

                                      <div className="flex items-center gap-3">

                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${isMonthExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}`}>{mNum}</div>

                                        <div>

                                          <div className="font-bold text-slate-900 capitalize">{monthName}</div>

                                          <div className="text-xs text-slate-500">{daysInMonth.length} días · Recaudo: <b>${monthRecaudo.toLocaleString('es-CO')}</b></div>

                                        </div>

                                      </div>

                                      <div className="flex items-center gap-3">

                                        <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">{monthPagados} cobros</div>

                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMonthExpanded ? 'rotate-180' : ''}`} />

                                      </div>

                                    </div>

                                    {isMonthExpanded && (

                                      <div className="border-t border-slate-100">

                                        {daysInMonth.map(date => {

                                          const dayData = (historialRutas as any)[date];

                                          const isDayExpanded = selectedHistoryDate === date;

                                          const [dy, dm, dd] = date.split('-');

                                          const dateObj = new Date(parseInt(dy), parseInt(dm)-1, parseInt(dd));

                                          const dayNameStr = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });

                                          return (

                                            <div key={date} className={`border-b border-slate-50 last:border-0 ${isDayExpanded ? 'bg-slate-50/40' : ''}`}>

                                              <div className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={async () => {

                                                if (!isDayExpanded && !dayData.loaded) { await cargarHistorialFecha(date); }

                                                setSelectedHistoryDate(isDayExpanded ? null : date);

                                              }}>

                                                <div className="flex items-center gap-3">

                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${isDayExpanded ? 'bg-[#08557f] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{dd}</div>

                                                  <div>

                                                    <span className="text-sm font-semibold text-slate-700 capitalize">{dayNameStr}</span>

                                                    <div className="text-[11px] text-slate-400">Recaudo: <b>${(dayData?.resumen?.recaudo || 0).toLocaleString('es-CO')}</b>{dayData?.loaded && dayData.visitas.length > 0 && <span className="ml-2">· {dayData.visitas.length} clientes</span>}</div>

                                                  </div>

                                                </div>

                                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDayExpanded ? 'rotate-180' : ''}`} />

                                              </div>

                                              {isDayExpanded && (

                                                <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-1 duration-150">

                                                   {!dayData.loaded ? (

                                                    <div className="flex flex-col items-center justify-center py-6 text-slate-400"><div className="w-5 h-5 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" /><span className="text-xs">Cargando...</span></div>

                                                  ) : (() => {

                                                    const filtradas = historyFrecuenciaFiltro === 'TODOS'

                                                      ? dayData.visitas

                                                      : dayData.visitas.filter((v: any) => v.periodoRuta === historyFrecuenciaFiltro);

                                                    if (filtradas.length === 0) return <div className="text-center py-6 text-[11px] text-slate-400">Sin cobros {historyFrecuenciaFiltro !== 'TODOS' ? `(${historyFrecuenciaFiltro.toLowerCase()})` : ''} para este dia</div>;

                                                    return filtradas.map((v: any) => (

                                                                                              <StaticVisitaItem
                                            key={visita.id}
                                            visita={visita}
                                            allowClick={false}
                                            onVerCliente={handleAbrirClienteInfo}
                                            getEstadoClasses={getEstadoClasses}
                                            getPrioridadColor={getPrioridadColor}
                                            actions={
                                              <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion) return; handleAbrirPago(visita); }}
                                                    disabled={visita.pendienteAprobacion}
                                                    title={visita.pendienteAprobacion ? 'Crédito pendiente de aprobación' : 'Registrar Pago'}
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] ${visita.pendienteAprobacion ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm'}`}
                                                >
                                                    <DollarSign className="h-3.5 w-3.5" />
                                                    Pago
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion) return; handleAbrirAbono(visita); }}
                                                    disabled={visita.pendienteAprobacion}
                                                    title={visita.pendienteAprobacion ? 'Crédito pendiente de aprobación' : 'Registrar Abono'}
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] ${visita.pendienteAprobacion ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm'}`}
                                                >
                                                    <Wallet className="h-3.5 w-3.5" />
                                                    Abono
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAbrirEstadoCuenta(visita); }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95 font-bold text-[11px]"
                                                >
                                                    <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />
                                                    Estado
                                                </button>
                                                <button
                                                    onClick={(e) => { 
                                                      e.stopPropagation(); 
                                                      const isProrrogaVencida = visita.enProrroga && visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now();
                                                      if (!visita.enProrroga || isProrrogaVencida) setVisitaReprogramar(visita); 
                                                    }}
                                                    disabled={!!visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now())}
                                                    title={visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()) ? 'No se puede reprogramar con prorroga activa' : 'Solicitar reprogramacion'}
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] ${visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()) ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm'}`}
                                                >
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    Repro.
                                                </button>
                                              </>
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

              </>

            )}

         </div>

      </div>



      {/* Modales (Gasto, Pago, etc...) */}

      {isGastoModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">

           <form onSubmit={handleGuardarGasto} className="p-6 space-y-4 bg-white rounded-lg">

              {/* Contenido simplificado gasto por brevedad de edicion */}

               <h3 className="font-bold">Registrar Gasto</h3>

               <button type="submit">Guardar</button>

           </form>

        </div>

      )}



      {/* Modal de Estado de Cuenta */}

      {estadoCuentaVisita && (

        <EstadoCuentaModal 

          visita={estadoCuentaVisita} 

          onClose={() => setEstadoCuentaVisita(null)} 

        />

      )}

      {/* Modal de Pago/Abono */}
      {pagoVisita && (
        <PagoModal
          visita={pagoVisita.visita}
          tipo={pagoVisita.tipo}
          onClose={() => setPagoVisita(null)}
          onConfirm={async (monto, metodo, comprobante) => {
            try {
              if (!pagoVisita?.visita?.clienteId || !pagoVisita?.visita?.prestamoId) {
                showNotification('error', 'No se pudo registrar el pago: falta cliente o préstamo', 'Error');
                return;
              }

              await pagosService.registrarPago({
                clienteId: pagoVisita.visita.clienteId,
                prestamoId: pagoVisita.visita.prestamoId,
                cobradorId: initialRuta.cobradorId,
                montoTotal: monto,
                metodoPago: metodo,
                comprobante: comprobante,
              } as any);

              showNotification('success', `${pagoVisita.tipo === 'ABONO' ? 'Abono' : 'Pago'} registrado correctamente`, 'Éxito');
              setPagoVisita(null);

              // Refrescar estadísticas
              try {
                await onRutaRefresh?.();
              } catch {}

              router.refresh();
            } catch (error) {
              console.error('Error registrando pago/abono:', error);
              showNotification('error', 'No se pudo registrar el pago/abono', 'Error');
            }
          }}
        />
      )}

      {visitaReprogramar && (

        <ReprogramarModal
            visita={visitaReprogramar}
            onClose={() => setVisitaReprogramar(null)}
            onConfirm={async (fecha, motivo) => {
                try {
                  if (!visitaReprogramar?.prestamoId) {
                    showNotification('error', 'Falta el ID del préstamo para reprogramar', 'Error');
                    return;
                  }
                  
                  await prestamosService.reprogramarPrestamo(visitaReprogramar.prestamoId, {
                    fecha,
                    motivo,
                    cobradorId: currentUser?.id || '',
                  });
                  
                  showNotification('success', 'Solicitud de reprogramación enviada correctamente', 'Éxito');
                  setVisitaReprogramar(null);
                  
                  try { await onRutaRefresh?.(); } catch {}
                  router.refresh();
                } catch (e: any) {
                  console.error('Error reprogramando:', e);
                  showNotification('error', e?.message || 'Error al solicitar reprogramación', 'Error');
                }
            }}
        />

      )}

      {showClienteSelector && (

        <SeleccionClienteModal

          visitas={visitasCobrador}

          onSelect={(visita) => {

            setShowClienteSelector(false)

            if (accionPendiente === 'PAGO') handleAbrirPago(visita)

            else if (accionPendiente === 'ABONO') handleAbrirAbono(visita)

            else if (accionPendiente === 'REPROGRAMAR') setVisitaReprogramar(visita)

            else handleAbrirEstadoCuenta(visita) 

            setAccionPendiente(null)

          }}

          onClose={() => setShowClienteSelector(false)}

        />

      )}

      

      {detalleVisita && (

        <ClienteDetalleModal

          visita={detalleVisita}

          onClose={() => setDetalleVisita(null)}

        />

      )}

      

      {showNewClientModal && (

        <NuevoClienteModal

          onClose={() => setShowNewClientModal(false)}

          onClienteCreado={async (nuevo) => {

            setShowNewClientModal(false)

            if (nuevo?.id) {

              try {

                if (initialRuta?.id && initialRuta?.cobradorId) {

                  await routesService.assignClient(initialRuta.id, nuevo.id, initialRuta.cobradorId)

                }

                setDefaultClienteId(nuevo.id)

                setShowCrearCreditoPrompt(true)

              } catch (e) {

                showNotification('warning', 'Cliente creado, pero no se pudo asignar automáticamente a la ruta', 'Aviso')

                setDefaultClienteId(nuevo.id)

                setShowCrearCreditoPrompt(true)

              }

            } else {

              showNotification('warning', 'Cliente creado, pero no se obtuvo el ID', 'Aviso')

            }

          }}

        />

      )}

      

      <ConfirmModal

        isOpen={showCrearCreditoPrompt}

        onClose={() => {

          setShowCrearCreditoPrompt(false)

          showNotification('success', 'Cliente creado correctamente', 'Éxito')

        }}

        onConfirm={async () => {

          setShowCrearCreditoPrompt(false)

          setShowCrearCreditoModal(true)

        }}

        title="Crear crédito para el cliente"

        message="¿Deseas crearle un crédito a este cliente ahora?"

        confirmText="Sí, crear crédito"

        cancelText="No, más tarde"

        variant="info"

      />

      

      {/* Modal de selección de caja principal removido en detalle de ruta */}

      

      {showCrearCreditoModal && (

        <CrearCreditoModal

          isOpen={showCrearCreditoModal}

          defaultClienteId={selectedClienteForCredito?.clienteId || defaultClienteId || undefined}

          onClose={() => {

            setShowCrearCreditoModal(false);

            setSelectedClienteForCredito(null);

            setDefaultClienteId(null);

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
                fechaInicio: data.fechaInicio || new Date().toISOString(),
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

              // Asignar cliente a la ruta automáticamente si estamos en el detalle de una ruta

              if (initialRuta?.id) {

                try {

                  await rutasService.asignarCliente(

                    initialRuta.id,

                    data.clienteCreditoId,

                    initialRuta.cobradorId || ''

                  );

                } catch (assignError) {

                  console.error('Error al asignar cliente a la ruta:', assignError);

                  // No bloqueamos el flujo principal si falla la asignación (puede que ya esté asignado)

                }

              }

              

              showNotification('success', 'Crédito creado (Pendiente de Aprobación) y cliente vinculado a la ruta', 'Operación completada');

              setShowCrearCreditoModal(false);

              setSelectedClienteForCredito(null);

              setDefaultClienteId(null);

              router.refresh();

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



const RutaClient = ({ initialRuta: initialRutaProp, rutaId }: RutaClientProps) => {

  const router = useRouter()

  const { user: currentUser } = useAuth()



  const [rutaData, setRutaData] = useState<RutaDetalleMock | null>(initialRutaProp)

  const [loadingRuta, setLoadingRuta] = useState(!initialRutaProp && !!rutaId)

  const [rutaCompletada, setRutaCompletada] = useState(!!initialRutaProp?.activa)



  const refreshRuta = useCallback(async () => {

    if (!rutaId) return;

    try {

      const ruta = await rutasService.obtenerRutaPorId(rutaId);

      setRutaData(ruta as any);

      setRutaCompletada(!!(ruta as any)?.activa);

    } catch (e) {

      console.error('Error refrescando ruta:', e);

    }

  }, [rutaId]);



  useRealtimeData(['pagos_actualizados', 'rutas_actualizadas', 'prestamos_actualizados'], async () => {

    await refreshRuta()

  })



  useEffect(() => {

    if (rutaData || !rutaId) return



    const run = async () => {

      try {

        setLoadingRuta(true)

        const ruta = await rutasService.obtenerRutaPorId(rutaId)

        setRutaData(ruta as any)

        setRutaCompletada(!!(ruta as any)?.activa)

      } catch (e) {

        setRutaData(null)

      } finally {

        setLoadingRuta(false)

      }

    }



    run()

  }, [rutaData, rutaId])



  const initialRuta = rutaData



  if (loadingRuta) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-50">

        <div className="flex items-center gap-2 text-slate-600 font-medium">

          <Loader2 className="w-5 h-5 animate-spin" />

          <span>Cargando detalle de ruta...</span>

        </div>

      </div>

    )

  }



  if (!initialRuta) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-xs text-rose-700 font-bold border border-rose-200">

            <XCircle className="h-3.5 w-3.5" />

            <span>Ruta no encontrada</span>

          </div>

          <p className="mt-4 text-slate-500 font-medium">No se pudo cargar el detalle de la ruta.</p>

          <button

            onClick={() => router.back()}

            className="mt-4 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"

          >

            Volver

          </button>

        </div>

      </div>

    )

  }



  return (

    <RutaClientLoaded

      initialRuta={initialRuta}

      rutaData={initialRuta}

      rutaId={rutaId}

      rutaCompletada={rutaCompletada}

      setRutaCompletada={setRutaCompletada}

      currentUser={currentUser}

      onRutaRefresh={refreshRuta}

    />

  )

}



/**

 * Formatea una fecha UTC para evitar saltos de día por zona horaria

 */

function formatDateUTC(dateStr: string) {

  if (!dateStr) return '---'

  const date = new Date(dateStr)

  const day = date.getUTCDate()

  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

  const month = monthNames[date.getUTCMonth()]

  const year = date.getUTCFullYear()

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

    r === 'bajo' ? 'text-emerald-600 bg-emerald-50' :

    r === 'leve' ? 'text-blue-600 bg-blue-50' :

    r === 'moderado' ? 'text-orange-600 bg-orange-50' :

    r === 'critico' ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50';



  const riesgoLabel = 

    r === 'bajo' ? 'Peligro Mínimo' :

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

      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"

      onClick={onClose}

    >

      <div 

        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]"

        onClick={(e) => e.stopPropagation()}

      >

        

        {/* Header Compacto */}

        <div className="px-8 pt-8 pb-4 flex justify-between items-center">

          <div>

            <h3 className="font-black text-2xl text-slate-900 tracking-tight">Expediente</h3>

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Detalle Administrativo</p>

          </div>

          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all group">

            <XCircle className="h-7 w-7 group-active:scale-90" />

          </button>

        </div>

        

        <div className="px-8 pb-8 space-y-6 overflow-y-auto custom-scrollbar">

           {loading ? (

             <div className="py-20 flex flex-col items-center justify-center gap-4">

                <Loader2 className="w-10 h-10 text-[#08557f] animate-spin" />

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</p>

             </div>

           ) : (

             <>

               {/* Perfil Header */}

               <div className="text-center space-y-3">

                 <div className="w-20 h-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center text-slate-200 border border-slate-100">

                   <User className="w-10 h-10" />

                 </div>

                 <div>

                    <h4 className="text-xl font-black text-slate-900">{visita.cliente}</h4>

                    <div className="flex justify-center gap-2 mt-1">

                       <span className={`${riesgoColor} text-[9px] font-black px-3 py-1 rounded-full uppercase border border-current/10`}>

                         {riesgoLabel}

                       </span>

                    </div>

                 </div>

               </div>



               {/* Información DINÁMICA */}

               <div className="grid grid-cols-2 gap-3">

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">

                     <div className="flex items-center gap-1.5 mb-1 text-slate-400">

                        <Fingerprint className="w-3 h-3" />

                        <span className="text-[9px] font-black uppercase">Cédula</span>

                     </div>

                     <p className="text-sm font-black text-slate-900">{clienteCompleto?.dni || '---'}</p>

                  </div>

                   <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">

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

                        }`}>{clienteCompleto?.score ?? clienteCompleto?.puntaje ?? '—'}<span className="text-xs font-bold text-slate-400">/100</span></span>

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

                      {/* ScoreMeter — igual al del listado de clientes */}

                      <div className="relative pt-2">

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

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">

                     <div className="flex items-center gap-1.5 mb-1 text-slate-400">

                        <CalendarDays className="w-3 h-3" />

                        <span className="text-[9px] font-black uppercase">Miembro Desde</span>

                     </div>

                     <p className="text-sm font-black text-slate-900 uppercase">

                       {clienteCompleto?.creadoEn ? formatDateUTC(clienteCompleto.creadoEn) : '---'}

                     </p>

                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">

                     <div className="flex items-center gap-1.5 mb-1 text-slate-400">

                        <History className="w-3 h-3" />

                        <span className="text-[9px] font-black uppercase">Préstamos</span>

                     </div>

                     <p className="text-sm font-black text-[#08557f]">{prestamosActivosCount} Activos</p>

                  </div>

               </div>



               {/* Contacto Alternativo */}

               <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100">

                  <h5 className="text-[10px] font-black text-[#08557f] uppercase tracking-widest mb-3">Referencias / Contacto</h5>

                  <div className="space-y-4">

                     <div className="flex items-center gap-3">

                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#08557f] shadow-sm">

                          <Phone className="w-4 h-4" />

                        </div>

                        <div>

                          <p className="text-[9px] font-bold text-blue-400 uppercase">WhatsApp / Tel</p>

                          <p className="text-sm font-black text-slate-900">{clienteCompleto?.telefono || visita.telefono}</p>

                        </div>

                     </div>

                     <div className="flex items-start gap-3">

                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#08557f] shadow-sm">

                          <MapPin className="w-4 h-4" />

                        </div>

                        <div>

                          <p className="text-[9px] font-bold text-blue-400 uppercase">Referencia de Ubicación</p>

                          <p className="text-xs font-bold text-slate-700 leading-tight">

                            {clienteCompleto?.referencia || "Sin referencias adicionales registradas."}

                          </p>

                        </div>

                     </div>

                  </div>

               </div>



               {/* Botón Cerrar */}

               <div className="pt-2">

                  <button 

                    onClick={onClose} 

                    className="w-full py-5 bg-[#08557f] hover:bg-[#063a58] text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.97] uppercase tracking-[0.15em] text-xs"

                  >

                     Cerrar Expediente

                  </button>

               </div>

             </>

           )}

        </div>

      </div>

    </div>

  )

}



export default RutaClient




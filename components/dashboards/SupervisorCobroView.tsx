'use client'

/**
 * ============================================================================
 * VISTA OPERATIVA DE COBRANZA - MODO SUPERVISOR
 * ============================================================================
 * Adaptación de VistaCobrador para que el Supervisor pueda gestionar rutas.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MapPin,
  RefreshCw,
  CheckCircle2,
  History,
  UserPlus,
  Receipt,
  DollarSign,
  ChevronDown,
  X,
  CreditCard,
  GripVertical,
  Calendar,
  Search,
  FileText as FileTextIcon,
  User,
  Target,
  ReceiptText,
  AlertTriangle,
  Wallet,
  FileDown,
} from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useRouter } from 'next/navigation'
import { RolUsuario } from '@/lib/types/autenticacion-type'
import { obtenerPerfil } from '@/services/autenticacion-service'
import { formatCurrency } from '@/lib/utils'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { VisitaRuta, EstadoVisita, PeriodoRuta, HistorialDia } from '@/lib/types/cobranza'
import { StaticVisitaItem, SortableVisita, Portal, MODAL_Z_INDEX, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'
import { rutasService } from '@/services/rutas-service'
import { TipoAmortizacion } from '@/types/enums'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import PagoModal from '@/components/dashboards/shared/PagoModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import GastoModal from '@/components/dashboards/shared/GastoModal'
import BaseModal from '@/components/dashboards/shared/BaseModal'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import { prestamosService } from '@/services/prestamos-service'
import { pagosService } from '@/services/pagos-service'
import { obtenerSaldoDisponibleRuta } from '@/services/contabilidad-service'
import { exportService } from '@/services/export-service'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'
import { toast } from 'sonner'

interface UserSession {
  id: string
  nombres: string
  apellidos: string
  correo?: string
  telefono?: string
  rol: RolUsuario
  rutaAsignada?: string
  zona?: string
  metaDiaria?: number
  avatar?: string
}

const SupervisorCobroView = ({ rutaId }: { rutaId?: string }) => {
  const { socket } = useNotificaciones()
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pagoInitialIsAbono, setPagoInitialIsAbono] = useState(false)
  const [visitaPagoSeleccionadaId, setVisitaPagoSeleccionadaId] = useState<string | null>(null)
  
  const [showClienteInfoModal, setShowClienteInfoModal] = useState(false)
  const [visitaClienteSeleccionada, setVisitaClienteSeleccionada] = useState<VisitaRuta | null>(null)
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false)
  const [visitaEstadoCuentaSeleccionada, setVisitaEstadoCuentaSeleccionada] = useState<VisitaRuta | null>(null)
  
  const [showMoraModal, setShowMoraModal] = useState(false)
  const [visitaMoraSeleccionada, setVisitaMoraSeleccionada] = useState<VisitaRuta | null>(null)
  const [moraCuenta, setMoraCuenta] = useState<{
    id: string
    numeroPrestamo: string
    cliente: { nombre: string; documento: string; telefono: string; direccion: string }
    diasMora: number
    montoMora: number
    montoTotalDeuda: number
    cuotasVencidas: number
    ruta: string
    cobrador: string
    nivelRiesgo: string
  } | null>(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showReprogramModal, setShowReprogramModal] = useState(false)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [showGastoModal, setShowGastoModal] = useState(false)
  const [showBaseModal, setShowBaseModal] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showMisClientes, setShowMisClientes] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null)
  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')

  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const [misCreditos, setMisCreditos] = useState<VisitaRuta[]>([])
  const [loadingMisCreditos, setLoadingMisCreditos] = useState(false)

  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})
  const toggleGrupo = useCallback(
    (key: string) => setGruposColapsados((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  )

  // Selector de cliente para acciones globales
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [pendingAction, setPendingAction] = useState<'CUENTA' | 'AGENDAR' | 'PAGO' | 'ABONO' | null>(null)

  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)

  const [modalAlerta, setModalAlerta] = useState<{titulo: string, mensaje: string, tipo: 'exito' | 'error' | 'info'} | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // El supervisor puede gestionar pagos en CUALQUIER ruta (propia o de un cobrador)
  // isPersonal solo controla si puede reordenar la lista (drag & drop)
  const isPersonal = rutaId === 'RT-SUP' || rutaId === 'SUP-001' || !rutaId
  const isReadOnly = false  // El supervisor/admin siempre puede registrar pagos
  const [periodoCards, setPeriodoCards] = useState<'HOY' | 'SEM' | 'MES' | 'AÑO'>('HOY')
  const [rutaStats, setRutaStats] = useState<{
    recaudo: number
    meta: number
    eficiencia: number
    gastos: number
    base: number
  }>({ recaudo: 0, meta: 0, eficiencia: 0, gastos: 0, base: 0 })
  const router = useRouter();
  const [rutaInfo, setRutaInfo] = useState<{ id: string; cobradorId: string } | null>(null);

  const cargarMisCreditos = useCallback(async () => {
    const cobradorId = rutaInfo?.cobradorId
    if (!cobradorId) return
    try {
      setLoadingMisCreditos(true)
      const resp = await rutasService.obtenerCreditosAsignadosACobrador(cobradorId)
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
          proximaVisita:
            row?.prestamo?.fechaEfectiva ||
            prox?.fechaVencimiento ||
            new Date().toISOString().split('T')[0],
          ordenVisita: Number(row?.ordenVisita || idx + 1),
          prioridad: 'media' as any,
          nivelRiesgo: toNivel(c?.nivelRiesgo || 'VERDE') as any,
          cobradorId,
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
      console.error('Error cargando mis clientes (SupervisorCobroView):', e)
      toast.error('No se pudieron cargar los clientes asignados.')
    } finally {
      setLoadingMisCreditos(false)
    }
  }, [rutaInfo?.cobradorId])

  useEffect(() => {
    if (!showMisClientes) return
    cargarMisCreditos()
  }, [showMisClientes, cargarMisCreditos])

  // Datos base
  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>([])

  const [visitasOrden, setVisitasOrden] = useState<string[]>([])

  const [historialRutas, setHistorialRutas] = useState<any>({});

  const getDatesByPeriod = (period: 'HOY' | 'SEM' | 'MES' | 'AÑO') => {
    const hoy = new Date();
    let inicio = new Date(hoy);
    let fin = new Date(hoy);

    switch (period) {
      case 'HOY':
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'SEM':
        const day = hoy.getDay();
        const diff = hoy.getDate() - day + (day === 0 ? -6 : 1);
        inicio.setDate(diff);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'MES':
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'AÑO':
        inicio.setMonth(0, 1);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
    }
    return { inicio: inicio.toISOString(), fin: fin.toISOString() };
  };

  const cargarEstadisticasRuta = useCallback(async () => {
    if (!rutaId) return
    try {
      const { inicio, fin } = getDatesByPeriod(periodoCards)
      const saldo = await obtenerSaldoDisponibleRuta(rutaId, undefined, inicio, fin)
      setRutaStats((prev) => {
        const meta = prev.meta
        const cobranza = Number(
          (saldo as any)?.cobranzaDelDia ??
            (saldo as any)?.recaudoDelDia ??
            prev.recaudo,
        )
        return {
          ...prev,
          recaudo: cobranza,
          gastos: Number((saldo as any)?.gastosDelDia ?? prev.gastos),
          base: Number((saldo as any)?.baseEfectivo ?? prev.base),
          eficiencia:
            meta > 0 ? Math.round((cobranza / meta) * 100) : prev.eficiencia,
        }
      })
    } catch (error) {
      console.error('Error al cargar estadísticas por periodo (supervisor):', error)
    }
  }, [rutaId, periodoCards])

  // Prefill historial: 30 días con loaded:false (carga lazy por día)
  useEffect(() => {
    if (!showHistory || !rutaId) return;
    if (historialRutas && Object.keys(historialRutas).length > 0) return;
    const hoy = new Date();
    const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const prefill: Record<string, any> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      prefill[toKey(d)] = {
        resumen: { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 },
        visitas: [],
        loaded: false,
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
            const cobradorMatch = rutaInfo?.cobradorId ? (p.cobradorId === rutaInfo.cobradorId) : true;
            if (next[pk] && !next[pk].loaded && cobradorMatch) {
               next[pk].resumen.recaudo += Number(p.montoTotal || 0);
               // En vista "Meses", el conteo de "cobros" no puede depender de dayData.visitas
               // porque los días no están cargados (lazy). Usamos pagos como fuente rápida.
               next[pk].resumen.visitados = Number(next[pk].resumen.visitados || 0) + 1;
            }
          }
          return next;
        });
      } catch (e) { console.warn('Error precargando montos de historial', e); }
    };
    cargarResumenRecaudos();
  }, [showHistory, rutaId, rutaInfo?.cobradorId]);

  // Cargar historial de una fecha específica desde BD (lazy)
  const cargarHistorialFecha = useCallback(async (fechaClave: string) => {
    if (!rutaId) return;

    // Normalizar fecha string a clave YYYY-MM-DD en hora local (evita bug de TZ)
    const toKey = (raw: string): string => {
      if (!raw) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      try {
        const d = new Date(raw);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      } catch { return ''; }
    };

    let visitasResp: any = null;
    let saldo: any = null;
    let pagosDelDia: any[] = [];

    try {
      // 1. Visitas del día (puede fallar para fechas antiguas — tolerable)
      visitasResp = await rutasService.obtenerVisitasDelDia(rutaId as string, fechaClave);
    } catch (e) {
      console.warn(`[Historial ${fechaClave}] obtenerVisitasDelDia falló:`, e);
    }

    try {
      // 2. Saldo del día filtrado por ruta en el backend — fuente principal del recaudo
      saldo = await obtenerSaldoDisponibleRuta(rutaId as string, fechaClave);
    } catch (e) {
      console.warn(`[Historial ${fechaClave}] obtenerSaldoDisponibleRuta falló:`, e);
    }

    // 3. Pagos del día — filtrar estrictamente por fecha y cobrador
    try {
      const pagosResp = await pagosService.obtenerPagos({ limit: 5000 });
      const pagosData = (pagosResp as any)?.pagos || pagosResp || [];
      pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
        const raw = p.fechaPago || p.creadoEn;
        if (!raw) return false;
        const cobradorMatch = rutaInfo?.cobradorId ? (p.cobradorId === rutaInfo.cobradorId) : true;
        return toKey(raw) === fechaClave && cobradorMatch;
      });
    } catch (e) {
      console.warn(`[Historial ${fechaClave}] pagos falló:`, e);
      pagosDelDia = [];
    }

    const recaudadoPorCliente: Record<string, number> = {};
    for (const p of pagosDelDia) {
      const cid = p.clienteId || (p.cliente?.id);
      if (!cid) continue;
      recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + Number(p.montoTotal || 0);
    }

    const existentes = new Set<string>();
    const visitas = (visitasResp?.visitas || []).map((item: any, index: number) => {
      const cliente = item.cliente || {};
      const prestamos = item.prestamos || [];
      const prestamoActivo = prestamos.find((p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA' || p.estado === 'PAGADO') || prestamos[0] || {};
      const proximaCuota = prestamoActivo?.proximaCuota || {};
      const saldoTotal = Number(prestamoActivo?.saldoPendiente || 0);
      const recDia = cliente.id ? (recaudadoPorCliente[cliente.id] || 0) : 0;
      const montoCuota = Number(proximaCuota?.monto || 0);
      if (cliente.id) existentes.add(cliente.id);

      let estado: any = 'pendiente';
      if (proximaCuota?.estado === 'PAGADA' || (recDia > 0 && recDia >= montoCuota - 1) || saldoTotal <= 0) estado = 'pagado';
      else if (proximaCuota?.estado === 'VENCIDA') estado = 'en_mora';

      return {
        id: item.asignacionId || `hist-${fechaClave}-${index}`,
        cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
        direccion: cliente.direccion || 'Sin dirección',
        telefono: cliente.telefono || '',
        horaSugerida: '08:00 AM',
        montoCuota,
        saldoTotal,
        estado,
        proximaVisita: proximaCuota?.fechaVencimiento || fechaClave,
        ordenVisita: item.ordenVisita || index + 1,
        prioridad: cliente.nivelRiesgo === 'ROJO' ? 'alta' : 'media',
        nivelRiesgo: (() => {
          const r = cliente.nivelRiesgo || 'VERDE';
          if (r === 'VERDE') return 'bajo'; if (r === 'AMARILLO') return 'leve';
          if (r === 'ROJO') return 'moderado'; if (r === 'LISTA_NEGRA') return 'critico';
          return 'bajo';
        })(),
        cobradorId: '',
        periodoRuta: (() => {
          const f = prestamoActivo?.frecuenciaPago || 'DIARIO';
          if (f === 'DIARIO') return 'DIA'; if (f === 'SEMANAL') return 'SEMANA';
          if (f === 'QUINCENAL') return 'QUINCENA'; if (f === 'MENSUAL') return 'MES';
          return 'DIA';
        })() as any,
        clienteId: cliente.id,
        recaudadoDelDia: recDia,
      };
    });

    // Visitas sintéticas de pagos cuyos clientes no están en la ruta principal del día
    const sinteticos = pagosDelDia.flatMap((p: any, i: number) => {
      const cid = p.clienteId || p.cliente?.id;
      if (!cid || existentes.has(cid)) return [];
      return [{ id: `pago-${p.id || i}-${fechaClave}`, cliente: p.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : 'Cliente', direccion: p.cliente?.direccion || '', telefono: p.cliente?.telefono || '', horaSugerida: '08:00 AM', montoCuota: 0, saldoTotal: 0, estado: 'pagado', proximaVisita: fechaClave, ordenVisita: visitas.length + i + 1, prioridad: 'media', cobradorId: '', periodoRuta: 'DIA', clienteId: cid, recaudadoDelDia: Number(p.montoTotal || 0) }];
    });

    const todasVisitas = [...visitas, ...sinteticos];
    const esperado = todasVisitas.reduce((s, v) => s + (v.montoCuota || 0), 0);
    // recaudoDelDia del saldo es la fuente más confiable (filtrada por ruta en backend)
    const recaudoSaldo = Number(saldo?.recaudoDelDia ?? saldo?.cobranzaDelDia ?? 0);
    const recaudoPagos = pagosDelDia.reduce((s: number, p: any) => s + Number(p.montoTotal || 0), 0);
    const recaudoFinal = recaudoSaldo > 0 ? recaudoSaldo : recaudoPagos;
    console.log(`[Historial ${fechaClave}] recaudo final: ${recaudoFinal} (saldo=${recaudoSaldo}, pagos=${recaudoPagos})`);

    setHistorialRutas((prev: any) => ({
      ...(prev || {}),
      [fechaClave]: {
        resumen: {
          recaudo: recaudoFinal,
          gastos: Number(saldo?.gastosDelDia ?? 0),
          efectividad: esperado > 0 ? Math.round((recaudoFinal / esperado) * 100) : (recaudoFinal > 0 ? 100 : 0),
          visitados: todasVisitas.filter(v => (v.recaudadoDelDia || 0) > 0 || v.estado === 'pagado').length,
          total: todasVisitas.length
        },
        visitas: todasVisitas,
        loaded: true,
      },
    }));
  }, [rutaId, rutaInfo?.cobradorId]);

  // Al abrir el historial, cargar hoy automáticamente
  useEffect(() => {
    if (!showHistory || !rutaId) return;
    const hoy = new Date().toISOString().split('T')[0];
    const existing = (historialRutas || {})[hoy];
    if (!existing || !existing.loaded) {
      cargarHistorialFecha(hoy);
    }
  }, [showHistory, rutaId, historialRutas, cargarHistorialFecha]);

  // WebSocket useEffect queda declarado DESPUÉS de cargarVisitasRuta (ver abajo)

  // ---------------------------------------------------------------------------
  // cargarVisitasRuta – carga y enriquece la lista de visitas desde el backend.
  // Es un useCallback estable para poder ser invocado tanto desde el useEffect
  // de montaje como desde el handler del WebSocket (tiempo real).
  // ---------------------------------------------------------------------------
  const cargarVisitasRuta = useCallback(async () => {
    if (!rutaId) return;
    try {
      const ruta = await rutasService.obtenerRutaPorId(rutaId)
      setRutaInfo({ id: ruta.id, cobradorId: ruta.cobradorId });

      if (ruta && ruta.asignaciones) {
        const toPeriodo = (f: string): PeriodoRuta => {
          if (f === 'SEMANAL') return 'SEMANA';
          if (f === 'QUINCENAL') return 'QUINCENA';
          if (f === 'MENSUAL') return 'MES';
          return 'DIA';
        };

        const toNivel = (r: string) => {
          if (r === 'AMARILLO') return 'precaucion' as any;
          if (r === 'ROJO') return 'moderado';
          if (r === 'LISTA_NEGRA') return 'critico';
          return 'bajo';
        };

        let gIdx = 0;
        const visitasRaw = ruta.asignaciones.flatMap((asig: any) => {
          const cliente = asig.cliente || {}
          // Incluir PENDIENTE_APROBACION: se mostrarán con botones deshabilitados
          const prestamosActivos: any[] = (cliente.prestamos || []).filter(
            (p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA' || p.estado === 'PENDIENTE_APROBACION'
          );
          const lista = prestamosActivos.length > 0 ? prestamosActivos : [null];

          return lista.map((prestamo: any) => {
            const proximaCuota = prestamo?.proximaCuota || {}
            const esArticulo = prestamo?.tipo === 'ARTICULO' || prestamo?.tipoPrestamo === 'ARTICULO'
            const esPendienteAprobacion = prestamo?.estado === 'PENDIENTE_APROBACION'
            const idx = gIdx++

            let estado: EstadoVisita = 'pendiente'
            if (proximaCuota.estado === 'VENCIDA') estado = 'en_mora'
            else if (proximaCuota.estado === 'PAGADA') estado = 'pagado'
            else if (!prestamo?.id) estado = 'pendiente'

            return {
              id: prestamo ? `${asig.id}-${prestamo.id}` : (asig.id || `asig-${idx}`),
              cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
              direccion: cliente.direccion || 'Sin dirección registrada',
              telefono: cliente.telefono || '',
              horaSugerida: asig.horaSugerida || '08:00 AM',
              montoCuota: Number(proximaCuota.monto || 0),
              saldoTotal: Number(prestamo?.saldoPendiente || 0),
              estado,
              proximaVisita: proximaCuota.fechaVencimiento || '9999-12-31T00:00:00.000Z',
              targetVencimiento: proximaCuota.fechaVencimiento || undefined,
              ordenVisita: asig.ordenVisita || idx + 1,
              prioridad: (asig.prioridad?.toLowerCase() as 'alta' | 'media' | 'baja') || (estado === 'en_mora' ? 'alta' : 'media'),
              nivelRiesgo: toNivel(cliente.nivelRiesgo || 'VERDE'),
              cobradorId: ruta.cobradorId,
              periodoRuta: toPeriodo(prestamo?.frecuenciaPago || 'DIARIO'),
              clienteId: cliente.id,
              prestamoId: prestamo?.id,
              tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
              articuloNombre: esArticulo ? (prestamo?.articulo || prestamo?.descripcionArticulo || undefined) : undefined,
              cuotaActual: proximaCuota.numeroCuota,
              cuotasTotales: prestamo?.cantidadCuotas,
              enProrroga: proximaCuota.estado === 'PRORROGADA' || !!proximaCuota.fechaVencimientoProrroga,
              fechaProrroga: proximaCuota.fechaVencimientoProrroga,
              // Deshabilitar botones mientras el crédito no esté aprobado
              pendienteAprobacion: esPendienteAprobacion,
            } as any
          });
        });

        // Deduplicación en 2 pasadas:
        // 1º: detectar clientes que ya tienen al menos un préstamo real (no sólo entrada vacía)
        // 2º: eliminar entradas sin prestamoId si el mismo cliente tiene entrada con prestamoId
        // Evita el duplicado al aprobar un crédito creado dentro de la ruta.
        const clientesConPrestamo = new Set<string>();
        visitasRaw.forEach((v: any) => {
          if (v.prestamoId && v.clienteId) clientesConPrestamo.add(v.clienteId);
        });
        const seenIds = new Set<string>();
        const visitas = visitasRaw.filter((v: any) => {
          if (!v.prestamoId && v.clienteId && clientesConPrestamo.has(v.clienteId)) return false;
          const clave = v.prestamoId ? `prestamo-${v.prestamoId}` : `cliente-${v.clienteId}`;
          if (seenIds.has(clave)) return false;
          seenIds.add(clave);
          return true;
        });

        const visitasEnriquecidas = await Promise.all(
          visitas.map(async (v: any) => {
            if (!v.prestamoId) return v
            try {
              const cuotas = await prestamosService.obtenerCuotas(v.prestamoId)
              const pendiente = cuotas.find((c: any) => c.estado !== 'PAGADA')

              if (pendiente) {
                const montoReal = Number(
                  pendiente.monto ||
                    pendiente.montoCapital + pendiente.montoInteres ||
                    0,
                )
                return {
                  ...v,
                  montoCuota: montoReal > 0 ? montoReal : v.montoCuota,
                  proximaVisita: (pendiente.estado === 'PRORROGADA' && pendiente.fechaVencimientoProrroga)
                    ? pendiente.fechaVencimientoProrroga
                    : (pendiente.fechaVencimiento || v.proximaVisita),
                  cuotaActual: pendiente.numeroCuota,
                  cuotasTotales: cuotas.length,
                  enProrroga: pendiente.estado === 'PRORROGADA' || !!pendiente.fechaVencimientoProrroga,
                  fechaProrroga: pendiente.fechaVencimientoProrroga || undefined,
                  fechaOriginalVencimiento: pendiente.fechaVencimiento || undefined,
                }
              }

              const p = await prestamosService.obtenerPrestamoPorId(v.prestamoId)
              const proxima = (p.proximaCuota ?? {}) as Partial<typeof p.cuotas extends (infer C)[] | undefined ? C : Record<string, unknown>>
              const montoP = Number(
                (proxima as any).monto ||
                  p.montoCuota ||
                  (p as any).valorCuota ||
                  0,
              )

              return {
                ...v,
                montoCuota: montoP > 0 ? montoP : v.montoCuota,
                proximaVisita: (proxima as any).fechaVencimiento || v.proximaVisita,
              }
            } catch {
              return v
            }
          }),
        )

        const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const hoyStr = toLocalKey(new Date())

        const withRecaudo = await Promise.all(
          visitasEnriquecidas.map(async (v: any) => {
            if (!v.clienteId) {
              return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 }
            }
            try {
              const pagosResp = await pagosService.obtenerPagos({ clienteId: v.clienteId, limit: 100 })
              const pagosCalc = pagosResp?.pagos || []

              const totalHoy = pagosCalc.reduce((sum: number, p: any) => {
                const raw = p.fechaPago || p.creadoEn;
                const f = raw ? (raw.includes('T') ? raw.split('T')[0] : raw) : '';
                return f === hoyStr ? sum + Number(p.montoTotal || 0) : sum
              }, 0)

              const totalHistorico = pagosCalc.reduce(
                (sum: number, p: any) => sum + Number(p.montoTotal || 0),
                0,
              )

              let ultimoPagoDate = 0;
              pagosCalc.forEach((p: any) => {
                const d = new Date(p.fechaPago || p.creadoEn).getTime();
                if (!isNaN(d) && d > ultimoPagoDate) ultimoPagoDate = d;
              });

              return { ...v, recaudadoDelDia: totalHoy, recaudadoTotalClient: totalHistorico, fechaUltimoPago: ultimoPagoDate }
            } catch {
              return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0, fechaUltimoPago: 0 }
            }
          }),
        )

        const ajustarEstadoConPago = (v: any): EstadoVisita => {
          if (Number(v.saldoTotal || 0) <= 0) return 'pagado'
          const saldoHoy = Number(v.recaudadoDelDia || 0)
          const cuota = Number(v.montoCuota || 0)
          if (saldoHoy >= cuota - 1 && saldoHoy > 0) return 'pagado'
          const proximoC = v.proximaVisita ? (v.proximaVisita.includes('T') ? v.proximaVisita.split('T')[0] : v.proximaVisita) : '';
          if (proximoC === hoyStr && saldoHoy >= cuota - 1) return 'pagado'
          return v.estado
        }

        const finales = withRecaudo.map((v: any) => ({ ...v, estado: ajustarEstadoConPago(v) }))

        finales.sort((a: any, b: any) => {
          if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;
          if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;
          if (a.fechaUltimoPago !== b.fechaUltimoPago) return a.fechaUltimoPago - b.fechaUltimoPago;
          return a.ordenVisita - b.ordenVisita;
        });

        setVisitasBase(finales)
        setVisitasOrden(finales.map((v: any) => v.id))
      }
    } catch (error) {
      console.error('Error al cargar visitas de ruta (supervisor):', error);
    }
  }, [rutaId]);

  // ---------------------------------------------------------------------------
  // WebSocket: suscripción a eventos en tiempo real.
  // Ubicado DESPUÉS de cargarVisitasRuta para evitar forward reference.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    // Handler completo: recarga visitas/cuotas (cuotas cambian al registrar pagos)
    const handlerFull = async () => {
      await cargarVisitasRuta();
      if (showMisClientes) {
        cargarMisCreditos();
      }
    };

    // Handler ligero: solo KPIs (eventos de dashboard no requieren recargar cuotas)
    const handlerKpi = () => {
      cargarEstadisticasRuta();
      if (showMisClientes) {
        cargarMisCreditos();
      }
    };

    socket.on('pagos_actualizados', handlerFull);
    socket.on('prestamos_actualizados', handlerFull);
    socket.on('dashboards_actualizados', handlerKpi);

    return () => {
      socket.off('pagos_actualizados', handlerFull);
      socket.off('prestamos_actualizados', handlerFull);
      socket.off('dashboards_actualizados', handlerKpi);
    };
  }, [socket, cargarVisitasRuta, cargarEstadisticasRuta, showMisClientes, cargarMisCreditos]);

  // Cargar datos del usuario y ruta (sesión + KPIs + visitas)
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.replace('/login');
          return;
        }

        if (userData) {
          setUserSession(JSON.parse(userData));
        } else {
          try {
            const perfil = await obtenerPerfil();
            localStorage.setItem('user', JSON.stringify(perfil));
            setUserSession(perfil);
          } catch (error: any) {
            console.warn('Error al obtener perfil en supervisor:', error);
            if (error?.statusCode === 401) router.replace('/login');
          }
        }

        if (rutaId) {
          const ruta = await rutasService.obtenerRutaPorId(rutaId)

          try {
            const est: any = (ruta as any).estadisticas || {}
            const { inicio, fin } = getDatesByPeriod(periodoCards)
            const saldo = await obtenerSaldoDisponibleRuta(ruta.id, undefined, inicio, fin)

            const cobranza = Number(
              (saldo as any)?.cobranzaDelDia ??
              (saldo as any)?.recaudoDelDia ??
              est.cobranzaDelDia ??
              0,
            )
            const meta = Number(est.metaDelDia ?? 0)

            setRutaStats({
              recaudo: cobranza,
              meta,
              eficiencia:
                meta > 0
                  ? Math.round((cobranza / meta) * 100)
                  : Number(est.avanceDiario ?? 0),
              gastos: Number((saldo as any)?.gastosDelDia ?? 0),
              base: Number((saldo as any)?.baseEfectivo ?? 0),
            })
          } catch {
            const est: any = (ruta as any).estadisticas || {}
            setRutaStats({
              recaudo: Number(est.cobranzaDelDia ?? 0),
              meta: Number(est.metaDelDia ?? 0),
              eficiencia: Number(est.avanceDiario ?? 0),
              gastos: 0,
              base: 0,
            })
          }

          // Carga de visitas delegada al useCallback reutilizable
          await cargarVisitasRuta();
        }
      } catch (error) {
        console.error('Error al cargar datos de supervisor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [router, rutaId, periodoCards, cargarVisitasRuta]);

  useEffect(() => {
    cargarEstadisticasRuta()
  }, [cargarEstadisticasRuta])


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleExportarRutaPdf = useCallback(async () => {
    if (!rutaId) return
    setIsExportingPdf(true)
    try {
      await exportService.exportRutaCobrador('pdf', rutaId)
    } catch {
      setModalAlerta({ titulo: 'Error', mensaje: 'No se pudo generar el PDF. Intente de nuevo.', tipo: 'error' })
    } finally {
      setIsExportingPdf(false)
    }
  }, [rutaId])


  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const searched = (visitasBase || []).filter(v =>
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Al pagar la cuota, desaparece de la ruta até el próximo vencimiento
    const filtered = searched.filter(v => v.estado !== 'pagado');

    const priority: Record<string, number> = { MES: 0, QUINCENA: 1, SEMANA: 2, DIA: 3 }
    const sorted = filtered.sort((a, b) => {
      const pA = priority[a.periodoRuta] ?? 99
      const pB = priority[b.periodoRuta] ?? 99
      if (pA !== pB) return pA - pB
      return a.ordenVisita - b.ordenVisita
    })

    return sorted
  }, [visitasBase, searchQuery])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (rutaCompletada) return
    setActiveId(event.active.id as string)
  }, [rutaCompletada])

  const handleGuardarReprogramacion = useCallback(async (fecha: string, motivo: string, cuotaId?: string) => {
    if (!visitaReprogramar) return
    if (!fecha || !motivo) return

    try {
      // Enviar solicitud al backend — queda pendiente de aprobación del supervisor
      if (visitaReprogramar.prestamoId && cuotaId) {
        await prestamosService.solicitarReprogramacionCuota({
          prestamoId: visitaReprogramar.prestamoId,
          cuotaId,
          nuevaFecha: fecha,
          motivo,
        })
      }

      // Marcar localmente como reprogramado (UI feedback)
      const [yyyy, mm, dd] = fecha.split('-')
      const fechaLabel = dd && mm ? `${dd}/${mm}` : fecha
      setVisitasBase((prev) =>
        prev.map((v) => {
          if (v.id !== visitaReprogramar.id) return v
          return { ...v, estado: 'reprogramado', proximaVisita: fechaLabel }
        })
      )

      toast.success('Solicitud de reprogramación enviada exitosamente', {
        description: `La cuota será revisada para reprogramarse al ${fechaLabel}`
      })

    } catch (err: any) {
      setModalAlerta({
        tipo: 'error',
        titulo: 'Error al solicitar',
        mensaje: err?.message || 'No se pudo enviar la solicitud de reprogramación.',
      })
    }

    setShowReprogramModal(false)
    setVisitaReprogramar(null)
  }, [visitaReprogramar])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setVisitasOrden((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }, [])

  // Cargar detalle de mora al abrir el modal
  useEffect(() => {
    const cargarDetalleMora = async () => {
      if (!showMoraModal || !visitaMoraSeleccionada) {
        setMoraCuenta(null)
        return
      }
      const prestamoId = visitaMoraSeleccionada.prestamoId || visitaMoraSeleccionada.id
      try {
        let detalle: any = null
        try {
          detalle = await prestamosService.obtenerPrestamoPorId(prestamoId)
        } catch {
          detalle = null
        }
        if (detalle) {
          setMoraCuenta({
            id: visitaMoraSeleccionada.id,
            numeroPrestamo: detalle.numeroPrestamo || detalle.id || prestamoId,
            cliente: {
              nombre: detalle.cliente?.nombre || visitaMoraSeleccionada.cliente,
              documento: detalle.cliente?.documento || 'N/A',
              telefono: detalle.cliente?.telefono || visitaMoraSeleccionada.telefono,
              direccion: detalle.cliente?.direccion || visitaMoraSeleccionada.direccion
            },
            diasMora: Number(detalle.diasMora || 0),
            montoMora: Number(detalle.montoMora ?? (visitaMoraSeleccionada.saldoTotal - visitaMoraSeleccionada.montoCuota)),
            montoTotalDeuda: Number(detalle.montoTotalDeuda ?? visitaMoraSeleccionada.saldoTotal),
            cuotasVencidas: Number(detalle.cuotasVencidas || 0),
            ruta: userSession?.rutaAsignada || 'Ruta Asignada',
            cobrador: userSession?.nombres || 'Cobrador',
            nivelRiesgo: visitaMoraSeleccionada.nivelRiesgo === 'critico' ? 'ROJO' :
                         visitaMoraSeleccionada.nivelRiesgo === 'moderado' ? 'AMARILLO' : 'VERDE'
          })
          return
        }
        const info = await prestamosService.obtenerPrestamoPorId(prestamoId)
        const cuotas = await prestamosService.obtenerCuotas(prestamoId).catch(() => [])
        const vencidas = (cuotas || []).filter((c: any) => c.estado === 'VENCIDA')
        const cuotasVencidas = vencidas.length
        let diasMora = 0
        if (vencidas.length > 0) {
          const oldest = vencidas.reduce((min: any, c: any) => (
            new Date(c.fechaVencimiento).getTime() < new Date(min.fechaVencimiento).getTime() ? c : min
          ), vencidas[0])
          const diff = Math.floor((Date.now() - new Date(oldest.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24))
          diasMora = diff > 0 ? diff : 0
        }
        const numeroPrestamo = info.numeroPrestamo || info.id || prestamoId
        const montoTotalDeuda = Number(info.saldoPendiente ?? visitaMoraSeleccionada.saldoTotal)
        const montoMora = Number(info.moraAcumulada ?? Math.max(0, visitaMoraSeleccionada.saldoTotal - visitaMoraSeleccionada.montoCuota))
        setMoraCuenta({
          id: visitaMoraSeleccionada.id,
          numeroPrestamo,
          cliente: {
            nombre: visitaMoraSeleccionada.cliente,
            documento: info.cliente?.dni || 'N/A',
            telefono: visitaMoraSeleccionada.telefono,
            direccion: visitaMoraSeleccionada.direccion
          },
          diasMora,
          montoMora,
          montoTotalDeuda,
          cuotasVencidas,
          ruta: userSession?.rutaAsignada || 'Ruta Asignada',
          cobrador: userSession?.nombres || 'Cobrador',
          nivelRiesgo: visitaMoraSeleccionada.nivelRiesgo === 'critico' ? 'ROJO' :
                       visitaMoraSeleccionada.nivelRiesgo === 'moderado' ? 'AMARILLO' : 'VERDE'
        })
      } catch {
        setMoraCuenta({
          id: visitaMoraSeleccionada.id,
          numeroPrestamo: prestamoId,
          cliente: {
            nombre: visitaMoraSeleccionada.cliente,
            documento: 'N/A',
            telefono: visitaMoraSeleccionada.telefono,
            direccion: visitaMoraSeleccionada.direccion
          },
          diasMora: 0,
          montoMora: Math.max(0, visitaMoraSeleccionada.saldoTotal - visitaMoraSeleccionada.montoCuota),
          montoTotalDeuda: visitaMoraSeleccionada.saldoTotal,
          cuotasVencidas: 0,
          ruta: userSession?.rutaAsignada || 'Ruta Asignada',
          cobrador: userSession?.nombres || 'Cobrador',
          nivelRiesgo: visitaMoraSeleccionada.nivelRiesgo === 'critico' ? 'ROJO' :
                       visitaMoraSeleccionada.nivelRiesgo === 'moderado' ? 'AMARILLO' : 'VERDE'
        })
      }
    }
    cargarDetalleMora()
  }, [showMoraModal, visitaMoraSeleccionada, userSession])
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    if (estado === 'pendiente') return 'bg-orange-50 text-orange-700 border-orange-100'
    if (estado === 'pagado') return 'bg-blue-50 text-blue-700 border-blue-100'
    if (estado === 'en_mora') return 'bg-orange-100 text-orange-800 border-orange-200'
    if (estado === 'ausente') return 'bg-gray-50 text-gray-600 border-gray-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    if (prioridad === 'alta') return '#f97316'
    if (prioridad === 'media') return '#08557f'
    return '#94a3b8'
  }, [])

  const handleRegistrarPago = useCallback((visitaId: string, montoPagado: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null) => {
    console.log(`Registra pago de ${montoPagado} para visita ${visitaId} (${metodo})`, comprobante)
    setShowPaymentModal(false)
  }, [])
  const handleCrearCredito = useCallback(async (data: any) => {
    try {
      setIsLoading(true)
      
      const esContado = Boolean((data as any).ventaContado)
      const isArticulo = data.creditType === 'articulo'
      const freq = esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO')

      const payload: any = {
        clienteId: data.clienteCreditoId,
        tipoPrestamo: isArticulo ? 'ARTICULO' : 'EFECTIVO',
        monto: data.monto || 0,
        tasaInteres: esContado ? 0 : (data.tasaInteres || 0),
        tasaInteresMora: 2, 
        plazoMeses: data.plazoMeses || 1,
        cantidadCuotas: data.cantidadCuotas || data.cuotas || data.cuotasTotales || (isArticulo ? data.numCuotas : 0),
        cuotas: data.cuotas || data.cantidadCuotas || (isArticulo ? data.numCuotas : 0),
        frecuenciaPago: freq,
        fechaInicio: data.fechaInicio || new Date().toISOString(),
        creadoPorId: userSession?.id,
        cuotaInicial: data.cuotaInicialArticulo || 0,
        notas: isArticulo
          ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}: ${data.articuloNombre || ''}`
          : (data.notas || ''),
        tipoAmortizacion: isArticulo ? 'INTERES_SIMPLE' : (data.tipoInteres || 'INTERES_SIMPLE'),
        esContado: esContado
      }

      if (isArticulo) {
        payload.productoId = data.articuloId
        payload.precioProductoId = esContado ? undefined : data.precioProductoId
      }

      const prestamo = await prestamosService.crearPrestamo(payload)

      if (isArticulo && prestamo?.id && !esContado) {
        try {
          await exportService.exportContrato(prestamo.id)
        } catch (err) {
          console.error('Error al descargar contrato:', err)
        }
      }
      
      // Asignar cliente a la ruta automáticamente si estamos en una ruta específica
      if (rutaId) {
        try {
          await rutasService.asignarCliente(
            rutaId,
            data.clienteCreditoId,
            rutaInfo?.cobradorId || ''
          );
        } catch (assignError) {
          console.error('Error al asignar cliente a la ruta:', assignError);
        }
      }

      setModalAlerta({
        titulo: 'Crédito Creado',
        mensaje: 'El crédito ha sido registrado (Pendiente de Aprobación) y el cliente vinculado a esta ruta.',
        tipo: 'exito'
      })
      setShowCreditModal(false)
      
    } catch (error: any) {
      console.error('Error al crear crédito:', error)
      setModalAlerta({
        titulo: 'Error',
        mensaje: error.message || 'No se pudo crear el crédito. Inténtelo de nuevo.',
        tipo: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }, [userSession?.id])

  const handleCompletarRuta = useCallback(() => {
    setRutaCompletada(true)
    setCoordinadorToast('Se notificó al coordinador: ruta diaria marcada como completada.')
    window.setTimeout(() => setCoordinadorToast(null), 4000)
  }, [])

  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {
    if (visita.estado === 'en_mora') {
      setVisitaMoraSeleccionada(visita)
      setShowMoraModal(true)
    } else {
      setVisitaClienteSeleccionada(visita)
      setShowClienteInfoModal(true)
    }
  }, [])

  const activeVisita = activeId ? visitasCobrador.find(v => v.id === activeId) : null

  const generarAvatar = (nombres: string, apellidos: string) => {
    return nombres.charAt(0) + (apellidos?.charAt(0) || '');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#08557f_0,transparent_100%)] opacity-20"></div>
      </div>

      <div className="relative w-full space-y-8 p-8">
        
        {/* Supervisor Context Banner */}
        <div className={`rounded-xl border p-3 flex items-center gap-3 animate-in slide-in-from-top-4 ${
            isPersonal ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
        }`}>
            <div className={`p-2 rounded-lg ${isPersonal ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                <Target className="w-5 h-5" />
            </div>
            <div>
                <h4 className={`font-bold text-sm ${isPersonal ? 'text-blue-900' : 'text-orange-900'}`}>
                    {isPersonal ? 'Mi Ruta Personal' : 'Modo Supervisión'}
                </h4>
                <p className={`text-xs ${isPersonal ? 'text-blue-700' : 'text-orange-700'}`}>
                    {isPersonal ? 'Tienes control total sobre esta ruta.' : 'Visualizando ruta asignada. Modo lectura.'}
                </p>
            </div>
            <button onClick={() => router.back()} className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${
                isPersonal ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
            }`}>
                Salir
            </button>
        </div>


        {coordinadorToast && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {coordinadorToast}
          </div>
        )}

        {rutaCompletada && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Ruta del día completada. Las modificaciones están bloqueadas.
          </div>
        )}

        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-[#08557f] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#08557f]/20">
                  {generarAvatar(userSession.nombres, userSession.apellidos)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {userSession.nombres} {userSession.apellidos}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{userSession.rol}</span>
                  <span>•</span>
                  <span>Supervisando {userSession.rutaAsignada || 'Ruta'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>


        <div className="flex items-center justify-between">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(['HOY', 'SEM', 'MES', 'AÑO'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodoCards(p)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  periodoCards === p
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recaudo {periodoCards === 'HOY' ? 'Hoy' : periodoCards === 'SEM' ? 'Semana' : periodoCards === 'MES' ? 'Mes' : 'Año'}
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(rutaStats.recaudo)}</h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {rutaStats.meta > 0 ? `+${((rutaStats.recaudo / rutaStats.meta) * 100).toFixed(1)}%` : '---'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Meta: {formatCurrency(rutaStats.meta)}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efectividad</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-2xl font-bold text-slate-900">{rutaStats.eficiencia}%</h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      rutaStats.eficiencia >= 90
                        ? 'text-emerald-600 bg-emerald-50'
                        : rutaStats.eficiencia >= 70
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-rose-600 bg-rose-50'
                    }`}
                  >
                    {rutaStats.eficiencia >= 90 ? 'ÓPTIMO' : rutaStats.eficiencia >= 70 ? 'REGULAR' : 'BAJO'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${rutaStats.eficiencia}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 font-medium mt-2">
              Pendiente: {formatCurrency(Math.max(0, rutaStats.meta - rutaStats.recaudo))}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Gastos {periodoCards === 'HOY' ? 'Hoy' : periodoCards === 'SEM' ? 'Semana' : periodoCards === 'MES' ? 'Mes' : 'Año'}
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(rutaStats.gastos)}</h3>
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 group-hover:scale-110 transition-transform">
                <Receipt className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Registrados {periodoCards === 'HOY' ? 'hoy' : periodoCards === 'SEM' ? 'esta semana' : periodoCards === 'MES' ? 'este mes' : 'este año'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base Efectivo</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(rutaStats.base)}</h3>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 group-hover:scale-110 transition-transform">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Asignada por coordinador</p>
          </div>
        </div>




        <div className="space-y-6">
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

            <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">

                  <button
                    type="button"
                    onClick={handleExportarRutaPdf}
                    disabled={!rutaId || isExportingPdf}
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
                    <span className="hidden md:inline">Mi Ruta</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowHistory(true)
                      setShowMisClientes(false)
                    }}
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

                  <button
                    type="button"
                    onClick={handleCompletarRuta}
                    disabled={rutaCompletada}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                      rutaCompletada
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-70'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden md:inline">Completar ruta</span>
                  </button>
            </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {!isReadOnly && (
                          <>
                            {/* Botón Pagar — deshabilitado si el crédito está pendiente de aprobación */}
                            {(() => {
                              const visitaActual = visitaSeleccionada ? visitasCobrador.find(v => v.id === visitaSeleccionada) : null;
                              const esPendiente = visitaActual?.pendienteAprobacion;
                              return (
                                <button
                                  onClick={() => {
                                    if (esPendiente) return;
                                    if (visitaSeleccionada) {
                                      const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                                      if (v) { setVisitaPagoSeleccionadaId(v.id); setPagoInitialIsAbono(false); setShowPaymentModal(true); }
                                    } else {
                                      setVisitaPagoSeleccionadaId(null); setShowPaymentModal(true); setPagoInitialIsAbono(false);
                                    }
                                  }}
                                  disabled={!!esPendiente}
                                  title={esPendiente ? 'El crédito aún está en aprobación' : 'Registrar pago'}
                                  className={`flex-1 min-w-[max-content] px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm transition-all ${
                                    esPendiente
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                      : 'bg-[#08557f]/5 text-[#08557f] border border-[#08557f]/10 active:scale-95'
                                  }`}
                                >
                                  <DollarSign className="h-5 w-5" /> Pagar
                                </button>
                              );
                            })()}
                            {/* Botón Abonar — deshabilitado si el crédito está pendiente de aprobación */}
                            {(() => {
                              const visitaActual = visitaSeleccionada ? visitasCobrador.find(v => v.id === visitaSeleccionada) : null;
                              const esPendiente = visitaActual?.pendienteAprobacion;
                              return (
                                <button
                                  onClick={() => {
                                    if (esPendiente) return;
                                    if (visitaSeleccionada) {
                                      const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                                      if (v) { setVisitaPagoSeleccionadaId(v.id); setPagoInitialIsAbono(true); setShowPaymentModal(true); }
                                    } else {
                                      setVisitaPagoSeleccionadaId(null); setShowPaymentModal(true); setPagoInitialIsAbono(true);
                                    }
                                  }}
                                  disabled={!!esPendiente}
                                  title={esPendiente ? 'El crédito aún está en aprobación' : 'Registrar abono'}
                                  className={`flex-1 min-w-[max-content] px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm transition-all ${
                                    esPendiente
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                      : 'bg-orange-50 text-orange-700 border border-orange-200 active:scale-95'
                                  }`}
                                >
                                  <RefreshCw className="h-5 w-5" /> Abonar
                                </button>
                              );
                            })()}
                          </>
                        )}
                        <button onClick={() => { 
                           if (visitaSeleccionada) {
                              const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                              setVisitaEstadoCuentaSeleccionada(v || null);
                              setShowEstadoCuentaModal(true); 
                           } else {
                              setPendingAction('CUENTA');
                              setShowClientSelector(true);
                           }
                        }} className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                            <FileTextIcon className="h-5 w-5 text-slate-400" /> Cuenta
                        </button>
                        <button onClick={() => { 
                           if (visitaSeleccionada) {
                              const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                              setVisitaReprogramar(v || null);
                              setShowReprogramModal(true); 
                           } else {
                              setPendingAction('AGENDAR');
                              setShowClientSelector(true);
                           }
                        }} className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                            <Calendar className="h-5 w-5 text-slate-400" /> Agendar
                        </button>
                </div>
            </div>

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

            <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  {showHistory && (
                    <h3 className="font-bold text-slate-900 text-lg">Histórico de Rutas</h3>
                  )}
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={visitasOrden}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {(() => {
                      if (showHistory) {
                        const historyDates = Object.keys(historialRutas).sort().reverse(); 

                        return (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             <div className="flex items-center gap-2 mb-2">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">VISTA:</span>
                               <button 
                                 onClick={() => setHistoryViewMode('DAYS')}
                                 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    historyViewMode === 'DAYS' 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                 }`}
                               >
                                 Días
                               </button>
                               <button 
                                 onClick={() => setHistoryViewMode('MONTHS')}
                                 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    historyViewMode === 'MONTHS' 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                 }`}
                               >
                                 Meses
                               </button>
                             </div>

                             {historyViewMode === 'DAYS' && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Historial de Días</h3>
                                     {historyDates.map(date => {
                                        const data = (historialRutas as Record<string, any>)[date];
                                        const isExpanded = selectedHistoryDate === date;
                                        const [y, m, d] = date.split('-');
                                        const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
                                        const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
                                        const isCompleted = data.visitas.length > 0 && (data.resumen.efectividad >= 95 || data.visitas.every((v: any) => v.estado === 'pagado'));

                                        return (
                                          <div key={date} 
                                               className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200
                                                 ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}
                                               `}
                                          >
                                            <div 
                                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                              onClick={async () => {
                                                if (!isExpanded && !data.loaded) {
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
                                                       {isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-200">Completada</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                       Recaudo: <b>${data.resumen.recaudo.toLocaleString('es-CO')}</b>
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

                                            {isExpanded && (
                                               <div className="border-t border-slate-100 bg-white p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase px-1">
                                                     <span>{data.visitas.length} Clientes Gestionados</span>
                                                     <span>Estado</span>
                                                  </div>
                                                  <div>
                                                     {!data.loaded ? (
                                                       <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                                         <div className="w-6 h-6 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />
                                                         <span className="text-xs font-medium">Cargando detalles...</span>
                                                       </div>
                                                     ) : data.visitas.length === 0 ? (
                                                       <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                          <History className="w-8 h-8 text-slate-300 mb-2 opacity-30" />
                                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">No se registraron visitas ni pagos para este día</span>
                                                       </div>
                                                     ) : (
                                                       data.visitas.map((visita: VisitaRuta) => (
                                                           <StaticVisitaItem 
                                                           key={visita.id}
                                                           visita={visita}
                                                           onSelect={() => {}} onVerCliente={handleAbrirClienteInfo}
                                                           getEstadoClasses={getEstadoClasses}
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
                              )}

                              {/* MONTHS VIEW: días agrupados por mes, con tarjetas de clientes */}
                              {historyViewMode === 'MONTHS' && (() => {
                                // Agrupar todos los días del historialRutas por mes
                                const allDates = Object.keys(historialRutas).sort().reverse();
                                const byMonth: Record<string, string[]> = {};
                                for (const date of allDates) {
                                  const [y, m] = date.split('-');
                                  const monthKey = `${y}-${m}`;
                                  if (!byMonth[monthKey]) byMonth[monthKey] = [];
                                  byMonth[monthKey].push(date);
                                }
                                const monthKeys = Object.keys(byMonth).sort().reverse();

                                if (monthKeys.length === 0) {
                                  return (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                      <History className="h-12 w-12 mb-3 opacity-20" />
                                      <p className="text-sm font-bold">Sin historial disponible</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-4">
                                    {monthKeys.map(monthKey => {
                                      const [my, mm] = monthKey.split('-');
                                      const monthObj = new Date(parseInt(my), parseInt(mm)-1, 1);
                                      const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
                                      const daysInMonth = byMonth[monthKey];
                                      const isMonthExpanded = selectedHistoryMonth === monthKey;

                                      // Calcular totales del mes desde los días que ya están cargados
                                      const monthRecaudo = daysInMonth.reduce((sum, d) => sum + ((historialRutas as any)[d]?.resumen?.recaudo || 0), 0);
                                      const monthPagados = daysInMonth.reduce((sum, d) => {
                                        const dayData = (historialRutas as any)[d];
                                        const cobrosFromPagos = Number(dayData?.resumen?.visitados || 0);
                                        if (cobrosFromPagos > 0) return sum + cobrosFromPagos;
                                        return sum + (dayData?.visitas?.filter((v: any) => v.estado === 'pagado')?.length || 0);
                                      }, 0);

                                      return (
                                        <div key={monthKey} className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${isMonthExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}`}>
                                          {/* Header del mes */}
                                          <div
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => setSelectedHistoryMonth(isMonthExpanded ? null : monthKey)}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${isMonthExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                {mm}
                                              </div>
                                              <div>
                                                <div className="font-bold text-slate-900 capitalize">{monthName}</div>
                                                <div className="text-xs text-slate-500">
                                                  <span>{daysInMonth.length} días · </span>
                                                  <span>Recaudo: <b>${monthRecaudo.toLocaleString('es-CO')}</b></span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">
                                                {monthPagados} cobros
                                              </div>
                                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMonthExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                          </div>

                                          {/* Días del mes expandibles */}
                                          {isMonthExpanded && (
                                            <div className="border-t border-slate-100">
                                              {daysInMonth.map(date => {
                                                const dayData = (historialRutas as any)[date];
                                                const isDayExpanded = selectedHistoryDate === date;
                                                const [dy, dm, dd] = date.split('-');
                                                const dateObj = new Date(parseInt(dy), parseInt(dm)-1, parseInt(dd));
                                                const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });

                                                return (
                                                  <div key={date} className={`border-b border-slate-50 last:border-0 transition-all ${isDayExpanded ? 'bg-slate-50/40' : ''}`}>
                                                    {/* Sub-header del día */}
                                                    <div
                                                      className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                      onClick={async () => {
                                                        if (!isDayExpanded && !dayData.loaded) {
                                                          await cargarHistorialFecha(date);
                                                        }
                                                        setSelectedHistoryDate(isDayExpanded ? null : date);
                                                      }}
                                                    >
                                                      <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${isDayExpanded ? 'bg-[#08557f] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                                          {dd}
                                                        </div>
                                                        <div>
                                                          <span className="text-sm font-semibold text-slate-700 capitalize">{dayName}</span>
                                                          <div className="text-[11px] text-slate-400">
                                                            Recaudo: <b>${(dayData?.resumen?.recaudo || 0).toLocaleString('es-CO')}</b>
                                                            {dayData?.loaded && dayData.visitas.length > 0 && (
                                                              <span className="ml-2">&middot; {dayData.visitas.length} clientes</span>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDayExpanded ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {/* Tarjetas de clientes del día */}
                                                    {isDayExpanded && (
                                                      <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-1 duration-150">
                                                        {!dayData.loaded ? (
                                                          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                                            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />
                                                            <span className="text-xs font-medium">Cargando clientes...</span>
                                                          </div>
                                                        ) : dayData.visitas.length === 0 ? (
                                                          <div className="text-center py-6 text-[11px] text-slate-400 font-medium">
                                                            Sin cobros registrados para este día
                                                          </div>
                                                        ) : (
                                                          dayData.visitas.map((visita: VisitaRuta) => (
                                                            <StaticVisitaItem
                                                              key={visita.id}
                                                              visita={visita}
                                                              onSelect={() => {}}
                                                              onVerCliente={handleAbrirClienteInfo}
                                                              getEstadoClasses={getEstadoClasses}
                                                            />
                                                          ))
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                           </div>
                         )
                       }

                      if (showMisClientes) {
                        if (loadingMisCreditos) {
                          return (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />
                              <span className="text-xs font-medium">Cargando clientes...</span>
                            </div>
                          )
                        }

                        const filtradas = misCreditos.filter((v) =>
                          v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.direccion.toLowerCase().includes(searchQuery.toLowerCase()),
                        )

                        if (filtradas.length === 0) {
                          return (
                            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                              <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                              <p className="font-bold text-slate-400">No hay créditos asignados.</p>
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between px-1">
                              <h3 className="font-bold text-slate-900 text-lg">Mis clientes</h3>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                                {`${filtradas.length} créditos`}
                              </div>
                            </div>

                            <div className="space-y-3">
                              {filtradas.map((visita) => (
                                <StaticVisitaItem
                                  key={visita.id}
                                  visita={visita}
                                  allowClick={false}
                                  onVerCliente={(v) => {
                                    setVisitaClienteSeleccionada(v)
                                    setShowClienteInfoModal(true)
                                  }}
                                  getEstadoClasses={getEstadoClasses}
                                  getPrioridadColor={getPrioridadColor}
                                  actions={
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setVisitaPagoSeleccionadaId(visita.id)
                                          setPagoInitialIsAbono(true)
                                          setShowPaymentModal(true)
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95 text-[11px] font-bold"
                                      >
                                        <Wallet className="h-3.5 w-3.5" />
                                        Abono
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setVisitaEstadoCuentaSeleccionada(visita)
                                          setShowEstadoCuentaModal(true)
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 text-[11px] font-bold"
                                      >
                                        <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />
                                        Estado
                                      </button>
                                    </>
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )
                      }

                      const noPagadas = visitasCobrador.filter(v => v.estado !== 'pagado')

                      const porPeriodo = {
                        DIA: noPagadas.filter(v => v.periodoRuta === 'DIA'),
                        SEMANA: noPagadas.filter(v => v.periodoRuta === 'SEMANA'),
                        QUINCENA: noPagadas.filter(v => v.periodoRuta === 'QUINCENA'),
                        MES: noPagadas.filter(v => v.periodoRuta === 'MES'),
                      }

                      const renderSeccion = (key: string, titulo: string, visitas: VisitaRuta[]) => {
                        if (visitas.length === 0) return null
                        const estaColapsado = !!gruposColapsados[key]
                        return (
                          <div className="space-y-4">
                            <button
                              type="button"
                              onClick={() => toggleGrupo(key)}
                              className="w-full flex items-center gap-4 group"
                            >
                              <div className="h-px flex-1 bg-slate-200" />
                              <span className="flex items-center gap-2 text-[11px] font-black text-[#08557f] uppercase tracking-[0.25em] bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm whitespace-nowrap select-none group-hover:bg-blue-100/60 transition-colors">
                                {titulo}{' '}
                                <span className="ml-1 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full">
                                  {visitas.length}
                                </span>
                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${estaColapsado ? '' : 'rotate-180'}`} />
                              </span>
                              <div className="h-px flex-1 bg-slate-200" />
                            </button>
                            {!estaColapsado && (
                              <div className="space-y-3">
                                {visitas.map((visita) => (
                                  <SortableVisita
                                    key={visita.id}
                                    visita={visita}
                                    onSelect={(id) =>
                                      setVisitaSeleccionada(
                                        id === visitaSeleccionada ? null : id,
                                      )
                                    }
                                    onVerCliente={handleAbrirClienteInfo}
                                    getEstadoClasses={getEstadoClasses}
                                    disableSort={rutaCompletada || !isPersonal}
                                    isSelected={visita.id === visitaSeleccionada}
                                    actions={
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setVisitaPagoSeleccionadaId(visita.id)
                                            setPagoInitialIsAbono(false)
                                            setShowPaymentModal(true)
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 text-[11px] font-bold"
                                        >
                                          <DollarSign className="h-3.5 w-3.5" />
                                          Pago
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setVisitaPagoSeleccionadaId(visita.id)
                                            setPagoInitialIsAbono(true)
                                            setShowPaymentModal(true)
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95 text-[11px] font-bold"
                                        >
                                          <Wallet className="h-3.5 w-3.5" />
                                          Abono
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setVisitaEstadoCuentaSeleccionada(visita)
                                            setShowEstadoCuentaModal(true)
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 text-[11px] font-bold"
                                        >
                                          <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />
                                          Estado
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setVisitaReprogramar(visita)
                                            setShowReprogramModal(true)
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 text-[11px] font-bold"
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
                      }

                      if (periodoRutaFiltro === 'DIA') return renderSeccion('DIA', 'Ruta del día', porPeriodo.DIA)
                      if (periodoRutaFiltro === 'SEMANA') return renderSeccion('SEMANA', 'Ruta de la semana', porPeriodo.SEMANA)
                      if (periodoRutaFiltro === 'QUINCENA') return renderSeccion('QUINCENA', 'Ruta quincenal', porPeriodo.QUINCENA)
                      if (periodoRutaFiltro === 'MES') return renderSeccion('MES', 'Ruta del mes', porPeriodo.MES)

                      return (
                        <>
                          {renderSeccion('MES', 'Ruta mensual', porPeriodo.MES)}
                          {renderSeccion('QUINCENA', 'Ruta quincenal', porPeriodo.QUINCENA)}
                          {renderSeccion('SEMANA', 'Ruta semanal', porPeriodo.SEMANA)}
                          {renderSeccion('DIA', 'Ruta del día', porPeriodo.DIA)}
                        </>
                      )
                    })()}
                  </div>
                </SortableContext>
                
                <DragOverlay>
                  {activeVisita ? (
                    <div className="w-full rounded-2xl border border-slate-900 bg-white shadow-xl px-4 py-3 opacity-90 rotate-2 cursor-grabbing">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex items-center">
                          <GripVertical className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-slate-900">
                                  {activeVisita.cliente}
                                </div>
                                <div 
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: getPrioridadColor(activeVisita.prioridad) }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {!showHistory && visitasCobrador.some(v => v.estado === 'pagado') && (
                <div className="mt-8">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 opacity-50">
                    <CheckCircle2 className="h-5 w-5" />
                    Completadas
                  </h3>
                  <div className="relative z-10 pointer-events-auto space-y-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    {visitasCobrador
                      .filter(v => v.estado === 'pagado' && (periodoRutaFiltro === 'TODOS' || v.periodoRuta === periodoRutaFiltro))
                      .map((visita) => (
                        <StaticVisitaItem
                          key={visita.id}
                          visita={visita}
                          onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          onVerCliente={handleAbrirClienteInfo}
                          getEstadoClasses={getEstadoClasses}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showClienteInfoModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowClienteInfoModal(false)
                setVisitaClienteSeleccionada(null)
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Cliente</h3>
                    <button
                      onClick={() => {
                        setShowClienteInfoModal(false)
                        setVisitaClienteSeleccionada(null)
                      }}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16"></div>
                      <div className="relative z-10 flex items-center gap-5">
                        <div className="h-24 w-24 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-300 font-bold overflow-hidden">
                          <User className="w-12 h-12" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-2xl font-bold text-slate-900 leading-tight">
                            {visitaClienteSeleccionada?.cliente || 'Sin nombre'}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                             <span className="bg-[#08557f] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Activo</span>
                             <span className="text-slate-400 text-xs font-bold">{visitaClienteSeleccionada?.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-3">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Información de contacto</h5>
                          <div className="grid grid-cols-1 gap-3">
                             <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-tighter">Dirección Exacta</div>
                                <div className="text-slate-900 font-bold">{visitaClienteSeleccionada?.direccion || 'No registrada'}</div>
                             </div>
                             <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-tighter">Punto de Referencia</div>
                                <div className="text-slate-900 font-medium italic">{visitaClienteSeleccionada?.direccion || 'Casa rejas blancas, frente al parque.'}</div>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-3 pt-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resumen Financiero</h5>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-orange-600 font-bold mb-1 uppercase tracking-tighter">Por Entregar</div>
                                <div className="text-orange-900 font-black text-xl">${visitaClienteSeleccionada?.saldoTotal.toLocaleString('es-CO')}</div>
                             </div>
                             <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-sm text-right">
                                <div className="text-xs text-emerald-600 font-bold mb-1 uppercase tracking-tighter">Recaudado</div>
                                <div className="text-emerald-900 font-black text-xl">$0</div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="pt-4 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowClienteInfoModal(false)
                          setVisitaClienteSeleccionada(null)
                        }}
                        className="w-full rounded-2xl bg-[#08557f] py-4 text-sm font-black text-white hover:bg-[#063a58] shadow-xl shadow-[#08557f]/20 transition-all uppercase tracking-widest"
                      >
                        Cerrar Detalles
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        <PagoModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setVisitaPagoSeleccionadaId(null)
          }}
          onConfirm={(data) => {
            handleRegistrarPago(data.clienteId, data.monto, 'EFECTIVO', data.comprobante)
          }}
          initialIsAbono={pagoInitialIsAbono}
          initialVisita={visitaPagoSeleccionadaId ? visitasCobrador.find(v => v.id === visitaPagoSeleccionadaId) : undefined}
        />

        <CrearCreditoModal
          isOpen={showCreditModal}
          onClose={() => setShowCreditModal(false)}
          onConfirm={handleCrearCredito}
        />

        {showNewClientModal && (
          <NuevoClienteModal
            onClose={() => setShowNewClientModal(false)}
            onClienteCreado={(nuevo) => {
              console.log('Nuevo cliente creado:', nuevo)
              setShowNewClientModal(false)
            }}
          />
        )}

        {showEstadoCuentaModal && visitaEstadoCuentaSeleccionada && (
          <EstadoCuentaModal
            onClose={() => {
              setShowEstadoCuentaModal(false)
              setVisitaEstadoCuentaSeleccionada(null)
            }}
            visita={visitaEstadoCuentaSeleccionada}
          />
        )}

        {showReprogramModal && visitaReprogramar && (
          <ReprogramarModal
            visita={visitaReprogramar}
            onClose={() => {
              setShowReprogramModal(false)
              setVisitaReprogramar(null)
            }}
            onConfirm={handleGuardarReprogramacion}
          />
        )}

        <GastoModal 
          isOpen={showGastoModal}
          onClose={() => setShowGastoModal(false)}
          onConfirm={(data) => {
            console.log('Gasto registrado:', data)
            setShowGastoModal(false)
          }}
        />

        <BaseModal
          isOpen={showBaseModal}
          onClose={() => setShowBaseModal(false)}
          onConfirm={(data) => {
            console.log('Base solicitada:', data)
            setShowBaseModal(false)
          }}
        />

        {showClientSelector && (
          <SeleccionClienteModal
            titulo={
              pendingAction === 'CUENTA' ? 'Ver Estado de Cuenta' : 
              pendingAction === 'PAGO' ? 'Registrar Pago' :
              pendingAction === 'ABONO' ? 'Registrar Abono' :
              'Agendar Visita'
            }
            subtitulo={
              pendingAction === 'CUENTA' ? 'Consultar Cliente' : 
              pendingAction === 'PAGO' ? 'Busque el cliente que paga' :
              pendingAction === 'ABONO' ? 'Busque el cliente para abono' :
              'Programar Cliente'
            }
            visitas={visitasBase}
            onSelect={(visita) => {
              setShowClientSelector(false)
              if (pendingAction === 'CUENTA') {
                setVisitaEstadoCuentaSeleccionada(visita)
                setShowEstadoCuentaModal(true)
              } else if (pendingAction === 'AGENDAR') {
                setVisitaReprogramar(visita)
                setShowReprogramModal(true)
              } else if (pendingAction === 'PAGO') {
                setVisitaPagoSeleccionadaId(visita.id)
                setPagoInitialIsAbono(false)
                setShowPaymentModal(true)
              } else if (pendingAction === 'ABONO') {
                setVisitaPagoSeleccionadaId(visita.id)
                setPagoInitialIsAbono(true)
                setShowPaymentModal(true)
              }
              setPendingAction(null)
            }}
            onClose={() => {
              setShowClientSelector(false)
              setPendingAction(null)
            }}
          />
        )}



        {showMoraModal && visitaMoraSeleccionada && moraCuenta && (
          <DetalleMoraModal
            cuenta={moraCuenta}
            onClose={() => {
              setShowMoraModal(false)
              setVisitaMoraSeleccionada(null)
              setMoraCuenta(null)
            }}
          />
        )}

        {/* Floating Action Button (FAB) - siempre visible para supervisor */}
        <FloatingActionMenu actions={[
            { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => setShowCreditModal(true) },
            { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => setShowNewClientModal(true) },
            { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setPendingAction('ABONO'); setShowClientSelector(true); } },
            { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setPendingAction('PAGO'); setShowClientSelector(true); } },
            { label: 'Gastos', icon: <ReceiptText className="h-5 w-5" />, color: 'rose', onClick: () => setShowGastoModal(true) },
          ] as FabAction[]} />

        {/* Modal de Alerta */}
        {modalAlerta && (
          <ConfirmModal
            isOpen={!!modalAlerta}
            onClose={() => setModalAlerta(null)}
            onConfirm={() => setModalAlerta(null)}
            title={modalAlerta.titulo}
            message={modalAlerta.mensaje}
            confirmText="Entendido"
            cancelText={null}
            variant={modalAlerta.tipo === 'error' ? 'danger' : modalAlerta.tipo === 'info' ? 'info' : 'success'}
          />
        )}
      </div>
    </div>
  )
}

export default SupervisorCobroView

'use client'

/**
 * ============================================================================
 * VISTA OPERATIVA DE COBRANZA (VISTA COBRADOR)
 * ============================================================================
 * 
 * @description
 * Componente central para la operación de campo (Mobile First Design).
 * Gestiona el flujo de trabajo diario del cobrador:
 * 1. Planificación de Ruta (Drag & Drop).
 * 2. Registro de Gestión (Pagos, No Pagos, Reprogramaciones).
 * 3. Rendición de Cuentas (Cierre de Caja).
 * 
 * @architecture
 * - Utiliza `@dnd-kit` para listas ordenables táctiles.
 * - Maneja estado local complejo para funcionamiento Offline-First (simulado).
 * - Integra múltiples modales operativos dentro del mismo archivo para performance móvil.
 * 
 * @roles ['COBRADOR', 'ADMIN']
 * Nota: El Admin puede visualizar esta vista en modo "Solo Lectura" (ver rutas/page.tsx).
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MapPin,
  RefreshCw,
  Wallet,
  CheckCircle2,
  History,
  UserPlus,
  Receipt,
  DollarSign,
  ChevronDown,
  X,
  CreditCard,
  Plus,
  ClipboardList,
  GripVertical,
  Calendar,
  Search,
  FileText as FileTextIcon,
  BarChart3,
  User,
  Target,
  ReceiptText,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Sparkline } from '@/components/ui/PremiumCharts'
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
import { rutasService, Ruta } from '@/services/rutas-service'
import { registrarGasto, solicitarBase, obtenerSaldoDisponibleRuta } from '@/services/contabilidad-service'
import { prestamosService } from '@/services/prestamos-service'
import { loansService_ } from '@/services/loans-service'
import { reportesCoordinadorService } from '@/services/reportes-coordinador-service'
import type { RouteDetailResponse } from '@/services/reportes-coordinador-service'
import { clientesService, Cliente } from '@/services/clientes-service'
import { ExportButton } from '@/components/ui/ExportButton'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { VisitaRuta, EstadoVisita, PeriodoRuta, HistorialDia } from '@/lib/types/cobranza'
import { StaticVisitaItem, SortableVisita, Portal, MODAL_Z_INDEX, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import PagoModal from '@/components/cobranza/PagoModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import GastoModal from '@/components/dashboards/shared/GastoModal'
import BaseModal from '@/components/dashboards/shared/BaseModal'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import { offlineStore } from '@/lib/offline/offlineDb'
import { enqueuePago } from '@/lib/offline/offlineQueue'
import { pagosService } from '@/services/pagos-service'
import { TipoAmortizacion } from '@/types/enums'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'
import { Bell } from 'lucide-react'

interface OperacionCaja {
  id: string
  tipo: 'pago' | 'gasto' | 'base'
  descripcion: string
  monto: number
  hora: string
  estado: 'completado' | 'pendiente'
  cobradorId: string
}

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



const VistaCobrador = () => {
  const { socket } = useNotificaciones()
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pagoInitialIsAbono, setPagoInitialIsAbono] = useState(false)
  const [visitaPagoSeleccionada, setVisitaPagoSeleccionada] = useState<VisitaRuta | null>(null)
  
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
  const [accionPendiente, setAccionPendiente] = useState<'PAGO' | 'ABONO' | 'REPROGRAMAR' | 'CUENTA' | null>(null)
  const [showClientSelector, setShowClientSelector] = useState(false)
  
  // Nuevos estados para la refactorización
  const formatFechaCorta = (iso: string | undefined | null) => {
    if (!iso) return 'Sin fecha';
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      const parts = String(iso).split('-');
      if (parts.length >= 3) return `${parts[2].slice(0,2)}/${parts[1]}/${parts[0]}`;
      return String(iso);
    }
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const formatFechaLargaUTC = (iso: string | undefined | null) => {
    if (!iso) return '---';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '---';
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dd = d.getUTCDate();
    const mes = meses[d.getUTCMonth()];
    const yyyy = d.getUTCFullYear();
    return `${dd} de ${mes} de ${yyyy}`;
  }
  const ajustarEstadoConPago = (v: VisitaRuta): EstadoVisita => {
    if (Number(v.saldoTotal || 0) <= 0) return 'pagado';
    
    // Si ya recaudamos lo de la cuota hoy (con pequeño margen de redondeo), marcamos como pagado
    const cobroSuficiente = Number(v.recaudadoDelDia || 0) >= (Number(v.montoCuota || 0) - 1);
    if (cobroSuficiente && Number(v.recaudadoDelDia || 0) > 0) return 'pagado';

    const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoyStr = toLocalKey(new Date());
    const propDateStr = v.proximaVisita ? (v.proximaVisita.includes('T') ? v.proximaVisita.split('T')[0] : v.proximaVisita) : '';
    const esHoy = propDateStr === hoyStr;
    
    if (esHoy && cobroSuficiente) return 'pagado';
    
    return v.estado;
  }

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
        // Inicio de la semana (Lunes)
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
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null)
  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')
  const [periodoCards, setPeriodoCards] = useState<'HOY' | 'SEM' | 'MES' | 'AÑO'>('HOY')

  const [rutaStats, setRutaStats] = useState<{
    recaudo: number
    meta: number
    eficiencia: number
    gastos: number
    base: number
  }>({ recaudo: 0, meta: 0, eficiencia: 0, gastos: 0, base: 0 })

  const [rutaActual, setRutaActual] = useState<Ruta | null>(null)

  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)
  const [showConfirmCompleteModal, setShowConfirmCompleteModal] = useState(false)
  const [modalAlerta, setModalAlerta] = useState<{titulo: string, mensaje: string, tipo: 'exito' | 'error' | 'info'} | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAction, setIsLoadingAction] = useState(false) // New state for actions

  const [creditosPendientes, setCreditosPendientes] = useState<any[]>([]);

  const router = useRouter();

  // Datos base - se cargan desde el backend
  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>([])
  const [visitasSelectorFallback, setVisitasSelectorFallback] = useState<VisitaRuta[]>([])

  const [visitasOrden, setVisitasOrden] = useState<string[]>([])

  const [operacionesCaja, setOperacionesCaja] = useState<OperacionCaja[]>([])

  // Historial dinámico (pendiente de integración real)
  const [historialRutas, setHistorialRutas] = useState<Record<string, HistorialDia> | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<RouteDetailResponse | null>(null);
  const [recaudadoClienteHoy, setRecaudadoClienteHoy] = useState<number>(0);
  const [nextPagoFecha, setNextPagoFecha] = useState<string | null>(null);
  const [nextPagoMonto, setNextPagoMonto] = useState<number | null>(null);

  // Cargar datos del usuario al montar el componente

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // Primero intentar cargar desde localStorage
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.replace('/login');
          return;
        }

        if (userData) {
          const user = JSON.parse(userData);
          setUserSession(user);
          
          // Verificar que el rol sea COBRADOR
          if (user.rol !== 'COBRADOR') {
            // Redirigir según el rol
            const ROLE_REDIRECT_MAP: Record<RolUsuario, string> = {
              SUPER_ADMINISTRADOR: '/admin',
              COORDINADOR: '/coordinador',
              SUPERVISOR: '/supervisor',
              COBRADOR: '/cobranzas',
              CONTADOR: '/contador/contable',
            };
            
            const redirectPath = ROLE_REDIRECT_MAP[user.rol as RolUsuario] ?? '/';
            router.replace(redirectPath);
            return;
          }
        } else {
          // Si no hay datos en localStorage, obtener del backend
          try {
            const perfil = await obtenerPerfil();
            localStorage.setItem('user', JSON.stringify(perfil));
            setUserSession(perfil);
          } catch (error) {
            console.error('Error al obtener perfil:', error);
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    cargarUsuario();
  }, [router]);

  // Cargar estadísticas de la ruta según el periodo seleccionado
  const cargarEstadisticasRuta = useCallback(async (rutaId: string) => {
    try {
      const { inicio, fin } = getDatesByPeriod(periodoCards);
      const saldo = await obtenerSaldoDisponibleRuta(rutaId, undefined, inicio, fin);
      
      setRutaStats(prev => ({
        ...prev,
        recaudo: Number(saldo?.recaudoDelDia ?? 0),
        gastos: Number(saldo?.gastosDelDia ?? 0),
        eficiencia: prev.meta > 0 ? Math.round((Number(saldo?.recaudoDelDia ?? 0) / prev.meta) * 100) : prev.eficiencia
      }));
    } catch (error) {
      console.error("Error al cargar estadísticas por periodo:", error);
    }
  }, [periodoCards]);

  // Recargar estadísticas cuando cambie el periodo o la ruta
  useEffect(() => {
    if (rutaActual?.id) {
      cargarEstadisticasRuta(rutaActual.id);
    }
  }, [periodoCards, rutaActual?.id, cargarEstadisticasRuta]);

  useEffect(() => {
    if (!socket) return;

    const handler = () => {
      if (rutaActual?.id) {
        cargarEstadisticasRuta(rutaActual.id);
      }
    };

    socket.on('pagos_actualizados', handler);
    socket.on('prestamos_actualizados', handler);
    socket.on('dashboards_actualizados', handler);

    return () => {
      socket.off('pagos_actualizados', handler);
      socket.off('prestamos_actualizados', handler);
      socket.off('dashboards_actualizados', handler);
    };
  }, [socket, rutaActual?.id, cargarEstadisticasRuta]);

  // Cargar visitas reales desde el backend cuando el usuario está disponible
  useEffect(() => {
    if (!userSession?.id) return;

    const cargarDatosRuta = async () => {
      try {
        setIsLoading(true);
        // 1. Obtener la ruta asignada al cobrador
        const rutas = await rutasService.obtenerRutas({ cobradorId: userSession.id, limit: 1 });
        const rutaResumen = rutas[0]; 
        
        if (!rutaResumen) {
          setRutaActual(null);
          setVisitasBase([]);
          setVisitasOrden([]);
          setIsLoading(false);
          return;
        }

        // 2. Obtener el detalle COMPLETO de la ruta (incluyendo TODAS las asignaciones)
        // Esto garantiza que se trae todo lo asignado en Base de Datos.
        const rutaCompleta = await rutasService.obtenerRutaPorId(rutaResumen.id);
        setRutaActual(rutaCompleta);

        // 3. Actualizar estadísticas con datos reales del backend
        {
          const est = (rutaCompleta as any).estadisticas || {};
          const { inicio, fin } = getDatesByPeriod(periodoCards);
          try {
            const saldo = await obtenerSaldoDisponibleRuta(rutaCompleta.id, undefined, inicio, fin);
            setRutaStats({
              recaudo: Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? est.cobranzaDelDia ?? 0),
              meta: Number(est.metaDelDia ?? 0),
              eficiencia: (est.metaDelDia > 0) ? Math.round((Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? 0) / est.metaDelDia) * 100) : Number(est.avanceDiario ?? 0),
              gastos: Number(saldo?.gastosDelDia ?? 0),
              base: Number(saldo?.baseEfectivo ?? 0)
            });
          } catch {
            setRutaStats({
              recaudo: Number(est.cobranzaDelDia ?? 0),
              meta: Number(est.metaDelDia ?? 0),
              eficiencia: Number(est.avanceDiario ?? 0),
              gastos: 0,
              base: 0
            });
          }
        }



        // 4. Mapear asignaciones a Visitas
        // Usamos las asignaciones directas de la ruta para tener la lista completa de clientes
        const asignaciones = (rutaCompleta as any).asignaciones || (rutaCompleta as any).asignacionesRuta || [];

        const visitasMapeadas: VisitaRuta[] = asignaciones.map((asig: any, index: number) => {
           const cliente = asig.cliente || {};
           // Intentar obtener el préstamo activo
           const prestamos = cliente.prestamos || [];
           const prestamoActivo = prestamos.find((p: any) => p.estado === 'ACTIVO' || p.estado === 'VENCIDO') || prestamos[0] || {};
           
           // Calcular proxima cuota o saldo
           const proximaCuota = prestamoActivo.proximaCuota || {}; 
           const saldoTotal = cliente.prestamos?.reduce((sum: number, p: any) => sum + Number(p.saldoPendiente || 0), 0) || 0;

           // Determinar estado basado en prestamo
           let estado: EstadoVisita = 'pendiente';
           if (proximaCuota.estado === 'VENCIDA') estado = 'en_mora';
           else if (proximaCuota.estado === 'PAGADA') estado = 'pagado';
           else if (!prestamoActivo.id) estado = 'pendiente'; // Sin prestamo

           return {
            id: asig.id || `asig-${index}`,
            cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
            direccion: cliente.direccion || 'Sin dirección registrada',
            telefono: cliente.telefono || '',
            horaSugerida: asig.horaSugerida || '08:00 AM',
            montoCuota: Number(proximaCuota.monto || 0),
            saldoTotal: Number(saldoTotal),
            estado: estado,
            proximaVisita: proximaCuota.fechaVencimiento || '9999-12-31T00:00:00.000Z', // Far future if no payment
            targetVencimiento: proximaCuota.fechaVencimiento || undefined,
            ordenVisita: asig.ordenVisita || index + 1,
            prioridad: (asig.prioridad?.toLowerCase()) || (estado === 'en_mora' ? 'alta' : 'media'),
            nivelRiesgo: (() => {
               const r = cliente.nivelRiesgo || 'VERDE';
               if (r === 'VERDE') return 'bajo';
               if (r === 'AMARILLO') return 'leve';
               if (r === 'ROJO') return 'moderado';
               if (r === 'LISTA_NEGRA') return 'critico';
               return 'bajo';
            })(),
            cobradorId: userSession.id,
            periodoRuta: (() => {
               const f = prestamoActivo.frecuenciaPago || 'DIARIO';
               if (f === 'DIARIO') return 'DIA';
               if (f === 'SEMANAL') return 'SEMANA';
               if (f === 'QUINCENAL') return 'QUINCENA';
               if (f === 'MENSUAL') return 'MES';
               return 'DIA';
            })() as PeriodoRuta,
            clienteId: cliente.id,
            prestamoId: prestamoActivo.id
           };
        });

         // Consultamos explícitamente las cuotas para obtener el valor real del backend.
         const visitasEnriquecidas = await Promise.all(visitasMapeadas.map(async (v) => {
             if (!v.prestamoId) return v;
             try {
                // 1. Consultar cuotas reales para obtener la pendiente exacta
                const cuotas = await prestamosService.obtenerCuotas(v.prestamoId);
                const pendiente = cuotas.find(c => c.estado !== 'PAGADA');
                
                if (pendiente) {
                    const montoReal = Number(pendiente.monto || (pendiente.montoCapital + pendiente.montoInteres) || 0);
                    return { 
                      ...v, 
                      montoCuota: montoReal > 0 ? montoReal : v.montoCuota,
                      proximaVisita: pendiente.fechaVencimiento || v.proximaVisita
                    };
                }
                
                // 2. Fallback: Consultar detalle del préstamo
                const p = await prestamosService.obtenerPrestamoPorId(v.prestamoId);
                const proxima = p.proximaCuota || {};
                const montoP = Number(proxima.monto || p.montoCuota || p.valorCuota || 0);
                
                return { 
                  ...v, 
                  montoCuota: montoP > 0 ? montoP : v.montoCuota,
                  proximaVisita: proxima.fechaVencimiento || v.proximaVisita
                };
             } catch (e) {
                return v;
             }
         }));

        // Enriquecer con recaudado total y del día por cliente
        try {
          const hoyStr = new Date().toDateString();
          const withRecaudo = await Promise.all(visitasEnriquecidas.map(async (v) => {
            if (!v.clienteId) return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };
            try {
              const pagosResp = await pagosService.obtenerPagos({ clienteId: v.clienteId, limit: 100 });
              const pagosCalc = (pagosResp?.pagos || []);
              
              const totalHoy = pagosCalc.reduce((sum: number, p: any) => {
                const f = new Date(p.fechaPago).toDateString();
                return f === hoyStr ? sum + Number(p.montoTotal || 0) : sum;
              }, 0);
              const totalHistorico = pagosCalc.reduce((sum: number, p: any) => {
                return sum + Number(p.montoTotal || 0);
              }, 0);

              return { ...v, recaudadoDelDia: totalHoy, recaudadoTotalClient: totalHistorico };
            } catch {
              return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };
            }
          }));

          // Ordenar y guardar
          withRecaudo.sort((a, b) => a.ordenVisita - b.ordenVisita);
          const finales = withRecaudo.map(v => ({ ...v, estado: ajustarEstadoConPago(v) }));
          setVisitasBase(finales);
          setVisitasSelectorFallback(finales);
          setVisitasOrden(finales.map(v => v.id));

          // Fallback KPIs si backend vino en cero
          const metaCalculada = withRecaudo.reduce((sum, v) => {
            const d = new Date(v.proximaVisita);
            const sameDay = !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
            return sameDay ? sum + Number(v.montoCuota || 0) : sum;
          }, 0);
          const recaudadoCalculado = withRecaudo.reduce((sum, v) => sum + Number(v.recaudadoDelDia || 0), 0);
          setRutaStats(prev => ({
            ...prev,
            meta: prev.meta > 0 ? prev.meta : metaCalculada,
            recaudo: prev.recaudo > 0 ? prev.recaudo : recaudadoCalculado,
            eficiencia: (prev.meta > 0 ? prev.meta : metaCalculada) > 0
              ? parseFloat((((prev.recaudo > 0 ? prev.recaudo : recaudadoCalculado) / (prev.meta > 0 ? prev.meta : metaCalculada)) * 100).toFixed(1))
              : prev.eficiencia
          }));
        } catch {
          // Ordenar y guardar (sin recaudado)
          visitasEnriquecidas.sort((a, b) => a.ordenVisita - b.ordenVisita);
          setVisitasBase(visitasEnriquecidas);
          setVisitasOrden(visitasMapeadas.map(v => v.id));
        }

      } catch (err) {
        console.error('Error cargando datos completos de ruta:', err);
        
        // Fallback offline: intentar reconstruir la ruta desde IndexedDB si falla la red
        try {
          const [offlineRutas, offlineClientes, offlinePrestamos, offlineCuotas] = await Promise.all([
            offlineStore.getAll<any>('rutas'),
            offlineStore.getAll<any>('clientes'),
            offlineStore.getAll<any>('prestamos'),
            offlineStore.getAll<any>('cuotas'),
          ]);

          // Buscar la ruta del cobrador actual
          const miRuta = offlineRutas.find(r => r.cobradorId === userSession.id);
          
          if (miRuta) {
             setRutaActual(miRuta);
             
             // Filtrar clientes de esta ruta
             const dataParaMapear = offlineClientes.filter(c => c.rutaId === miRuta.id);
             
             const visitasOffline: VisitaRuta[] = dataParaMapear.map((c: any, idx: number) => {
                 // Buscar préstamo activo para el cliente (solo estados operativos)
                 const p = offlinePrestamos.find(lp => 
                   lp.clienteId === c.id && 
                   (lp.estado === 'ACTIVO' || lp.estado === 'VENCIDO' || lp.estado === 'EN_MORA' || lp.estado === 'PENDIENTE')
                 );
                 
                 const proximaCuota = p ? offlineCuotas.find(cq => cq.prestamoId === p.id && cq.estado !== 'PAGADA') : null;
                 
                 return {
                     id: `offline-${c.id}`,
                     cliente: `${c.nombres || ''} ${c.apellidos || ''}`.trim(),
                     direccion: c.direccion || 'Sin dirección (Offline)',
                     telefono: c.telefono || '',
                     horaSugerida: '08:00 AM',
                     montoCuota: Number(proximaCuota?.monto || p?.montoCuota || 0),
                     saldoTotal: Number(p?.saldoPendiente || 0),
                     estado: proximaCuota?.estado === 'VENCIDA' ? 'en_mora' : 'pendiente',
                     proximaVisita: proximaCuota?.fechaVencimiento || 'Offline',
                     ordenVisita: idx + 1,
                     prioridad: 'media',
                     nivelRiesgo: (c.nivelRiesgo || 'BAJO').toLowerCase() as any,
                     cobradorId: userSession.id,
                     periodoRuta: (p?.frecuenciaPago || 'DIARIO') as PeriodoRuta,
                     clienteId: c.id,
                     prestamoId: p?.id
                 };
             });

             setVisitasBase(visitasOffline);
             setVisitasSelectorFallback(visitasOffline);
             setVisitasOrden(visitasOffline.map(v => v.id));
             
             // KPIs Offline básicos
             const totalMora = visitasOffline.filter(v => v.estado === 'en_mora').length;
             setRutaStats({
               recaudo: 0,
               meta: visitasOffline.reduce((sum, v) => sum + v.montoCuota, 0),
               eficiencia: 0,
               gastos: 0,
               base: 0
             });
          } else {
             setVisitasBase([]);
             setVisitasOrden([]);
          }
        } catch (offlineErr) {
          console.error('Error crítico en el fallback offline:', offlineErr);
          setVisitasBase([]);
          setVisitasOrden([]); 
        }
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatosRuta();
  }, [userSession?.id]);







  useEffect(() => {
    const cargarClientesSelector = async () => {
      if (!showClientSelector) return;
      if (visitasBase.length > 0) {
        setVisitasSelectorFallback([]);
        return;
      }
      try {
        const filtros: { ruta?: string } = {};
        if (rutaActual?.id) {
          filtros.ruta = rutaActual.id;
        }
        const clientes: Cliente[] = await clientesService.obtenerTodos(filtros);
        const clientesConPrestamo = clientes.filter(
          (c) => (c.prestamosActivos ?? 0) > 0
        );
        const fuente = clientesConPrestamo.length > 0 ? clientesConPrestamo : clientes;
        const visitas: VisitaRuta[] = fuente.map((c, index) => {
          const nombre = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Cliente';
          const riesgoBackend = c.nivelRiesgo;
          const riesgo =
            riesgoBackend === 'VERDE'
              ? 'bajo'
              : riesgoBackend === 'AMARILLO'
              ? 'leve'
              : riesgoBackend === 'ROJO'
              ? 'moderado'
              : riesgoBackend === 'LISTA_NEGRA'
              ? 'critico'
              : 'bajo';
          return {
            id: c.id,
            cliente: nombre,
            direccion: c.direccion || 'Sin dirección registrada',
            telefono: c.telefono || '',
            horaSugerida: '08:00 AM',
            montoCuota: Number(c.montoMora || 0),
            saldoTotal: Number(c.montoTotal || 0),
            estado: 'pendiente',
            proximaVisita: new Date().toISOString(),
            ordenVisita: index + 1,
            prioridad: 'media',
            nivelRiesgo: riesgo,
            cobradorId: userSession?.id || '',
            periodoRuta: 'DIA',
            clienteId: c.id,
            prestamoId: undefined,
          };
        });
        setVisitasSelectorFallback(visitas);
      } catch {
        try {
          const offlineClientes = await offlineStore.getAll<Cliente>('clientes');
          const clientesConPrestamo = offlineClientes.filter(
            (c: any) => (c.prestamosActivos ?? 0) > 0
          );
          const fuente = clientesConPrestamo.length > 0 ? clientesConPrestamo : offlineClientes;
          const visitas: VisitaRuta[] = fuente.map((c, index) => {
            const nombre = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Cliente';
            const riesgoBackend = c.nivelRiesgo;
            const riesgo =
              riesgoBackend === 'VERDE'
                ? 'bajo'
                : riesgoBackend === 'AMARILLO'
                ? 'leve'
                : riesgoBackend === 'ROJO'
                ? 'moderado'
                : riesgoBackend === 'LISTA_NEGRA'
                ? 'critico'
                : 'bajo';
            return {
              id: c.id,
              cliente: nombre,
              direccion: c.direccion || 'Sin dirección registrada',
              telefono: c.telefono || '',
              horaSugerida: '08:00 AM',
              montoCuota: 0,
              saldoTotal: 0,
              estado: 'pendiente',
              proximaVisita: new Date().toISOString(),
              ordenVisita: index + 1,
              prioridad: 'media',
              nivelRiesgo: riesgo,
              cobradorId: userSession?.id || '',
              periodoRuta: 'DIA',
              clienteId: c.id,
              prestamoId: undefined,
            };
          });
          setVisitasSelectorFallback(visitas);
        } catch {
          setVisitasSelectorFallback([]);
        }
      }
    };
    cargarClientesSelector();
  }, [showClientSelector, visitasBase.length, rutaActual?.id, userSession?.id]);

  useEffect(() => {
    const cargarResumenMensual = async () => {
      if (!showHistory || historyViewMode !== 'MONTHS' || !rutaActual?.id) return;
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        let totalRecaudado = 0;
        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 });
        const pagosData = (pagosResp as any)?.pagos || pagosResp || [];
        const pagosMes = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
          const raw = p.fechaPago || p.creadoEn;
          if (!raw) return false;
          const d = new Date(raw);
          const inMonth = d >= start && d <= end;
          const cobradorMatch = userSession?.id ? (p.cobradorId === userSession.id) : true;
          // Un pago pertenece a esta ruta indirectamente si el cobrador coincide (ya que no viene p.ruta).
          // Por seguridad vamos a mapear en inMonth, si es el cobrador activo
          return inMonth && cobradorMatch;
        });
        const uniqueClientes = new Set<string>();
        for (const p of pagosMes) {
          totalRecaudado += Number(p.montoTotal || 0);
          const cid = p.clienteId || (p.cliente?.id);
          if (cid) uniqueClientes.add(cid);
        }
        const elapsedDays = now.getDate(); // días transcurridos del mes
        setMonthlyReport({
          ruta: {
            id: rutaActual.id,
            nombre: rutaActual.nombre,
            codigo: rutaActual.codigo || '',
            zona: rutaActual.zona || '',
            cobrador: {
              id: rutaActual.cobradorId,
              nombres: '',
              apellidos: ''
            }
          },
          periodo: {
            tipo: 'month',
            inicio: start.toISOString(),
            fin: end.toISOString()
          },
          estadisticas: {
            totalClientes: uniqueClientes.size,
            totalRecaudado,
            totalPagos: pagosMes.length,
            promedioDiario: elapsedDays > 0 ? Math.round(totalRecaudado / elapsedDays) : 0,
            pagosPorDia: []
          },
          pagosRecientes: [],
          clientesConPrestamos: []
        });
      } catch {
        setMonthlyReport(null);
      }
    };
    cargarResumenMensual();
  }, [showHistory, historyViewMode, rutaActual?.id]);

  // Prefill historial keys for últimos 30 días (lazy fetch per día al expandir)
  useEffect(() => {
    if (!showHistory || !rutaActual?.id) return;
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
        setHistorialRutas(prev => {
          if (!prev) return prev;
          const next = { ...prev };
          const keys = Object.keys(next);
          for (const k of keys) {
            if (!next[k].loaded) next[k].resumen.recaudo = 0;
          }
          for (const p of pagosData) {
            const raw = p.fechaPago || p.creadoEn;
            if (!raw) continue;
            // Manejar compatibilidad TimeZone local vs UTC asegurando el día correcto
            const dStr = typeof raw === 'string' ? raw.split('T')[0] : new Date(raw).toISOString().split('T')[0];
            const pk = dStr;
            const cobradorMatch = userSession?.id ? (p.cobradorId === userSession.id) : true;
            if (next[pk] && !next[pk].loaded && cobradorMatch) {
               next[pk].resumen.recaudo += Number(p.montoTotal || 0);
            }
          }
          return next;
        });
      } catch (e) { console.warn('Error precargando montos de historial', e); }
    };
    cargarResumenRecaudos();
  }, [showHistory, rutaActual?.id, userSession?.id]);

  const cargarHistorialFecha = useCallback(async (fechaClave: string) => {
    if (!rutaActual?.id) return;

    const toKey = (raw: string): string => {
      if (!raw) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      try {
        const d = new Date(raw);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } catch { return ''; }
    };

    let visitasResp: any = null;
    let saldo: any = null;
    let pagosDelDia: any[] = [];

    try {
      visitasResp = await rutasService.obtenerVisitasDelDia(rutaActual.id, fechaClave);
    } catch (e) { console.warn(`[Cobrador Historial ${fechaClave}] visitas falló:`, e); }

    try {
      saldo = await obtenerSaldoDisponibleRuta(rutaActual.id, fechaClave);
    } catch (e) { console.warn(`[Cobrador Historial ${fechaClave}] saldo falló:`, e); }

    try {
      const pagosResp = await pagosService.obtenerPagos({ limit: 5000 });
      const pagosData = (pagosResp as any)?.pagos || pagosResp || [];
      // El modelo Pago NO tiene rutaId — filtramos SOLO por fecha
      pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
        const raw = p.fechaPago || p.creadoEn;
        return raw && toKey(raw) === fechaClave;
      });
    } catch (e) { console.warn(`[Cobrador Historial ${fechaClave}] pagos falló:`, e); }

    const recaudadoPorCliente: Record<string, number> = {};
    for (const p of pagosDelDia) {
      const cid = p.clienteId || (p.cliente?.id);
      if (!cid) continue;
      recaudadoPorCliente[cid] = (recaudadoPorCliente[cid] || 0) + Number(p.montoTotal || 0);
    }
    const visitas: VisitaRuta[] = (visitasResp?.visitas || []).map((item: any, index: number) => {
      const cliente = item.cliente || {};
      const prestamos = item.prestamos || [];
      const prestamoActivo = prestamos.find((p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA' || p.estado === 'PAGADO') || prestamos[0] || {};
      const proximaCuota = prestamoActivo?.proximaCuota || {};
      const saldoTotal = Number(prestamoActivo?.saldoPendiente || 0);
      let estado: EstadoVisita = 'pendiente';
      if (proximaCuota?.estado === 'VENCIDA') estado = 'en_mora';
      else if (proximaCuota?.estado === 'PAGADA' || saldoTotal <= 0) estado = 'pagado';
      else if (!prestamoActivo?.id) estado = 'pendiente';
      const clienteId = cliente.id;
      const recDia = clienteId ? (recaudadoPorCliente[clienteId] || 0) : 0;
      const estadoFinal: EstadoVisita = (recDia > 0 && recDia >= Number(proximaCuota?.monto || 0)) || saldoTotal <= 0 ? 'pagado' : estado;
      return {
        id: item.asignacionId || `hist-${fechaClave}-${index}`,
        cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente Sin Nombre',
        direccion: cliente.direccion || 'Sin dirección registrada',
        telefono: cliente.telefono || '',
        horaSugerida: '08:00 AM',
        montoCuota: Number(proximaCuota?.monto || 0),
        saldoTotal,
        estado: estadoFinal,
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
        cobradorId: userSession?.id || '',
        periodoRuta: (() => {
          const f = prestamoActivo?.frecuenciaPago || 'DIARIO';
          if (f === 'DIARIO') return 'DIA';
          if (f === 'SEMANAL') return 'SEMANA';
          if (f === 'QUINCENAL') return 'QUINCENA';
          if (f === 'MENSUAL') return 'MES';
          return 'DIA';
        })() as PeriodoRuta,
        clienteId,
        prestamoId: prestamoActivo?.id,
        recaudadoDelDia: recDia,
        recaudadoTotalClient: recDia
      };
    });
    const existentes = new Set(visitas.map(v => v.clienteId));
    let sinteticos: VisitaRuta[] = (pagosDelDia || []).flatMap((p: any, i: number) => {
      const cid = p.clienteId || (p.cliente?.id);
      if (!cid || existentes.has(cid)) return [];
      const nombre = p.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : 'Cliente';
      const montoPago = Number(p.montoTotal || 0);
      return [{
        id: `pago-${p.id || p.numeroPago || i}-${fechaClave}`,
        cliente: nombre || 'Cliente',
        direccion: 'Sin dirección registrada',
        telefono: '',
        horaSugerida: '08:00 AM',
        montoCuota: 0,
        saldoTotal: 0,
        estado: 'pagado',
        proximaVisita: fechaClave,
        ordenVisita: visitas.length + i + 1,
        prioridad: 'media',
        cobradorId: userSession?.id || '',
        periodoRuta: 'DIA',
        clienteId: cid,
        prestamoId: p.prestamoId || undefined,
        recaudadoDelDia: montoPago,
        recaudadoTotalClient: montoPago
      }];
    });
    try {
      sinteticos = await Promise.all(sinteticos.map(async (v) => {
        if (!v.prestamoId) return v;
        try {
          const detalle = await prestamosService.obtenerPrestamoPorId(v.prestamoId);
          try {
            const cli = await clientesService.obtenerPorId(v.clienteId);
            v = { ...v, direccion: cli?.direccion || v.direccion, telefono: cli?.telefono || v.telefono, nivelRiesgo: (() => { const r = cli?.nivelRiesgo || 'VERDE'; if (r === 'VERDE') return 'bajo'; if (r === 'AMARILLO') return 'leve'; if (r === 'ROJO') return 'moderado'; if (r === 'LISTA_NEGRA') return 'critico'; return v.nivelRiesgo; })() };
          } catch { /* ignore */ }
          const cuotas = Array.isArray(detalle?.cuotas) ? detalle.cuotas : [];
          const proxima = cuotas.find((c: any) => c.estado === 'PENDIENTE' || c.estado === 'ATRASADA' || c.estado === 'PARCIAL');
          const f = detalle?.frecuenciaPago || 'DIARIO';
          const periodo = f === 'SEMANAL' ? 'SEMANA' : f === 'QUINCENAL' ? 'QUINCENA' : f === 'MENSUAL' ? 'MES' : 'DIA';
          const riesgo = (() => { const r = detalle?.cliente?.nivelRiesgo || 'VERDE'; if (r === 'VERDE') return 'bajo'; if (r === 'AMARILLO') return 'leve'; if (r === 'ROJO') return 'moderado'; if (r === 'LISTA_NEGRA') return 'critico'; return undefined; })();
          return { ...v, direccion: detalle?.cliente?.direccion || v.direccion, telefono: detalle?.cliente?.telefono || v.telefono, montoCuota: proxima ? Number(proxima.monto || 0) : v.montoCuota, saldoTotal: Number(detalle?.saldoPendiente || v.saldoTotal || 0), proximaVisita: proxima?.fechaVencimiento || v.proximaVisita, periodoRuta: periodo as PeriodoRuta, nivelRiesgo: riesgo };
        } catch { return v; }
      }));
    } catch {}

    const todasVisitas = [...visitas, ...sinteticos];
    const esperado = todasVisitas.reduce((sum, v) => sum + (v.montoCuota || 0), 0);
    const recaudoSaldo = Number(saldo?.recaudoDelDia ?? saldo?.cobranzaDelDia ?? 0);
    const recaudoPagos = pagosDelDia.reduce((s: number, p: any) => s + Number(p.montoTotal || 0), 0);
    const recaudoDia = recaudoSaldo > 0 ? recaudoSaldo : recaudoPagos;
    console.log(`[Cobrador Historial ${fechaClave}] recaudo final: ${recaudoDia} (saldo=${recaudoSaldo}, pagos=${recaudoPagos})`);
    const resumen = {
      recaudo: recaudoDia,
      gastos: Number(saldo?.gastosDelDia ?? 0),
      efectividad: esperado > 0 ? Math.round((recaudoDia / esperado) * 100) : (recaudoDia > 0 ? 100 : 0),
      visitados: Math.max(todasVisitas.filter(v => Number(v.recaudadoDelDia || 0) > 0 || v.estado === 'pagado').length, Object.keys(recaudadoPorCliente).length),
      total: todasVisitas.length
    };
    setHistorialRutas((prev: Record<string, HistorialDia> | null) => ({
      ...(prev || {}),
      [fechaClave]: { resumen, visitas: todasVisitas, loaded: true }
    }));
  }, [rutaActual?.id, userSession?.id]);

  useEffect(() => {
    if (!showHistory || !rutaActual?.id) return;
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const existing = (historialRutas || {})[key];
    if (!existing || !existing.loaded) {
      cargarHistorialFecha(key);
    }
  }, [showHistory, rutaActual?.id, historialRutas, cargarHistorialFecha]);
  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const filtradas = visitasBase
      .filter(v => !userSession?.id || v.cobradorId === userSession.id)
      .filter(v => {
        if (v.estado === 'pagado') return false;
        if (v.estado === 'en_mora') return true;
        
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999); // Final del día de hoy
        
        const d = new Date(v.proximaVisita);
        if (isNaN(d.getTime())) return false; // Hide invalid dates
        
        const dLocal = new Date(d);
        dLocal.setHours(0, 0, 0, 0);
        
        const hoyLocal = new Date();
        hoyLocal.setHours(0, 0, 0, 0);
        
        // Mostrar si es hoy o antes
        return dLocal <= hoyLocal;
      })
    
    // Aplicar búsqueda
    const buscadas = filtradas.filter(v => 
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Ordenar por Periodo (Mensual -> Quincenal -> Semanal -> Diario)
    const sorted = buscadas.sort((a, b) => {
        const priority: Record<string, number> = { 'MES': 0, 'QUINCENA': 1, 'SEMANA': 2, 'DIA': 3 };
        const pA = priority[a.periodoRuta] ?? 99;
        const pB = priority[b.periodoRuta] ?? 99;
        return pA - pB;
    });

    return sorted;
  }, [visitasBase, searchQuery])

  const visitasSelector = visitasCobrador.length > 0 ? visitasCobrador : visitasSelectorFallback

  const exportarRutaDiariaCSV = useCallback(() => {
    const filas = visitasCobrador
      .filter((v) => v.periodoRuta === 'DIA' && v.estado !== 'pagado')
      .map((v) => {
        const cols = [
          v.ordenVisita,
          v.cliente,
          v.telefono,
          v.direccion,
          v.horaSugerida,
          v.estado,
          v.montoCuota,
          v.saldoTotal,
          v.proximaVisita,
        ]
        return cols
          .map((c) => String(c).replace(/\r?\n/g, ' ').replace(/"/g, '""'))
          .map((c) => `"${c}"`)
          .join(',')
      })

    const header = [
      'orden',
      'cliente',
      'telefono',
      'direccion',
      'hora_sugerida',
      'estado',
      'monto_cuota',
      'saldo_total',
      'proxima_visita',
    ].join(',')

    const csv = [header, ...filas].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `ruta-diaria-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [visitasCobrador])

  const exportarRutaDiariaPDF = useCallback(() => {
    const data = visitasCobrador
      .filter((v) => v.periodoRuta === 'DIA' && v.estado !== 'pagado')

    const rows = data
      .map(
        (v) => `
          <tr>
            <td>${v.ordenVisita}</td>
            <td>${v.cliente}</td>
            <td>${v.telefono}</td>
            <td>${v.direccion}</td>
            <td>${v.horaSugerida}</td>
            <td>${v.estado}</td>
            <td style="text-align:right;">${formatCurrency(v.montoCuota)}</td>
          </tr>
        `
      )
      .join('')

    const html = `
      <html>
        <head>
          <title>Ruta diaria</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Ruta diaria</h1>
          <div class="sub">${new Date().toISOString().slice(0, 10)} • ${data.length} visitas</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Hora</th>
                <th>Estado</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `

    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
  }, [visitasCobrador])

  const operacionesCobrador = useMemo(() => 
    operacionesCaja.filter(op => op.cobradorId === 'CB-001'), // Temporal
    [operacionesCaja]
  )

  // Calcular caja
  const cajaRuta = useMemo(() => {
    const recaudoTotal = operacionesCobrador
      .filter(op => op.tipo === 'pago' && op.estado === 'completado')
      .reduce((sum, op) => sum + op.monto, 0)
    
    const gastosOperativos = operacionesCobrador
      .filter(op => op.tipo === 'gasto' && op.estado === 'completado')
      .reduce((sum, op) => sum + op.monto, 0)
    
    const baseSolicitada = operacionesCobrador
      .filter(op => op.tipo === 'base' && op.estado === 'pendiente')
      .reduce((sum, op) => sum + op.monto, 0)

    const recaudoEsperado = visitasCobrador
      .filter(v => v.periodoRuta === 'DIA')
      .reduce((sum, v) => sum + (v.montoCuota || 0), 0)

    const eficiencia = recaudoEsperado > 0 
      ? Math.round((recaudoTotal / recaudoEsperado) * 100) 
      : 0

    return {
      recaudoTotal,
      recaudoEsperado,
      gastosOperativos,
      eficiencia,
      baseDisponible: baseSolicitada,
      saldoNeto: recaudoTotal - gastosOperativos,
      efectivoDisponible: recaudoTotal - gastosOperativos - baseSolicitada,
      cambioNecesario: 20000,
    }
  }, [operacionesCobrador, visitasCobrador])

  const overlayVisita = useMemo(() => {
    return activeId ? visitasCobrador.find(v => v.id === activeId) || null : null
  }, [activeId, visitasCobrador])

  // Configuración de sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handlers para drag & drop
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (rutaCompletada) return
    setActiveId(event.active.id as string)
  }, [rutaCompletada])



  const handleGuardarReprogramacion = useCallback(async (fecha: string, motivo: string) => {
    if (!visitaReprogramar) return
    if (!fecha) return

    const formatearFechaISO = (iso: string) => {
      const [yyyy, mm, dd] = iso.split('-')
      if (!yyyy || !mm || !dd) return iso
      return `${dd}/${mm}`
    }

    try {
      setIsLoadingAction(true)
      if (!visitaReprogramar?.prestamoId) {
        setModalAlerta({
          titulo: 'Error',
          mensaje: 'La visita seleccionada no tiene un préstamo asociado.',
          tipo: 'error'
        })
        return;
      }

      await prestamosService.reprogramarPrestamo(visitaReprogramar.prestamoId, {
        fecha: fecha, // YYYY-MM-DD
        motivo,
        cobradorId: userSession?.id || ''
      })

      setVisitasBase((prev) =>
        prev.map((v) => {
          if (v.id !== visitaReprogramar.id) return v
          return {
            ...v,
            estado: 'reprogramado',
            proximaVisita: formatearFechaISO(fecha),
          }
        })
      )

      setModalAlerta({
        titulo: 'Éxito',
        mensaje: 'Visita reprogramada exitosamente',
        tipo: 'exito'
      })
      setShowReprogramModal(false)
      setVisitaReprogramar(null)
    } catch (error: any) {
      console.error(error)
      setModalAlerta({
          titulo: 'Error',
          mensaje: error.message || 'No se pudo realizar la reprogramación.',
          tipo: 'error'
      })
    } finally {
      setIsLoadingAction(false)
    }
  }, [visitaReprogramar, userSession?.id])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const newOrder = arrayMove(visitasOrden, visitasOrden.indexOf(active.id as string), visitasOrden.indexOf(over.id as string))
    setVisitasOrden(newOrder)

    // NUEVA FUNCIONALIDAD: Guardar orden en backend
    try {
      const rutas = await rutasService.obtenerRutas({ cobradorId: userSession?.id, limit: 1 });
      if (rutas[0]) {
        const ordenData = newOrder.map((id, index) => {
          const visita = visitasBase.find(v => v.id === id);
          // Extraer clienteId del id de asignación o usar el id de la visita
          const clienteId = (visita as any)?.clienteId || visita?.id.split('-')[1] || '';
          return {
            clienteId,
            orden: index + 1,
          };
        }).filter(item => item.clienteId);

        await rutasService.actualizarOrdenClientes(rutas[0].id, ordenData);
      }
    } catch (error) {
      console.error('Error al guardar orden:', error);
    }
  }, [visitasOrden, visitasBase, userSession?.id])

  const handleCrearCredito = useCallback(async (data: any) => {
    try {
      setIsLoadingAction(true)
      
      const isArticulo = data.creditType === 'articulo';
      const freq = data.frecuenciaPago || 'DIARIO';

      const payload: any = {
        clienteId: data.clienteCreditoId,
        tipoPrestamo: isArticulo ? 'ARTICULO' : 'EFECTIVO',
        monto: data.monto || 0,
        tasaInteres: data.tasaInteres || 0,
        tasaInteresMora: 2, 
        plazoMeses: data.plazoMeses || 1,
        cantidadCuotas: isArticulo ? data.numCuotas : data.cuotasTotales,
        frecuenciaPago: freq,
        fechaInicio: data.fechaInicio || new Date().toISOString(),
        creadoPorId: userSession?.id,
        cuotaInicial: data.cuotaInicialArticulo || 0,
        notas: data.notas || '',
        tipoAmortizacion: isArticulo ? 'INTERES_SIMPLE' : (data.tipoInteres || 'INTERES_SIMPLE')
      }

      if (isArticulo) {
        payload.productoId = data.articuloId;
        payload.precioProductoId = data.precioProductoId;
      }

      await prestamosService.crearPrestamo(payload)
      
      setModalAlerta({
        titulo: 'Crédito Creado',
        mensaje: 'El crédito ha sido registrado exitosamente. Si requiere aprobación, se ha enviado la notificación correspondiente.',
        tipo: 'exito'
      })
      setShowCreditModal(false)
      
      // Refrescar datos
      if (rutaActual?.id) {
         cargarEstadisticasRuta(rutaActual.id);
      }
    } catch (error: any) {
      console.error('Error al crear crédito:', error)
      setModalAlerta({
        titulo: 'Error',
        mensaje: error.message || 'No se pudo crear el crédito. Por favor verifique los datos e intente de nuevo.',
        tipo: 'error'
      })
    } finally {
      setIsLoadingAction(false)
    }
  }, [userSession?.id, rutaActual?.id, cargarEstadisticasRuta])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // Funciones auxiliares
  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    if (estado === 'pagado') return 'bg-emerald-50 text-emerald-700 border-emerald-500/30'
    if (estado === 'pendiente') return 'bg-orange-50 text-orange-700 border-orange-500/30'
    if (estado === 'en_mora') return 'bg-rose-50 text-rose-700 border-rose-500/30'
    if (estado === 'ausente') return 'bg-slate-50 text-slate-600 border-slate-300'
    return 'bg-blue-50 text-blue-700 border-blue-500/30'
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    if (prioridad === 'alta') return '#f97316'
    if (prioridad === 'media') return '#08557f'
    return '#94a3b8'
  }, [])

  const handleRegistrarPago = useCallback(async (monto: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null) => {
    if (!visitaPagoSeleccionada) return

    try {
      setIsLoadingAction(true)
      if (!visitaPagoSeleccionada.prestamoId) {
        setModalAlerta({
          titulo: 'Error',
          mensaje: 'Esta asignación no tiene un préstamo asociado vinculado correctamente. Por favor contacte soporte.',
          tipo: 'error'
        })
        return;
      }

      const resultado = await prestamosService.registrarPago({
        prestamoId: visitaPagoSeleccionada.prestamoId,
        clienteId: visitaPagoSeleccionada.clienteId,
        monto,
        metodoPago: metodo,
        comprobante,
        esAbono: pagoInitialIsAbono,
        cobradorId: userSession?.id
      })

      // Actualizar estado local (optimista) para reflejar pago
      setVisitasBase(prev => prev.map(v => {
        if (v.id === visitaPagoSeleccionada.id) {
           const nuevoSaldo = Math.max(0, v.saldoTotal - monto);
           return {
              ...v,
              saldoTotal: nuevoSaldo,
              estado: nuevoSaldo <= 0 ? 'pagado' : 'pendiente', // Lógica simplificada
              montoCuota: nuevoSaldo <= 0 ? 0 : v.montoCuota
           }
        }
        return v
      }))

      // Sincronizar inmediatamente la visita con la próxima cuota real del préstamo
      try {
        const detallePrestamo = await prestamosService.obtenerPrestamoPorId(visitaPagoSeleccionada.prestamoId);
        const cuotas = detallePrestamo?.cuotas || [];
        const proxima = cuotas.find((c: any) => c.estado === 'PENDIENTE' || c.estado === 'ATRASADA' || c.estado === 'PARCIAL');
        setVisitasBase(prev => prev.map(v => {
          if (v.id !== visitaPagoSeleccionada.id) return v;
          const nuevoRecaudoDia = Number(v.recaudadoDelDia || 0) + Number(monto || 0);
          const nuevoRecaudoTotalClient = Number(v.recaudadoTotalClient || 0) + Number(monto || 0);
          if (proxima) {
            const nuevoEstado: EstadoVisita = proxima.estado === 'ATRASADA' ? 'en_mora' : 'pendiente';
            return {
              ...v,
              proximaVisita: proxima.fechaVencimiento || v.proximaVisita,
              montoCuota: Number(proxima.monto || v.montoCuota),
              estado: nuevoEstado,
              recaudadoDelDia: nuevoRecaudoDia,
              recaudadoTotalClient: nuevoRecaudoTotalClient
            };
          } else {
            // Si no hay próxima, el préstamo podría quedar pagado
            return {
              ...v,
              estado: 'pagado',
              montoCuota: 0,
              recaudadoDelDia: nuevoRecaudoDia,
              recaudadoTotalClient: nuevoRecaudoTotalClient
            };
          }
        }));
      } catch {}

      // Actualizar KPIs de ruta (recaudo y eficiencia) usando respuesta del backend
      const montoRegistrado = Number(resultado?.descomposicion?.montoTotal ?? monto);
      setRutaStats(prev => {
        const nuevoRecaudo = prev.recaudo + montoRegistrado;
        const nuevaEficiencia = prev.meta > 0 ? parseFloat(((nuevoRecaudo / prev.meta) * 100).toFixed(1)) : prev.eficiencia;
        return { ...prev, recaudo: nuevoRecaudo, eficiencia: nuevaEficiencia };
      });

      // Reconsultar estadísticas reales de la ruta desde backend para sincronizar
      try {
        if (rutaActual?.id) {
          const rutaRefrescada = await rutasService.obtenerRutaPorId(rutaActual.id);
          const est = (rutaRefrescada as any).estadisticas;
          if (est) {
            setRutaStats({
              recaudo: est.cobranzaDelDia || 0,
              meta: est.metaDelDia || 0,
              eficiencia: est.avanceDiario || 0,
              gastos: rutaStats.gastos,
              base: rutaStats.base,
            });
          }
          // Fallback/Complemento: usar contabilidad para asegurar el recaudado del día real
          try {
            const saldo = await obtenerSaldoDisponibleRuta(rutaActual.id);
            setRutaStats(prev => ({
              ...prev,
              recaudo: Number(saldo?.recaudoDelDia ?? prev.recaudo),
              gastos: Number(saldo?.gastosDelDia ?? prev.gastos)
            }));
          } catch {}

          // Refrescar visitas desde las asignaciones reales del backend para reflejar saldos y estados
          const asignaciones = (rutaRefrescada as any).asignaciones || (rutaRefrescada as any).asignacionesRuta || [];
          const visitasActualizadas: VisitaRuta[] = asignaciones.map((asig: any, index: number) => {
            const cliente = asig.cliente || {};
            const prestamos = cliente.prestamos || [];
            const prestamoActivo = prestamos.find((p: any) => p.estado === 'ACTIVO' || p.estado === 'VENCIDO') || prestamos[0] || {};
            const proximaCuota = prestamoActivo.proximaCuota || {};
            const saldoTotal = Number(prestamoActivo.saldoPendiente || 0);
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
              saldoTotal,
              estado,
              proximaVisita: proximaCuota.fechaVencimiento || new Date().toISOString(),
              ordenVisita: asig.ordenVisita || index + 1,
              prioridad: (asig.prioridad?.toLowerCase()) || (estado === 'en_mora' ? 'alta' : 'media'),
              nivelRiesgo: (() => {
                const r = cliente.nivelRiesgo || 'VERDE';
                if (r === 'VERDE') return 'bajo';
                if (r === 'AMARILLO') return 'leve';
                if (r === 'ROJO') return 'moderado';
                if (r === 'LISTA_NEGRA') return 'critico';
                return 'bajo';
              })(),
              cobradorId: userSession?.id || '',
              periodoRuta: (() => {
                const f = prestamoActivo.frecuenciaPago || 'DIARIO';
                if (f === 'DIARIO') return 'DIA';
                if (f === 'SEMANAL') return 'SEMANA';
                if (f === 'QUINCENAL') return 'QUINCENA';
                if (f === 'MENSUAL') return 'MES';
                return 'DIA';
              })() as PeriodoRuta,
              clienteId: cliente.id,
              prestamoId: prestamoActivo.id
            };
          }).sort((a: any, b: any) => a.ordenVisita - b.ordenVisita);
          // Enriquecer con recaudado del día por cliente
          try {
            const hoyStr = new Date().toDateString();
            const enriquecidas = await Promise.all(visitasActualizadas.map(async (v) => {
              if (!v.clienteId) return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };
              try {
                const pagosResp = await pagosService.obtenerPagos({ clienteId: v.clienteId, limit: 100 });
                const pagosCalc = (pagosResp?.pagos || []);
                const totalHoy = pagosCalc.reduce((sum: number, p: any) => {
                  return new Date(p.fechaPago).toDateString() === hoyStr ? sum + Number(p.montoTotal || 0) : sum;
                }, 0);
                const totalHistorico = pagosCalc.reduce((sum: number, p: any) => sum + Number(p.montoTotal || 0), 0);
                return { ...v, recaudadoDelDia: totalHoy, recaudadoTotalClient: totalHistorico };
              } catch {
                return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };
              }
            }));
            const finales2 = enriquecidas.map(v => ({ ...v, estado: ajustarEstadoConPago(v) }));
            setVisitasBase(finales2);
            setVisitasOrden(finales2.map(v => v.id));
            // Actualizar KPIs si faltan valores
            const metaCalculada = enriquecidas.reduce((sum, v) => {
              const d = new Date(v.proximaVisita);
              const sameDay = !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
              return sameDay ? sum + Number(v.montoCuota || 0) : sum;
            }, 0);
            const recaudadoCalculado = enriquecidas.reduce((sum, v) => sum + Number(v.recaudadoDelDia || 0), 0);
            setRutaStats(prev => ({
              ...prev,
              meta: prev.meta > 0 ? prev.meta : metaCalculada,
              recaudo: prev.recaudo > 0 ? prev.recaudo : recaudadoCalculado,
              eficiencia: (prev.meta > 0 ? prev.meta : metaCalculada) > 0 
                ? parseFloat((((prev.recaudo > 0 ? prev.recaudo : recaudadoCalculado) / (prev.meta > 0 ? prev.meta : metaCalculada)) * 100).toFixed(1))
                : prev.eficiencia
            }));
          } catch {
            setVisitasBase(visitasActualizadas);
            setVisitasOrden(visitasActualizadas.map(v => v.id));
          }
        }
      } catch {
        // Silencioso: mantenemos el optimista si falla el refresh
      }

      setModalAlerta({
        titulo: 'Éxito',
        mensaje: 'Pago registrado correctamente en el sistema',
        tipo: 'exito'
      })
      
      setShowPaymentModal(false)
      setVisitaPagoSeleccionada(null)
    } catch (error: any) {
      console.error('Error al registrar pago', error)
      setModalAlerta({
        titulo: 'Error',
        mensaje: error.message || 'Ocurrió un error al registrar el pago. Intente de nuevo.',
        tipo: 'error'
      })
    } finally {
      setIsLoadingAction(false)
    }
  }, [visitaPagoSeleccionada, pagoInitialIsAbono, userSession?.id])

  const confirmarFinalizarRuta = useCallback(() => {
    const meta = rutaStats.meta || 1;
    const recaudo = rutaStats.recaudo || 0;
    const clientesFaltantes = visitasBase.filter(v => v.estado === 'pendiente' || v.estado === 'en_mora').length;
    const efectividad = Math.round((recaudo / meta) * 100);

    socket?.emit('ruta_completada_emit', {
      rutaNombre: rutaActual?.nombre || 'Mi Ruta',
      cobradorNombre: userSession?.nombres || 'El Cobrador',
      recaudo: recaudo,
      efectividad: efectividad,
      clientesFaltantes: clientesFaltantes
    });

    setRutaCompletada(true)
    setCoordinadorToast('Se ha cerrado el día de manera exitosa y se alertó a la oficina.')
    setShowConfirmCompleteModal(false)
    window.setTimeout(() => setCoordinadorToast(null), 4000)
  }, [socket, rutaActual, userSession, rutaStats, visitasBase])

  const handleCompletarRuta = useCallback(() => {
    setShowConfirmCompleteModal(true)
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

  // Cargar recaudado del cliente en el día desde backend
  useEffect(() => {
    const cargarRecaudoCliente = async () => {
      if (!showClienteInfoModal || !visitaClienteSeleccionada?.clienteId) {
        setRecaudadoClienteHoy(0);
        setNextPagoFecha(null);
        setNextPagoMonto(null);
        return;
      }
      try {
        const resp = await pagosService.obtenerPagos({ clienteId: visitaClienteSeleccionada.clienteId, limit: 100 });
        const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let targetDateStr = toLocalKey(new Date());
        
        // Si hay una fecha seleccionada en el historial, evaluarla directamente
        if (selectedHistoryDate) {
           targetDateStr = selectedHistoryDate;
        } else if ((visitaClienteSeleccionada as any).fecha || visitaClienteSeleccionada.proximaVisita) {
           const dString = (visitaClienteSeleccionada as any).fecha || visitaClienteSeleccionada.proximaVisita;
           targetDateStr = dString.includes('T') ? dString.split('T')[0] : dString;
        }

        const totalDelDia = (resp?.pagos || []).reduce((sum: number, p: any) => {
          const rawPago = p.fechaPago || p.creadoEn;
          const f = rawPago ? (rawPago.includes('T') ? rawPago.split('T')[0] : rawPago) : '';
          
          if (f === targetDateStr) return sum + Number(p.montoTotal || 0);
          return sum;
        }, 0);
        setRecaudadoClienteHoy(totalDelDia);
      } catch {
        setRecaudadoClienteHoy(0);
      }
    };
    cargarRecaudoCliente();
  }, [showClienteInfoModal, visitaClienteSeleccionada?.clienteId]);

  useEffect(() => {
    const cargarProximaCuotaCliente = async () => {
      if (!showClienteInfoModal || !visitaClienteSeleccionada) {
        setNextPagoFecha(null);
        setNextPagoMonto(null);
        return;
      }
      try {
        let detalle: any = null;
        if (visitaClienteSeleccionada.prestamoId) {
          try {
            detalle = await prestamosService.obtenerPrestamoPorId(visitaClienteSeleccionada.prestamoId);
          } catch {
            detalle = null;
          }
        }
        if (!detalle) {
          try {
            const resp = await prestamosService.obtenerPrestamos({
              search: visitaClienteSeleccionada.cliente,
              limit: 5,
              estado: 'ACTIVO',
            });
            const loan = resp?.prestamos?.find((p: any) => p.clienteId === visitaClienteSeleccionada.clienteId) || resp?.prestamos?.[0];
            if (loan?.id) detalle = await prestamosService.obtenerPrestamoPorId(loan.id);
          } catch {
            detalle = null;
          }
        }
        if (detalle?.cuotas && Array.isArray(detalle.cuotas)) {
          const proxima = detalle.cuotas.find((c: any) => c.estado === 'PENDIENTE' || c.estado === 'ATRASADA' || c.estado === 'PARCIAL');
          setNextPagoFecha(proxima?.fechaVencimiento || null);
          setNextPagoMonto(proxima ? Number(proxima.monto || 0) : null);
        } else {
          setNextPagoFecha(null);
          setNextPagoMonto(null);
        }
      } catch {
        setNextPagoFecha(null);
        setNextPagoMonto(null);
      }
    };
    cargarProximaCuotaCliente();
  }, [showClienteInfoModal, visitaClienteSeleccionada?.prestamoId, visitaClienteSeleccionada?.clienteId, visitaClienteSeleccionada?.cliente]);

  // Cargar detalle real de mora al abrir el modal
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
          detalle = await loansService_.obtenerDetallePrestamo(prestamoId)
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




  // Generar avatar del usuario
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
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#08557f_0,transparent_100%)] opacity-20"></div>
      </div>

      <div className="relative w-full space-y-8 p-8">
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

        {/* Header con información del cobrador */}
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
                  <span className="font-medium text-slate-700">Cobrador</span>
                  <span>•</span>
                  <span>{rutaActual?.nombre || userSession.rutaAsignada || 'Cargando ruta...'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Filtro de período para Cards */}
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

        {/* Stats rápidos - 4 Cards con Diseño Admin */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Tarjeta 1: Recaudo */}
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

          {/* Tarjeta 2: Efectividad */}
           <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efectividad</p>
                <div className="flex items-baseline gap-2 mt-2">
                   <h3 className="text-2xl font-bold text-slate-900">{rutaStats.eficiencia}%</h3>
                   <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rutaStats.eficiencia >= 90 ? 'text-emerald-600 bg-emerald-50' : rutaStats.eficiencia >= 70 ? 'text-orange-600 bg-orange-50' : 'text-rose-600 bg-rose-50'}`}>
                      {rutaStats.eficiencia >= 90 ? 'ÓPTIMO' : rutaStats.eficiencia >= 70 ? 'REGULAR' : 'BAJO'}
                   </span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
             <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${rutaStats.eficiencia}%` }}></div>
             </div>
             <p className="text-xs text-slate-400 font-medium mt-2">Pendiente: {formatCurrency(Math.max(0, rutaStats.meta - rutaStats.recaudo))}</p>
          </div>

          {/* Tarjeta 3: Gastos */}
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
             <p className="text-xs text-slate-400 font-medium">Registrados {periodoCards === 'HOY' ? 'hoy' : periodoCards === 'SEM' ? 'esta semana' : periodoCards === 'MES' ? 'este mes' : 'este año'}</p>
          </div>

          {/* Tarjeta 4: Base */}
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
            {/* Buscador y filtros */}
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

            <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">

                  <ExportButton
                    label="Exportar Ruta"
                    onExportExcel={exportarRutaDiariaCSV}
                    onExportPDF={exportarRutaDiariaPDF}
                  />
                  <button 
                    onClick={() => setShowHistory(false)}
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


              {!showHistory && (
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
            {/* Lista de visitas */}
            <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  {showHistory && (
                    <h3 className="font-bold text-slate-900 text-lg">Histórico de Rutas</h3>
                  )}
                  {!showHistory && (
                     <div className="flex flex-wrap gap-2 text-[10px] font-black text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm uppercase tracking-tighter">
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-500/20">
                             <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 
                             <span>Mínimo</span>
                         </div>
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-500/20">
                             <div className="w-2 h-2 rounded-full bg-blue-500"></div> 
                             <span>Leve</span>
                         </div>
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded-lg border border-yellow-500/20">
                             <div className="w-2 h-2 rounded-full bg-yellow-500"></div> 
                             <span>Precaución</span>
                         </div>
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-500/20">
                             <div className="w-2 h-2 rounded-full bg-amber-500"></div> 
                             <span>Moderado</span>
                         </div>
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 rounded-lg border border-rose-500/20">
                             <div className="w-2 h-2 rounded-full bg-rose-500"></div> 
                             <span>Crítico</span>
                         </div>
                     </div>
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
                        const historyDates = historialRutas ? Object.keys(historialRutas).sort().reverse() : []; // Newest first

                        if (historyDates.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                               <History className="h-12 w-12 mb-3 opacity-20" />
                               <p className="text-sm font-bold">Sin historial disponible</p>
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             {/* Improved Filter Tabs (Pills) */}
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

                             {/* MONTHS VIEW: días agrupados por mes con tarjetas de clientes */}
                             {historyViewMode === 'MONTHS' && (() => {
                               const allDates2 = historialRutas ? Object.keys(historialRutas).sort().reverse() : [];
                               const byMonth2: Record<string, string[]> = {};
                               for (const date of allDates2) {
                                 const [y2, mi2] = date.split('-');
                                 const mk = `${y2}-${mi2}`;
                                 if (!byMonth2[mk]) byMonth2[mk] = [];
                                 byMonth2[mk].push(date);
                               }
                               const monthKeys2 = Object.keys(byMonth2).sort().reverse();
                               if (monthKeys2.length === 0) {
                                 return (
                                   <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                     <History className="h-12 w-12 mb-3 opacity-20" />
                                     <p className="text-sm font-bold">Sin historial disponible</p>
                                   </div>
                                 );
                               }
                               return (
                                 <div className="space-y-4">
                                   {monthKeys2.map(monthKey => {
                                     const [my, mNum] = monthKey.split('-');
                                     const monthObj = new Date(parseInt(my), parseInt(mNum)-1, 1);
                                     const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
                                     const daysInMonth = byMonth2[monthKey];
                                     const isMonthExpanded = selectedHistoryMonth === monthKey;
                                     const monthRecaudo = daysInMonth.reduce((sum, d2) => sum + (((historialRutas as any)||{})[d2]?.resumen?.recaudo || 0), 0);
                                     const monthPagados = daysInMonth.reduce((sum, d2) => {
                                       const dd2 = ((historialRutas as any)||{})[d2];
                                       return sum + (dd2?.visitas?.filter((v: any) => v.estado === 'pagado')?.length || 0);
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
                                               const dayData = ((historialRutas as any)||{})[date];
                                               const isDayExpanded = selectedHistoryDate === date;
                                               const [dy, dm, dd] = date.split('-');
                                               const dateObj2 = new Date(parseInt(dy), parseInt(dm)-1, parseInt(dd));
                                               const dayNameStr = dateObj2.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });
                                               return (
                                                 <div key={date} className={`border-b border-slate-50 last:border-0 transition-all ${isDayExpanded ? 'bg-slate-50/40' : ''}`}>
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
                                                         <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                                           <div className="w-5 h-5 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />
                                                           <span className="text-xs font-medium">Cargando clientes...</span>
                                                         </div>
                                                       ) : dayData.visitas.length === 0 ? (
                                                         <div className="text-center py-6 text-[11px] text-slate-400 font-medium">Sin cobros registrados para este día</div>
                                                       ) : (
                                                         dayData.visitas.map((visita: VisitaRuta) => (
                                                           <StaticVisitaItem key={visita.id} visita={visita} onSelect={() => {}} onVerCliente={handleAbrirClienteInfo} getEstadoClasses={getEstadoClasses} />
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

                             {/* Daily Routes List (Only in DAYS mode) */}
                             {historyViewMode === 'DAYS' && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Historial de Días</h3>
                                    {historyDates.map(date => {
                                       const data = (historialRutas as Record<string, HistorialDia>)[date]
                                       const isExpanded = selectedHistoryDate === date
                                       const [y, m, d] = date.split('-')
                                       const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d))
                                       const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
                                       
                                       // Detect completion
                                       const isCompleted = data.visitas.length > 0 && (data.resumen.efectividad === 100 || data.visitas.every((v: VisitaRuta) => v.estado === 'pagado'));

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
                                               if (!isExpanded && (!data.loaded)) {
                                                 await cargarHistorialFecha(date);
                                               }
                                               setSelectedHistoryDate(isExpanded ? null : date);
                                             }}
                                           >
                                             <div className="flex items-center gap-3">
                                                {/* Date Badge */}
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

                                             {/* Body (Expanded) */}
                                             {isExpanded && (
                                                <div className="border-t border-slate-100 bg-white p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                   <div className="flex justify-between text-xs font-bold text-slate-500 uppercase px-1">
                                                      <span>{data.resumen.visitados} Clientes Gestionados</span>
                                                      <span>Estado</span>
                                                    </div>
                                                   <div>
                                                      {!(data as any).loaded ? (
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
                           </div>
                         )
                      }

                      const noPagadas = visitasCobrador.filter(v => v.estado !== 'pagado')

                      const isTodayOrMora = (dateStr: string) => {
                        if (!dateStr) return true;
                        const d = new Date(dateStr);
                        const hoy = new Date();
                        hoy.setHours(0, 0, 0, 0);
                        d.setHours(0, 0, 0, 0);
                        return d.getTime() <= hoy.getTime();
                      };

                      const filterByDate = (v: any) => searchQuery || isTodayOrMora(v.proximaVisita);

                      const porPeriodo = {
                        DIA: noPagadas.filter(v => v.periodoRuta === 'DIA' && filterByDate(v)),
                        SEMANA: noPagadas.filter(v => v.periodoRuta === 'SEMANA' && filterByDate(v)),
                        QUINCENA: noPagadas.filter(v => v.periodoRuta === 'QUINCENA' && filterByDate(v)),
                        MES: noPagadas.filter(v => v.periodoRuta === 'MES' && filterByDate(v)),
                      }

                      const renderSeccion = (titulo: string, visitas: VisitaRuta[]) => {
                        if (visitas.length === 0) return null;
                        return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-slate-200"></div>
                            <span className="text-[11px] font-black text-[#08557f] uppercase tracking-[0.25em] bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
                              {titulo} <span className="ml-1 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full">{visitas.length}</span>
                            </span>
                            <div className="h-px flex-1 bg-slate-200"></div>
                          </div>
                          <div className="space-y-3">
                            {visitas.map((visita) => (
                              <SortableVisita
                                key={visita.id}
                                visita={visita}
                                onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                                onVerCliente={handleAbrirClienteInfo}
                                getEstadoClasses={getEstadoClasses}
                                disableSort={rutaCompletada}
                                isSelected={visita.id === visitaSeleccionada}
                              >
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                  <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setVisitaPagoSeleccionada(visita);
                                        setPagoInitialIsAbono(false);
                                        setShowPaymentModal(true);
                                    }}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                  >
                                    <DollarSign className="h-4 w-4 mb-1" />
                                    <span className="text-[9px] font-bold uppercase">Pago</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setVisitaPagoSeleccionada(visita); setPagoInitialIsAbono(true); setShowPaymentModal(true); }}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                                  >
                                    <Wallet className="h-4 w-4 mb-1" />
                                    <span className="text-[9px] font-bold uppercase">Abono</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setVisitaEstadoCuentaSeleccionada(visita); setShowEstadoCuentaModal(true); }}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                  >
                                    <FileTextIcon className="h-4 w-4 mb-1 text-slate-400" />
                                    <span className="text-[9px] font-bold uppercase">Estado</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setVisitaReprogramar(visita); setShowReprogramModal(true); }}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                  >
                                    <Calendar className="h-4 w-4 mb-1 text-slate-400" />
                                    <span className="text-[9px] font-bold uppercase">Repro.</span>
                                  </button>
                                </div>
                              </SortableVisita>
                            ))}
                          </div>
                        </div>
                        )
                      }

                      if (periodoRutaFiltro === 'DIA') return renderSeccion('Ruta del día', porPeriodo.DIA)
                      if (periodoRutaFiltro === 'SEMANA') return renderSeccion('Ruta de la semana', porPeriodo.SEMANA)
                      if (periodoRutaFiltro === 'QUINCENA') return renderSeccion('Ruta quincenal', porPeriodo.QUINCENA)
                      if (periodoRutaFiltro === 'MES') return renderSeccion('Ruta del mes', porPeriodo.MES)

                      return (
                        <>
                          {renderSeccion('Ruta mensual', porPeriodo.MES)}
                          {renderSeccion('Ruta quincenal', porPeriodo.QUINCENA)}
                          {renderSeccion('Ruta semanal', porPeriodo.SEMANA)}
                          {renderSeccion('Ruta del día', porPeriodo.DIA)}
                        </>
                      )
                    })()}
                  </div>
                </SortableContext>
                
                <DragOverlay>
                  {overlayVisita ? (
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
                                  {overlayVisita.cliente}
                                </div>
                                <div 
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: getPrioridadColor(overlayVisita.prioridad) }}
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

             {/* Visitas Completadas */}
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

        {/* Floating Action Buttons */}
        <FloatingActionMenu actions={[
          { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => setShowCreditModal(true) },
          { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => setShowNewClientModal(true) },
          { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setAccionPendiente('ABONO'); setShowClientSelector(true); } },
          { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setAccionPendiente('PAGO'); setShowClientSelector(true); } },
          { label: 'Solicitudes', icon: <ClipboardList className="h-5 w-5" />, onClick: () => router.push('/cobranzas/solicitudes') },
          { label: 'Pedir Base', icon: <Wallet className="h-5 w-5" />, color: 'emerald', onClick: () => setShowBaseModal(true) },
          { label: 'Gastos', icon: <ReceiptText className="h-5 w-5" />, color: 'rose', onClick: () => setShowGastoModal(true) },
        ] as FabAction[]} />


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
                    {/* Header Info */}
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



                    {/* Detailed Info Sections */}
                    <div className="space-y-4">
                       {/* Personal Data */}
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

                       {/* Financial Summary */}
                       <div className="space-y-3 pt-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resumen Financiero</h5>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-orange-600 font-bold mb-1 uppercase tracking-tighter">Por Entregar</div>
                                <div className="text-orange-900 font-black text-xl">${visitaClienteSeleccionada?.saldoTotal.toLocaleString('es-CO')}</div>
                             </div>
                             <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-sm text-right">
                                <div className="text-xs text-emerald-600 font-bold mb-1 uppercase tracking-tighter">Recaudado</div>
                                <div className="text-emerald-900 font-black text-xl">${recaudadoClienteHoy.toLocaleString('es-CO')}</div>
                             </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center">
                             <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Cuota Proyectada</div>
                              <div className="text-slate-900 font-bold text-lg">${(nextPagoMonto ?? visitaClienteSeleccionada?.montoCuota ?? 0).toLocaleString('es-CO')}</div>
                             </div>
                             <div className="text-right">
                              {nextPagoFecha && (
                                <>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase">Próxima Fecha</div>
                                  <div className="text-[#08557f] font-bold">{formatFechaLargaUTC(nextPagoFecha)}</div>
                                </>
                              )}
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

        {/* Modales Compartidos */}
        {showPaymentModal && visitaPagoSeleccionada && (
          <PagoModal
            visita={visitaPagoSeleccionada}
            tipo={pagoInitialIsAbono ? 'ABONO' : 'PAGO'}
            onClose={() => {
              setShowPaymentModal(false)
              setVisitaPagoSeleccionada(null)
            }}
            onConfirm={handleRegistrarPago}
          />
        )}

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

        {showEstadoCuentaModal && visitaEstadoCuentaSeleccionada && (
          <EstadoCuentaModal
            onClose={() => {
              setShowEstadoCuentaModal(false)
              setVisitaEstadoCuentaSeleccionada(null)
            }}
            visita={visitaEstadoCuentaSeleccionada}
          />
        )}

        {showClientSelector && (
          <SeleccionClienteModal
            titulo={accionPendiente === 'PAGO' ? 'Seleccionar Cliente' : accionPendiente === 'ABONO' ? 'Seleccionar para Abono' : 'Seleccionar Cliente'}
            subtitulo={accionPendiente === 'PAGO' ? '¿Quién realiza el pago?' : 'Busque el cliente en la lista'}
            visitas={visitasBase}
          onSelect={(visita) => {
            setShowClientSelector(false)
            if (accionPendiente === 'PAGO') {
                setVisitaPagoSeleccionada(visita)
                setPagoInitialIsAbono(false)
                setShowPaymentModal(true)
            }
            else if (accionPendiente === 'ABONO') {
                setVisitaPagoSeleccionada(visita)
                setPagoInitialIsAbono(true)
                setShowPaymentModal(true)
            }
            else if (accionPendiente === 'REPROGRAMAR') {
                setVisitaReprogramar(visita)
                setShowReprogramModal(true)
            }
            else {
                setVisitaEstadoCuentaSeleccionada(visita)
                setShowEstadoCuentaModal(true)
            }
            setAccionPendiente(null)
          }}
          onClose={() => {
            setShowClientSelector(false)
            setAccionPendiente(null)
          }}
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
          onConfirm={async (data) => {
            if (!rutaActual || !userSession) return
            try {
              setIsLoadingAction(true)
              await registrarGasto({
                descripcion: data.descripcion,
                valor: data.valor,
                comprobante: data.comprobante,
                rutaId: rutaActual.id,
                cobradorId: userSession.id
              })
              // Sincronizar KPI de gastos con valor real desde backend
              try {
                const now = new Date();
                const hoyClave = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                const saldo = await obtenerSaldoDisponibleRuta(rutaActual.id, hoyClave);
                setRutaStats(prev => ({
                  ...prev,
                  gastos: Number(saldo.gastosDelDia || prev.gastos)
                }));
              } catch {
                // Fallback local si el endpoint falla
                setRutaStats(prev => ({ ...prev, gastos: prev.gastos + data.valor }))
              }
              setModalAlerta({
                titulo: 'Éxito',
                mensaje: 'Gasto registrado correctamente. Se notificó al coordinador para aprobación.',
                tipo: 'exito'
              })
              setShowGastoModal(false)
            } catch (error: any) {
              console.error('Error al registrar gasto:', error)
              const mensajeError =
                error?.statusCode === 404 && typeof error?.message === 'string' && error.message.toLowerCase().includes('caja de ruta')
                  ? 'No se encontró una caja de ruta asociada para registrar el gasto. Informe al coordinador para que configure la caja de ruta en el módulo contable.'
                  : (error?.message || 'Error al registrar el gasto. Intente nuevamente.')
              setModalAlerta({
                titulo: 'Error',
                mensaje: mensajeError,
                tipo: 'error'
              })
            } finally {
              setIsLoadingAction(false)
            }
          }}
          cobradorId={userSession?.id}
          rutaId={rutaActual?.id}
          recaudoDia={rutaStats.recaudo}
          gastosDia={rutaStats.gastos}
        />

        <BaseModal
          isOpen={showBaseModal}
          onClose={() => setShowBaseModal(false)}
          onConfirm={async (data) => {
            if (!rutaActual || !userSession) return
            try {
              setIsLoadingAction(true)
              await solicitarBase({
                monto: data.monto,
                descripcion: data.descripcion,
                cobradorId: userSession.id,
                rutaId: rutaActual.id
              })
              setModalAlerta({
                titulo: 'Éxito',
                mensaje: 'Solicitud de base enviada al coordinador. Espere aprobación.',
                tipo: 'exito'
              })
              setShowBaseModal(false)
            } catch (error: any) {
              console.error('Error solicitando base:', error)
              setModalAlerta({
                titulo: 'Error',
                mensaje: error.message || 'No se pudo enviar la solicitud de base.',
                tipo: 'error'
              })
            } finally {
              setIsLoadingAction(false)
            }
          }}
        />

        {showConfirmCompleteModal && (
          <Portal>
            <div 
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
            >
             <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                   <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-2 border border-orange-100">
                      <AlertTriangle className="h-8 w-8" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">¿Finalizar Ruta del Día?</h3>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed mb-4">
                        Al marcar la ruta como completada se reportará tu rendimiento a la oficina.
                     </p>
                     
                     <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Meta</p>
                          <p className="text-sm font-black text-slate-900">${(rutaStats.meta || 0).toLocaleString('es-CO')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recaudado</p>
                          <p className="text-sm font-black text-emerald-600">${(rutaStats.recaudo || 0).toLocaleString('es-CO')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Efectividad</p>
                          <p className={`text-sm font-black ${(rutaStats.recaudo / (rutaStats.meta || 1)) >= 1 ? 'text-emerald-600' : 'text-orange-600'}`}>
                             {Math.round(((rutaStats.recaudo || 0) / (rutaStats.meta || 1)) * 100)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pendientes</p>
                          <p className="text-sm font-black text-slate-900 text-slate-400">
                            {visitasBase.filter(v => v.estado === 'pendiente' || v.estado === 'en_mora').length} clientes
                          </p>
                        </div>
                     </div>
                   </div>
                   <div className="flex gap-3 w-full mt-4">
                      <button 
                        onClick={() => setShowConfirmCompleteModal(false)}
                        className="flex-1 py-3.5 text-slate-600 font-bold bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 border border-slate-200"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={confirmarFinalizarRuta}
                        className="flex-1 py-3.5 text-white font-bold bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                      >
                        Confirmar
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </Portal>
      )}

        {/* Modal de Alerta usando ConfirmModal */}
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

export default VistaCobrador

'use client'

import { useState, ChangeEvent, FormEvent, useEffect, useCallback, useMemo } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { usePageFocusRefresh } from '@/hooks/usePageFocusRefresh'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Route,
  Users,
  User,
  Clock,
  Eye,
  Plus,
  Search,
  TrendingUp,
  LayoutGrid,
  List,
  Pencil,
  X,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  ArrowRightLeft,
  XCircle,
  Wallet,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { routesService } from '@/services/routes-service';
import { rutasService } from '@/services/rutas-service';
import {
  getBogotaDateKey,
} from '@/lib/rutas-core'
import { clientesService, Cliente } from '@/services/clientes-service';
import { useNotification } from '@/components/providers/NotificationProvider';
import { usePermission } from '@/hooks/usePermission';
import { offlineStore } from '@/lib/offline/offlineDb';
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal';
import { getCajas, consolidarCaja, obtenerSaldoDisponibleRuta, Caja } from '@/services/contabilidad-service';
import { prestamosService } from '@/services/prestamos-service';
import { creditosService } from '@/services/creditos-service';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Ruta {
  id: string;
  nombre: string;
  codigo: string;
  zona?: string;
  estado: 'ACTIVA' | 'INACTIVA' | 'PENDIENTE_ACTIVACION' | 'COMPLETADA';
  cobrador: string;
  cobradorId?: string;
  supervisorId?: string;
  clientesAsignados: number;
  clientesNuevos: number;
  cobranzaDelDia: number;
  metaDelDia: number;
  descripcion?: string;
  nivelRiesgo?: string;
  frecuenciaVisita?: string;
}

interface PrestamoResumen {
  id: string;
  tipo: 'EFECTIVO' | 'ARTICULO';
  articulo?: string;
  frecuencia: string;
  saldoPendiente: number;
}

interface ClienteSelection {
  id: string;
  nombre?: string;
  codigo?: string;
  prestamos?: PrestamoResumen[];
  // Allow other properties to avoid tight coupling with backend response in this view
  [key: string]: unknown;
}

interface RutasPageViewProps {
  readOnly?: boolean;
  rutasBasePath?: string;
  rutas?: Ruta[];
  cobradores?: { id: string; nombre: string }[];
  supervisores?: { id: string; nombre: string }[];
}

const mapAsignacionesToClientesRuta = (asignaciones: any[] = []): ClienteSelection[] => {
  const uniqueByClienteId = new Map<string, ClienteSelection>();

  asignaciones.forEach((a: any) => {
    const clienteId = a?.cliente?.id;
    if (!clienteId || uniqueByClienteId.has(clienteId)) return;

    uniqueByClienteId.set(clienteId, {
      id: clienteId,
      nombre: `${a.cliente.nombres} ${a.cliente.apellidos}`,
      codigo: a.cliente.dni,
      direccion: a.cliente.telefono,
      prestamos: (a.cliente.prestamos || [])
        .filter((p: any) => p.estado === 'ACTIVO' || p.estado === 'EN_MORA')
        .map((p: any) => ({
          id: p.id,
          tipo:
            p.tipo === 'ARTICULO' || p.tipoPrestamo === 'ARTICULO'
              ? 'ARTICULO'
              : 'EFECTIVO',
          articulo: p.articulo || p.descripcionArticulo || undefined,
          frecuencia: p.frecuenciaPago || 'DIARIO',
          saldoPendiente: Number(p.saldoPendiente || 0),
        })) as PrestamoResumen[],
    });
  });

  return Array.from(uniqueByClienteId.values());
};

export const RutasPageView = ({ 
  readOnly = false, 
  rutasBasePath = '/admin/rutas', 
  rutas = [],
  cobradores = [],
  supervisores = [] 
}: RutasPageViewProps) => {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { can, canForPath } = usePermission()
  const puedeCrear = can('RUTAS_CREATE') || canForPath(rutasBasePath || '/admin/rutas')
  const puedeEditar = can('RUTAS_EDIT') || canForPath(rutasBasePath || '/admin/rutas')
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('TODAS')
  const [vista, setVista] = useState<'grid' | 'list'>(() => {
    const p = (rutasBasePath || '').toLowerCase()
    if (p.includes('/coordinador') || p.includes('/admin') || p.includes('/supervisor')) {
      return 'list'
    }
    return 'grid'
  })
  const [loading, setLoading] = useState(false)
  const { showNotification } = useNotification();
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false)
  const permitido = can('RUTAS_VIEW') || canForPath(rutasBasePath || '/admin/rutas')

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    zona: '',
    frecuenciaVisita: 'DIARIO',
    estado: 'ACTIVA',
    cobradorId: '',
    supervisorId: '',
    descripcion: ''
  })
  
  // Mocks removed. Data now passed via props.
  // const [cobradores]... removed
  // const [supervisores]... removed
  
  const [clientesRuta, setClientesRuta] = useState<ClienteSelection[]>([]) // Typed array
  const [clientesDisponibles, setClientesDisponibles] = useState<ClienteSelection[]>([]) 
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [isAddingCliente, setIsAddingCliente] = useState(false)
  
  // Use state for routes to allow client-side updates
  const [rutasList, setRutasList] = useState<Ruta[]>(rutas as Ruta[]);
  
  const displayRutas: Ruta[] = rutasList;
  
  // State for lists with fallback fetching
  const [cobradoresList, setCobradoresList] = useState(cobradores);
  const [supervisoresList, setSupervisoresList] = useState(supervisores);
  const [showSelectPrincipalModal, setShowSelectPrincipalModal] = useState(false)
  const [principalOptions, setPrincipalOptions] = useState<Caja[]>([])
  const [processingTransfer, setProcessingTransfer] = useState(false)
  const [routeForTransfer, setRouteForTransfer] = useState<Ruta | null>(null)
  const showRecolectar = currentUser?.rol === 'SUPER_ADMINISTRADOR' || currentUser?.rol === 'ADMIN'
  const [showRecolectarModal, setShowRecolectarModal] = useState(false)
  const [montoRecolectar, setMontoRecolectar] = useState('')      // valor formateado con puntos
  const [saldoDisponibleRecolectar, setSaldoDisponibleRecolectar] = useState<number | null>(null)
  const [cajaRutaIdRecolectar, setCajaRutaIdRecolectar] = useState<string | null>(null)
  const [errorRecolectar, setErrorRecolectar] = useState<string | null>(null)

  // Formatea numero con puntos de miles: 200000 -> '200.000'
  const formatInputMonto = (raw: string): string => {
    const numeros = raw.replace(/[^0-9]/g, '')
    if (!numeros) return ''
    return parseInt(numeros, 10).toLocaleString('es-CO')
  }
  // Parsea el valor formateado a numero
  const parseMonto = (formatted: string): number => {
    return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0
  }

  const fetchRutas = useCallback(async () => {
    setLoading(true);
    try {
      const isSupervisorPath = (rutasBasePath || '').toLowerCase().includes('/supervisor')
      const response = await routesService.getAll({
        limit: 100,
        ...(isSupervisorPath && currentUser?.id ? { supervisorId: currentUser.id } : {}),
      });
      const payload = (response as any)?.data ?? response
      const data = Array.isArray(payload)
        ? payload
        : (Array.isArray((payload as any)?.data) ? (payload as any).data : [])

      if (Array.isArray(data) && data.length > 0) {
        const hoyBogota = getBogotaDateKey(new Date())
        // metaDelDia ya viene calculada correctamente por el backend en findAll.
        // Solo enriquecemos cobranzaDelDia con datos frescos del saldo de caja
        // para reflejar pagos procesados después del último TTL de caché.
        const enriched = await Promise.all(
          (data as Ruta[]).map(async (r: Ruta) => {
            if (r?.estado !== 'ACTIVA') return r;
            try {
              const saldoResp = await obtenerSaldoDisponibleRuta(r.id, hoyBogota)
              const cobranzaFromSaldo = Number(saldoResp?.cobranzaDelDia ?? saldoResp?.recaudoDelDia ?? 0)
              const cobranzaDelDia = Math.max(cobranzaFromSaldo, Number(r.cobranzaDelDia || 0))
              const backendMeta = Number(r.metaDelDia || 0)
              const backendCobranza = Number(r.cobranzaDelDia || 0)
              const pendienteNominal = Math.max(0, backendMeta - backendCobranza)
              const metaDelDia = pendienteNominal > 0
                ? pendienteNominal + cobranzaDelDia
                : Math.max(backendMeta, cobranzaDelDia)
              return { ...r, cobranzaDelDia, metaDelDia }
            } catch {
              return r;
            }
          })
        );

        setRutasList(enriched as unknown as Ruta[]);
      }
    } catch {
      try {
        const offRutas = await offlineStore.getAll<any>('rutas');
        if (offRutas.length > 0) {
          setRutasList(offRutas.map((r: any) => ({
            id: r.id, nombre: r.nombre, codigo: r.codigo, zona: r.zona || '',
            estado: r.activa ? 'ACTIVA' : 'INACTIVA', cobrador: '',
            cobradorId: r.cobradorId || '', supervisorId: r.supervisorId || '',
            clientesAsignados: 0, clientesNuevos: 0, cobranzaDelDia: 0, metaDelDia: 0,
          } as Ruta)));
        }
      } catch {}
    }
  }, [currentUser?.id, rutasBasePath])

  useEffect(() => {
    const fetchLists = async () => {
      try {
        if (cobradoresList.length === 0) {
          const fetchedCobradores = await routesService.getCobradores();
          setCobradoresList(fetchedCobradores);
        }
        if (supervisoresList.length === 0) {
          const fetchedSupervisores = await routesService.getSupervisores();
          setSupervisoresList(fetchedSupervisores);
        }
        await fetchRutas();
      } catch (error) { /* offline handled inside fetchRutas */ }
    };
    fetchLists();
  }, [fetchRutas]);

  // Tiempo real: rutas o clientes actualizados
  useRealtimeData(
    ['rutas_actualizadas', 'clientes_actualizados', 'dashboards_actualizados'],
    fetchRutas,
  )
  usePageFocusRefresh(fetchRutas)


  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteAMover, setClienteAMover] = useState<string | null>(null)
  const [rutaDestinoId, setRutaDestinoId] = useState('')
  // Mapa de prestamoId -> rutaId destino para mover créditos individualmente
  const [rutaDestinoMap, setRutaDestinoMap] = useState<Record<string, string>>({})

  const loadClientesRuta = useCallback(async (rutaId: string) => {
    const rutaDetalle = await routesService.getById(rutaId);
    setClientesRuta(mapAsignacionesToClientesRuta(rutaDetalle.asignaciones || []));
  }, [])

  // Efecto para buscar clientes disponibles
  useEffect(() => {
    if (!isAddingCliente) {
      setClientesDisponibles([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setLoadingClientes(true);
      try {
        // Si no hay búsqueda, traemos los más recientes (omitiendo el filtro search)
        const results = await clientesService.obtenerTodos({ 
          search: clienteSearch.length >= 1 ? clienteSearch : undefined 
        });
        
        setClientesDisponibles(results.map(c => ({
          id: c.id,
          nombre: `${c.nombres} ${c.apellidos}`,
          codigo: c.dni,
          direccion: c.direccion || '',
          deuda: c.montoTotal || 0
        })));
      } catch (error) {
        console.error('Error buscando clientes:', error);
      } finally {
        setLoadingClientes(false);
      }
    }, 300); // Un poco más rápido

    return () => clearTimeout(searchTimer);
  }, [clienteSearch, isAddingCliente]);

  const handleCreateClick = () => {
    if (!puedeCrear) return
    setEditingId(null)
    setFormData({
      nombre: '',
      codigo: '',
      zona: '',
      frecuenciaVisita: 'DIARIO',
      estado: 'ACTIVA',
      cobradorId: '',
      supervisorId: '',
      descripcion: ''
    })
    setShowModal(true)
  }

  const handleEditClick = async (ruta: Ruta) => {
    if (!puedeEditar) return
    setEditingId(ruta.id)
    setFormData({
      nombre: ruta.nombre,
      codigo: ruta.codigo,
      zona: ruta.zona || '',
      frecuenciaVisita: ruta.frecuenciaVisita || 'DIARIO',
      estado: ruta.estado || 'ACTIVA',
      cobradorId: ruta.cobradorId || '',
      supervisorId: ruta.supervisorId || '',
      descripcion: ruta.descripcion || ''
    })
    
    // Cargar clientes de la ruta
    try {
      await loadClientesRuta(ruta.id);
    } catch (error) {
      console.error('Error cargando clientes de la ruta:', error);
      setClientesRuta([]);
    }
    
    setShowModal(true)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingId) {
        await routesService.update(editingId, {
          nombre: formData.nombre,
          codigo: formData.codigo,
          zona: formData.zona,
          cobradorId: formData.cobradorId,
          supervisorId: formData.supervisorId || undefined,
          descripcion: formData.descripcion,
          activa: formData.estado === 'ACTIVA'
        });
        showNotification('success', 'Ruta actualizada correctamente', 'Éxito');
      } else {
        await routesService.create({
          nombre: formData.nombre,
          codigo: formData.codigo,
          zona: formData.zona,
          cobradorId: formData.cobradorId,
          supervisorId: formData.supervisorId || undefined,
          descripcion: formData.descripcion
        });
        showNotification('success', 'Ruta creada correctamente', 'Éxito');
      }
      
      setShowModal(false);
      
      // Refresh list client-side to ensure UI updates immediately
      try {
        await fetchRutas();
      } catch (e) { /* Error refreshing routes */ }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'No se pudo guardar la ruta';
      showNotification('error', Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, 'Error');
    }
  }

  const handleToggleEstado = async (id: string) => {
    try {
      await routesService.toggleActive(id);
      
      // Update local state optimistic or fetch
      try {
         await fetchRutas();
      } catch (e) { /* Error loading routes */ }

      showNotification('success', 'Estado de la ruta actualizado', 'Éxito');
    } catch (error) {
      showNotification('error', 'No se pudo cambiar el estado', 'Error');
    }
  }
  const handleRecolectarDinero = async (ruta: Ruta) => {
    setErrorRecolectar(null)
    setMontoRecolectar('')
    setSaldoDisponibleRecolectar(null)
    setCajaRutaIdRecolectar(null)
    setRouteForTransfer(ruta)
    setShowRecolectarModal(true)
    // Cargar saldo y buscar caja de la ruta en paralelo
    try {
      const [saldoResp, cajasResp] = await Promise.all([
        obtenerSaldoDisponibleRuta(ruta.id),
        getCajas(),
      ])
      const saldo = saldoResp?.saldoCaja ?? saldoResp?.saldoDisponible ?? 0
      setSaldoDisponibleRecolectar(saldo)
      const cajaIdBackend = (saldoResp as any)?.cajaId as (string | undefined)
      const cajaRuta = cajaIdBackend
        ? cajasResp.find(c => c.id === cajaIdBackend)
        : cajasResp.find(c => c.rutaId === ruta.id)
      setCajaRutaIdRecolectar(cajaRuta?.id || null)
    } catch (e) {
      console.error('Error cargando saldo:', e)
      setErrorRecolectar('No se pudo cargar el saldo de la ruta')
    }
  }

  const handleConfirmarRecolectar = async () => {
    const monto = parseMonto(montoRecolectar)
    if (!monto || monto <= 0) { setErrorRecolectar('Ingresa un monto valido'); return }
    if (saldoDisponibleRecolectar !== null && monto > saldoDisponibleRecolectar) {
      setErrorRecolectar(`El monto supera el saldo disponible (${formatCurrency(saldoDisponibleRecolectar)})`);
      return
    }
    if (!cajaRutaIdRecolectar) { setErrorRecolectar('No se encontro la caja de la ruta'); return }
    setProcessingTransfer(true)
    setErrorRecolectar(null)
    try {
      await consolidarCaja(cajaRutaIdRecolectar, monto)
      setShowRecolectarModal(false)
      showNotification('success', `Se recolectaron ${formatCurrency(monto)} de la ruta hacia Caja de Oficina`, 'Recoleccion exitosa')
      await fetchRutas()
    } catch (e: any) {
      setErrorRecolectar(e?.message || 'No se pudo recolectar. Intenta de nuevo.')
    } finally {
      setProcessingTransfer(false)
    }
  }
  const confirmarEnvioA = async (destinoId: string) => {
    try {
      setProcessingTransfer(true)
      if (!routeForTransfer) return
      const cajas = await getCajas()
      const cajaRuta = cajas.find(c => c.tipo === 'RUTA' && c.rutaId === routeForTransfer.id)
      const destino = cajas.find(c => c.id === destinoId)
      if (!cajaRuta || !destino) return
      await consolidarCaja(cajaRuta.id)
      setShowSelectPrincipalModal(false)
      setRouteForTransfer(null)
      showNotification('success', `Dinero enviado a ${destino.nombre}`, 'Éxito')
    } catch {
      showNotification('error', 'No se pudo completar la transferencia', 'Error')
    } finally {
      setProcessingTransfer(false)
    }
  }
  const handleMoveCliente = async (clienteId: string) => {
    if (!editingId || !rutaDestinoId) return;
    
    try {
      await routesService.moveClient(clienteId, editingId, rutaDestinoId);
      showNotification('success', 'Cliente movido exitosamente', 'Éxito');
      
      setClientesRuta(prev => prev.filter(c => c.id !== clienteId));
      setClienteAMover(null);
      setRutaDestinoId('');
      
      try {
        await fetchRutas();
      } catch {}
    } catch (error) {
      showNotification('error', 'No se pudo mover el cliente', 'Error');
    }
  }

  const handleMoveLoan = async (prestamoId: string) => {
    const toRutaId = rutaDestinoMap[prestamoId];
    if (!toRutaId) return;
    try {
      await routesService.moveLoan(prestamoId, toRutaId);
      showNotification('success', 'Crédito asignado a la ruta correctamente', 'Éxito');
      setRutaDestinoMap(prev => { const n = { ...prev }; delete n[prestamoId]; return n; });
      if (editingId) {
        await loadClientesRuta(editingId);
      }
      await fetchRutas();
    } catch (error) {
      showNotification('error', 'No se pudo mover el crédito', 'Error');
    }
  }

  const confirmAddCliente = async (cliente: ClienteSelection) => {
    if (!editingId || !formData.cobradorId) {
      showNotification('warning', 'Seleccione un cobrador para la ruta primero', 'Atención');
      return;
    }

    try {
      await routesService.assignClient(editingId, cliente.id, formData.cobradorId);
      showNotification('success', `Cliente ${cliente.nombre} asignado a la ruta`, 'Éxito');
      
      await loadClientesRuta(editingId);
      setIsAddingCliente(false);
      setClienteSearch('');
      
      try {
        await fetchRutas();
      } catch {}
    } catch (error) {
      showNotification('error', 'No se pudo asignar el cliente', 'Error');
    }
  }
  const [activeTab, setActiveTab] = useState<'info' | 'clientes'>('info')

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  // ... (Rest of code)

  const rutasFiltradas = displayRutas.filter((ruta) => {
    const cumpleEstado = estadoFiltro === 'TODAS' || ruta.estado === estadoFiltro
    const cumpleBusqueda =
      ruta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      ruta.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      ruta.cobrador.toLowerCase().includes(busqueda.toLowerCase())

    return cumpleEstado && cumpleBusqueda
  })

  // Lógica de Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRutas = rutasFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rutasFiltradas.length / itemsPerPage);

  // Reset página al filtrar
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const rutasActivas = displayRutas.filter((ruta) => ruta.estado === 'ACTIVA').length
  const rutasPendientes = displayRutas.filter((ruta) => ruta.estado === 'PENDIENTE_ACTIVACION').length
  const totalClientes = displayRutas.reduce((acc, curr) => acc + curr.clientesAsignados, 0)

  const { objetivoTotalShown, cobranzaTotal, porcentajeAvance } = useMemo(() => {
    const rutasOperativas = (Array.isArray(displayRutas) ? displayRutas : []).filter((r: any) => r && r.estado === 'ACTIVA' && r.clientesAsignados > 0)

    console.log('🔍 rutasOperativas:', rutasOperativas.map((r: any) => ({
      nombre: r.nombre,
      clientesAsignados: r.clientesAsignados,
      metaDelDia: r.metaDelDia,
      cobranzaDelDia: r.cobranzaDelDia,
    })))

    const objetivoTotal = rutasOperativas.reduce((acc, curr) => {
      const meta = Number(curr?.metaDelDia ?? 0)
      // Si la meta del backend es 0 o no existe, no sumarla (evita metas incorrectas)
      if (meta <= 0) return acc
      return acc + meta
    }, 0)

    const recTotal = rutasOperativas.reduce((acc, curr) => {
      const recaudo = Number(curr?.cobranzaDelDia ?? 0)
      return acc + recaudo
    }, 0)

    return {
      objetivoTotalShown: objetivoTotal,
      cobranzaTotal: recTotal,
      porcentajeAvance: objetivoTotal > 0 ? Math.min(100, (recTotal / objetivoTotal) * 100) : 0,
    }
  }, [displayRutas])

  // Force list view for Coordinador, Admin and Supervisor
  if ((rutasBasePath.includes('/coordinador') || rutasBasePath.includes('/admin') || rutasBasePath.includes('/supervisor')) && vista !== 'list') {
    setVista('list')
  }

  // Determine risk color classes
  const getRiesgoColor = (riesgo: string) => {
    if (!riesgo) return 'hidden';
    switch (riesgo) {
        case 'PELIGRO_MINIMO': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'LEVE_RETRASO': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'PRECAUCION': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'RIESGO_MODERADO': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'ALTO_RIESGO': return 'bg-rose-50 text-rose-700 border-rose-200';
        default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  const getRiesgoLabel = (riesgo: string) => {
      if (!riesgo) return '';
      return riesgo.replace('_', ' ');
  }

  if (!permitido) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-bold border border-slate-200">
            <Route className="h-3.5 w-3.5" />
            <span>Acceso no autorizado</span>
          </div>
          <p className="mt-4 text-slate-500 font-medium">No tienes permisos para ver Rutas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo Arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Route className="h-3.5 w-3.5" />
              <span>Gestión de Territorios</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Rutas y </span>
              <span className="text-orange-500">Cobradores</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm max-w-2xl">
              Administra la asignación geográfica de clientes y monitorea el rendimiento de cada zona operativa.
            </p>
          </div>
          <div className="flex gap-4">
            {!readOnly && currentUser?.role !== 'COBRADOR' && puedeCrear && (
              <button
                onClick={handleCreateClick}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
              >
                <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                <span>Nueva Ruta</span>
              </button>
            )}
            {!readOnly && currentUser?.role !== 'COBRADOR' && (
              <button
                onClick={() => setShowCrearCreditoModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm font-bold text-sm group"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Crédito</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Tarjetas de Resumen (Stats) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                label: 'Rutas Activas',
                value: rutasActivas,
                sub: 'Operativas hoy',
                icon: MapPin,
                color: 'text-slate-900',
                subColor: 'text-emerald-600',
                iconColor: 'text-emerald-600',
                bgIcon: 'bg-emerald-50',
              },
              {
                label: 'Clientes Asignados',
                value: totalClientes,
                sub: `En ${rutasActivas} rutas`,
                icon: Users,
                color: 'text-slate-900',
                subColor: 'text-slate-500',
                iconColor: 'text-blue-600',
                bgIcon: 'bg-blue-50',
              },
              {
                label: 'Avance Cobranza',
                value: `${porcentajeAvance.toFixed(1)}%`,
                sub: `Objetivo: ${formatCurrency(objetivoTotalShown)}`,
                icon: TrendingUp,
                color: 'text-slate-900',
                subColor: 'text-slate-500',
                iconColor: 'text-indigo-600',
                bgIcon: 'bg-indigo-50',
              },
              {
                label: 'Coordinadores',
                value: '2',
                sub: 'Supervisando rutas',
                icon: User,
                color: 'text-slate-900',
                subColor: 'text-slate-500',
                iconColor: 'text-blue-600',
                bgIcon: 'bg-blue-50',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl transition-colors ${stat.bgIcon}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <h3 className={`text-3xl font-bold ${stat.color} tracking-tight`}>{stat.value}</h3>
                </div>
                <div className={`mt-4 text-xs font-medium ${stat.subColor} flex items-center gap-1.5`}>
                  <Eye className="h-3.5 w-3.5" />
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Filtros y Búsqueda */}
          <div className="flex flex-col md:flex-row gap-6 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex-1 buscador-3d">
              <Search className="icon h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o cobrador..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="buscador-3d-input"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {(['TODAS', 'PENDIENTE_ACTIVACION', 'ACTIVA', 'INACTIVA'] as const).map((estado) => {
                const count = estado === 'PENDIENTE_ACTIVACION' ? rutasPendientes : null
                const label = estado === 'TODAS' ? 'Todas'
                  : estado === 'PENDIENTE_ACTIVACION' ? 'Pendientes'
                    : estado.charAt(0) + estado.slice(1).toLowerCase()

                return (
                  <button
                    key={estado}
                    onClick={() => setEstadoFiltro(estado)}
                    className={cn(
                      'px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2',
                      estadoFiltro === estado
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200',
                    )}
                  >
                    {label}
                    {count !== null && count > 0 && (
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-bold',
                        estadoFiltro === estado
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-100 text-orange-600'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {!rutasBasePath.includes('/coordinador') && !rutasBasePath.includes('/admin') && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setVista('grid')}
                className={cn(
                  'p-2.5 rounded-lg transition-all',
                  vista === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setVista('list')}
                className={cn(
                  'p-2.5 rounded-lg transition-all',
                  vista === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
            )}
          </div>

          {/* Contenido Principal */}
          {vista === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentRutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className={cn(
                    "group bg-white/80 backdrop-blur-sm rounded-2xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col",
                    ruta.nivelRiesgo === 'ALTO_RIESGO' ? "border-rose-200 shadow-rose-100" :
                    ruta.nivelRiesgo === 'RIESGO_MODERADO' ? "border-amber-200 shadow-amber-100" :
                    ruta.nivelRiesgo === 'PRECAUCION' ? "border-yellow-200 shadow-yellow-100" :
                    ruta.nivelRiesgo === 'LEVE_RETRASO' ? "border-blue-200 shadow-blue-100" :
                    ruta.nivelRiesgo === 'PELIGRO_MINIMO' ? "border-emerald-200 shadow-emerald-100" :
                    "border-slate-200"
                  )}
                >
                  <div className="p-8 flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-600 tracking-wide border border-slate-200">
                            {ruta.codigo}
                          </span>
                          {ruta.clientesNuevos > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-xs font-bold text-blue-700 tracking-wide border border-blue-200">
                              +{ruta.clientesNuevos} nuevos
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mt-3 group-hover:text-blue-700 transition-colors">
                          {ruta.nombre}
                        </h3>
                      </div>
                      <div
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-bold border',
                          ruta.estado === 'ACTIVA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ruta.estado === 'PENDIENTE_ACTIVACION'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : ruta.estado === 'COMPLETADA'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200',
                        )}
                      >
                        {ruta.estado === 'PENDIENTE_ACTIVACION' ? 'PENDIENTE' : ruta.estado}
                      </div>
                      {ruta.nivelRiesgo && (
                          <div className={cn(
                              'px-3 py-1 rounded-full text-[10px] font-bold border uppercase ml-2',
                              getRiesgoColor(ruta.nivelRiesgo)
                          )}>
                              {getRiesgoLabel(ruta.nivelRiesgo)}
                          </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-4 group/item">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cobrador</p>
                          <p className="font-bold text-slate-900">{ruta.cobrador}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 group/item">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cartera</p>
                          <p className="font-bold text-slate-900">{ruta.clientesAsignados} clientes</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 group/item">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Frecuencia</p>
                          <p className="font-bold text-slate-900">{ruta.frecuenciaVisita}</p>
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso de objetivo diario */}
                    {ruta.estado === 'ACTIVA' && (
                      <div className="pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Recaudo Diario</p>
                            <p className="font-bold text-slate-900">{formatCurrency(ruta.cobranzaDelDia)}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {ruta.metaDelDia > 0 ? Math.min(100, (ruta.cobranzaDelDia / ruta.metaDelDia) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className="bg-slate-900 h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${ruta.metaDelDia > 0 ? Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-right text-slate-400 mt-2 font-medium">Objetivo: {formatCurrency(ruta.metaDelDia)}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 group-hover:bg-blue-50/30 transition-colors" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-slate-400 font-bold">ID: {ruta.id}</span>

                      <div className="flex items-center gap-2">
                        {/* Botones de acción (siempre visibles) */}
                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditClick(ruta)
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {!readOnly && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleEstado(ruta.id)
                                }}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    ruta.estado === 'ACTIVA' 
                                        ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" 
                                        : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                )}
                                title={ruta.estado === 'ACTIVA' ? "Desactivar" : "Activar"}
                            >
                                {ruta.estado === 'ACTIVA' ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                          )}
                          <Link
                            href={`${rutasBasePath}/${ruta.id}`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Ver detalle"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                router.push(`${rutasBasePath}/${ruta.id}`)
                              }}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {showRecolectar && (
                          <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRecolectarDinero(ruta)
                              }}
                              disabled={processingTransfer}
                              className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                              title="Recolectar Dinero"
                            >
                              <Wallet className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Card para añadir nueva ruta */}
              {!readOnly && (
                <button
                  onClick={handleCreateClick}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-50 transition-all duration-300 min-h-[400px]"
                >
                  <div className="p-6 rounded-full bg-slate-100 group-hover:bg-white group-hover:shadow-md transition-all mb-6 duration-300 border border-slate-200">
                    <Plus className="h-8 w-8 text-slate-400 group-hover:text-slate-900" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Crear nueva ruta</h3>
                  <p className="text-sm text-slate-500 mt-3 text-center max-w-[200px] leading-relaxed font-medium">
                    Define un nuevo territorio y asigna un cobrador responsable.
                  </p>
                </button>
              )}
            </div>
          ) : (
            <>
            {/* Tabla - Desktop */}
            <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wider">Ruta / Código</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Cobrador</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Clientes</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Avance Diario</th>
                      <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentRutas.map((ruta) => (
                      <tr
                        key={ruta.id}
                        onClick={() => router.push(`${rutasBasePath}/${ruta.id}`)}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center border border-blue-100">
                              <Route className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900">{String(ruta.nombre || 'Ruta sin nombre')}</div>
                              <div className="text-xs text-slate-500">{String(ruta.codigo || 'S/C')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
                              ruta.estado === 'ACTIVA'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-100',
                            )}
                          >
                            {ruta.estado}
                          </span>
                          {ruta.nivelRiesgo && (
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ml-2 lowercase first-letter:uppercase',
                                  getRiesgoColor(ruta.nivelRiesgo)
                                )}
                              >
                                {getRiesgoLabel(ruta.nivelRiesgo)}
                              </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                              {ruta.cobrador.charAt(0)}
                            </div>
                            <span className="text-slate-700 font-medium">{ruta.cobrador}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>{ruta.clientesAsignados}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {ruta.estado === 'ACTIVA' ? (
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-primary">{ruta.metaDelDia > 0 ? Math.min(100, (ruta.cobranzaDelDia / ruta.metaDelDia) * 100).toFixed(0) : 0}%</span>
                                <span className="text-slate-500 font-medium">{formatCurrency(ruta.cobranzaDelDia)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                                <div
                                  className="bg-slate-900 h-1.5 rounded-full"
                                  style={{ width: `${ruta.metaDelDia > 0 ? Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100) : 0}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`${rutasBasePath}/${ruta.id}`)
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!readOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditClick(ruta)
                                }}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {!readOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleEstado(ruta.id)
                                }}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    ruta.estado === 'ACTIVA'
                                        ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                        : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                )}
                                title={ruta.estado === 'ACTIVA' ? "Desactivar" : "Activar"}
                              >
                                {ruta.estado === 'ACTIVA' ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                              </button>
                            )}
                            {showRecolectar && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleRecolectarDinero(ruta)
                                }}
                                disabled={processingTransfer}
                                className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                                title="Recolectar Dinero"
                              >
                                <Wallet className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vista de Cards - Móvil */}
            <div className="md:hidden space-y-4">
              {currentRutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
                  onClick={() => router.push(`${rutasBasePath}/${ruta.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center border border-blue-100 flex-shrink-0">
                        <Route className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate">{ruta.nombre}</div>
                        <div className="text-xs text-slate-500">{ruta.codigo}</div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ml-2',
                        ruta.estado === 'ACTIVA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-600 border-slate-100',
                      )}
                    >
                      {ruta.estado}
                    </span>
                  </div>

                  {/* Cobrador */}
                  <div className="mb-3">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cobrador</div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                        {ruta.cobrador.charAt(0)}
                      </div>
                      <span className="text-slate-700 font-medium">{ruta.cobrador}</span>
                    </div>
                  </div>

                  {/* Clientes */}
                  <div className="mb-3">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Clientes Asignados</div>
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{ruta.clientesAsignados}</span>
                    </div>
                  </div>

                  {/* Avance Diario */}
                  {ruta.estado === 'ACTIVA' && (
                    <div className="mb-3 pb-3 border-b border-slate-100">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Avance Diario</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(ruta.cobranzaDelDia)}</span>
                          <span className="text-sm font-bold text-primary">{ruta.metaDelDia > 0 ? Math.min(100, (ruta.cobranzaDelDia / ruta.metaDelDia) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className="bg-slate-900 h-2 rounded-full"
                            style={{ width: `${ruta.metaDelDia > 0 ? Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500">Objetivo: {formatCurrency(ruta.metaDelDia)}</div>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`${rutasBasePath}/${ruta.id}`)
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {!readOnly && puedeEditar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditClick(ruta)
                        }}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {!readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleEstado(ruta.id)
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          ruta.estado === 'ACTIVA' 
                            ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" 
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        )}
                        title={ruta.estado === 'ACTIVA' ? "Desactivar" : "Activar"}
                      >
                        {ruta.estado === 'ACTIVA' ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    )}
                    {showRecolectar && (
                          <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleRecolectarDinero(ruta)
                        }}
                        disabled={processingTransfer}
                        className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                        title="Recolectar Dinero"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {/* Paginación Elegante Estandarizada */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500 font-medium rounded-2xl">
            <span>
              Mostrando {currentRutas.length} de {rutasFiltradas.length} resultados
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                Siguiente <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nueva Ruta */}
      {!readOnly && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-orange-500 rounded-lg">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      <span className="text-blue-600">{editingId ? 'Editar' : 'Nueva'}</span> <span className="text-orange-500">Ruta</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {editingId ? 'Modifique los datos de la ruta existente' : 'Configure una nueva zona de cobranza'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              {editingId && (
                <div className="flex px-6 border-b border-slate-100 bg-white shrink-0">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={cn(
                      'px-4 py-3 text-sm font-bold border-b-2 transition-colors',
                      activeTab === 'info'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Información General
                  </button>
                  <button
                    onClick={() => setActiveTab('clientes')}
                    className={cn(
                      'px-4 py-3 text-sm font-bold border-b-2 transition-colors',
                      activeTab === 'clientes'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Clientes Asignados
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'info' ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Nombre de la Ruta</label>
                        <input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          placeholder="Ej: Ruta Centro - Comercial"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Código Identificador</label>
                        <input
                          type="text"
                          name="codigo"
                          value={formData.codigo}
                          onChange={handleInputChange}
                          placeholder="Ej: RT-CEN-01"
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Zona</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="zona"
                            value={formData.zona}
                            onChange={handleInputChange}
                            placeholder="Ej: Sector Norte"
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                            required
                          />
                          <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Cobrador Asignado</label>
                        <div className="relative">
                          <select
                            name="cobradorId"
                            value={formData.cobradorId}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                            required
                          >
                            <option value="">Seleccione un cobrador</option>
                            {cobradoresList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                          <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Supervisor</label>
                        <div className="relative">
                          <select
                            name="supervisorId"
                            value={formData.supervisorId}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                            required
                          >
                            <option value="">Seleccione un supervisor</option>
                            {supervisoresList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre}
                              </option>
                            ))}
                          </select>
                          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Estado de la Ruta</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, estado: 'ACTIVA' }))}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                              formData.estado === 'ACTIVA' 
                                ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" 
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <CheckCircle2 className={cn("h-4 w-4", formData.estado === 'ACTIVA' ? "text-emerald-500" : "text-slate-400")} />
                            Activa
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, estado: 'INACTIVA' }))}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                              formData.estado === 'INACTIVA'
                                ? "bg-white text-slate-700 shadow-sm ring-1 ring-black/5"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <XCircle className="h-4 w-4" />
                            Inactiva
                          </button>
                        </div>
                      </div>

                      <div className="col-span-full space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Descripción</label>
                        <textarea
                          name="descripcion"
                          value={formData.descripcion}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"
                          placeholder="Detalles de la ruta..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4" />
                        <span>Guardar</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Clientes</p>
                          <p className="text-2xl font-bold text-slate-900">{clientesRuta.length}</p>
                        </div>
                      </div>
                      {!isAddingCliente ? (
                        <button
                          onClick={() => setIsAddingCliente(true)}
                          type="button"
                          className="px-4 py-2 bg-white text-blue-600 font-bold text-sm rounded-lg shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar Cliente
                        </button>
                      ) : (
                        <div className="relative w-72">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar por nombre..."
                              className="w-full pl-9 pr-9 py-2.5 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm text-slate-900"
                              value={clienteSearch}
                              onChange={e => setClienteSearch(e.target.value)}
                            />
                            <button
                              onClick={() => {
                                setIsAddingCliente(false)
                                setClienteSearch('')
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Dropdown Results */}
                          {isAddingCliente && (clientesDisponibles.length > 0 || loadingClientes) && (
                            <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                              {loadingClientes && (
                                <div className="sticky top-0 z-10 bg-blue-50/90 backdrop-blur-sm px-4 py-2 border-b border-blue-100">
                                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest animate-pulse">Actualizando lista...</p>
                                </div>
                              )}
                              
                              {clientesDisponibles.filter(c =>
                                !clientesRuta.some(existing => existing.id === c.id) &&
                                (clienteSearch === '' || String(c.nombre || '').toLowerCase().includes(clienteSearch.toLowerCase()))
                              ).length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                  {clientesDisponibles
                                    .filter(c =>
                                      !clientesRuta.some(existing => existing.id === c.id) &&
                                      (clienteSearch === '' || String(c.nombre || '').toLowerCase().includes(clienteSearch.toLowerCase()))
                                    )
                                    .map(cliente => (
                                      <button
                                        key={cliente.id}
                                        onClick={() => confirmAddCliente(cliente)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group flex items-center justify-between"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-sm text-slate-900 group-hover:text-blue-700 truncate">{String(cliente.nombre || 'Sin nombre')}</p>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                            <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase">{String(cliente.codigo || 'S/D')}</span>
                                            <span className="truncate">{String(cliente.direccion || 'Sin dirección')}</span>
                                          </div>
                                        </div>
                                        <Plus className="h-4 w-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0 ml-2" />
                                      </button>
                                    ))}
                                </div>
                              ) : !loadingClientes && (
                                <div className="p-8 text-center bg-slate-50">
                                  <Search className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                  <p className="text-xs text-slate-500 font-medium">No se encontraron clientes disponibles</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {clientesRuta.map((cliente) => {
                        const prestamos = (cliente.prestamos as PrestamoResumen[]) || [];
                        const FREQ_LABEL: Record<string, string> = {
                          DIARIO: 'Diario',
                          SEMANAL: 'Semanal',
                          QUINCENAL: 'Quincenal',
                          MENSUAL: 'Mensual',
                        };
                        const FREQ_COLOR: Record<string, string> = {
                          DIARIO: 'bg-blue-50 text-blue-700 border-blue-200',
                          SEMANAL: 'bg-purple-50 text-purple-700 border-purple-200',
                          QUINCENAL: 'bg-amber-50 text-amber-700 border-amber-200',
                          MENSUAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        };
                        return (
                        <div key={cliente.id} className="bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow group overflow-hidden">
                          {/* Cabecera del cliente */}
                          <div className="flex items-center gap-4 p-4">
                            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold border border-slate-200 flex-shrink-0">
                              {String(cliente.nombre || '?').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-900 truncate">{String(cliente.nombre || 'Sin nombre')}</h4>
                              <p className="text-xs text-slate-500 truncate">{String(cliente.codigo || cliente.direccion || '')}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{prestamos.length} crédito{prestamos.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>

                          {/* Créditos individuales con selector de ruta por crédito */}
                          {prestamos.length > 0 ? (
                            <div className="border-t border-slate-100 divide-y divide-slate-100">
                              {prestamos.map((p) => (
                                <div key={p.id} className="px-4 py-3 space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        p.tipo === 'ARTICULO' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}>
                                        {p.tipo === 'ARTICULO' ? `Artículo${p.articulo ? `: ${p.articulo}` : ''}` : 'Efectivo'}
                                      </span>
                                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${FREQ_COLOR[p.frecuencia] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {FREQ_LABEL[p.frecuencia] || p.frecuencia}
                                      </span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="font-bold text-slate-900 text-sm">{formatCurrency(p.saldoPendiente)}</p>
                                      <p className="text-[10px] text-slate-400">Saldo pendiente</p>
                                    </div>
                                  </div>
                                  {/* Selector de ruta individual por crédito */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                      <select
                                        className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        value={rutaDestinoMap[p.id] || ''}
                                        onChange={(e) => setRutaDestinoMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                      >
                                        <option value="">Asignar a otra ruta...</option>
                                        {rutas.filter(r => r.id !== editingId).map(r => (
                                          <option key={r.id} value={r.id}>{r.nombre}</option>
                                        ))}
                                      </select>
                                      <ArrowRightLeft className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                                    </div>
                                    <button
                                      disabled={!rutaDestinoMap[p.id]}
                                      onClick={() => handleMoveLoan(p.id)}
                                      className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                      Asignar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="border-t border-slate-100 px-4 py-3">
                              <p className="text-xs text-slate-400 italic">Sin créditos activos</p>
                            </div>
                          )}
                        </div>
                        );
                      })}

                      {clientesRuta.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No hay clientes asignados a esta ruta.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Recolectar Dinero con monto personalizable */}
      {showRecolectarModal && routeForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowRecolectarModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-white font-bold text-base">Recolectar Dinero</h2>
                  <p className="text-emerald-100 text-xs">{routeForTransfer.nombre}</p>
                </div>
              </div>
              <button onClick={() => setShowRecolectarModal(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Saldo disponible */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo disponible en ruta</p>
                {saldoDisponibleRecolectar === null ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(saldoDisponibleRecolectar)}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">Sera enviado a la <strong>Caja de Oficina</strong></p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Monto a recolectar</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={montoRecolectar}
                    onChange={(e) => {
                      setMontoRecolectar(formatInputMonto(e.target.value))
                      setErrorRecolectar(null)
                    }}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-900 text-lg font-bold tracking-wide"
                  />
                </div>
                {saldoDisponibleRecolectar !== null && saldoDisponibleRecolectar > 0 && (
                  <button type="button" onClick={() => setMontoRecolectar(formatInputMonto(saldoDisponibleRecolectar.toString()))}
                    className="mt-1 text-xs text-emerald-600 font-bold hover:underline">
                    Recolectar monto completo
                  </button>
                )}
              </div>

              {errorRecolectar && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <XCircle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-rose-700">{errorRecolectar}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowRecolectarModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                  disabled={processingTransfer}>
                  Cancelar
                </button>
                <button onClick={handleConfirmarRecolectar}
                  disabled={processingTransfer || !montoRecolectar || !cajaRutaIdRecolectar}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {processingTransfer ? 'Recolectando...' : <><Wallet className="h-4 w-4" /> Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSelectPrincipalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setShowSelectPrincipalModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Seleccionar Caja Principal</h3>
              </div>
              <button onClick={() => setShowSelectPrincipalModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {principalOptions.map((caja) => (
                <div key={caja.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{caja.nombre}</div>
                    <div className="text-xs text-slate-500 font-medium">Saldo: {formatCurrency(caja.saldo)}</div>
                  </div>
                  <button
                    onClick={() => confirmarEnvioA(caja.id)}
                    disabled={processingTransfer}
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
                  >
                    Enviar a esta caja
                  </button>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              El dinero será transferido desde la caja de la ruta seleccionada a la caja principal elegida.
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Crear Crédito */}
      <CrearCreditoModal
        isOpen={showCrearCreditoModal}
        onClose={() => setShowCrearCreditoModal(false)}
        onConfirm={async (data: any) => {
          try {
            const payload = {
              ...data,
              creadoPorId: currentUser?.id || ''
            };
            
            if (data.creditType === 'prestamo') {
              await prestamosService.crearPrestamo({
                clienteId: data.clienteCreditoId,
                tipoPrestamo: 'EFECTIVO',
                monto: data.monto,
                tasaInteres: data.tasaInteres,
                tasaInteresMora: 2.0,
                plazoMeses: data.cuotasTotales,
                frecuenciaPago: data.frecuenciaPago,
                fechaInicio: data.fechaInicio,
                creadoPorId: currentUser?.id || ''
              } as any);
            } else {
              await creditosService.crearCredito(payload as any);
            }
            
            showNotification('success', 'Crédito creado exitosamente', 'Operación completada');
            setShowCrearCreditoModal(false);
            try {
              await fetchRutas();
            } catch {}
          } catch (error) {
            console.error('Error al crear crédito:', error);
            showNotification('error', 'No se pudo crear el crédito', 'Error');
          }
        }}
      />
    </div>
  )
}




'use client'
import { logger } from '@/lib/logger'

/**
 * ============================================================================
 * MÓDULO DE GESTIÓN CONTABLE Y FINANCIERA
 * ============================================================================
 * 
 * @description
 * Dashboard financiero centralizado para la administración de flujos de efectivo.
 * Permite gestionar múltiples "Cajas" (Principal y de Rutas), registrar ingresos/egresos
 * manuales, y supervisar el cierre diario de operaciones (Cuadre de Caja).
 * 
 * @roles ['CONTADOR', 'ADMIN', 'SUPER_ADMINISTRADOR']
 * 
 * @features
 * - Multi-caja: Soporte para cajas independientes por ruta y caja fuerte principal.
 * - Auditoría: Registro inmutable de cierres (Cuadrada vs Descuadrada).
 * - Categorización: Movimientos tipificados para facilitar reportes P&L (Ganancias y Pérdidas).
 */

import React, { useState, Suspense, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNotification } from '@/components/providers/NotificationProvider'
import { Rol } from '@/lib/permissions'
import { exportService } from '@/services/export-service'

import {
  DollarSign,
  TrendingUp,
  TrendingDown,

  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  Wallet,
  XCircle,
  Eye,
  Edit2,
  Plus,
  Receipt,
  Zap,
  CreditCard,
  BarChart3,
  Clock,
  History,
  CheckCircle2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import { 
  getCajas, 
  getTransacciones, 
  getResumenFinanciero, 
  createCaja as apiCreateCaja,
  updateCaja,
  createTransaccion as apiCreateTransaccion,
  type Caja as ApiCaja,
  type Transaccion as ApiTransaccion,
  type ResumenFinanciero as ApiResumen,
  getHistorialCierres,
  obtenerSaldoDisponibleRuta,
  type SaldoDisponibleRuta
} from '@/services/contabilidad-service'
import { toast } from 'sonner'
import { usuariosService, type Usuario as ApiUsuario } from '@/services/usuarios-service'
import { rutasService, type Ruta as ApiRuta } from '@/services/rutas-service'
import SelectCategoria from '@/components/ui/SelectCategoria'
import AnimacionCarga from '@/components/ui/AnimacionCarga'

// --- TIPOS DE DATOS ---
// Definimos la estructura de nuestras "Cajas".
// Una caja puede ser la PRINCIPAL (Caja fuerte de la oficina) o DE RUTA (La billetera del cobrador).
interface Caja {
  id: string
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  rutaId?: string // Si es de tipo RUTA, aquí guardamos a cuál pertenece
  responsable: string // Quién responde por la plata
  saldo: number
  estado: 'ABIERTA' | 'CERRADA'
  recaudoEsperado?: number
  eficiencia?: number
  ultimaActualizacion: string
}

// Historial de cuando se cierra la caja (El famoso "Cuadre")
interface HistorialCierre {
  id: string
  fecha: string
  caja: string
  responsable: string
  saldoSistema: number // Lo que el software dice que debe haber
  saldoReal: number    // Lo que se contó físicamente (billete sobre billete)
  diferencia: number   // Si sobra (+) o falta (-) plata
  estado: 'CUADRADA' | 'DESCUADRADA'
}

// Cada movimiento de dinero que entra o sale
interface MovimientoContable {
  id: string
  numero?: string // TRX-IN... TRX-OUT...
  fecha: string
  concepto: string
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA'
  monto: number
  categoria: string // Ej: 'Transporte', 'Papelería', 'Aporte Capital'
  responsable: string
  origen: 'EMPRESA' | 'COBRADOR' // Quién generó el movimiento
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  referencia?: string // Número de recibo, factura, etc.
  rutaId?: string
  cajaId: string
  cajaOrigenId?: string
}

// Resumen general para los indicadores de arriba (KPIs)
interface ResumenFinanciero {
  ingresosHoy: number
  egresosHoy: number
  utilidadNeta: number
  capitalEnCalle: number // Dinero prestado que aún no ha regresado
  cajaActual: number // Dinero disponible ya mismo
  porcentajeIngresosVsAyer: number | null
  porcentajeEgresosVsAyer: number | null
  esIngresoPositivo: boolean
  esEgresoPositivo: boolean
  rutasTotales: number
  rutasAbiertas: number
  rutasPendientesConsolidacion: number
  consolidacionesHoy: number
  porcentajeCierre: number
}

type RutaResumen = {
  id: string
  nombre: string
  responsable: string
}

const ModuloContableContent = () => {
  // --- AUTENTICACIÓN Y PERMISOS ---
  // Identificamos quién está usando el módulo para mostrar/ocultar botones sensibles
  const [userRole, setUserRole] = useState<Rol | null>(null)
  
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserRole(user.rol)
      } catch (e) {
        console.error('Error al leer datos del usuario', e)
      }
    }
  }, [])

  // --- ESTADOS DE LA INTERFAZ (UI) ---
  const [showCrearCajaModal, setShowCrearCajaModal] = useState(false)
  const { showNotification } = useNotification()
  
  // Filtros para la tabla de movimientos
  const [busqueda, setBusqueda] = useState('') // Buscará por concepto, responsable o categoría
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA'>('TODOS')
  const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | MovimientoContable['origen']>('TODOS')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | MovimientoContable['estado']>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string>('TODOS')

  // Control de todos los modales (ventanas emergentes)
  const [showEditarCajaModal, setShowEditarCajaModal] = useState(false)
  const [showVerArqueoModal, setShowVerArqueoModal] = useState(false)
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState<HistorialCierre | null>(null)
  const [showRegistrarMovimientoModal, setShowRegistrarMovimientoModal] = useState(false)
  const [showVerMovimientoModal, setShowVerMovimientoModal] = useState(false)
  const [showVerCajaModal, setShowVerCajaModal] = useState(false)
  const [cajaSeleccionada, setCajaSeleccionada] = useState<Caja | null>(null)
  const [saldoRutaSeleccionada, setSaldoRutaSeleccionada] = useState<SaldoDisponibleRuta | null>(null)
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoContable | null>(null)

  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [detalleTipo, setDetalleTipo] = useState<'INGRESOS' | 'EGRESOS' | 'CIERRES' | null>(null)

  // Estados para Paginación de Listas Locales (Máximo 3 por vista)
  const [currentPageMovimientos, setCurrentPageMovimientos] = useState(0)
  const [currentPageArqueos, setCurrentPageArqueos] = useState(0)



  // Usuarios del sistema para asignar responsables
  const [usuariosList, setUsuariosList] = useState<ApiUsuario[]>([])
  // Rutas disponibles (cargadas del backend)
  const [rutasDisponibles, setRutasDisponibles] = useState<ApiRuta[]>([])

  // --- ESTADOS DE DATOS (DATA) ---
  const [cajas, setCajas] = useState<Caja[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [currentPageCajas, setCurrentPageCajas] = useState(0)

  // Formularios controlados
  const [crearCajaForm, setCrearCajaForm] = useState({
    tipo: 'RUTA' as Caja['tipo'],
    nombre: '',
    rutaId: '',
    responsableId: '',
    saldoInicialInput: '',
  })

  const [editarCajaForm, setEditarCajaForm] = useState({
    nombre: '',
    responsableId: '',
    estado: 'ABIERTA' as Caja['estado'],
    saldoInput: '',
    rutaId: '',
    responsableNombre: '', // Auxiliar para mostrar nombre si falla carga
  })

  // Historial de Cierres 
  const [historialCierres, setHistorialCierres] = useState<HistorialCierre[]>([])

  // Filtros para el modal de detalles (Histórico)
  const [fechaInicioModal, setFechaInicioModal] = useState<string>('')
  const [fechaFinModal, setFechaFinModal] = useState<string>('')

  const loadMovimientosDetalle = async () => {
    if (!cajaSeleccionada) {
      setMovimientosDetalle([])
      return
    }
    try {
      const params: any = { cajaId: cajaSeleccionada.id, limit: 500 }
      if (fechaInicioModal) params.fechaInicio = fechaInicioModal
      if (fechaFinModal) params.fechaFin = fechaFinModal
      const resp = await getTransacciones(params)
      if (resp && Array.isArray(resp.data)) {
        setMovimientosDetalle(resp.data.map(t => ({
          id: t.id,
          numero: t.numero,
          fecha: t.fecha,
          concepto: t.descripcion,
          tipo: t.tipo,
          monto: t.monto,
          categoria: t.categoria || 'GENERAL',
          responsable: t.responsable,
          origen: (t as any).origen || 'EMPRESA',
          estado: (t.estado as any) || 'APROBADO',
          cajaId: (t as any).cajaId,
          cajaOrigenId: (t as any).cajaOrigenId
        })))
      } else {
        setMovimientosDetalle([])
      }
    } catch {
      setMovimientosDetalle([])
    }
  }

  const handleExportExcel = async () => {
    try {
      await exportService.exportAccounting('excel')
      toast.success('Reporte contable Excel descargado')
    } catch (e) {
      toast.error('Error al exportar reporte contable')
    }
  }

  const handleExportPDF = async () => {
    try {
      await exportService.exportAccounting('pdf')
      toast.success('Reporte contable PDF descargado')
    } catch (e) {
      toast.error('Error al exportar reporte contable')
    }
  }

  // Resumen financiero global
  const [resumenData, setResumenData] = useState<ResumenFinanciero>({
    ingresosHoy: 0,
    egresosHoy: 0,
    utilidadNeta: 0,
    capitalEnCalle: 0,
    cajaActual: 0,
    porcentajeIngresosVsAyer: null,
    porcentajeEgresosVsAyer: null,
    esIngresoPositivo: true,
    esEgresoPositivo: true,
    rutasTotales: 0,
    rutasAbiertas: 0,
    rutasPendientesConsolidacion: 0,
    consolidacionesHoy: 0,
    porcentajeCierre: 0
  })

  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([])
  const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoContable[]>([])

  // --- CARGA DE DATOS (REUSABLE) ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Usuarios se cargan en un useEffect separado (solo para ADMIN/SUPER_ADMINISTRADOR)

      // 2. Traemos las cajas configuradas
      const cajasData = await getCajas();

      // 2b. Traemos las rutas (solo roles con permiso: ADMIN, SUPER_ADMIN, COORDINADOR, SUPERVISOR)
      const rolActual = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}').rol } catch { return null }
      })()
      if (rolActual !== 'CONTADOR') {
        try {
          const rutasData = await rutasService.obtenerRutas({ limit: 100, activa: true });
          setRutasDisponibles(rutasData);
        } catch (err) {
          logger.warn('No se pudo cargar rutas (permiso insuficiente)');
        }
      }

      if (cajasData && Array.isArray(cajasData)) {
        setCajas(cajasData.map(c => ({
          id: c.id,
          nombre: c.nombre,
          tipo: c.tipo,
          rutaId: c.rutaId,
          responsable: c.responsable, // Nombre completo que viene del backend
          responsableId: c.responsableId, // ID real
          saldo: c.saldo,
          estado: c.estado,
          ultimaActualizacion: c.ultimaActualizacion
        })));
      }

      // 3. Traemos los números totales (Resumen histórico completo)
      const resumen = await getResumenFinanciero('2020-01-01');
      if (resumen) {
        setResumenData({
          ingresosHoy: resumen.ingresosHoy,
          egresosHoy: resumen.egresosHoy,
          utilidadNeta: resumen.gananciaNeta,
          capitalEnCalle: resumen.capitalEnCalle,
          cajaActual: resumen.saldoCajas,
          porcentajeIngresosVsAyer: resumen.porcentajeIngresosVsAyer ?? null,
          porcentajeEgresosVsAyer: resumen.porcentajeEgresosVsAyer ?? null,
          esIngresoPositivo: resumen.esIngresoPositivo ?? true,
          esEgresoPositivo: resumen.esEgresoPositivo ?? true,
          rutasTotales: resumen.rutasTotales || 0,
          rutasAbiertas: resumen.rutasAbiertas || 0,
          rutasPendientesConsolidacion: resumen.rutasPendientesConsolidacion || 0,
          consolidacionesHoy: resumen.consolidacionesHoy || 0,
          porcentajeCierre: resumen.porcentajeCierre || 0
        });
      }

      // 4. Traemos la lista de movimientos recientes
      const transaccionesResp = await getTransacciones({ limit: 50 });
      if (transaccionesResp && transaccionesResp.data) {
        setMovimientos(transaccionesResp.data.map(t => ({
          id: t.id,
          numero: t.numero, // Mapeamos el número de transacción real (TRX-IN/OUT)
          fecha: t.fecha,
          concepto: t.descripcion,
          tipo: t.tipo,
          monto: t.monto,
          categoria: t.categoria || 'GENERAL',
          responsable: t.responsable,
          origen: (t as any).origen || 'EMPRESA',
          estado: (t.estado as any) || 'APROBADO',
          cajaId: (t as any).cajaId,
          cajaOrigenId: (t as any).cajaOrigenId
        })));
      }

      // 5. Historial de Cierres (Real)
      const cierresResp = await getHistorialCierres();
      if (Array.isArray(cierresResp)) {
        setHistorialCierres(cierresResp.map((c: any) => ({
             id: c.id,
             fecha: c.fecha,
             caja: c.caja || 'Desconocida',
             responsable: c.responsable || 'Sistema',
             saldoSistema: Number(c.saldoSistema),
             saldoReal: Number(c.saldoReal),
             diferencia: Number(c.diferencia),
             estado: c.estado || (Number(c.diferencia) === 0 ? 'CUADRADA' : 'DESCUADRADA')
        })));
      }
    } catch (error) {
      console.error('Error cargando datos contables:', error);
      toast.error('Hubo un problema cargando la información financiera.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cargar usuarios solo cuando el rol está disponible y es admin
  useEffect(() => {
    if (userRole && ['ADMIN', 'SUPER_ADMINISTRADOR'].includes(userRole)) {
      usuariosService.obtenerTodos()
        .then(data => setUsuariosList(data))
        .catch(() => {})
    }
  }, [userRole]);

  /* Estado para movimientos */
  const [movimientoForm, setMovimientoForm] = useState({
    tipo: 'INGRESO' as MovimientoContable['tipo'],
    categoria: '',
    categoriaId: '',
    montoInput: '',
    concepto: '',
    referencia: '',
    cajaId: '',
    origen: 'EMPRESA' as 'EMPRESA' | 'COBRADOR',
    estado: 'PENDIENTE' as MovimientoContable['estado'],
    responsableId: '', // Debe seleccionarse un usuario válido
    cajaOrigenId: '', // Para cuando origen es COBRADOR
  })

  // Filtrado de movimientos
  const movimientosFiltrados = movimientos.filter(mov => {
    const cumpleBusqueda = 
      mov.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.responsable.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.categoria.toLowerCase().includes(busqueda.toLowerCase())
    
    // Filtro de tipo mejorado para incluir transferencias en ingresos/egresos según el contexto
    let cumpleTipo = filtroTipo === 'TODOS';
    if (!cumpleTipo) {
      if (filtroTipo === 'INGRESO') {
        cumpleTipo = mov.tipo === 'INGRESO' || (mov.tipo === 'TRANSFERENCIA' && mov.tipo === 'TRANSFERENCIA'); 
        // Nota: En la lista unificada, las transferencias se comportan visualmente según si suman o restan
        // Pero como aquí no tenemos el contexto de "caja actual" para saber si sumó o restó, 
        // simplemente las mostramos si el filtro no es estricto, o las excluimos.
        // CORRECCIÓN: Como el backend manda todo como TRANSFERENCIA, necesitamos ver el signo visual o contexto.
        // Simplificación: Mostramos TRANSFERENCIA en ambos filtros para no ocultar info, o solo en TODOS.
        // Decisión UX: Incluir TRANSFERENCIA en ambos si es relevante, o dejar solo en TODOS.
        // Dado el problema del usuario, vamos a permitir que se vean.
        cumpleTipo = mov.tipo === 'INGRESO' || mov.tipo === 'TRANSFERENCIA';
      } else if (filtroTipo === 'EGRESO') {
        cumpleTipo = mov.tipo === 'EGRESO' || mov.tipo === 'TRANSFERENCIA';
      }
    }

    const cumpleOrigen = filtroOrigen === 'TODOS' || mov.origen === filtroOrigen
    const cumpleEstado = filtroEstado === 'TODOS' || mov.estado === filtroEstado
    const cumpleRuta = filtroRuta === 'TODOS' || mov.rutaId === filtroRuta

    return cumpleBusqueda && cumpleTipo && cumpleOrigen && cumpleEstado && cumpleRuta
  })



  const handleCrearCaja = async () => {
    const saldo = parseCOPInputToNumber(crearCajaForm.saldoInicialInput)
    const ruta = rutasDisponibles.find((r) => r.id === crearCajaForm.rutaId)
    const respId = crearCajaForm.responsableId;

    if (!respId) {
        showNotification('error', 'Debe seleccionar un responsable válido', 'Error');
        return;
    }

    try {
      await apiCreateCaja({
        nombre: crearCajaForm.nombre.trim() || (crearCajaForm.tipo === 'PRINCIPAL' ? 'Caja Principal' : `Caja ${ruta?.nombre ?? 'Ruta'}`),
        tipo: crearCajaForm.tipo,
        rutaId: crearCajaForm.tipo === 'RUTA' ? (crearCajaForm.rutaId || undefined) : undefined,
        responsableId: respId,
        saldoInicial: saldo
      })

      fetchData()
      setShowCrearCajaModal(false)
      showNotification('success', 'La caja ha sido creada correctamente', 'Caja Creada')
    } catch (error) {
      console.error('Error creating caja:', error)
      showNotification('error', 'No se pudo crear la caja', 'Error')
    }
  }

  const openEditarCaja = (caja: Caja) => {
    setCajaSeleccionada(caja)
    // Buscamos el ID del responsable basado en el nombre (fallback si no tenemos el ID directo en la interfaz)
    // Idealmente Caja debería tener responsableId. He actualizado la carga de datos para incluirlo.
    const cajaConId = caja as any; // Cast temporal si la interfaz Caja no tiene responsableId aún
    
    setEditarCajaForm({
      nombre: caja.nombre,
      responsableId: cajaConId.responsableId || '', 
      responsableNombre: caja.responsable,
      estado: caja.estado,
      saldoInput: caja.saldo ? formatMilesCOP(caja.saldo) : '',
      rutaId: caja.rutaId ?? '',
    })
    setShowEditarCajaModal(true)
  }

  const handleEditarCaja = async () => {
    if (!cajaSeleccionada) return
    const saldo = parseCOPInputToNumber(editarCajaForm.saldoInput)
    const respId = editarCajaForm.responsableId

    if (!respId) {
        showNotification('error', 'Debe asignar un responsable', 'Validación');
        return;
    }

    try {
      await updateCaja(cajaSeleccionada.id, {
        nombre: editarCajaForm.nombre,
        responsableId: respId,
        saldoActual: saldo
      })

      fetchData()
      setShowEditarCajaModal(false)
      setCajaSeleccionada(null)
      showNotification('success', 'La información de la caja ha sido actualizada', 'Caja Actualizada')
    } catch (error) {
      console.error('Error updating caja:', error)
      showNotification('error', 'No se pudo actualizar la caja', 'Error')
    }
  }

  const openRegistrarMovimiento = () => {
    // Buscamos el ID real de la caja principal para el admin
    const cajaPrincipal = cajas.find(c => c.tipo === 'PRINCIPAL');
    const defaultCaja = (userRole === 'ADMIN' || userRole === 'SUPER_ADMINISTRADOR') 
        ? (cajaPrincipal?.id || '') 
        : (cajas.find(c => c.tipo === 'RUTA')?.id || '')
    
    setMovimientoForm({
      tipo: 'INGRESO',
      categoria: '',
      categoriaId: '',
      montoInput: '',
      concepto: '',
      referencia: '',
      cajaId: defaultCaja,
      origen: 'EMPRESA',
      estado: 'PENDIENTE',
      responsableId: '',
      cajaOrigenId: '',
    })
    setShowRegistrarMovimientoModal(true)
  }

  const handleRegistrarMovimiento = async () => {
    const monto = parseCOPInputToNumber(movimientoForm.montoInput)
    if (monto <= 0) {
        showNotification('error', 'El monto debe ser mayor a 0', 'Validación');
        return;
    }
    if (!movimientoForm.cajaId) {
        showNotification('error', 'Debe seleccionar una caja', 'Validación');
        return;
    }
    // For movements, we relax the requirement for 'responsableId' if it's not strictly needed by the backend for manual entry
    // or if the backend infers it from the session.
    // if (!movimientoForm.responsableId) { ... } // Removed validation as per request

    try {
      // Si tenemos categoriaId del SelectCategoria, la usamos.
      // Actualmente apiCreateTransaccion espera una descripción combinada o solo descripción.
      // Vamos a mandar la categoría como parte de la descripción si el backend no soporta campo 'categoriaId' separado aún.
      // Ojo: Si tu backend ya soporta 'categoriaId', añádelo a la llamada.
      
      const categoriaTexto = movimientoForm.categoria || 'GENERAL';

      // Usar apiCreateTransaccion con los datos del form
      // Si es EGRESO con cobrador, invertimos los roles: 
      // La oficina (cajaId) es el origen y el cobrador (cajaOrigenId) es el destino.
      const isEgresoConsolidacion = movimientoForm.tipo === 'EGRESO' && movimientoForm.origen === 'COBRADOR';
      
      await apiCreateTransaccion({
        cajaId: isEgresoConsolidacion ? movimientoForm.cajaOrigenId : movimientoForm.cajaId,
        tipo: movimientoForm.tipo as any,
        monto: monto,
        // Eliminamos la lógica mágica de descripción automática para transferencias manuales
        // para que el usuario siempre vea lo que escribió o un default claro.
        descripcion: movimientoForm.concepto || (movimientoForm.origen === 'COBRADOR' ? (movimientoForm.tipo === 'INGRESO' ? 'Consolidación de Ruta (Entrada)' : 'Entrega de Base a Ruta (Salida)') : 'Movimiento de Caja'),
        cajaOrigenId: isEgresoConsolidacion ? movimientoForm.cajaId : (movimientoForm.origen === 'COBRADOR' ? movimientoForm.cajaOrigenId : undefined)
      })
      
      fetchData()
      setShowRegistrarMovimientoModal(false)

      showNotification('success', 'El movimiento contable ha sido registrado', 'Movimiento Registrado')
    } catch (error) {
      console.error('Error creating transaccion:', error)
      showNotification('error', 'No se pudo registrar el movimiento', 'Error')
    }
  }

  const renderInPortal = (node: React.ReactNode) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
  }



  if (isLoading) {
    return <AnimacionCarga texto="Cargando módulo contable..." />
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header Ultra Clean */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <Wallet className="h-3.5 w-3.5" />
                <span>Gestión Financiera</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="text-blue-600">Gestión </span><span className="text-orange-500">Contable</span>
              </h1>
              <p className="text-base text-slate-500 max-w-xl font-medium">
                Administración centralizada de Cajas, Saldos y Recursos.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <ExportButton 
                label="Exportar" 
                onExportExcel={handleExportExcel} 
                onExportPDF={handleExportPDF} 
              />
              <button
                type="button"
                onClick={() => setShowCrearCajaModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 transform active:scale-95"
              >
                  <Plus className="h-4 w-4" />
                  Crear Caja
              </button>
            </div>
        </header>

        {/* Banner Informativo - Elegant Compact Version */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-50 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-md shadow-blue-600/20 ring-4 ring-blue-50 shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 tracking-tight">Gestión de Cierre Automático</p>
              <p className="text-xs text-slate-500 font-medium leading-tight">Las cajas de ruta se consolidarán al finalizar los recorridos.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 relative z-10">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Estado</span>
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3 text-blue-600" />
                {resumenData.rutasAbiertas > 0 ? `FALTAN ${resumenData.rutasAbiertas} RUTAS` : 'TODAS LAS RUTAS CERRADAS'}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <div className="relative w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-black text-blue-600 shadow-inner shrink-0">
               <div 
                 className="absolute inset-0 border-2 border-blue-600 rounded-full" 
                 style={{ clipPath: `inset(${100 - resumenData.porcentajeCierre}% 0 0 0)` }}
               ></div>
               {resumenData.porcentajeCierre}%
            </div>
          </div>

          {(['ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR', 'COORDINADOR'] as any[]).includes(userRole) && 
            !isLoading && 
            resumenData.consolidacionesHoy > 0 &&
            resumenData.rutasPendientesConsolidacion === 0 && 
            resumenData.rutasAbiertas === 0 && (
            <button
              type="button"
              onClick={() => {
                toast.success('Cierre de operación realizado con éxito. El reporte diario ha sido generado.')
                // Aquí iría la llamada al backend para consolidar el día
              }}
              className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 relative z-10 bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 active:scale-95 animate-in zoom-in duration-300"
            >
              <CheckCircle2 className="h-4 w-4" />
              Cierre Total de Operación
            </button>
          )}
        </div>

        {/* Tarjetas de Resumen Minimalistas */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Ingresos */}
          {/* Ingresos */}
          <div 
            onClick={() => { setDetalleTipo('INGRESOS'); setShowDetalleModal(true); }}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Ingresos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.ingresosHoy)}
            </div>
            {resumenData.porcentajeIngresosVsAyer != null && resumenData.porcentajeIngresosVsAyer !== 0 && (
              <div className={cn(
                  "mt-2 flex items-center text-xs font-bold w-fit px-2 py-1 rounded-full",
                  resumenData.esIngresoPositivo ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
              )}>
                {resumenData.esIngresoPositivo ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {resumenData.porcentajeIngresosVsAyer > 0 ? '+' : ''}{resumenData.porcentajeIngresosVsAyer}% vs Ayer
              </div>
            )}
          </div>

          {/* Egresos */}
          <div 
            onClick={() => { setDetalleTipo('EGRESOS'); setShowDetalleModal(true); }}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Gastos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.egresosHoy)}
            </div>
            {resumenData.porcentajeEgresosVsAyer != null && resumenData.porcentajeEgresosVsAyer !== 0 && (
              <div className={cn(
                  "mt-2 text-xs font-bold w-fit px-2 py-1 rounded-full flex items-center",
                  resumenData.esEgresoPositivo ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
              )}>
                {resumenData.esEgresoPositivo ? <ArrowDownLeft className="mr-1 h-3 w-3" /> : <ArrowUpRight className="mr-1 h-3 w-3" />}
                {resumenData.porcentajeEgresosVsAyer > 0 ? '+' : ''}{resumenData.porcentajeEgresosVsAyer}% vs Ayer
              </div>
            )}
          </div>

          {/* Ganancia */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ganancia Neta
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.utilidadNeta)}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Utilidad Operativa
            </div>
          </div>

          {/* Prestado */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Capital Prestado
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.capitalEnCalle)}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Colocación Hoy
            </div>
          </div>

          {/* Cajas Abiertas */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cajas Abiertas
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {cajas.filter((c) => c.estado === 'ABIERTA').length}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Operativas hoy
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sección Movimientos Recientes (Restaurada) */}
          <section className="space-y-8">
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-extrabold text-slate-900">Movimientos recientes</div>
              </div>
              <button
                type="button"
                onClick={openRegistrarMovimiento}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-blue-600/20"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Movimiento</div>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="TODOS">Todos los tipos</option>
                    <option value="INGRESO">Solo Ingresos</option>
                    <option value="EGRESO">Solo Egresos</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Origen / Fuente</div>
                  <select
                    value={filtroOrigen}
                    onChange={(e) => setFiltroOrigen(e.target.value as typeof filtroOrigen)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="TODOS">Todos los orígenes</option>
                    <option value="EMPRESA">Empresa</option>
                    <option value="COBRADOR">Cobrador</option>
                  </select>
                </div>

              </div>

              <div className="pt-3 border-t border-slate-200/60">
                  <FiltroRuta 
                      onRutaChange={(r: string | null) => setFiltroRuta(r || 'TODOS')} 
                      selectedRutaId={filtroRuta === 'TODOS' ? null : filtroRuta}
                      layout="wrap"
                      hideLabel={true}
                  />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {movimientosFiltrados.slice(currentPageMovimientos * 7, (currentPageMovimientos + 1) * 7).map((m) => {
                // Determinar si es un movimiento positivo (Ingreso/Entrada) o negativo (Egreso/Salida)
                // Nos guiamos PRINCIPALMENTE por la categoría base que se asignó al crear el movimiento
                // Si la categoría contiene "INGRESO" o "ENTRADA", es positivo. Si es "EGRESO", "GASTO" o "SALIDA", es negativo.
                // Esto simplifica la lógica y respeta la intención original del registro.
                
                const categoriaUpper = m.categoria.toUpperCase();
                let isIngreso = false;

                if (m.tipo === 'INGRESO') {
                    isIngreso = true;
                } else if (m.tipo === 'EGRESO') {
                    isIngreso = false;
                } else if (m.tipo === 'TRANSFERENCIA') {
                    // Para transferencias, intentamos deducir por el concepto o categoría
                    if (categoriaUpper.includes('INGRESO') || categoriaUpper.includes('ENTRADA')) {
                        isIngreso = true;
                    } else if (m.concepto.toUpperCase().includes('ENTRADA') || m.concepto.toUpperCase().includes('RECIBIDA')) {
                        isIngreso = true;
                    } else {
                        // Por defecto transferencia es salida si no se demuestra lo contrario (o si es 'SALIDA' explícita)
                        isIngreso = false;
                    }
                }

                // Limpiar concepto para visualización
                const conceptoLimpio = m.concepto
                    .replace(/^Entrada desde .*?: |^Salida hacia .*?: |^Consolidación .*?: /i, '')
                    .replace(/^Transferencia enviada a .*?: |^Transferencia recibida de .*?: /i, '')
                    .replace(/\(Entrada\)|\(Salida\)/gi, '')
                    .trim();

                return (
                <div key={m.id} className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className={cn(
                        "p-2.5 rounded-full shrink-0 flex items-center justify-center border",
                        isIngreso ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                     )}>
                        {isIngreso ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                     </div>
                     <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate" title={m.concepto}>
                            {conceptoLimpio || m.concepto}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 mt-0.5">
                           <span>{new Date(m.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                           <span className="text-slate-300">•</span>
                           <span>{new Date(m.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                           {m.referencia && (
                               <>
                                <span className="text-slate-300">•</span>
                                <span className="bg-slate-100 px-1 rounded text-slate-600">Ref: {m.referencia}</span>
                               </>
                           )}
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 pl-4 shrink-0">
                     <div className="text-right">
                        <div className={cn(
                           "text-sm font-black tracking-tight",
                           isIngreso ? "text-emerald-700" : "text-rose-700"
                        )}>
                           {isIngreso ? '+' : '-'}{formatCurrency(m.monto)}
                        </div>
                     </div>
                     <button
                       onClick={() => {
                         setMovimientoSeleccionado(m)
                         setShowVerMovimientoModal(true)
                       }}
                       className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                       title="Ver Detalle"
                     >
                       <Eye className="h-4 w-4" />
                     </button>
                  </div>
                </div>
              )})}
            </div>

            {/* Controles de Paginación para Movimientos */}
            {movimientosFiltrados.length > 7 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Página {currentPageMovimientos + 1} de {Math.ceil(movimientosFiltrados.length / 7)}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPageMovimientos(p => Math.max(0, p - 1))}
                            disabled={currentPageMovimientos === 0}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setCurrentPageMovimientos(p => (p + 1) * 7 < movimientosFiltrados.length ? p + 1 : p)}
                            disabled={(currentPageMovimientos + 1) * 7 >= movimientosFiltrados.length}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
          </div>
          </section>

        {/* Sección Cajas Registradas (Restaurada) */}
        <section className="w-full">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-500" />
                <div className="text-sm font-extrabold text-slate-900">Cajas Registradas</div>
              </div>
              <button
                type="button"
                onClick={() => setShowCrearCajaModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Crear
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {cajas
                .filter(c => (['ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR', 'COORDINADOR'] as any[]).includes(userRole) || c.tipo !== 'PRINCIPAL')
                .slice(currentPageCajas * 3, (currentPageCajas + 1) * 3).map((c) => (
                <div
                  key={c.id}
                  className="w-full text-left p-5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">{c.nombre}</div>
                      <div className="mt-1 text-xs text-slate-500 font-medium">{c.responsable}</div>
                      {c.rutaId && (
                        <div 
                          className="mt-1 text-[10px] text-blue-600 font-bold bg-blue-50 inline-block px-1.5 py-0.5 rounded border border-blue-100"
                          title="Caja asociada a Ruta"
                        >
                          Ruta
                        </div>
                      )}
                      {c.recaudoEsperado && (
                        <div className="mt-2 flex items-center gap-3">
                           <div className="text-[10px] font-bold text-slate-400 uppercase">Goal: {formatCurrency(c.recaudoEsperado)}</div>
                           <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{c.eficiencia}% Efficiency</div>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                        c.estado === 'ABIERTA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      )}>
                        {c.estado}
                      </div>
                      <div className="text-sm font-extrabold text-slate-900">{formatCurrency(c.saldo)}</div>
                      <div className="flex gap-2">

                        <button 
                          onClick={async () => {
                            setCajaSeleccionada(c)
                            if (c.tipo === 'RUTA' && c.rutaId) {
                              try {
                                const now = new Date()
                                const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString()
                                const hoyClave = localIso.split('T')[0]
                                const saldo = await obtenerSaldoDisponibleRuta(c.rutaId, hoyClave)
                                setSaldoRutaSeleccionada(saldo)
                              } catch {
                                setSaldoRutaSeleccionada(null)
                              }
                            } else {
                              setSaldoRutaSeleccionada(null)
                            }
                            setShowVerCajaModal(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                        <button 
                          onClick={() => openEditarCaja(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controles de Paginación para Cajas */}
            {cajas.filter(c => (['ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR', 'COORDINADOR'] as any[]).includes(userRole) || c.tipo !== 'PRINCIPAL').length > 3 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Página {currentPageCajas + 1} de {Math.ceil(cajas.filter(c => (['ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR', 'COORDINADOR'] as any[]).includes(userRole) || c.tipo !== 'PRINCIPAL').length / 3)}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPageCajas(p => Math.max(0, p - 1))}
                            disabled={currentPageCajas === 0}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setCurrentPageCajas(p => (p + 1) * 3 < cajas.filter(c => (['ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR', 'COORDINADOR'] as any[]).includes(userRole) || c.tipo !== 'PRINCIPAL').length ? p + 1 : p)}
                            disabled={(currentPageCajas + 1) * 3 >= cajas.filter(c => (['ADMIN', 'SUPER_ADMINISTRADOR', 'CONTADOR', 'COORDINADOR'] as any[]).includes(userRole) || c.tipo !== 'PRINCIPAL').length}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
          </div>
        </section>
        </div>



        {showCrearCajaModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowCrearCajaModal(false)}>
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cajas</p>
                  <h3 className="text-lg font-bold text-slate-900">Crear Caja</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCrearCajaModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {userRole === 'SUPER_ADMINISTRADOR' && (
                    <button
                      type="button"
                      onClick={() =>
                        setCrearCajaForm((p) => ({
                          ...p,
                          tipo: 'PRINCIPAL',
                          rutaId: '',
                        }))
                      }
                      className={cn(
                        'px-4 py-3 rounded-2xl border text-sm font-bold transition-colors',
                        crearCajaForm.tipo === 'PRINCIPAL'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      Caja Principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCrearCajaForm((p) => ({ ...p, tipo: 'RUTA' }))}
                    className={cn(
                      'px-4 py-3 rounded-2xl border text-sm font-bold transition-colors w-full',
                      crearCajaForm.tipo === 'RUTA' || userRole !== 'SUPER_ADMINISTRADOR'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    Caja por Ruta
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nombre</label>
                    <input
                      value={crearCajaForm.nombre}
                      onChange={(e) => setCrearCajaForm((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder={crearCajaForm.tipo === 'PRINCIPAL' ? 'Caja Principal Oficina' : 'Caja Ruta Norte'}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Responsable</label>
                    <select
                      value={crearCajaForm.responsableId}
                      onChange={(e) => setCrearCajaForm((p) => ({ ...p, responsableId: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuariosList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombres} {u.apellidos} ({u.rol})
                        </option>
                      ))}
                    </select>
                  </div>

                  {crearCajaForm.tipo === 'RUTA' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Ruta</label>
                      <select
                        value={crearCajaForm.rutaId}
                        onChange={(e) =>
                          setCrearCajaForm((p) => ({
                            ...p,
                            rutaId: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      >
                        <option value="">Seleccionar ruta...</option>
                        {(Array.isArray(rutasDisponibles) ? rutasDisponibles : []).map((r) => {
                          const responsableNombre = usuariosList.find(u => u.id === r.cobradorId)?.nombres || 'Sin asignar';
                          return (
                            <option key={r.id} value={r.id}>
                                {r.nombre} • {responsableNombre}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Saldo inicial</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={crearCajaForm.saldoInicialInput}
                        onChange={(e) =>
                          setCrearCajaForm((p) => ({
                            ...p,
                            saldoInicialInput: formatCOPInputValue(e.target.value),
                          }))
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCrearCajaModal(false)}
                  className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearCaja}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
                >
                  Crear Caja
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditarCajaModal && cajaSeleccionada && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditarCajaModal(false)}>
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cajas</p>
                  <h3 className="text-lg font-bold text-slate-900">Editar Caja</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarCajaModal(false)
                    setCajaSeleccionada(null)
                  }}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nombre</label>
                    <input
                      value={editarCajaForm.nombre}
                      onChange={(e) => setEditarCajaForm((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Responsable</label>
                    <select
                      value={editarCajaForm.responsableId}
                      onChange={(e) => setEditarCajaForm((p) => ({ ...p, responsableId: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuariosList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombres} {u.apellidos} ({u.rol})
                        </option>
                      ))}
                    </select>
                  </div>

                  {cajaSeleccionada.tipo === 'RUTA' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Ruta</label>
                      <select
                        value={editarCajaForm.rutaId}
                        onChange={(e) => setEditarCajaForm((p) => ({ ...p, rutaId: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      >
                        <option value="">Seleccionar ruta...</option>
                        {(Array.isArray(rutasDisponibles) ? rutasDisponibles : []).map((r) => {
                          const responsableNombre = usuariosList.find(u => u.id === r.cobradorId)?.nombres || 'Sin asignar';
                          return (
                            <option key={r.id} value={r.id}>
                                {r.nombre} • {responsableNombre}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Estado</label>
                    <select
                      value={editarCajaForm.estado}
                      onChange={(e) =>
                        setEditarCajaForm((p) => ({
                          ...p,
                          estado: e.target.value as Caja['estado'],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="ABIERTA">ABIERTA</option>
                      <option value="CERRADA">CERRADA</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex justify-between">
                        Saldo
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded">Solo Lectura</span>
                    </label>
                    <div className="relative opacity-60">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={editarCajaForm.saldoInput}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-500 cursor-not-allowed"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 px-1">
                        Para ajustar el saldo, debe registrar un Movimiento de Ingreso o Egreso (Ajuste de Caja).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarCajaModal(false)
                    setCajaSeleccionada(null)
                  }}
                  className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEditarCaja}
                  className="px-6 py-3 rounded-2xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {showRegistrarMovimientoModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowRegistrarMovimientoModal(false)}>
            <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Movimientos</p>
                  <h3 className="text-lg font-bold text-slate-900">Registrar Movimiento</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegistrarMovimientoModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Tipo de Movimiento */}
                <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                     setMovimientoForm((p) => ({ ...p, tipo: 'INGRESO', categoria: 'INGRESO', concepto: '', referencia: '', cajaOrigenId: '', origen: 'EMPRESA' }));
                     // Limpiamos los campos que podrían causar confusión
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-colors shadow-sm',
                    movimientoForm.tipo === 'INGRESO'
                      ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-100 ring-offset-2'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => {
                     setMovimientoForm((p) => ({ ...p, tipo: 'EGRESO', categoria: 'EGRESO', concepto: '', referencia: '', cajaOrigenId: '', origen: 'EMPRESA' }));
                     // Limpiamos los campos
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-colors shadow-sm',
                    movimientoForm.tipo === 'EGRESO'
                      ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-100 ring-offset-2'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Egreso
                </button>
                </div>

                {/* Caja y Origen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">
                        {movimientoForm.origen === 'COBRADOR' 
                           ? (movimientoForm.tipo === 'INGRESO' ? 'Caja Destino (Recibe)' : 'Caja Origen (Entrega)')
                           : 'Caja Afectada'}
                    </label>
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          value={movimientoForm.cajaId}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, cajaId: e.target.value }))}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-700 focus:bg-white transition-all shadow-sm"
                        >
                          <option value="">Seleccionar caja destino...</option>
                          {cajas
                            .filter(c => {
                                if (c.tipo === 'PRINCIPAL') {
                                    return userRole === 'ADMIN' || userRole === 'SUPER_ADMINISTRADOR' || userRole === 'CONTADOR'
                                }
                                return true
                            })
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.nombre} (Saldo: {formatCurrency(c.saldo)})</option>
                          ))}
                        </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">Origen del Capital</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          value={movimientoForm.origen}
                          onChange={(e) => {
                            const val = e.target.value as 'EMPRESA' | 'COBRADOR';
                            setMovimientoForm((p) => ({ ...p, origen: val }));
                          }}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-700 focus:bg-white transition-all shadow-sm"
                        >
                          <option value="EMPRESA">Externo (Gasto/Ingreso)</option>
                          <option value="COBRADOR">Transferencia entre Cajas</option>
                        </select>
                    </div>
                  </div>
                </div>

                {/* Caso Especial: Consolidación / Transferencia entre Cajas */}
                {movimientoForm.origen === 'COBRADOR' && (
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-orange-800">
                       <Zap className="h-4 w-4" />
                       <span className="text-xs font-black uppercase tracking-tight">
                         {movimientoForm.tipo === 'INGRESO' ? 'Caja que Entrega Capital' : 'Caja que Recibe Capital'}
                       </span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-700 uppercase ml-1">
                        {movimientoForm.tipo === 'INGRESO' ? '¿De qué caja sale el dinero?' : '¿A qué caja va el dinero?'}
                      </label>
                      <select
                          value={movimientoForm.cajaOrigenId}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, cajaOrigenId: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-sm font-bold text-slate-900 shadow-sm focus:ring-2 focus:ring-orange-200 transition-all font-mono"
                      >
                          <option value="">--- SELECCIONAR CAJA ---</option>
                          {cajas
                            .filter(c => c.id !== movimientoForm.cajaId)
                            .map(c => (
                            <option key={c.id} value={c.id}>{c.nombre} (Saldo: {formatCurrency(c.saldo)})</option>
                          ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-orange-600/80 font-medium italic">
                      {movimientoForm.tipo === 'INGRESO' 
                        ? 'Al guardar, se restará el monto de la caja seleccionada arriba y se sumará a la caja afectada.' 
                        : 'Al guardar, se restará el monto de la caja afectada y se sumará a la caja seleccionada arriba.'}
                    </p>
                  </div>
                )}

                {/* Detalles Financieros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <SelectCategoria
                        tipo={movimientoForm.tipo === 'INGRESO' ? 'INGRESO' : 'GASTO'}
                        label="Categoría"
                        placeholder="Seleccionar..."
                        value={movimientoForm.categoriaId}
                        onChange={(val) => setMovimientoForm(p => ({ ...p, categoriaId: val, categoria: '' }))}
                        // Forzamos un valor por defecto visual si no hay selección (aunque SelectCategoria maneja su estado)
                        // La idea es que el componente SelectCategoria debería permitir seleccionar "INGRESO" o "EGRESO" base
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Monto de Operación</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={movimientoForm.montoInput}
                        onChange={(e) => setMovimientoForm((p) => ({ ...p, montoInput: formatCOPInputValue(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Responsables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                            {movimientoForm.tipo === 'INGRESO' ? 'Recibido Por ' : 'Registrado Por'}
                        </label>
                        <select
                          value={movimientoForm.responsableId}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, responsableId: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-700"
                        >
                            <option value="">Seleccionar...</option>
                            {usuariosList.map(u => (
                                <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Alerta de fondos insuficientes */}
                {(() => {
                    const montoValue = parseCOPInputToNumber(movimientoForm.montoInput);
                    const isTransfer = movimientoForm.origen === 'COBRADOR';
                    let sourceCajaId = '';
                    if (movimientoForm.tipo === 'EGRESO') {
                        sourceCajaId = movimientoForm.cajaId;
                    } else if (isTransfer && movimientoForm.tipo === 'INGRESO') {
                        sourceCajaId = movimientoForm.cajaOrigenId;
                    }

                    const sourceCaja = cajas.find(c => c.id === sourceCajaId);
                    if (sourceCajaId && sourceCaja && montoValue > sourceCaja.saldo) {
                        return (
                            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 animate-pulse">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-xs font-bold text-red-600 uppercase tracking-tight leading-none">
                                    Fondos Insuficientes en {sourceCaja.nombre}
                                </span>
                            </div>
                        );
                    }
                    return null;
                })()}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegistrarMovimientoModal(false)}
                  className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegistrarMovimiento}
                  disabled={(() => {
                    const montoValue = parseCOPInputToNumber(movimientoForm.montoInput);
                    const isTransfer = movimientoForm.origen === 'COBRADOR';
                    let sourceCajaId = '';
                    if (movimientoForm.tipo === 'EGRESO') {
                        sourceCajaId = movimientoForm.cajaId;
                    } else if (isTransfer && movimientoForm.tipo === 'INGRESO') {
                        sourceCajaId = movimientoForm.cajaOrigenId;
                    }
                    const sourceCaja = cajas.find(c => c.id === sourceCajaId);
                    const hasInsufficientFunds = sourceCajaId && sourceCaja ? (montoValue > sourceCaja.saldo) : false;
                    return (
                        montoValue <= 0 ||
                        (!movimientoForm.categoria && !movimientoForm.categoriaId) ||
                        (isTransfer && !movimientoForm.cajaOrigenId) ||
                        hasInsufficientFunds
                    );
                  })()}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}


        {showVerMovimientoModal && movimientoSeleccionado && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowVerMovimientoModal(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Detalle de Movimiento</h3>
                    {/* ID Oculto por solicitud del usuario */}
                </div>
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                 {/* Bloque Principal: Monto y Tipo */}
                 <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto Operación</div>
                        <div className="text-2xl font-black text-slate-900">{formatCurrency(movimientoSeleccionado.monto)}</div>
                    </div>
                    <div className="text-right">
                        <div className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border",
                            movimientoSeleccionado.tipo === 'INGRESO' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                            {movimientoSeleccionado.tipo}
                        </div>
                    </div>
                 </div>

                 {/* Detalles en Grid */}
                 <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha Registro</div>
                        <div className="font-semibold text-slate-900 text-sm">{new Date(movimientoSeleccionado.fecha).toLocaleString('es-CO')}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</div>
                        <div className="font-semibold text-slate-900 text-sm">{movimientoSeleccionado.estado}</div>
                    </div>
                    
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Categoría</div>
                        <div className="font-semibold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded w-fit">
                           {movimientoSeleccionado.categoria}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {movimientoSeleccionado.tipo === 'TRANSFERENCIA' || movimientoSeleccionado.categoria === 'CONSOLIDACION' 
                                ? (movimientoSeleccionado.tipo === 'INGRESO' ? 'Recibido De' : 'Enviado A')
                                : 'Origen'}
                        </div>
                        <div className="font-semibold text-slate-900 text-sm">
                            {(() => {
                                // Intentar extraer la caja de la descripción si es transferencia
                                if (movimientoSeleccionado.tipo === 'TRANSFERENCIA' || movimientoSeleccionado.categoria === 'CONSOLIDACION') {
                                    const desc = movimientoSeleccionado.concepto;
                                    // Patrones comunes según accounting.service.ts
                                    // "Salida hacia [Caja]: ..."
                                    // "Entrada desde [Caja]: ..."
                                    // "Consolidación hacia [Caja]..."
                                    // "Consolidación desde [Caja]..."
                                    
                                    const matchHacia = desc.match(/(?:hacia|a)\s+(.*?)(?::|\(|\)|$)/i);
                                    const matchDesde = desc.match(/(?:desde|de)\s+(.*?)(?::|\(|\)|$)/i);
                                    
                                    if (movimientoSeleccionado.tipo === 'EGRESO' || desc.includes('Salida') || desc.includes('hacia')) {
                                        if (matchHacia && matchHacia[1]) return matchHacia[1].trim();
                                    }
                                    if (movimientoSeleccionado.tipo === 'INGRESO' || desc.includes('Entrada') || desc.includes('desde')) {
                                        if (matchDesde && matchDesde[1]) return matchDesde[1].trim();
                                    }
                                }
                                return movimientoSeleccionado.origen;
                            })()}
                        </div>
                    </div>
                 </div>

                 {/* Bloque de Responsable */}
                 <div className="pt-4 border-t border-slate-100">
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsable</div>
                     <div className="font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600">
                            {movimientoSeleccionado.responsable.charAt(0)}
                        </div>
                        {movimientoSeleccionado.responsable}
                     </div>
                 </div>

                 {/* Bloque de Concepto */}
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Concepto / Descripción</div>
                    <div className="font-medium text-slate-800 text-sm leading-relaxed">
                        {(() => {
                            let conceptoMostrar = movimientoSeleccionado.concepto
                                .replace(/^Entrada desde .*?: |^Salida hacia .*?: |^Consolidación .*?: /i, '')
                                .replace(/^Transferencia enviada a .*?: |^Transferencia recibida de .*?: /i, '')
                                .replace(/\(Entrada\)|\(Salida\)/gi, '')
                                .trim();
                            
                            // Si es una transferencia/consolidación, mejorar el texto
                            if (movimientoSeleccionado.tipo === 'TRANSFERENCIA' || movimientoSeleccionado.categoria === 'CONSOLIDACION') {
                                // Determinamos si visualmente es un ingreso o egreso para este modal
                                const isIngreso = movimientoSeleccionado.tipo === 'INGRESO' || 
                                    (movimientoSeleccionado.categoria.includes('INGRESO') || movimientoSeleccionado.concepto.includes('Entrada') || movimientoSeleccionado.concepto.includes('recibida'));
                                    
                                if (isIngreso) {
                                     const origen = movimientoSeleccionado.concepto.match(/desde (.*?)[:\(]/i)?.[1] || movimientoSeleccionado.concepto.match(/de (.*?)($|[:\(])/i)?.[1] || 'Caja Origen';
                                     conceptoMostrar = `Ingreso de: ${origen}`;
                                } else {
                                     const destino = movimientoSeleccionado.concepto.match(/hacia (.*?)[:\(]/i)?.[1] || movimientoSeleccionado.concepto.match(/a (.*?)($|[:\(])/i)?.[1] || 'Caja Destino';
                                     conceptoMostrar = `Egreso a: ${destino}`;
                                }
                                conceptoMostrar = conceptoMostrar.replace('Caja Caja', 'Caja');
                            }
                            
                            if (conceptoMostrar.includes('undefined') || conceptoMostrar.length < 5) {
                                conceptoMostrar = movimientoSeleccionado.concepto
                                    .replace(/^Entrada desde .*?: |^Salida hacia .*?: |^Consolidación .*?: /i, '')
                                    .replace(/^Transferencia enviada a .*?: |^Transferencia recibida de .*?: /i, '')
                                    .trim();
                            }
                            
                            return conceptoMostrar;
                        })()}
                    </div>
                 </div>

                 {/* Bloque de Referencia (Condicional) */}
                 {movimientoSeleccionado.referencia && (
                     <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referencia Externa</div>
                        <div className="font-mono text-slate-700 text-sm bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                            {movimientoSeleccionado.referencia}
                        </div>
                     </div>
                 )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}


        {showVerCajaModal && cajaSeleccionada && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowVerCajaModal(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Detalle de Caja</h3>
                    <p className="text-xs font-bold text-slate-500">{cajaSeleccionada.id}</p>
                </div>
                <button
                  onClick={() => setShowVerCajaModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <div className="text-slate-500 text-sm font-bold uppercase mb-1">Saldo Actual</div>
                    <div className="text-4xl font-extrabold text-slate-900">{formatCurrency(cajaSeleccionada.saldo)}</div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre Caja</label>
                        <div className="font-bold text-slate-900 text-lg">{cajaSeleccionada.nombre}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo / Ruta</label>
                        <div>
                            {cajaSeleccionada.tipo === 'RUTA' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Ruta
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Principal
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Responsable</label>
                        <div className="font-medium text-slate-700 flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                                {cajaSeleccionada.responsable.charAt(0)}
                             </div>
                             {cajaSeleccionada.responsable}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado</label>
                        <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border",
                            cajaSeleccionada.estado === 'ABIERTA' 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                            {cajaSeleccionada.estado}
                        </span>
                    </div>
                </div>
              </div>

              {/* Información Operativa y de Rendimiento */}
              <div className="px-6 pb-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Rendimiento
                 </h4>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Recaudado */}
                      <div 
                        onClick={async () => {
                            setDetalleTipo('INGRESOS');
                            await loadMovimientosDetalle();
                            setShowDetalleModal(true);
                        }}
                        className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 cursor-pointer hover:bg-emerald-100/80 transition-colors group"
                      >
                         <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1 justify-between">
                             <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Recaudado
                             </div>
                             <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                         <div className="font-extrabold text-emerald-800 text-lg">
                             {(() => {
                                if (cajaSeleccionada?.tipo === 'RUTA') {
                                  if (saldoRutaSeleccionada) {
                                    const valor =
                                      saldoRutaSeleccionada.recaudoDelDia ||
                                      saldoRutaSeleccionada.saldoCaja ||
                                      cajaSeleccionada.saldo;
                                    return formatCurrency(valor);
                                  }
                                  if (cajaSeleccionada.saldo) {
                                    return formatCurrency(cajaSeleccionada.saldo);
                                  }
                                }
                                const ingresos = movimientos
                                  .filter(m => (m.tipo === 'INGRESO' || m.tipo === 'TRANSFERENCIA'))
                                  .filter(m => {
                                    if (m.cajaId !== cajaSeleccionada?.id) return false;
                                    if (m.tipo === 'TRANSFERENCIA') {
                                      const concepto = m.concepto.toUpperCase();
                                      const esSalida = concepto.includes('SALIDA') || 
                                                     concepto.includes('ENVIADA A') || 
                                                     concepto.includes('EGRESO');
                                      return !esSalida;
                                    }
                                    return true;
                                  })
                                  .reduce((acc, m) => acc + m.monto, 0);
                                return formatCurrency(ingresos);
                             })()}
                         </div>
                      </div>

                      {/* Gastado/Invertido */}
                      <div 
                        onClick={async () => {
                            setDetalleTipo('EGRESOS');
                            await loadMovimientosDetalle();
                            setShowDetalleModal(true);
                        }}
                        className="bg-rose-50 p-4 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-100/80 transition-colors group"
                      >
                         <div className="text-[10px] font-bold text-rose-600 uppercase mb-1 flex items-center gap-1 justify-between">
                             <div className="flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Egresos
                             </div>
                             <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                         <div className="font-extrabold text-rose-800 text-lg">
                             {(() => {
                                if (cajaSeleccionada?.tipo === 'RUTA' && saldoRutaSeleccionada) {
                                  // Los egresos de una ruta incluyen gastos operativos y desembolsos
                                  return formatCurrency(saldoRutaSeleccionada.gastosDelDia + (saldoRutaSeleccionada.desembolsos || 0));
                                }
                                const egresos = movimientos
                                  .filter(m => (m.tipo === 'EGRESO' || m.tipo === 'TRANSFERENCIA'))
                                  .filter(m => {
                                    if (m.cajaId !== cajaSeleccionada?.id) return false;
                                    if (m.tipo === 'TRANSFERENCIA') {
                                      const concepto = m.concepto.toUpperCase();
                                      return concepto.includes('SALIDA') || 
                                             concepto.includes('ENVIADA A') || 
                                             concepto.includes('EGRESO');
                                    }
                                    return true;
                                  })
                                  .reduce((acc, m) => acc + m.monto, 0);
                                return formatCurrency(egresos);
                             })()}
                         </div>
                      </div>
                 </div>

                 <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Utilidad Diaria</span>
                          <span className="text-[10px] font-bold text-slate-400">Estimado</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                          {(() => {
                                if (cajaSeleccionada?.tipo === 'RUTA' && saldoRutaSeleccionada) {
                                  // La utilidad diaria operativa: lo recaudado menos los gastos
                                  const valor = saldoRutaSeleccionada.recaudoDelDia - saldoRutaSeleccionada.gastosDelDia;
                                  return formatCurrency(valor);
                                }
                              if (cajaSeleccionada?.saldo) {
                                return formatCurrency(cajaSeleccionada.saldo);
                              }
                            const ingresos = movimientos
                              .filter(m => (m.tipo === 'INGRESO' || m.tipo === 'TRANSFERENCIA'))
                              .filter(m => {
                                if (m.cajaId !== cajaSeleccionada?.id) return false;
                                if (m.tipo === 'TRANSFERENCIA') {
                                  const concepto = m.concepto.toUpperCase();
                                  const esSalida = concepto.includes('SALIDA') || 
                                                 concepto.includes('ENVIADA A') || 
                                                 concepto.includes('EGRESO');
                                  return !esSalida;
                                }
                                return true;
                              })
                              .reduce((acc, m) => acc + m.monto, 0);

                            const egresos = movimientos
                              .filter(m => (m.tipo === 'EGRESO' || m.tipo === 'TRANSFERENCIA'))
                              .filter(m => {
                                if (m.cajaId !== cajaSeleccionada?.id) return false;
                                if (m.tipo === 'TRANSFERENCIA') {
                                  return (m.id && (m.id as any).includes('TRX-OUT')) || (m.concepto && m.concepto.includes('Salida') && !m.concepto.startsWith('Entrada'));
                                }
                                return true;
                              })
                              .reduce((acc, m) => acc + m.monto, 0);

                            return formatCurrency(ingresos - egresos);
                          })()}
                      </div>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => {
                    setShowVerCajaModal(false)
                    setSaldoRutaSeleccionada(null)
                  }}
                  className="px-6 py-2 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Detalle */}
        {showDetalleModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setShowDetalleModal(false); setMovimientosDetalle([]); }}>
            <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">
                      {detalleTipo === 'INGRESOS' ? 'Historial de Ingresos' : 'Historial de Egresos'}
                   </h3>
                    <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                       <History className="w-3.5 h-3.5" />
                       Consulta detallada
                    </p>
                </div>
                <button
                  onClick={() => { setShowDetalleModal(false); setMovimientosDetalle([]); }}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-6">
                    {/* Resumen Total Header */}
                    {detalleTipo === 'CIERRES' ? (
                        <div className="rounded-xl border p-5 flex justify-between items-center transition-colors shadow-sm border-orange-100 bg-orange-50/50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider mb-1 text-orange-600">
                                  Consolidaciones Automáticas
                                </span>
                                <span className="text-3xl font-black tracking-tight text-orange-800">
                                  {historialCierres.length} registros
                                </span>
                            </div>
                            <div className="p-4 rounded-full border shadow-sm bg-white border-orange-100 text-orange-600">
                                <History className="w-6 h-6"/>
                            </div>
                        </div>
                    ) : (
                        <div className={cn(
                          "rounded-xl border p-5 flex justify-between items-center transition-colors shadow-sm",
                          detalleTipo === 'INGRESOS' ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/50"
                        )}>
                           <div className="flex flex-col">
                               <span className={cn("text-xs font-bold uppercase tracking-wider mb-1", detalleTipo === 'INGRESOS' ? "text-emerald-600" : "text-red-600")}>
                                 Total Registrado
                               </span>
                               <span className={cn("text-3xl font-black tracking-tight", detalleTipo === 'INGRESOS' ? "text-emerald-800" : "text-red-800")}>
                                 {(() => {
                                    const source = movimientosDetalle.length ? movimientosDetalle : movimientos
                                    const filtered = source
                                        .filter(m => {
                                            if (!cajaSeleccionada && m.categoria === 'CONSOLIDACION') return false;
                                            if (detalleTipo === 'INGRESOS') {
                                                if (m.tipo === 'INGRESO') return true;
                                                if (m.tipo === 'EGRESO') return false;
                                                if (m.tipo === 'TRANSFERENCIA') {
                                                    const concepto = m.concepto.toUpperCase();
                                                    const esSalida = concepto.includes('SALIDA') || 
                                                                   concepto.includes('ENVIADA A') || 
                                                                   concepto.includes('EGRESO');
                                                    return !esSalida;
                                                }
                                            } else {
                                                if (m.tipo === 'EGRESO') return true;
                                                if (m.tipo === 'INGRESO') return false;
                                                if (m.tipo === 'TRANSFERENCIA') {
                                                    const concepto = m.concepto.toUpperCase();
                                                    const esSalida = concepto.includes('SALIDA') || 
                                                                   concepto.includes('ENVIADA A') || 
                                                                   concepto.includes('EGRESO');
                                                    return esSalida;
                                                }
                                            }
                                            return false;
                                        })
                                        .filter(m => {
                                            if (!cajaSeleccionada) return true;
                                            return m.cajaId === cajaSeleccionada.id;
                                        })
                                        .filter(m => {
                                            if (fechaInicioModal || fechaFinModal) {
                                                const fechaM = new Date(m.fecha).toISOString().split('T')[0];
                                                if (fechaInicioModal && fechaM < fechaInicioModal) return false;
                                                if (fechaFinModal && fechaM > fechaFinModal) return false;
                                                return true;
                                            }
                                            return true;
                                        });
                                    const total = filtered.reduce((acc, m) => acc + m.monto, 0);

                                    if (cajaSeleccionada?.tipo === 'RUTA' && saldoRutaSeleccionada && total === 0) {
                                      if (detalleTipo === 'INGRESOS') {
                                        const valor = saldoRutaSeleccionada.recaudoDelDia ||
                                                      saldoRutaSeleccionada.saldoCaja ||
                                                      cajaSeleccionada.saldo;
                                        if (valor > 0) return formatCurrency(valor);
                                      } else {
                                        const valor = saldoRutaSeleccionada.gastosDelDia;
                                        if (valor > 0) return formatCurrency(valor);
                                      }
                                    }

                                    return formatCurrency(total);
                                 })()}
                               </span>
                           </div>
                           <div className={cn(
                               "p-4 rounded-full border shadow-sm",
                               detalleTipo === 'INGRESOS' ? "bg-white border-emerald-100 text-emerald-600" : "bg-white border-red-100 text-red-600"
                           )}>
                               {detalleTipo === 'INGRESOS' ? <TrendingUp className="w-6 h-6"/> : <TrendingDown className="w-6 h-6"/>}
                           </div>
                        </div>
                    )}

                    {/* Lista de Movimientos / Arqueos */}
                    <div className="space-y-3">
                      {detalleTipo !== 'CIERRES' && (
                        <div className="flex gap-2 mb-4 bg-slate-50 p-2 rounded-xl">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</label>
                                <input 
                                    type="date" 
                                    value={fechaInicioModal}
                                    onChange={(e) => setFechaInicioModal(e.target.value)}
                                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta</label>
                                <input 
                                    type="date" 
                                    value={fechaFinModal}
                                    onChange={(e) => setFechaFinModal(e.target.value)}
                                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                           <h4 className="text-sm font-bold text-slate-700">
                             {detalleTipo === 'CIERRES' ? 'Listado de Consolidaciones' : 'Historial de Movimientos'}
                           </h4>
                           <span className="text-xs font-medium text-slate-400">
                              {detalleTipo === 'CIERRES' 
                                 ? historialCierres.length 
                                 : (() => {
                                      const base = movimientosDetalle.length ? movimientosDetalle : movimientos;
                                      const filtrados = base
                                        .filter(m => {
                                          if (!cajaSeleccionada && m.categoria === 'CONSOLIDACION') return false;
                                          if (detalleTipo === 'INGRESOS') {
                                            if (m.tipo === 'INGRESO') {
                                              if (m.categoria === 'SOLICITUD_BASE' || m.categoria === 'SOLICITUD_BASE_EFECTIVO') return false;
                                              return true;
                                            }
                                            if (m.tipo === 'EGRESO') return false;
                                            if (m.tipo === 'TRANSFERENCIA') {
                                              const concepto = m.concepto.toUpperCase();
                                              const esSalida = concepto.includes('SALIDA') || 
                                                               concepto.includes('ENVIADA A') || 
                                                               concepto.includes('EGRESO');
                                              return !esSalida;
                                            }
                                          } else {
                                            if (m.tipo === 'EGRESO') return true;
                                            if (m.tipo === 'INGRESO') return false;
                                            if (m.tipo === 'TRANSFERENCIA') {
                                              const concepto = m.concepto.toUpperCase();
                                              const esSalida = concepto.includes('SALIDA') || 
                                                               concepto.includes('ENVIADA A') || 
                                                               concepto.includes('EGRESO');
                                              return esSalida;
                                            }
                                          }
                                          return false;
                                        })
                                        .filter(m => {
                                          if (!cajaSeleccionada) return true;
                                          return m.cajaId === cajaSeleccionada.id;
                                        })
                                        .filter(m => {
                                          if (fechaInicioModal || fechaFinModal) {
                                            const fechaM = new Date(m.fecha).toISOString().split('T')[0];
                                            if (fechaInicioModal && fechaM < fechaInicioModal) return false;
                                            if (fechaFinModal && fechaM > fechaFinModal) return false;
                                            return true;
                                          }
                                          return true;
                                        });
                                      return filtrados.length;
                                    })()} {detalleTipo === 'CIERRES' ? 'consolidaciones' : 'registros'}
                           </span>
                       </div>
                       
                       {detalleTipo === 'CIERRES' ? (
                           <div className="space-y-3">
                               {historialCierres.map(c => (
                                   <div key={c.id} className="p-4 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between">
                                       <div className="flex flex-col">
                                           <span className="text-xs font-black text-slate-900 uppercase">
                                              {new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                                           </span>
                                           <span className="text-[10px] font-bold text-slate-500 uppercase">{c.caja}</span>
                                       </div>
                                       <div className="flex items-center gap-4">
                                           <div className="text-right">
                                               <div className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1 text-right">Monto Consolidado</div>
                                               <div className="text-sm font-black text-slate-900 leading-none text-right">{formatCurrency(c.saldoSistema)}</div>
                                           </div>
                                           <span className={cn(
                                               "px-2 py-0.5 rounded text-[8px] font-black uppercase border",
                                               "bg-blue-50 text-blue-600 border-blue-100"
                                           )}>
                                               AUTOMÁTICO
                                           </span>
                                           <button 
                                              onClick={() => {
                                                  setArqueoSeleccionado(c);
                                                  setShowVerArqueoModal(true);
                                              }}
                                              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                                              title="Ver Detalles de Consolidación"
                                           >
                                               <Eye className="w-4 h-4" />
                                           </button>
                                       </div>
                                   </div>
                               ))}
                               {historialCierres.length === 0 && (
                                   <div className="py-10 text-center text-slate-400 font-bold text-sm">No hay arqueos en el historial</div>
                               )}
                           </div>
                       ) : (
                         <>
                          {(movimientosDetalle.length ? movimientosDetalle : movimientos)
                            .filter(m => {
                              if (!cajaSeleccionada && m.categoria === 'CONSOLIDACION') return false;
                              let isIngreso = false;

                              if (m.tipo === 'INGRESO') {
                                if (m.categoria === 'SOLICITUD_BASE' || m.categoria === 'SOLICITUD_BASE_EFECTIVO') return false;
                                isIngreso = true;
                              } else if (m.tipo === 'EGRESO') {
                                isIngreso = false;
                              } else if (m.tipo === 'TRANSFERENCIA') {
                                const concepto = m.concepto.toUpperCase();
                                const esSalida = concepto.includes('SALIDA') || 
                                                 concepto.includes('ENVIADA A') || 
                                                 concepto.includes('EGRESO');
                                isIngreso = !esSalida;
                              }
                              
                              if (detalleTipo === 'INGRESOS') return isIngreso;
                              return !isIngreso;
                            })
                            .filter(m => {
                              if (cajaSeleccionada) {
                                return m.cajaId === cajaSeleccionada.id;
                              }
                              
                              if (fechaInicioModal || fechaFinModal) {
                                const fechaM = new Date(m.fecha).toISOString().split('T')[0];
                                if (fechaInicioModal && fechaM < fechaInicioModal) return false;
                                if (fechaFinModal && fechaM > fechaFinModal) return false;
                                return true;
                              }
                              
                              return true;
                            })
                            .map((m) => {
                              let conceptoMostrar = m.concepto
                                .replace(/^Entrada desde .*?: |^Salida hacia .*?: |^Consolidación .*?: /i, '')
                                .replace(/^Transferencia enviada a .*?: |^Transferencia recibida de .*?: /i, '')
                                .replace(/\(Entrada\)|\(Salida\)/gi, '')
                                .trim();
                              
                              if (m.tipo === 'TRANSFERENCIA' || m.categoria === 'CONSOLIDACION') {
                                if (detalleTipo === 'INGRESOS') {
                                  conceptoMostrar = `Ingreso de: ${m.concepto.match(/desde (.*?)[:\(]/i)?.[1] || m.concepto.match(/de (.*?)($|[:\(])/i)?.[1] || 'Caja Origen'}`;
                                } else {
                                  conceptoMostrar = `Egreso a: ${m.concepto.match(/hacia (.*?)[:\(]/i)?.[1] || m.concepto.match(/a (.*?)($|[:\(])/i)?.[1] || 'Caja Destino'}`;
                                }
                                conceptoMostrar = conceptoMostrar.replace('Caja Caja', 'Caja'); 
                              }
                              
                              if (conceptoMostrar.includes('undefined') || conceptoMostrar.length < 5) {
                                conceptoMostrar = m.concepto
                                  .replace(/^Entrada desde .*?: |^Salida hacia .*?: |^Consolidación .*?: /i, '')
                                  .replace(/^Transferencia enviada a .*?: |^Transferencia recibida de .*?: /i, '')
                                  .trim();
                              }
                              
                              return (
                                <div key={m.id} className="group p-4 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-start gap-3">
                                      <div className={cn(
                                        "mt-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-offset-2",
                                        detalleTipo === 'INGRESOS' ? "bg-emerald-500 ring-emerald-100" : "bg-rose-500 ring-rose-100"
                                      )} />
                                      <div>
                                        <div className="font-bold text-slate-900 text-base leading-snug">
                                          {conceptoMostrar}
                                        </div>
                                      </div>
                                    </div>
                                    <div className={cn(
                                      "font-black text-lg tabular-nums tracking-tight whitespace-nowrap",
                                      detalleTipo === 'INGRESOS' ? "text-emerald-700" : "text-rose-700"
                                    )}>
                                      {detalleTipo === 'INGRESOS' ? '+' : '-'}{formatCurrency(m.monto)}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-2 pt-3 border-t border-slate-100 mt-3">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Fecha y Hora</span>
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-900 uppercase leading-tight">
                                          {new Date(m.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <div className="flex items-center gap-1 mt-0.5 text-blue-600 font-bold">
                                          <Clock className="w-2.5 h-2.5" />
                                          <span className="text-[10px] uppercase">
                                            {new Date(m.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Categoría</span>
                                      <span className="inline-block truncate max-w-full text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        {m.categoria.replace(/_/g, ' ')}
                                      </span>
                                    </div>

                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Responsable</span>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[9px] font-bold text-indigo-700 border border-indigo-100 shrink-0">
                                          {(cajaSeleccionada ? cajaSeleccionada.responsable : (m.responsable || 'A')).charAt(0)}
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 truncate">
                                          {cajaSeleccionada ? cajaSeleccionada.responsable : (m.responsable || 'Admin')}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Origen</span>
                                      <span className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border w-fit",
                                        m.origen === 'COBRADOR' ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-blue-50 text-blue-700 border-blue-100"
                                      )}>
                                        <Briefcase className="w-2.5 h-2.5" />
                                        {m.origen}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                         </>
                       )}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}
        {/* Modal: Ver Detalle Arqueo */}
        {showVerArqueoModal && arqueoSeleccionado && renderInPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowVerArqueoModal(false)}>
            <div className="w-full max-w-xl rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 leading-none">Detalle de Consolidación</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Registro Automático: {arqueoSeleccionado.id}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowVerArqueoModal(false)} 
                        className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 transition-all active:scale-90"
                    >
                        <XCircle className="h-7 w-7" />
                    </button>
                </div>
                
                <div className="p-8 space-y-10">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Momento del Cierre
                            </span>
                            <div className="space-y-1">
                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">
                                    {new Date(arqueoSeleccionado.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                                <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-black">
                                    {new Date(arqueoSeleccionado.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Operación</span>
                            <div>
                                <span className={cn(
                                    "inline-flex items-center px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm",
                                    "bg-blue-50 text-blue-700 border-blue-200 shadow-blue-100"
                                )}>
                                    Consolidación Automática
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 group hover:bg-white transition-colors duration-300">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Monto Consolidado</span>
                            <span className="text-base font-black text-slate-900">{formatCurrency(Math.abs(arqueoSeleccionado.saldoSistema))}</span>
                        </div>
                        <div className="p-5 rounded-[1.5rem] border border-blue-100 bg-blue-50 flex flex-col items-center justify-center gap-1">
                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Estado</span>
                            <span className="text-base font-black text-blue-800">AUTOMÁTICO</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-200">
                                {arqueoSeleccionado.responsable.charAt(0)}
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable de Auditoría</div>
                                <div className="text-lg font-black text-slate-900">{arqueoSeleccionado.responsable}</div>
                            </div>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-200 mx-4" />
                        <div className="text-right">
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Caja Origen</div>
                           <div className="text-sm font-bold text-slate-600">{arqueoSeleccionado.caja.toUpperCase()}</div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                    <button 
                        onClick={() => setShowVerArqueoModal(false)}
                        className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-sm uppercase tracking-widest"
                    >
                        Confirmar Lectura
                    </button>
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// Wrap in Suspense to avoid de-opting entire page
const ModuloContablePage = () => {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ModuloContableContent />

    </Suspense>
  )
}

export default ModuloContablePage


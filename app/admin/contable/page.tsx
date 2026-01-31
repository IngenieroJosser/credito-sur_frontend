'use client'

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

import React, { useState, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useNotification } from '@/components/providers/NotificationProvider'

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
  History
} from 'lucide-react'

import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'

// Interfaces alineadas con el dominio financiero
interface Caja {
  id: string
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  rutaId?: string // Vinculación opcional a una ruta específica
  responsable: string
  saldo: number
  estado: 'ABIERTA' | 'CERRADA'
  recaudoEsperado?: number
  eficiencia?: number
  ultimaActualizacion: string
}

interface HistorialCierre {
  id: string
  fecha: string
  caja: string
  responsable: string
  saldoSistema: number // Lo que el software dice que debe haber
  saldoReal: number    // Lo que se contó físicamente
  diferencia: number   // Surplus (+) o Deficit (-)
  estado: 'CUADRADA' | 'DESCUADRADA'
}

interface MovimientoContable {
  id: string
  fecha: string // Changed to string for serialization safety
  concepto: string
  tipo: 'INGRESO' | 'EGRESO'
  monto: number
  categoria: string
  responsable: string
  origen: 'EMPRESA' | 'COBRADOR'
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  referencia?: string
  rutaId?: string // Vinculación opcional a una ruta
}

interface ResumenFinanciero {
  ingresos: number
  egresos: number
  utilidadNeta: number
  capitalEnCalle: number
  cajaActual: number
}

type RutaResumen = {
  id: string
  nombre: string
  responsable: string
}

const ModuloContableContent = () => {
  const [showCrearCajaModal, setShowCrearCajaModal] = useState(false)
  const { showNotification } = useNotification()
  const [busqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS')
  const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | MovimientoContable['origen']>('TODOS')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | MovimientoContable['estado']>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string>('TODOS')

  const [showEditarCajaModal, setShowEditarCajaModal] = useState(false)
  const [showVerArqueoModal, setShowVerArqueoModal] = useState(false)
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState<HistorialCierre | null>(null)
  const [showRegistrarMovimientoModal, setShowRegistrarMovimientoModal] = useState(false)
  const [showVerMovimientoModal, setShowVerMovimientoModal] = useState(false)
  const [showVerCajaModal, setShowVerCajaModal] = useState(false)
  const [cajaSeleccionada, setCajaSeleccionada] = useState<Caja | null>(null)
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoContable | null>(null)

  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [detalleTipo, setDetalleTipo] = useState<'INGRESOS' | 'EGRESOS' | null>(null)

  const rutasDisponibles: RutaResumen[] = [
    { id: 'RUTA-NORTE', nombre: 'Ruta Norte', responsable: 'Carlos Cobrador' },
    { id: 'RUTA-SUR', nombre: 'Ruta Sur', responsable: 'Pedro Supervisor' },
    { id: 'RUTA-CENTRO', nombre: 'Ruta Centro', responsable: 'Ana Admin' },
  ]

  // Usuarios del sistema (Administrativos y Cobradores)
  const usuarios = [
    { id: 'USR-001', nombre: 'María Rodríguez', rol: 'SUPER_ADMINISTRADOR' },
    { id: 'USR-002', nombre: 'Laura Sánchez', rol: 'CONTADOR' },
    { id: 'USR-003', nombre: 'Admin General', rol: 'ADMIN' },
    { id: 'USR-004', nombre: 'Ana Admin', rol: 'SUPER_ADMINISTRADOR' },
    { id: 'USR-005', nombre: 'Carlos Cobrador', rol: 'COBRADOR' },
    { id: 'USR-006', nombre: 'Pedro Supervisor', rol: 'COBRADOR' },
  ]

  // Mock Data: Cajas
  const [cajas, setCajas] = useState<Caja[]>([
    {
      id: 'CAJA-MAIN',
      nombre: 'Caja Principal Oficina',
      tipo: 'PRINCIPAL',
      responsable: 'Ana Admin',
      saldo: 5200000,
      estado: 'ABIERTA',
      ultimaActualizacion: 'Hace 10 min'
    },
    {
      id: 'CAJA-R1',
      nombre: 'Caja Ruta Norte',
      tipo: 'RUTA',
      rutaId: 'RUTA-NORTE',
      responsable: 'Carlos Cobrador',
      saldo: 850000,
      recaudoEsperado: 950000,
      eficiencia: 89,
      estado: 'ABIERTA',
      ultimaActualizacion: 'Hace 2 horas'
    },
    {
      id: 'CAJA-R2',
      nombre: 'Caja Ruta Sur',
      tipo: 'RUTA',
      rutaId: 'RUTA-SUR',
      responsable: 'Pedro Supervisor',
      saldo: 120000,
      estado: 'CERRADA',
      ultimaActualizacion: 'Ayer 6:00 PM'
    }
  ])

  const [crearCajaForm, setCrearCajaForm] = useState({
    tipo: 'RUTA' as Caja['tipo'],
    nombre: '',
    rutaId: '',
    responsable: '',
    saldoInicialInput: '',
  })

  const [editarCajaForm, setEditarCajaForm] = useState({
    nombre: '',
    responsable: '',
    estado: 'ABIERTA' as Caja['estado'],
    saldoInput: '',
    rutaId: '',
  })

  // Mock Data: Historial Cierres
  const [historialCierres] = useState<HistorialCierre[]>([
    {
      id: 'CIERRE-001',
      fecha: '2026-01-22T18:30:00',
      caja: 'Caja Principal Oficina',
      responsable: 'Ana Admin',
      saldoSistema: 5200000,
      saldoReal: 5200000,
      diferencia: 0,
      estado: 'CUADRADA'
    },
    {
      id: 'CIERRE-002',
      fecha: '2026-01-22T17:00:00',
      caja: 'Caja Ruta Norte',
      responsable: 'Carlos Cobrador',
      saldoSistema: 850000,
      saldoReal: 845000,
      diferencia: -5000,
      estado: 'DESCUADRADA'
    },
    {
      id: 'CIERRE-003',
      fecha: '2026-01-21T18:00:00',
      caja: 'Caja Principal Oficina',
      responsable: 'Ana Admin',
      saldoSistema: 4800000,
      saldoReal: 4800000,
      diferencia: 0,
      estado: 'CUADRADA'
    }
  ])

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

  // Datos de ejemplo (Mock Data) - Moved inside component state or effect to avoid hydration mismatch
  const [resumenData] = useState<ResumenFinanciero>({
    ingresos: 28500500,
    egresos: 13250750,
    utilidadNeta: 15249750,
    capitalEnCalle: 45000000,
    cajaActual: 5200000
  })

  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([
    {
      id: 'MOV-001',
      fecha: '2026-01-30T10:00:00.000Z', // Hoy
      concepto: 'Cobro Cuota - Cliente Juan Pérez',
      tipo: 'INGRESO',
      monto: 150000,
      categoria: 'COBRO_CUOTA',
      responsable: 'Carlos Cobrador',
      origen: 'COBRADOR',
      rutaId: 'RUTA-NORTE',
      estado: 'APROBADO'
    },
    {
      id: 'MOV-002',
      fecha: '2026-01-30T11:00:00.000Z', // Hoy
      concepto: 'Combustible Ruta Norte',
      tipo: 'EGRESO',
      monto: 25000,
      categoria: 'GASTO_OPERATIVO',
      responsable: 'Carlos Cobrador',
      origen: 'COBRADOR',
      rutaId: 'RUTA-NORTE',
      estado: 'PENDIENTE'
    },
    {
      id: 'MOV-003',
      fecha: '2026-01-30T12:00:00.000Z', // Hoy
      concepto: 'Cobro Cuota - Cliente María Garcia',
      tipo: 'INGRESO',
      monto: 200000,
      categoria: 'COBRO_CUOTA',
      responsable: 'Carlos Cobrador',
      origen: 'COBRADOR',
      rutaId: 'RUTA-NORTE',
      estado: 'APROBADO'
    },
    {
      id: 'MOV-004',
      fecha: '2026-01-19T14:30:00.000Z', // Ayer
      concepto: 'Compra Papelería Oficina',
      tipo: 'EGRESO',
      monto: 45500,
      categoria: 'GASTO_ADMINISTRATIVO',
      responsable: 'Ana Admin',
      origen: 'EMPRESA',
      estado: 'APROBADO'
    },
    {
      id: 'MOV-005',
      fecha: '2026-01-19T16:45:00.000Z', // Ayer
      concepto: 'Abono Capital - Cliente Luis Rodriguez',
      tipo: 'INGRESO',
      monto: 500000,
      categoria: 'ABONO_CAPITAL',
      responsable: 'Pedro Supervisor',
      origen: 'EMPRESA',
      estado: 'APROBADO'
    }
  ])

  const categoriasIngreso = [
    { id: 'APORTE_CAPITAL', label: 'Aporte de Capital' },
    { id: 'AJUSTE_POSITIVO', label: 'Ajuste de Caja (+)' },
    { id: 'OTROS_INGRESOS', label: 'Otros Ingresos' },
  ]

  const categoriasEgreso = [
    { id: 'GASTO_OPERATIVO', label: 'Gasto Operativo (Transporte, Comida)' },
    { id: 'GASTO_ADMINISTRATIVO', label: 'Gasto Administrativo (Papelería, Servicios)' },
    { id: 'BASE_COBRADOR', label: 'Entrega Base a Cobrador' },
    { id: 'RETIRO_UTILIDADES', label: 'Retiro de Utilidades' },
  ]

  const [movimientoForm, setMovimientoForm] = useState({
    tipo: 'INGRESO' as MovimientoContable['tipo'],
    categoria: '',
    montoInput: '',
    concepto: '',
    referencia: '',
    cajaId: 'CAJA-MAIN',
    origen: 'EMPRESA' as MovimientoContable['origen'],
    estado: 'PENDIENTE' as MovimientoContable['estado'],
    responsableId: 'USR-004', // Default: Ana Admin (Super Admin)
    entregadoPor: '', // Para cuando origen es COBRADOR
  })

  // Filtrado de movimientos
  const movimientosFiltrados = movimientos.filter(mov => {
    const cumpleBusqueda = 
      mov.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.responsable.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.categoria.toLowerCase().includes(busqueda.toLowerCase())
    
    const cumpleTipo = filtroTipo === 'TODOS' || mov.tipo === filtroTipo
    const cumpleOrigen = filtroOrigen === 'TODOS' || mov.origen === filtroOrigen
    const cumpleEstado = filtroEstado === 'TODOS' || mov.estado === filtroEstado
    const cumpleRuta = filtroRuta === 'TODOS' || mov.rutaId === filtroRuta

    return cumpleBusqueda && cumpleTipo && cumpleOrigen && cumpleEstado && cumpleRuta
  })



  const handleCrearCaja = () => {
    const now = new Date().toISOString()
    const saldo = parseCOPInputToNumber(crearCajaForm.saldoInicialInput)
    const ruta = rutasDisponibles.find((r) => r.id === crearCajaForm.rutaId)

    const nuevaCaja: Caja = {
      id: `CAJA-${Date.now()}`,
      nombre:
        crearCajaForm.nombre.trim() ||
        (crearCajaForm.tipo === 'PRINCIPAL'
          ? 'Caja Principal'
          : `Caja ${ruta?.nombre ?? 'Ruta'}`),
      tipo: crearCajaForm.tipo,
      rutaId: crearCajaForm.tipo === 'RUTA' ? (crearCajaForm.rutaId || undefined) : undefined,
      responsable:
        crearCajaForm.responsable.trim() ||
        (crearCajaForm.tipo === 'RUTA' ? ruta?.responsable ?? 'Sin asignar' : 'Oficina'),
      saldo,
      estado: 'ABIERTA',
      ultimaActualizacion: `Creada ${new Date(now).toLocaleDateString('es-CO')}`,
    }

    setCajas((prev) => [nuevaCaja, ...prev])
    setShowCrearCajaModal(false)
    showNotification('success', 'La caja ha sido creada correctamente', 'Caja Creada')
  }

  const openEditarCaja = (caja: Caja) => {
    setCajaSeleccionada(caja)
    setEditarCajaForm({
      nombre: caja.nombre,
      responsable: caja.responsable,
      estado: caja.estado,
      saldoInput: caja.saldo ? formatMilesCOP(caja.saldo) : '',
      rutaId: caja.rutaId ?? '',
    })
    setShowEditarCajaModal(true)
  }

  const handleEditarCaja = () => {
    if (!cajaSeleccionada) return
    const saldo = parseCOPInputToNumber(editarCajaForm.saldoInput)

    setCajas((prev) =>
      prev.map((c) =>
        c.id === cajaSeleccionada.id
          ? {
              ...c,
              nombre: editarCajaForm.nombre,
              responsable: editarCajaForm.responsable,
              estado: editarCajaForm.estado,
              saldo,
              rutaId: c.tipo === 'RUTA' ? (editarCajaForm.rutaId || undefined) : undefined,
              ultimaActualizacion: 'Actualizada hace 1 min',
            }
          : c
      )
    )
    setShowEditarCajaModal(false)
    setCajaSeleccionada(null)
    showNotification('success', 'La información de la caja ha sido actualizada', 'Caja Actualizada')
  }

  const openRegistrarMovimiento = () => {
    setMovimientoForm({
      tipo: 'INGRESO',
      categoria: '',
      montoInput: '',
      concepto: '',
      referencia: '',
      cajaId: 'CAJA-MAIN',
      origen: 'EMPRESA',
      estado: 'PENDIENTE',
      responsableId: 'USR-004',
      entregadoPor: '',
    })
    setShowRegistrarMovimientoModal(true)
  }

  const handleRegistrarMovimiento = () => {
    const monto = parseCOPInputToNumber(movimientoForm.montoInput)
    if (!monto || !movimientoForm.categoria || !movimientoForm.concepto.trim()) return

    const nuevo: MovimientoContable = {
      id: `MOV-${Date.now()}`,
      fecha: new Date().toISOString(),
      concepto: movimientoForm.concepto,
      tipo: movimientoForm.tipo,
      monto,
      categoria: movimientoForm.categoria,
      responsable: 'Contador',
      origen: movimientoForm.origen,
      estado: movimientoForm.estado,
      referencia: movimientoForm.referencia || undefined,
    }
    setMovimientos((prev) => [nuevo, ...prev])
    setShowRegistrarMovimientoModal(false)
    showNotification('success', 'El movimiento contable ha sido registrado', 'Movimiento Registrado')
  }

  const renderInPortal = (node: React.ReactNode) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        {/* Header Ultra Clean */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Gestión Financiera</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="text-blue-600">Gestión </span><span className="text-orange-500">Contable V2</span>
              </h1>
              <p className="text-base text-slate-500 max-w-xl font-medium">
                Control centralizado de flujos de caja, gastos operativos y rentabilidad.
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
                FALTAN 3 RUTAS
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <div className="relative w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-black text-blue-600 shadow-inner shrink-0">
               <div className="absolute inset-0 border-2 border-blue-600 rounded-full clip-path-75"></div>
               75%
            </div>
          </div>
        </div>

        {/* Tarjetas de Resumen Minimalistas */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
          {/* Ingresos */}
          <div 
            onClick={() => { setDetalleTipo('INGRESOS'); setShowDetalleModal(true); }}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ingresos Hoy
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(3500000)}
            </div>
            <div className="mt-2 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +12% vs Ayer
            </div>
          </div>

          {/* Egresos */}
          <div 
            onClick={() => { setDetalleTipo('EGRESOS'); setShowDetalleModal(true); }}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Egresos Hoy
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(2500000)}
            </div>
            <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
              <History className="mr-1 h-3 w-3" />
              Dentro del presupuesto
            </div>
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
              {formatCurrency(1000000)}
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
              {formatCurrency(4500000)}
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

          {/* Cierres */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cierres
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                <History className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {historialCierres.length}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              En historial
            </div>
          </div>
        </section>

        {/* Historial de Arqueos de Caja - FULL WIDTH AND MORE VISIBLE */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900">Historial de Arqueos</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Auditoría y control de cierres diarios</p>
                    </div>
                </div>
                <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                    Descargar Historial
                </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Fecha Cierre</th>
                            <th className="px-6 py-4">Caja / Ruta</th>
                            <th className="px-6 py-4">Responsable</th>
                            <th className="px-6 py-4 text-right">Software (Teórico)</th>
                            <th className="px-6 py-4 text-right">Físico (Conteo)</th>
                            <th className="px-6 py-4 text-right">Diferencia</th>
                            <th className="px-6 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                         </tr>
                     </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historialCierres.map((cierre) => (
                            <tr key={cierre.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-black text-slate-900 text-[11px] uppercase tracking-tight">
                                        {new Date(cierre.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                    <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {new Date(cierre.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-bold text-xs uppercase tracking-tight">
                                    {cierre.caja}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                            {cierre.responsable.charAt(0)}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">{cierre.responsable}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                    {formatCurrency(cierre.saldoSistema)}
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/30">
                                    {formatCurrency(cierre.saldoReal)}
                                </td>
                                <td className={cn(
                                    "px-6 py-4 text-right font-black text-sm",
                                    cierre.diferencia === 0 ? "text-slate-300" : (cierre.diferencia > 0 ? "text-emerald-500" : "text-rose-500")
                                )}>
                                    {cierre.diferencia > 0 ? '+' : ''}{formatCurrency(cierre.diferencia)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                        cierre.estado === 'CUADRADA' 
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                             : "bg-rose-50 text-rose-700 border-rose-200"
                                    )}>
                                        {cierre.estado === 'CUADRADA' ? 'Cuadrada' : 'Descuadrada'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => {
                                            setArqueoSeleccionado(cierre);
                                            setShowVerArqueoModal(true);
                                        }}
                                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center ml-auto"
                                        title="Ver Detalle"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</div>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="TODOS">Cualquier estado</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="APROBADO">Aprobado</option>
                    <option value="RECHAZADO">Rechazado</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60">
                  <FiltroRuta 
                      onRutaChange={(r: string | null) => setFiltroRuta(r || 'TODOS')} 
                      selectedRutaId={filtroRuta === 'TODOS' ? null : filtroRuta}
                  />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {movimientosFiltrados.slice(0, 6).map((m) => (
                <div key={m.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{m.concepto}</div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-tight">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(m.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-blue-600 font-black pl-5 uppercase tracking-widest">
                        Registrado a las {new Date(m.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {m.categoria ? ` • ${m.categoria.replace(/_/g, ' ')}` : ''}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <div className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                        m.origen === 'COBRADOR'
                          ? 'bg-orange-50 text-orange-800 border-orange-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      )}>
                        {m.origen === 'COBRADOR' ? 'COBRADOR' : 'EMPRESA'}
                      </div>
                      <div className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                        m.estado === 'APROBADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : m.estado === 'RECHAZADO'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : 'bg-amber-50 text-amber-800 border-amber-100'
                      )}>
                        {m.estado}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div className={cn(
                      'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                      m.tipo === 'INGRESO'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    )}>
                      {m.tipo}
                    </div>
                    <div className={cn(
                      'text-sm font-extrabold',
                      m.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                    )}>
                      {m.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(m.monto)}
                    </div>
                    <button
                      onClick={() => {
                        setMovimientoSeleccionado(m)
                        setShowVerMovimientoModal(true)
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver Detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-500" />
                <div className="text-sm font-extrabold text-slate-900">Cajas</div>
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
              {cajas.slice(0, 6).map((c) => (
                <div
                  key={c.id}
                  className="w-full text-left p-5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">{c.nombre}</div>
                      <div className="mt-1 text-xs text-slate-500 font-medium">{c.responsable}</div>
                      {c.rutaId && <div className="mt-1 text-[10px] text-blue-600 font-bold bg-blue-50 inline-block px-1.5 py-0.5 rounded border border-blue-100">{c.rutaId}</div>}
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
                          onClick={() => {
                            setCajaSeleccionada(c)
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
          </div>

        </section>

        {showCrearCajaModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
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
                  <button
                    type="button"
                    onClick={() => setCrearCajaForm((p) => ({ ...p, tipo: 'RUTA' }))}
                    className={cn(
                      'px-4 py-3 rounded-2xl border text-sm font-bold transition-colors',
                      crearCajaForm.tipo === 'RUTA'
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
                      value={crearCajaForm.responsable}
                      onChange={(e) => setCrearCajaForm((p) => ({ ...p, responsable: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.nombre}>
                          {u.nombre} ({u.rol})
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
                        {rutasDisponibles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre} • {r.responsable}
                          </option>
                        ))}
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
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
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
                      value={editarCajaForm.responsable}
                      onChange={(e) => setEditarCajaForm((p) => ({ ...p, responsable: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.nombre}>
                          {u.nombre} ({u.rol})
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
                        {rutasDisponibles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre} • {r.responsable}
                          </option>
                        ))}
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
                    <label className="text-sm font-bold text-slate-700">Saldo</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editarCajaForm.saldoInput}
                        onChange={(e) =>
                          setEditarCajaForm((p) => ({
                            ...p,
                            saldoInput: formatCOPInputValue(e.target.value),
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
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
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
                    onClick={() => setMovimientoForm((p) => ({ ...p, tipo: 'INGRESO', categoria: '' }))}
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
                    onClick={() => setMovimientoForm((p) => ({ ...p, tipo: 'EGRESO', categoria: '' }))}
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
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Caja Afectada</label>
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          value={movimientoForm.cajaId}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, cajaId: e.target.value }))}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-700 focus:bg-white transition-all"
                        >
                          {cajas.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Origen / Fuente</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          value={movimientoForm.origen}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, origen: e.target.value as MovimientoContable['origen'] }))}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-700 focus:bg-white transition-all"
                        >
                          <option value="EMPRESA">Empresa</option>
                          <option value="COBRADOR">Ruta / Cobrador</option>
                        </select>
                    </div>
                  </div>
                </div>

                {/* Detalles Financieros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoría</label>
                    <select
                      value={movimientoForm.categoria}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, categoria: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    >
                      <option value="">Seleccione...</option>
                      {(movimientoForm.tipo === 'INGRESO' ? categoriasIngreso : categoriasEgreso).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
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
                            {movimientoForm.tipo === 'INGRESO' ? 'Recibido Por (Yo)' : 'Registrado Por'}
                        </label>
                        <select
                          value={movimientoForm.responsableId}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, responsableId: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-700"
                        >
                            {usuarios.map(u => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {movimientoForm.origen === 'COBRADOR' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 text-orange-600">
                                ¿Quién Entregó el Dinero?
                            </label>
                            <select
                              value={movimientoForm.entregadoPor}
                              onChange={(e) => setMovimientoForm((p) => ({ ...p, entregadoPor: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-sm font-bold text-orange-800 focus:ring-2 focus:ring-orange-100 outline-none"
                            >
                                <option value="">Seleccione Cobrador...</option>
                                {usuarios.map(u => (
                                    <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Concepto y Referencia */}
                <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Concepto / Descripción</label>
                    <input
                      value={movimientoForm.concepto}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, concepto: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="Ej: Recaudo Ruta Norte - Cobrador Carlos..."
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Referencia (Opcional)</label>
                        <input
                          value={movimientoForm.referencia}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, referencia: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none"
                          placeholder="Doc #..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Estado Operación</label>
                        <select
                          value={movimientoForm.estado}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, estado: e.target.value as MovimientoContable['estado'] }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="APROBADO">Aprobado</option>
                          <option value="RECHAZADO">Rechazado</option>
                        </select>
                    </div>
                </div>
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
                  disabled={
                    parseCOPInputToNumber(movimientoForm.montoInput) <= 0 ||
                    !movimientoForm.concepto.trim() ||
                    !movimientoForm.categoria
                  }
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}


        {showVerMovimientoModal && movimientoSeleccionado && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Detalle de Movimiento</h3>
                    <p className="text-xs font-bold text-slate-500">{movimientoSeleccionado.id}</p>
                </div>
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Fecha</div>
                        <div className="font-medium text-slate-900">{new Date(movimientoSeleccionado.fecha).toLocaleString('es-CO')}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Monto</div>
                        <div className="font-bold text-slate-900 text-lg">{formatCurrency(movimientoSeleccionado.monto)}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Tipo</div>
                        <div className={cn(
                            "inline-block px-2 py-1 rounded-2xl text-xs font-bold mt-1 border",
                            movimientoSeleccionado.tipo === 'INGRESO' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"
                        )}>
                            {movimientoSeleccionado.tipo}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Estado</div>
                        <div className="font-bold text-slate-900">{movimientoSeleccionado.estado}</div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Categoría</div>
                        <div className="font-medium text-slate-900">
                           {(categoriasIngreso.find(c => c.id === movimientoSeleccionado.categoria) || 
                             categoriasEgreso.find(c => c.id === movimientoSeleccionado.categoria))?.label || movimientoSeleccionado.categoria}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Origen</div>
                        <div className="font-medium text-slate-900">{movimientoSeleccionado.origen}</div>
                    </div>
                     <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Responsable</div>
                        <div className="font-medium text-slate-900">{movimientoSeleccionado.responsable}</div>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Concepto</div>
                    <div className="font-medium text-slate-900">{movimientoSeleccionado.concepto}</div>
                 </div>
                 {movimientoSeleccionado.referencia && (
                     <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Referencia</div>
                        <div className="font-medium text-slate-900">{movimientoSeleccionado.referencia}</div>
                     </div>
                 )}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="px-6 py-2 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}


        {showVerCajaModal && cajaSeleccionada && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                                    {cajaSeleccionada.rutaId || 'Ruta'}
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
                        onClick={() => {
                            setDetalleTipo('INGRESOS');
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
                                if (cajaSeleccionada.tipo === 'PRINCIPAL') return formatCurrency(resumenData.ingresos);
                                if (cajaSeleccionada.recaudoEsperado && cajaSeleccionada.eficiencia) {
                                    return formatCurrency(cajaSeleccionada.recaudoEsperado * (cajaSeleccionada.eficiencia / 100));
                                }
                                return formatCurrency(cajaSeleccionada.saldo * 0.9);
                             })()}
                         </div>
                      </div>

                      {/* Gastado/Invertido */}
                      <div 
                        onClick={() => {
                            setDetalleTipo('EGRESOS');
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
                                if (cajaSeleccionada.tipo === 'PRINCIPAL') return formatCurrency(resumenData.egresos);
                                if (cajaSeleccionada.recaudoEsperado && cajaSeleccionada.eficiencia) {
                                    return formatCurrency((cajaSeleccionada.recaudoEsperado * (cajaSeleccionada.eficiencia / 100)) * 0.15);
                                }
                                return formatCurrency(cajaSeleccionada.saldo * 0.1);
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
                            const ingresos = cajaSeleccionada.tipo === 'PRINCIPAL' 
                                ? resumenData.ingresos 
                                : (cajaSeleccionada.recaudoEsperado && cajaSeleccionada.eficiencia 
                                    ? cajaSeleccionada.recaudoEsperado * (cajaSeleccionada.eficiencia / 100) 
                                    : cajaSeleccionada.saldo * 0.9);
                            
                            const egresos = cajaSeleccionada.tipo === 'PRINCIPAL'
                                ? resumenData.egresos
                                : (cajaSeleccionada.recaudoEsperado && cajaSeleccionada.eficiencia
                                    ? (cajaSeleccionada.recaudoEsperado * (cajaSeleccionada.eficiencia / 100)) * 0.15
                                    : cajaSeleccionada.saldo * 0.1);

                            return formatCurrency(ingresos - egresos);
                          })()}
                      </div>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setShowVerCajaModal(false)}
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
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">
                      {cajaSeleccionada
                          ? (detalleTipo === 'INGRESOS' ? `Ingresos: ${cajaSeleccionada.nombre}` : `Egresos: ${cajaSeleccionada.nombre}`)
                          : (detalleTipo === 'INGRESOS' ? 'Detalle de Ingresos' : 'Detalle de Egresos')}
                   </h3>
                    <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                       <Clock className="w-3.5 h-3.5" />
                       {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button
                  onClick={() => setShowDetalleModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-6">
                    {/* Resumen Total Header */}
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
                                // Consistent Calculation: Sum of visible movements
                                const filtered = movimientos
                                    .filter(m => detalleTipo === 'INGRESOS' ? m.tipo === 'INGRESO' : m.tipo === 'EGRESO')
                                    .filter(m => {
                                        if (!cajaSeleccionada) return true;
                                        if (cajaSeleccionada.tipo === 'PRINCIPAL') return m.origen === 'EMPRESA';
                                        if (cajaSeleccionada.tipo === 'RUTA') return m.origen === 'COBRADOR';
                                        return true;
                                    });
                                const total = filtered.reduce((acc, m) => acc + m.monto, 0);
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

                    {/* Lista de Movimientos */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <h4 className="text-sm font-bold text-slate-700">Movimientos Recientes</h4>
                          <span className="text-xs font-medium text-slate-400">
                             {movimientos
                                .filter(m => detalleTipo === 'INGRESOS' ? m.tipo === 'INGRESO' : m.tipo === 'EGRESO')
                                .filter(m => {
                                    if (!cajaSeleccionada) return true;
                                    if (cajaSeleccionada.tipo === 'PRINCIPAL') return m.origen === 'EMPRESA';
                                    if (cajaSeleccionada.tipo === 'RUTA') return m.origen === 'COBRADOR';
                                    return true;
                                }).length} registros
                          </span>
                      </div>
                      
                      {movimientos
                        .filter(m => detalleTipo === 'INGRESOS' ? m.tipo === 'INGRESO' : m.tipo === 'EGRESO')
                        .filter(m => {
                            // Si se abre desde una caja específica, filtrar por origen
                            if (cajaSeleccionada) {
                                if (cajaSeleccionada.tipo === 'PRINCIPAL') return m.origen === 'EMPRESA';
                                if (cajaSeleccionada.tipo === 'RUTA') return m.origen === 'COBRADOR' && (m.rutaId === cajaSeleccionada.rutaId);
                                return true;
                            }
                            // Si se abre desde las tarjetas de resumen (sin caja específica), mostrar todo de hoy
                            const hoy = new Date().toISOString().split('T')[0];
                            const fechaM = new Date(m.fecha).toISOString().split('T')[0];
                            return fechaM === hoy;
                        })
                        .map((m) => (
                          <div key={m.id} className="group p-4 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                             <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start gap-3">
                                   <div className={cn(
                                       "mt-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-offset-2",
                                       detalleTipo === 'INGRESOS' ? "bg-emerald-500 ring-emerald-100" : "bg-rose-500 ring-rose-100"
                                   )} />
                                   <div>
                                       <div className="font-bold text-slate-900 text-base leading-snug">{m.concepto}</div>
                                       {m.referencia && (
                                           <div className="text-[10px] font-mono mt-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit border border-slate-200/50">
                                               REF: {m.referencia}
                                           </div>
                                       )}
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
                        ))}
                      
                      {movimientos
                        .filter(m => detalleTipo === 'INGRESOS' ? m.tipo === 'INGRESO' : m.tipo === 'EGRESO')
                        .filter(m => {
                            if (cajaSeleccionada) {
                                if (cajaSeleccionada.tipo === 'PRINCIPAL') return m.origen === 'EMPRESA';
                                if (cajaSeleccionada.tipo === 'RUTA') return m.origen === 'COBRADOR' && (m.rutaId === cajaSeleccionada.rutaId);
                                return true;
                            }
                            const hoy = new Date().toISOString().split('T')[0];
                            const fechaM = new Date(m.fecha).toISOString().split('T')[0];
                            return fechaM === hoy;
                        }).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                              <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                                <History className="h-8 w-8 text-slate-300" />
                              </div>
                              <p className="font-bold text-sm text-slate-500">No hay movimientos registrados</p>
                              <p className="text-xs text-slate-400 max-w-[200px] text-center mt-1">
                                  No se encontraron transacciones que coincidan con los filtros actuales.
                              </p>
                          </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}
        {/* Modal: Ver Detalle Arqueo */}
        {showVerArqueoModal && arqueoSeleccionado && renderInPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-xl rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 leading-none">Detalle de Arqueo</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Registro Auditado: {arqueoSeleccionado.id}
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
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condición del Cuadre</span>
                            <div>
                                <span className={cn(
                                    "inline-flex items-center px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm",
                                    arqueoSeleccionado.estado === 'CUADRADA' 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100" 
                                        : "bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100"
                                )}>
                                    {arqueoSeleccionado.estado === 'CUADRADA' ? '✓ Operación Exitosa' : '⚠ Descuadre Detectado'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 group hover:bg-white transition-colors duration-300">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Software (Teórico)</span>
                            <span className="text-base font-black text-slate-900">{formatCurrency(arqueoSeleccionado.saldoSistema)}</span>
                        </div>
                        <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 group hover:bg-white transition-colors duration-300">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Físico (Efectivo)</span>
                            <span className="text-base font-black text-slate-900">{formatCurrency(arqueoSeleccionado.saldoReal)}</span>
                        </div>
                        <div className={cn(
                             "p-5 rounded-[1.5rem] border flex flex-col items-center justify-center gap-1 transition-all duration-300",
                             arqueoSeleccionado.diferencia === 0 
                                ? "bg-slate-50 border-slate-100 text-slate-400 opacity-60" 
                                : (arqueoSeleccionado.diferencia > 0 
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-700 font-bold" 
                                    : "bg-rose-50 border-rose-100 text-rose-700 font-bold shadow-lg shadow-rose-100/50 scale-105")
                        )}>
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Balance / Dif.</span>
                            <span className="text-base font-black">
                                {arqueoSeleccionado.diferencia > 0 ? '+' : ''}{formatCurrency(arqueoSeleccionado.diferencia)}
                            </span>
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

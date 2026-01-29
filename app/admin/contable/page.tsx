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
  Search,
  TrendingUp,
  TrendingDown,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  Wallet,
  XCircle,
  AlertCircle,
  Eye,
  Edit2,
  Plus,
  History,
  Receipt,
  Zap,
  Clock
} from 'lucide-react'

import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

// Interfaces alineadas con el dominio financiero
interface Caja {
  id: string
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  rutaId?: string // Vinculación opcional a una ruta específica
  responsable: string
  saldo: number
  estado: 'ABIERTA' | 'CERRADA'
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
  const { showNotification } = useNotification()
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS')
  const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | MovimientoContable['origen']>('TODOS')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | MovimientoContable['estado']>('TODOS')

  const [showCrearCajaModal, setShowCrearCajaModal] = useState(false)
  const [showEditarCajaModal, setShowEditarCajaModal] = useState(false)
  /* Removed Arqueo State */
  const [showRegistrarMovimientoModal, setShowRegistrarMovimientoModal] = useState(false)
  const [showVerMovimientoModal, setShowVerMovimientoModal] = useState(false)
  const [showVerCajaModal, setShowVerCajaModal] = useState(false)
  const [cajaSeleccionada, setCajaSeleccionada] = useState<Caja | null>(null)
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoContable | null>(null)

  const rutasDisponibles: RutaResumen[] = [
    { id: 'RUTA-NORTE', nombre: 'Ruta Norte', responsable: 'Carlos Cobrador' },
    { id: 'RUTA-SUR', nombre: 'Ruta Sur', responsable: 'Pedro Supervisor' },
    { id: 'RUTA-CENTRO', nombre: 'Ruta Centro', responsable: 'Ana Admin' },
  ]

  // Usuarios autorizados para ser responsables de caja (Roles: ADMIN, SUPER_ADMINISTRADOR, CONTADOR)
  const usuariosAutorizados = [
    { id: 'USR-001', nombre: 'María Rodríguez', rol: 'SUPER_ADMINISTRADOR' },
    { id: 'USR-002', nombre: 'Laura Sánchez', rol: 'CONTADOR' },
    { id: 'USR-003', nombre: 'Admin General', rol: 'ADMIN' },
    { id: 'USR-004', nombre: 'Ana Admin', rol: 'SUPER_ADMINISTRADOR' },
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
      fecha: '2026-01-20T10:00:00.000Z', // Fixed date for consistency
      concepto: 'Cobro Cuota - Cliente Juan Pérez',
      tipo: 'INGRESO',
      monto: 150000,
      categoria: 'COBRO_CUOTA',
      responsable: 'Carlos Cobrador',
      origen: 'COBRADOR',
      estado: 'APROBADO'
    },
    {
      id: 'MOV-002',
      fecha: '2026-01-20T11:00:00.000Z', // Fixed date for consistency
      concepto: 'Combustible Ruta Norte',
      tipo: 'EGRESO',
      monto: 25000,
      categoria: 'GASTO_OPERATIVO',
      responsable: 'Carlos Cobrador',
      origen: 'COBRADOR',
      estado: 'PENDIENTE'
    },
    {
      id: 'MOV-003',
      fecha: '2026-01-20T12:00:00.000Z', // Fixed date for consistency
      concepto: 'Cobro Cuota - Cliente María Garcia',
      tipo: 'INGRESO',
      monto: 200000,
      categoria: 'COBRO_CUOTA',
      responsable: 'Carlos Cobrador',
      origen: 'COBRADOR',
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

    return cumpleBusqueda && cumpleTipo && cumpleOrigen && cumpleEstado
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
                <span className="text-blue-600">Gestión </span><span className="text-orange-500">Contable</span>
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
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ingresos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.ingresos)}
            </div>
            <div className="mt-2 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +12.5%
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Egresos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.egresos)}
            </div>
            <div className="mt-2 flex items-center text-xs font-bold text-red-600 bg-red-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +5.2%
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inventario Activo
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <PieChart className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(185000000)}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Valor estimado
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Caja Actual
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.cajaActual)}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Disponible inmediato
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
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

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cierres Registrados
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

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="p-4 border-b border-slate-100 bg-slate-50/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold text-slate-600">Tipo</div>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="INGRESO">Ingresos</option>
                    <option value="EGRESO">Egresos</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold text-slate-600">Origen</div>
                  <select
                    value={filtroOrigen}
                    onChange={(e) => setFiltroOrigen(e.target.value as typeof filtroOrigen)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="EMPRESA">Empresa</option>
                    <option value="COBRADOR">Cobrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold text-slate-600">Estado</div>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="APROBADO">Aprobado</option>
                    <option value="RECHAZADO">Rechazado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {movimientosFiltrados.slice(0, 6).map((m) => (
                <div key={m.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{m.concepto}</div>
                    <div className="mt-1 text-xs text-slate-500 font-medium">
                      {new Date(m.fecha).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {m.categoria ? ` • ${m.categoria}` : ''}
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

          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-600" />
                <div className="text-sm font-extrabold text-slate-900">Historial de cierres</div>
              </div>
              <div className="text-xs font-bold text-slate-500">{historialCierres.length} registros</div>
            </div>
            <div className="divide-y divide-slate-100">
              {historialCierres.slice(0, 6).map((h) => (
                <div key={h.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 truncate">{h.caja}</div>
                    <div className="mt-1 text-xs text-slate-500 font-medium">
                      {new Date(h.fecha).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {h.responsable ? ` • ${h.responsable}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn(
                      'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                      h.estado === 'CUADRADA'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-800 border-amber-100'
                    )}>
                      {h.estado}
                    </div>
                    <div className={cn(
                      'mt-2 text-sm font-extrabold',
                      h.diferencia === 0 ? 'text-slate-900' : h.diferencia > 0 ? 'text-blue-700' : 'text-rose-700'
                    )}>
                      {h.diferencia === 0 ? formatCurrency(0) : h.diferencia > 0 ? `+${formatCurrency(h.diferencia)}` : `-${formatCurrency(Math.abs(h.diferencia))}`}
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
                      {usuariosAutorizados.map((u) => (
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
                      {usuariosAutorizados.map((u) => (
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

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMovimientoForm((p) => ({ ...p, tipo: 'INGRESO', categoria: '' }))}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-colors',
                      movimientoForm.tipo === 'INGRESO'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovimientoForm((p) => ({ ...p, tipo: 'EGRESO', categoria: '' }))}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-colors',
                      movimientoForm.tipo === 'EGRESO'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Egreso
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Origen</label>
                    <select
                      value={movimientoForm.origen}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, origen: e.target.value as MovimientoContable['origen'] }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="EMPRESA">Empresa</option>
                      <option value="COBRADOR">Cobrador</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Estado</label>
                    <select
                      value={movimientoForm.estado}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, estado: e.target.value as MovimientoContable['estado'] }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="APROBADO">Aprobado</option>
                      <option value="RECHAZADO">Rechazado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Categoría</label>
                    <select
                      value={movimientoForm.categoria}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, categoria: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccione una categoría...</option>
                      {(movimientoForm.tipo === 'INGRESO' ? categoriasIngreso : categoriasEgreso).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Monto</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={movimientoForm.montoInput}
                        onChange={(e) => setMovimientoForm((p) => ({ ...p, montoInput: formatCOPInputValue(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Concepto / Descripción</label>
                    <input
                      value={movimientoForm.concepto}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, concepto: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder="Ej: Compra de papelería"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Referencia (Opcional)</label>
                    <input
                      value={movimientoForm.referencia}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, referencia: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder="Ej: Factura #123"
                    />
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

              {/* Información Operativa Adicional */}
              <div className="px-6 pb-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Resumen Operativo (Hoy)</h4>
                 <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                         <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Apertura</div>
                         <div className="font-bold text-slate-900 text-sm">07:30 AM</div>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                         <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Ingresos</div>
                         <div className="font-bold text-emerald-800 text-sm">
                             {formatCurrency(cajaSeleccionada.tipo === 'PRINCIPAL' ? resumenData.ingresos : 850000)}
                         </div>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100">
                         <div className="text-[10px] font-bold text-rose-600 uppercase mb-1">Egresos</div>
                         <div className="font-bold text-rose-800 text-sm">
                             {formatCurrency(cajaSeleccionada.tipo === 'PRINCIPAL' ? resumenData.egresos : 120000)}
                         </div>
                      </div>
                 </div>
                 
                 {cajaSeleccionada.tipo === 'RUTA' && (
                     <div className="mt-4 p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                          <div className="text-xs font-bold text-blue-800">Estado de Ruta</div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-blue-200 text-[10px] font-bold text-blue-700">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                             En Recorrido
                          </span>
                     </div>
                 )}
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

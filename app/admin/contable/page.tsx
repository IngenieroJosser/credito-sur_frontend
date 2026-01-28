'use client'

import React, { useState, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Calendar,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  Wallet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Edit2,
  Lock,
  Plus,
  History,
  Receipt
} from 'lucide-react'
import Link from 'next/link'
import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

// Interfaces alineadas con el dominio
interface Caja {
  id: string
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  rutaId?: string
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
  saldoSistema: number
  saldoReal: number
  diferencia: number
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
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const basePath = pathname?.startsWith('/contador') ? '/contador' : '/admin'
  const tabParam = searchParams.get('tab')
  const validTabs = ['MOVIMIENTOS', 'CAJAS', 'HISTORIAL']
  const initialTab = validTabs.includes(tabParam || '') ? (tabParam as 'MOVIMIENTOS' | 'CAJAS' | 'HISTORIAL') : 'CAJAS'

  const [activeTab, setActiveTab] = useState<'MOVIMIENTOS' | 'CAJAS' | 'HISTORIAL'>(initialTab)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS')
  const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | MovimientoContable['origen']>('TODOS')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | MovimientoContable['estado']>('TODOS')

  const [showCrearCajaModal, setShowCrearCajaModal] = useState(false)
  const [showEditarCajaModal, setShowEditarCajaModal] = useState(false)
  const [showRegistrarMovimientoModal, setShowRegistrarMovimientoModal] = useState(false)
  const [cajaSeleccionada, setCajaSeleccionada] = useState<Caja | null>(null)

  const rutasDisponibles: RutaResumen[] = [
    { id: 'RUTA-NORTE', nombre: 'Ruta Norte', responsable: 'Carlos Cobrador' },
    { id: 'RUTA-SUR', nombre: 'Ruta Sur', responsable: 'Pedro Supervisor' },
    { id: 'RUTA-CENTRO', nombre: 'Ruta Centro', responsable: 'Ana Admin' },
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

  const openCrearCaja = () => {
    setCrearCajaForm({
      tipo: 'RUTA',
      nombre: '',
      rutaId: '',
      responsable: '',
      saldoInicialInput: '',
    })
    setShowCrearCajaModal(true)
  }

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
            
            <div className="flex gap-3">
              <ExportButton 
                label="Exportar" 
                onExportExcel={handleExportExcel} 
                onExportPDF={handleExportPDF} 
              />
              <button
                type="button"
                onClick={() => setShowCrearCajaModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 transform active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Crear Caja
              </button>
              <Link 
                href={`${basePath}/contable/cierre-caja`}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 transform active:scale-95"
              >
                <Calendar className="h-4 w-4" />
                Cierre Diario de Caja
              </Link>
            </div>
        </header>

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
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
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
                  <div className="text-right shrink-0">
                    <div className={cn(
                      'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                      m.tipo === 'INGRESO'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    )}>
                      {m.tipo}
                    </div>
                    <div className={cn(
                      'mt-2 text-sm font-extrabold',
                      m.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                    )}>
                      {m.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(m.monto)}
                    </div>
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
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Crear
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {cajas.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openEditarCaja(c)}
                  className="w-full text-left p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">{c.nombre}</div>
                      <div className="mt-1 text-xs text-slate-500 font-medium">{c.responsable}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                        c.estado === 'ABIERTA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      )}>
                        {c.estado}
                      </div>
                      <div className="mt-2 text-sm font-extrabold text-slate-900">{formatCurrency(c.saldo)}</div>
                    </div>
                  </div>
                </button>
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
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
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
                      'px-4 py-3 rounded-xl border text-sm font-bold transition-colors',
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
                      'px-4 py-3 rounded-xl border text-sm font-bold transition-colors',
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder={crearCajaForm.tipo === 'PRINCIPAL' ? 'Caja Principal Oficina' : 'Caja Ruta Norte'}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Responsable</label>
                    <input
                      value={crearCajaForm.responsable}
                      onChange={(e) => setCrearCajaForm((p) => ({ ...p, responsable: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder="Ej. Ana Admin"
                    />
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
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
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
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
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearCaja}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
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
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Responsable</label>
                    <input
                      value={editarCajaForm.responsable}
                      onChange={(e) => setEditarCajaForm((p) => ({ ...p, responsable: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    />
                  </div>

                  {cajaSeleccionada.tipo === 'RUTA' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Ruta</label>
                      <select
                        value={editarCajaForm.rutaId}
                        onChange={(e) => setEditarCajaForm((p) => ({ ...p, rutaId: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
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
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
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
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEditarCaja}
                  className="px-6 py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
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
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
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
                      'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-colors',
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
                      'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-colors',
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
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
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Concepto / Descripción</label>
                    <input
                      value={movimientoForm.concepto}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, concepto: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder="Ej: Compra de papelería"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Referencia (Opcional)</label>
                    <input
                      value={movimientoForm.referencia}
                      onChange={(e) => setMovimientoForm((p) => ({ ...p, referencia: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder="Ej: Factura #123"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegistrarMovimientoModal(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
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
                  className="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar
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
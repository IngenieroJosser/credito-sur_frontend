'use client'

import { use, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, User, DollarSign, CheckCircle, AlertCircle, XCircle, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'

// Mock data para el detalle de caja
const MOCK_CAJA = {
  id: '1',
  nombre: 'Caja Principal Oficina',
  responsable: 'Ana Admin',
  tipo: 'PRINCIPAL',
  estado: 'ABIERTA',
  saldoActual: 5200000,
  saldoInicial: 1000000,
  ingresosDia: 4500000,
  egresosDia: 300000,
  fechaApertura: '2024-01-23 08:00 AM',
  movimientos: [
    { id: 1, tipo: 'INGRESO', concepto: 'Pago Cuota #45 - Juan Perez', monto: 150000, hora: '08:30 AM', usuario: 'Ana Admin' },
    { id: 2, tipo: 'INGRESO', concepto: 'Pago Cuota #12 - Maria Lopez', monto: 200000, hora: '09:15 AM', usuario: 'Ana Admin' },
    { id: 3, tipo: 'EGRESO', concepto: 'Pago Servicio Internet', monto: 120000, hora: '10:00 AM', usuario: 'Ana Admin' },
    { id: 4, tipo: 'INGRESO', concepto: 'Cierre Ruta Centro', monto: 2500000, hora: '12:00 PM', usuario: 'Carlos Cobrador' },
    { id: 5, tipo: 'EGRESO', concepto: 'Adelanto Gasolina', monto: 50000, hora: '02:00 PM', usuario: 'Ana Admin' },
  ]
}

export default function DetalleCajaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [showEditarCajaModal, setShowEditarCajaModal] = useState(false)
  const [showRegistrarMovimientoModal, setShowRegistrarMovimientoModal] = useState(false)
  const [editForm, setEditForm] = useState({
    nombre: MOCK_CAJA.nombre,
    responsable: MOCK_CAJA.responsable,
    saldoInicialInput: '',
  })

  const [movimientoForm, setMovimientoForm] = useState({
    tipo: 'INGRESO' as 'INGRESO' | 'EGRESO',
    categoria: '',
    montoInput: '',
    concepto: '',
    referencia: '',
  })

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

  const movimientosPorPagina = 4
  const [paginaMovimientos, setPaginaMovimientos] = useState(1)

  // En una implementación real, aquí se cargaría la data basada en el ID
  const caja = MOCK_CAJA

  const totalPaginasMovimientos = Math.max(1, Math.ceil(caja.movimientos.length / movimientosPorPagina))
  const movimientosPaginados = useMemo(() => {
    const start = (paginaMovimientos - 1) * movimientosPorPagina
    return caja.movimientos.slice(start, start + movimientosPorPagina)
  }, [caja.movimientos, paginaMovimientos])

  const openEditarCaja = () => {
    setEditForm({
      nombre: caja.nombre,
      responsable: caja.responsable,
      saldoInicialInput: '',
    })
    setShowEditarCajaModal(true)
  }

  const openRegistrarMovimiento = () => {
    setMovimientoForm({
      tipo: 'INGRESO',
      categoria: '',
      montoInput: '',
      concepto: '',
      referencia: '',
    })
    setShowRegistrarMovimientoModal(true)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200 shadow-sm hover:shadow"
          >
            <ArrowLeft className="h-6 w-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Detalle</span> <span className="text-orange-500">Caja</span>
            </h1>
            <p className="text-slate-500">Visualización de estado y movimientos</p>
          </div>
        </div>

        {/* Resumen Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta de Información */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{caja.nombre}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      caja.estado === 'ABIERTA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {caja.estado === 'ABIERTA' ? <CheckCircle className="w-3 h-3 mr-1"/> : <AlertCircle className="w-3 h-3 mr-1"/>}
                      {caja.estado}
                    </span>
                    <span className="text-slate-400 text-sm">•</span>
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <User className="w-3 h-3" /> {caja.responsable}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 mb-1">Saldo Actual</p>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(caja.saldoActual)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-700">Ingresos Hoy</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(caja.ingresosDia)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-red-700">Egresos Hoy</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(caja.egresosDia)}</p>
              </div>
            </div>
          </div>

          {/* Detalles Adicionales */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Detalles de Apertura</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Fecha Apertura</p>
                    <p className="text-sm text-slate-500">{caja.fechaApertura}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Saldo Inicial</p>
                    <p className="text-sm text-slate-500">{formatCurrency(caja.saldoInicial)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <button 
                onClick={openEditarCaja}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Editar Configuración
              </button>
            </div>
          </div>
        </div>

        {/* Listado de Movimientos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Movimientos Recientes</h3>
            <button 
              onClick={openRegistrarMovimiento}
              className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline"
            >
              Registrar Nuevo
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {movimientosPaginados.map((mov) => (
              <div key={mov.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    mov.tipo === 'INGRESO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {mov.tipo === 'INGRESO' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{mov.concepto}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{mov.hora}</span>
                      <span>•</span>
                      <span>{mov.usuario}</span>
                    </div>
                  </div>
                </div>
                <div className="font-bold text-slate-900">
                  {mov.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.monto)}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Página {paginaMovimientos} de {totalPaginasMovimientos}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaMovimientos((p) => Math.max(1, p - 1))}
                disabled={paginaMovimientos <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPaginaMovimientos((p) => Math.min(totalPaginasMovimientos, p + 1))}
                disabled={paginaMovimientos >= totalPaginasMovimientos}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {showEditarCajaModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Caja</p>
                  <h3 className="text-lg font-bold text-slate-900">Editar Configuración</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditarCajaModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nombre</label>
                    <input
                      value={editForm.nombre}
                      onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Responsable</label>
                    <input
                      value={editForm.responsable}
                      onChange={(e) => setEditForm((p) => ({ ...p, responsable: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Saldo Inicial (referencia)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.saldoInicialInput}
                        onChange={(e) => setEditForm((p) => ({ ...p, saldoInicialInput: formatCOPInputValue(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Este modal es solo frontend (mock). No persiste cambios en base de datos.
                </p>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditarCajaModal(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditarCajaModal(false)}
                  className="px-6 py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {showRegistrarMovimientoModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
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
                    className={
                      movimientoForm.tipo === 'INGRESO'
                        ? 'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold bg-blue-600 text-white border-blue-600'
                        : 'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovimientoForm((p) => ({ ...p, tipo: 'EGRESO', categoria: '' }))}
                    className={
                      movimientoForm.tipo === 'EGRESO'
                        ? 'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold bg-rose-600 text-white border-rose-600'
                        : 'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Egreso
                  </button>
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

                <p className="text-xs text-slate-500 font-medium">
                  Este modal es solo frontend (mock). No persiste cambios en base de datos.
                </p>
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
                  disabled={
                    parseCOPInputToNumber(movimientoForm.montoInput) <= 0 ||
                    !movimientoForm.concepto.trim() ||
                    !movimientoForm.categoria
                  }
                  onClick={() => setShowRegistrarMovimientoModal(false)}
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

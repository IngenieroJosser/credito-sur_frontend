'use client'


import Paginador from '@/components/ui/Paginador'
import PantallaCarga from '@/components/ui/PantallaCarga'

import { createPortal } from 'react-dom'
import { use, useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, User, DollarSign, CheckCircle, AlertCircle, XCircle, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, CheckCircle2, X } from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
import MoneyAmount from '@/components/contable/MoneyAmount'
import { useNotification } from '@/components/providers/NotificationProvider'
import { createTransaccion, getCajaById, getMovimientosLedger, type MovimientoLedger } from '@/services/contabilidad-service'
import { usuariosService } from '@/services/usuarios-service'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { formatRoleLabel } from '@/lib/display-labels'
import { categoriasPorTipo } from '@/lib/contable/categorias-movimiento'

interface CajaDetalle {
  id: string
  nombre: string
  responsable: string
  tipo: string
  estado: string
  saldoActual: number
  saldoInicial: number
  totalRegistradoRango: number
  saldoPrevioRango: number
  rangoInicio: string
  rangoFin: string
  ingresosDia: number
  egresosDia: number
  fechaApertura: string
  movimientos: Array<{ id: string | number; tipo: string; concepto: string; monto: number; hora: string; usuario: string }>
}

const mapLedgerCajaMovimiento = (entry: MovimientoLedger, cajaId: string) => {
  const lineasCaja = entry.lineas.filter((linea) => linea.cajaId === cajaId)
  const debitoCaja = lineasCaja.reduce((acc, linea) => acc + Number(linea.debitAmount || 0), 0)
  const creditoCaja = lineasCaja.reduce((acc, linea) => acc + Number(linea.creditAmount || 0), 0)
  return {
    id: entry.id,
    tipo: debitoCaja >= creditoCaja ? 'INGRESO' : 'EGRESO',
    concepto: entry.descripcion || entry.tipo,
    monto: Math.max(debitoCaja, creditoCaja),
    hora: new Date(entry.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    usuario: entry.creadoPorId || 'Sistema',
  }
}

export default function DetalleCajaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [caja, setCaja] = useState<CajaDetalle | null>(null)
  const [loadingCaja, setLoadingCaja] = useState(true)
  const [usuariosAutorizados, setUsuariosAutorizados] = useState<Array<{id: string; nombre: string; rol: string}>>([])
  const [showEditarCajaModal, setShowEditarCajaModal] = useState(false)
  const [showRegistrarMovimientoModal, setShowRegistrarMovimientoModal] = useState(false)
  const [editForm, setEditForm] = useState({ nombre: '', responsable: '', saldoInicialInput: '' })
  const [movimientoForm, setMovimientoForm] = useState({
    tipo: 'INGRESO' as 'INGRESO' | 'EGRESO',
    categoria: '',
    montoInput: '',
    concepto: '',
    referencia: '',
    accountCode: '',
  })

  const { showNotification } = useNotification()

  const fetchCaja = useCallback(async () => {
    setLoadingCaja(true)
    try {
      const getBogotaDateKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

      const hoyKey = getBogotaDateKey(new Date())
      const ayerTmp = new Date()
      ayerTmp.setDate(ayerTmp.getDate() - 1)
      const ayerKey = getBogotaDateKey(ayerTmp)

      const cajaData = await getCajaById(id)
      const ledgerRes = await getMovimientosLedger({ cajaId: id, limit: 500 })

      const txEnRango = (t: any) => {
        const key = new Date(t.fecha).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
        return key >= ayerKey && key <= hoyKey
      }

      const totalRegistradoRango = (ledgerRes.data || [])
        .filter((entry: any) => txEnRango(entry))
        .reduce((s: number, entry: MovimientoLedger) => {
          const lineasCaja = entry.lineas.filter((linea) => linea.cajaId === id)
          const debitos = lineasCaja.reduce((acc, linea) => acc + Number(linea.debitAmount || 0), 0)
          const creditos = lineasCaja.reduce((acc, linea) => acc + Number(linea.creditAmount || 0), 0)
          return s + debitos - creditos
        }, 0)

      const saldoActual = cajaData?.saldo || 0
      const saldoPrevioRango = (ledgerRes.data || [])
        .filter((entry: any) => {
          const key = new Date(entry.fecha).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
          return key < ayerKey
        })
        .reduce((s: number, entry: MovimientoLedger) => {
          const lineasCaja = entry.lineas.filter((linea) => linea.cajaId === id)
          const debitos = lineasCaja.reduce((acc, linea) => acc + Number(linea.debitAmount || 0), 0)
          const creditos = lineasCaja.reduce((acc, linea) => acc + Number(linea.creditAmount || 0), 0)
          return s + debitos - creditos
        }, 0)

      const ingresos = ledgerRes.data
        .reduce((s, entry: MovimientoLedger) => {
          const debitos = entry.lineas
            .filter((linea) => linea.cajaId === id)
            .reduce((acc, linea) => acc + Number(linea.debitAmount || 0), 0)
          return s + debitos
        }, 0)

      const egresos = ledgerRes.data
        .reduce((s, entry: MovimientoLedger) => {
          const creditos = entry.lineas
            .filter((linea) => linea.cajaId === id)
            .reduce((acc, linea) => acc + Number(linea.creditAmount || 0), 0)
          return s + creditos
        }, 0)

      setCaja({
        id: cajaData?.id || id,
        nombre: cajaData?.nombre || '',
        responsable: cajaData?.responsable || '',
        tipo: cajaData?.tipo || 'PRINCIPAL',
        estado: cajaData?.estado || 'ABIERTA',
        saldoActual,
        saldoInicial: 0,
        totalRegistradoRango,
        saldoPrevioRango,
        rangoInicio: ayerKey,
        rangoFin: hoyKey,
        ingresosDia: ingresos,
        egresosDia: egresos,
        fechaApertura: cajaData?.ultimaActualizacion || '',
        movimientos: ledgerRes.data.map((entry) => mapLedgerCajaMovimiento(entry, id)),
      })
      setEditForm({ nombre: cajaData?.nombre || '', responsable: cajaData?.responsable || '', saldoInicialInput: '' })
      try {
        const users = await usuariosService.obtenerTodos()
        setUsuariosAutorizados((users as any[]).map((u: any) => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}`, rol: u.rol })))
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Error cargando caja:', err)
      setCaja(null)
    } finally {
      setLoadingCaja(false)
    }
  }, [id])

  useEffect(() => {
    fetchCaja()
  }, [fetchCaja])

  useRealtimeData(['dashboards_actualizados', 'pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas'], fetchCaja)

  const handleRegistrarMovimiento = async () => {
    const monto = parseCOPInputToNumber(movimientoForm.montoInput)
    if (monto <= 0) {
      showNotification('error', 'El monto debe ser mayor a 0', 'Validación')
      return
    }
    if (!movimientoForm.concepto.trim()) {
      showNotification('error', 'Debe ingresar un concepto', 'Validación')
      return
    }
    if (!movimientoForm.categoria) {
      showNotification('error', 'Debe seleccionar una categoría', 'Validación')
      return
    }

    try {
      await createTransaccion({
        cajaId: id,
        tipo: movimientoForm.tipo as any,
        monto,
        descripcion: movimientoForm.concepto,
        tipoReferencia: movimientoForm.categoria,
        referenciaId: movimientoForm.referencia?.trim() ? movimientoForm.referencia.trim() : undefined,
      })

      showNotification('success', 'Movimiento registrado correctamente', 'Éxito')
      setShowRegistrarMovimientoModal(false)
      setMovimientoForm({ tipo: 'INGRESO', categoria: '', montoInput: '', concepto: '', referencia: '', accountCode: '' })
      await fetchCaja()
    } catch (error: any) {
      console.error('Error registrando movimiento:', error)
      const msg =
        error?.message ||
        error?.response?.message ||
        (Array.isArray(error?.response?.message) ? error.response.message.join(', ') : undefined) ||
        'No se pudo registrar el movimiento'
      showNotification('error', String(msg), 'Error')
    }
  }

  // Mismos nombres claros que el panel general (fuente única).
  const [categoriasIngreso, setCategoriasIngreso] = useState(
    categoriasPorTipo('INGRESO').map((c) => ({ id: c.code, label: c.label })),
  )

  const [categoriasEgreso, setCategoriasEgreso] = useState(
    categoriasPorTipo('EGRESO').map((c) => ({ id: c.code, label: c.label })),
  )

  // Estado para crear nueva categoría inline
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  const handleCrearCategoria = () => {
    if (!nuevaCategoria.trim()) return
    const id = nuevaCategoria.trim().toUpperCase().replace(/\s+/g, '_')
    const nueva = { id, label: nuevaCategoria.trim() }
    
    if (movimientoForm.tipo === 'INGRESO') {
      setCategoriasIngreso(prev => [...prev, nueva])
    } else {
      setCategoriasEgreso(prev => [...prev, nueva])
    }
    
    setMovimientoForm(p => ({ ...p, categoria: id }))
    setNuevaCategoria('')
    setIsCreatingCategory(false)
    showNotification('success', 'Categoría creada correctamente', 'Éxito')
  }

  const movimientosPorPagina = 4
  const [paginaMovimientos, setPaginaMovimientos] = useState(1)

  // Va antes de los returns tempranos: puesto después, mientras la caja
  // cargaba se ejecutaba un hook menos que ya cargada, y en cuanto el número
  // cambia entre dos renders React tumba la pantalla con el error 310.
  //
  // La caja puede no estar todavía, así que la lista se protege aquí; abajo ya
  // se sabe que existe.
  const movimientosPaginadosMemo = useMemo(() => {
    const movimientos = caja?.movimientos ?? []
    const start = (paginaMovimientos - 1) * movimientosPorPagina
    return movimientos.slice(start, start + movimientosPorPagina)
  }, [caja?.movimientos, paginaMovimientos])

  if (loadingCaja) {
    return (
      <PantallaCarga />
    )
  }

  if (!caja) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-500">No se pudo cargar la caja</p>
      </div>
    )
  }

  const totalPaginasMovimientos = Math.max(1, Math.ceil(caja.movimientos.length / movimientosPorPagina))
  const movimientosPaginados = movimientosPaginadosMemo

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
      accountCode: '',
    })
    setShowRegistrarMovimientoModal(true)
  }

  const renderInPortal = (node: React.ReactNode) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
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
                <MoneyAmount value={caja.saldoActual} amountClassName="text-3xl font-bold text-slate-900" />
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Total registrado ({caja.rangoInicio} → {caja.rangoFin})</p>
                  <MoneyAmount value={caja.totalRegistradoRango} meaning="signed" amountClassName="text-sm font-bold text-slate-900" />
                  <p className="text-xs font-medium text-slate-500">Saldo previo al rango</p>
                  <MoneyAmount value={caja.saldoPrevioRango} amountClassName="text-sm font-bold text-slate-900" />
                </div>
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
                <MoneyAmount value={caja.ingresosDia} amountClassName="text-2xl font-bold text-slate-900" />
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-red-700">Egresos Hoy</span>
                </div>
                <MoneyAmount value={caja.egresosDia} meaning="expense" amountClassName="text-2xl font-bold text-slate-900" />
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
                    <MoneyAmount value={caja.saldoInicial} amountClassName="text-sm text-slate-500" />
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
                  <MoneyAmount
                    value={mov.monto}
                    meaning={mov.tipo === 'EGRESO' ? 'expense' : 'signed'}
                    amountClassName="font-bold text-slate-900"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <Paginador
              pagina={paginaMovimientos}
              totalPaginas={totalPaginasMovimientos}
              onCambiar={setPaginaMovimientos}
              className="mt-0"
            />
          </div>
        </div>

        {showEditarCajaModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
                    <select
                      value={editForm.responsable}
                      onChange={(e) => setEditForm((p) => ({ ...p, responsable: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuariosAutorizados.map((u) => (
                        <option key={u.id} value={u.nombre}>
                          {u.nombre} ({formatRoleLabel(u.rol)})
                        </option>
                      ))}
                    </select>
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
                  El movimiento se registrará en esta caja.
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
                    {isCreatingCategory ? (
                        <div className="flex gap-2">
                             <input 
                                autoFocus
                                value={nuevaCategoria}
                                onChange={(e) => setNuevaCategoria(e.target.value)}
                                placeholder="Nombre nueva categoría..."
                                className="flex-1 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-blue-300"
                             />
                             <button
                                type="button" 
                                onClick={handleCrearCategoria}
                                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                             >
                                <CheckCircle2 className="h-5 w-5" />
                             </button>
                             <button 
                                type="button"
                                onClick={() => setIsCreatingCategory(false)}
                                className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
                             >
                                <X className="h-5 w-5" />
                             </button>
                        </div>
                    ) : (
                        <select
                        value={movimientoForm.categoria}
                        onChange={(e) => {
                            if (e.target.value === 'NUEVA_CATEGORIA') {
                                setIsCreatingCategory(true)
                                setNuevaCategoria('')
                            } else {
                                setMovimientoForm((p) => ({ ...p, categoria: e.target.value }))
                            }
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                        >
                        <option value="">Seleccione una categoría...</option>
                        {(movimientoForm.tipo === 'INGRESO' ? categoriasIngreso : categoriasEgreso).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                            {cat.label}
                            </option>
                        ))}
                        <option value="NUEVA_CATEGORIA" className="font-bold text-blue-600 bg-blue-50">+ Crear nueva categoría...</option>
                        </select>
                    )}
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
                  onClick={handleRegistrarMovimiento}
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

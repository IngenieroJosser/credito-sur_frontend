'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Banknote, CheckCircle2, RefreshCw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
import { pagosService } from '@/services/pagos-service'
import { prestamosService } from '@/services/prestamos-service'
import type { PrestamoDelListado } from '@/types/domain'
import { MetodoPago } from '@/types/enums'

type ClienteDeCobro = { id: string; nombres: string; apellidos: string; dni?: string | null }
type Props = { cliente: ClienteDeCobro; onRegistrado?: () => void }
const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900'
const boton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50'

export function PagoOficinaModal({ onClose, ...props }: Props & { onClose: () => void }) {
  const enviando = useRef(false)
  return (
    <Modal title="Registrar pago en oficina" isOpen size="lg"
      onClose={() => { if (!enviando.current) onClose() }}>
      <PagoOficina {...props} enviandoRef={enviando} />
    </Modal>
  )
}

export function PagoOficina({ cliente, onRegistrado, enviandoRef }: Props & {
  enviandoRef?: { current: boolean }
}) {
  const [carga, setCarga] = useState<{ creditos: PrestamoDelListado[] } | { error: string } | null>(null)
  const [consulta, setConsulta] = useState(0)
  const [seleccion, setSeleccion] = useState('')
  const [monto, setMonto] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorPago, setErrorPago] = useState('')
  const [confirmacion, setConfirmacion] = useState<{ pendiente: boolean; saldoNuevo?: number } | null>(null)
  const envio = useRef(false)
  const intento = useRef<{ firma: string; llave: string } | null>(null)

  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const creditos = new Map<string, PrestamoDelListado>()
        for (let pagina = 1; vigente; pagina++) {
          const resultado = await prestamosService.obtenerPrestamos({ clienteId: cliente.id, page: pagina, limit: 100 }, { sinCache: true })
          const totalPaginas = resultado.paginacion?.totalPaginas
          if (!Number.isInteger(totalPaginas) || totalPaginas < 0) {
            throw new Error('No se pudo verificar el listado completo de créditos.')
          }
          for (const credito of resultado.prestamos) {
            if (credito.clienteId === cliente.id && ['ACTIVO', 'EN_MORA'].includes(credito.estado) &&
                Number.isFinite(credito.montoPendiente) && credito.montoPendiente > 0) {
              creditos.set(credito.id, credito)
            }
          }
          if (pagina >= totalPaginas) break
        }
        if (!vigente) return
        const opciones = Array.from(creditos.values())
        setSeleccion(opciones.length === 1 ? opciones[0].id : '')
        setCarga({ creditos: opciones })
      } catch (error) {
        if (vigente) setCarga({ error: mensajeDeError(error, 'No se pudieron consultar los créditos.') })
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [cliente.id, consulta])

  const creditos = carga && 'creditos' in carga ? carga.creditos : []
  const credito = creditos.find((c) => c.id === seleccion)
  const importe = parseCOPInputToNumber(monto)
  const montoValido = !!credito && Number.isSafeInteger(importe) && importe > 0 && importe <= credito.montoPendiente

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!credito || !montoValido || envio.current || confirmacion) return
    envio.current = true
    if (enviandoRef) enviandoRef.current = true
    setEnviando(true)
    setErrorPago('')
    try {
      const pago = { clienteId: cliente.id, prestamoId: credito.id, montoTotal: importe,
        metodoPago: MetodoPago.EFECTIVO, notas: notas.trim() || undefined }
      const firma = JSON.stringify(pago)
      if (intento.current?.firma !== firma) intento.current = { firma, llave: crypto.randomUUID() }
      const resultado = await pagosService.registrarPago({ ...pago, idempotencyKey: intento.current.llave })
      if (!resultado.esOffline && !resultado.pago) throw new Error('No se recibió confirmación del pago.')
      setConfirmacion({
        pendiente: Boolean(resultado.esOffline),
        saldoNuevo: resultado.esOffline ? undefined : resultado.descomposicion?.saldoNuevo,
      })
      if (!resultado.esOffline) onRegistrado?.()
    } catch (error) {
      setErrorPago(mensajeDeError(error, 'No se pudo registrar el pago.'))
    } finally {
      envio.current = false
      if (enviandoRef) enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <p className="break-words font-semibold text-slate-900">{cliente.nombres} {cliente.apellidos}</p>
        {cliente.dni && <p className="text-sm text-slate-600">CC {cliente.dni}</p>}
      </div>
      {!carga ? <p role="status" className="text-sm text-slate-600">Consultando créditos…</p>
        : 'error' in carga ? (
          <div role="alert" className="space-y-2">
            <p className="text-sm text-rose-700">{carga.error}</p>
            <button type="button" className={boton} onClick={() => { setCarga(null); setConsulta((n) => n + 1) }}>
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        ) : creditos.length === 0 ? <p className="text-sm text-slate-600">Este cliente no tiene créditos activos o en mora con saldo pendiente.</p>
          : confirmacion ? (
            <div role="status" className={confirmacion.pendiente ? 'text-amber-800' : 'text-emerald-800'}>
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18} />
                {confirmacion.pendiente ? 'Pago pendiente de sincronización' : 'Pago registrado'}
              </p>
              <p className="mt-1 break-words text-sm">{credito?.numeroPrestamo} · {formatCurrency(importe)}</p>
              {typeof confirmacion.saldoNuevo === 'number' && Number.isFinite(confirmacion.saldoNuevo) && (
                <p className="mt-1 text-sm">Saldo restante: {formatCurrency(confirmacion.saldoNuevo)}</p>
              )}
            </div>
          ) : (
            <form className="space-y-4" onSubmit={registrar}>
              <label className="block space-y-1 text-sm font-semibold">
                <span>Crédito</span>
                <select value={seleccion} className={campo} required disabled={enviando}
                  onChange={(e) => { setSeleccion(e.target.value); setMonto(''); setErrorPago('') }}>
                  <option value="" disabled>Selecciona el crédito que se va a pagar</option>
                  {creditos.map((c) => <option key={c.id} value={c.id}>{c.numeroPrestamo} · {c.producto} · {formatCurrency(c.montoPendiente)}</option>)}
                </select>
              </label>
              {credito && <dl className="flex flex-wrap justify-between gap-2 border-y border-slate-200 py-3 text-sm">
                <div><dt className="text-slate-600">Ruta</dt><dd className="font-semibold">{credito.rutaNombre}</dd></div>
                <div><dt className="text-slate-600">Saldo pendiente</dt><dd className="font-semibold">{formatCurrency(credito.montoPendiente)}</dd></div>
                <div><dt className="text-slate-600">Destino del efectivo</dt><dd className="font-semibold">Caja de Oficina</dd></div>
              </dl>}
              <label className="block space-y-1 text-sm font-semibold">
                <span>Monto recibido (COP)</span>
                <input className={campo} inputMode="numeric" value={monto} required placeholder="0"
                  disabled={!credito || enviando} onChange={(e) => setMonto(formatCOPInputValue(e.target.value))} />
              </label>
              {credito && importe > credito.montoPendiente && (
                <p role="alert" className="text-sm text-rose-700">El pago no puede superar el saldo pendiente.</p>
              )}
              <label className="block space-y-1 text-sm font-semibold">
                <span>Nota (opcional)</span>
                <textarea className={campo} rows={2} value={notas} disabled={enviando} onChange={(e) => setNotas(e.target.value)} />
              </label>
              {errorPago && <p role="alert" className="text-sm text-rose-700">{errorPago}</p>}
              <button type="submit" className={boton} disabled={!montoValido || enviando}>
                <Banknote size={18} /> {enviando ? 'Registrando…' : 'Registrar pago en efectivo'}
              </button>
            </form>
          )}
    </div>
  )
}

'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, Info, Loader2, X } from 'lucide-react'
import FieldLabel from '@/components/ui/FieldLabel'
import { Selector } from '@/components/ui/Selector'
import Tooltip from '@/components/ui/Tooltip'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import { categoriasPorTipo, mensajeEfectoMovimiento } from '@/lib/contable/categorias-movimiento'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import { BARRA_DE_ARRASTRE, CUERPO_HOJA_MODAL, FONDO_HOJA_MODAL, PANEL_HOJA_MODAL, PIE_HOJA_MODAL } from '@/lib/ui/hoja-modal'
import { cn, formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
import type { Caja, createTransaccion } from '@/services/contabilidad-service'

export type ModoMovimiento = 'EXTERNO' | 'TRANSFERENCIA'

type Props = {
  modoInicial: ModoMovimiento
  cajaInicial: string
  cajas: Pick<Caja, 'id' | 'nombre' | 'saldo'>[]
  onClose: () => void
  onRegistrar: (datos: Parameters<typeof createTransaccion>[0]) => Promise<void>
}

const control = 'min-h-11 w-full rounded-lg'
const segmento = 'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors'
const seleccionado = 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
const disponible = 'text-slate-600 hover:bg-white/70'

export default function RegistrarMovimientoModal({ modoInicial, cajaInicial, cajas, onClose, onRegistrar }: Props) {
  const id = useId()
  const [modo, setModo] = useState(modoInicial)
  const [externo, setExterno] = useState({
    tipo: 'INGRESO' as 'INGRESO' | 'EGRESO', cajaId: cajaInicial, categoria: '', monto: '',
  })
  const [transferencia, setTransferencia] = useState({ origen: '', destino: cajaInicial, monto: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enCurso = useRef(false)
  const cerrar = () => { if (!enCurso.current) onClose() }
  const { contenedorRef, propsDialogo, capa } = useModalDialog({ onClose: cerrar })

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = anterior }
  }, [])

  const esTransferencia = modo === 'TRANSFERENCIA'
  const montoEscrito = esTransferencia ? transferencia.monto : externo.monto
  const monto = parseCOPInputToNumber(montoEscrito)
  const origen = esTransferencia ? cajas.find((c) => c.id === transferencia.origen) : undefined
  const destino = esTransferencia ? cajas.find((c) => c.id === transferencia.destino) : undefined
  const cajaExterna = !esTransferencia ? cajas.find((c) => c.id === externo.cajaId) : undefined
  const cajaQueEntrega = esTransferencia ? origen : externo.tipo === 'EGRESO' ? cajaExterna : undefined
  const fondosInsuficientes = cajaQueEntrega && monto > cajaQueEntrega.saldo
  const categoria = !esTransferencia
    ? categoriasPorTipo(externo.tipo).find((opcion) => opcion.code === externo.categoria)
    : undefined
  const efecto = categoria ? mensajeEfectoMovimiento({
    tipo: externo.tipo, categoriaCode: categoria.code, cajaNombre: cajaExterna?.nombre,
    montoFmt: monto > 0 ? formatCurrency(monto) : undefined,
  }) : null
  const puedeGuardar = Number.isSafeInteger(monto) && monto > 0 && !fondosInsuficientes &&
    (esTransferencia ? !!origen && !!destino && origen.id !== destino.id : !!cajaExterna && !!categoria)
  const accion = esTransferencia ? 'Transferir' : externo.tipo === 'INGRESO' ? 'Registrar ingreso' : 'Registrar egreso'

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current || !puedeGuardar) return
    const datos = esTransferencia && origen && destino
      ? { tipo: 'TRANSFERENCIA' as const, cajaId: destino.id, cajaOrigenId: origen.id,
          tipoReferencia: 'TRANSFERENCIA', descripcion: 'Transferencia entre cajas manual', monto }
      : cajaExterna && categoria
        ? { tipo: externo.tipo, cajaId: cajaExterna.id, tipoReferencia: categoria.code,
            descripcion: 'Movimiento de Caja', monto }
        : null
    if (!datos) return
    enCurso.current = true
    setGuardando(true)
    setError(null)
    try {
      await onRegistrar(datos)
      onClose()
    } catch (error) {
      setError(mensajeDeError(error, 'No se pudo registrar el movimiento.'))
    } finally {
      enCurso.current = false
      setGuardando(false)
    }
  }

  function campoCaja(
    campo: string, etiqueta: string, value: string, cambiar: (valor: string) => void,
    elegida?: Pick<Caja, 'saldo'>, excluir?: string,
  ) {
    const campoId = `${id}-${campo}`
    return (
      <div className="min-w-0">
        <FieldLabel htmlFor={campoId} required>{etiqueta}</FieldLabel>
        <Selector id={campoId} etiqueta={etiqueta} value={value} onChange={cambiar}
          className={control} placeholder="Seleccionar caja" required disabled={guardando}
          opciones={cajas.map((c) => ({ value: c.id, label: c.nombre, disabled: c.id === excluir }))}
        />
        <p className="mt-1.5 min-h-5 text-xs text-slate-600">
          {elegida ? <>Saldo actual: <span className="font-semibold tabular-nums">{formatCurrency(elegida.saldo)}</span></> : null}
        </p>
      </div>
    )
  }

  return createPortal(
    <div className={FONDO_HOJA_MODAL} style={{ zIndex: capa }}>
      <div ref={contenedorRef} {...propsDialogo} aria-labelledby={`${id}-titulo`}
        className={`${PANEL_HOJA_MODAL} max-w-xl`}>
        <div className={BARRA_DE_ARRASTRE} aria-hidden="true" />
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <Banknote size={20} aria-hidden="true" />
          </div>
          <h2 id={`${id}-titulo`} className="min-w-0 flex-1 text-lg font-bold text-slate-900">Registrar movimiento</h2>
          <Tooltip texto="Cerrar">
            <button type="button" aria-label="Cerrar" onClick={cerrar} disabled={guardando}
              className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              <X size={20} aria-hidden="true" />
            </button>
          </Tooltip>
        </header>

        <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
          <div className={`${CUERPO_HOJA_MODAL} space-y-5 overscroll-contain px-4 py-5 sm:px-6`}>
            <div role="group" aria-label="Clase de movimiento" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button type="button" aria-pressed={!esTransferencia} disabled={guardando}
                onClick={() => { setModo('EXTERNO'); setError(null) }}
                className={cn(segmento, !esTransferencia ? seleccionado : disponible)}>
                <Banknote size={16} aria-hidden="true" className="hidden shrink-0 sm:block" /> Externo
              </button>
              <button type="button" aria-pressed={esTransferencia} disabled={guardando}
                onClick={() => { setModo('TRANSFERENCIA'); setError(null) }}
                className={cn(segmento, esTransferencia ? seleccionado : disponible)}>
                <ArrowLeftRight size={16} aria-hidden="true" className="hidden shrink-0 sm:block" /> Entre cajas
              </button>
            </div>

            {esTransferencia ? (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] sm:gap-3">
                {campoCaja('origen', 'Caja origen', transferencia.origen,
                  (valor) => setTransferencia((prev) => ({ ...prev, origen: valor })), origen, transferencia.destino)}
                <div className="flex justify-center sm:pt-7">
                  <Tooltip texto="Intercambiar origen y destino">
                    <button type="button" aria-label="Intercambiar origen y destino" disabled={guardando || (!origen && !destino)}
                      onClick={() => setTransferencia((prev) => ({ ...prev, origen: prev.destino, destino: prev.origen }))}
                      className="grid size-11 place-items-center rounded-lg border border-slate-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40">
                      <ArrowLeftRight size={18} aria-hidden="true" className="rotate-90 sm:rotate-0" />
                    </button>
                  </Tooltip>
                </div>
                {campoCaja('destino', 'Caja destino', transferencia.destino,
                  (valor) => setTransferencia((prev) => ({ ...prev, destino: valor })), destino, transferencia.origen)}
              </div>
            ) : (
              <>
                <div role="group" aria-label="Sentido del movimiento" className="flex flex-wrap gap-2">
                  {([
                    { tipo: 'INGRESO', texto: 'Ingreso', Icono: ArrowDownLeft },
                    { tipo: 'EGRESO', texto: 'Egreso', Icono: ArrowUpRight },
                  ] as const).map(({ tipo, texto, Icono }) => (
                    <button key={tipo} type="button" aria-pressed={externo.tipo === tipo} disabled={guardando}
                      onClick={() => setExterno((prev) => prev.tipo === tipo ? prev : { ...prev, tipo, categoria: '' })}
                      className={cn('flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold',
                        externo.tipo === tipo ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                      <Icono size={16} aria-hidden="true" />{texto}
                    </button>
                  ))}
                </div>
                {campoCaja('externa', externo.tipo === 'INGRESO' ? 'Caja que recibe' : 'Caja que entrega',
                  externo.cajaId, (valor) => setExterno((prev) => ({ ...prev, cajaId: valor })), cajaExterna)}
                <div>
                  <FieldLabel id={`${id}-categoria`} required>
                    ¿Qué tipo de {externo.tipo === 'INGRESO' ? 'entrada' : 'salida'} es?
                  </FieldLabel>
                  <div role="group" aria-labelledby={`${id}-categoria`} className="grid gap-2 sm:grid-cols-2">
                    {categoriasPorTipo(externo.tipo).map((opcion) => {
                      const activa = opcion.code === externo.categoria
                      return (
                        <button key={opcion.code} type="button" aria-pressed={activa} disabled={guardando}
                          onClick={() => setExterno((prev) => ({ ...prev, categoria: opcion.code }))}
                          className={cn('min-w-0 rounded-lg border p-3 text-left',
                            activa ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')}>
                          <span className="block break-words text-sm font-semibold text-slate-900">{opcion.label}</span>
                          <span className="mt-1 block break-words text-xs text-slate-600">{opcion.efecto}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            <div>
              <FieldLabel htmlFor={`${id}-monto`} required>Monto</FieldLabel>
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-slate-600">$</span>
                <input id={`${id}-monto`} type="text" inputMode="numeric" required disabled={guardando}
                  value={montoEscrito} placeholder="0" aria-describedby={`${id}-moneda`}
                  onChange={(evento) => {
                    const valor = formatCOPInputValue(evento.target.value)
                    if (esTransferencia) setTransferencia((prev) => ({ ...prev, monto: valor }))
                    else setExterno((prev) => ({ ...prev, monto: valor }))
                  }}
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-14 text-base font-bold tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <span id={`${id}-moneda`} className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-600">COP</span>
              </div>
            </div>

            {esTransferencia && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                {origen && destino && monto > 0 && !fondosInsuficientes && (
                  <dl className="mb-2 space-y-2 border-b border-slate-200 pb-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <dt className="min-w-0 break-words">{origen.nombre}</dt>
                      <dd className="font-semibold tabular-nums text-rose-700">{formatCurrency(-monto)}</dd>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <dt className="min-w-0 break-words">{destino.nombre}</dt>
                      <dd className="font-semibold tabular-nums text-emerald-700">+{formatCurrency(monto)}</dd>
                    </div>
                  </dl>
                )}
                <p className="flex items-start gap-2 text-xs">
                  <Info size={15} aria-hidden="true" className="shrink-0" /> No afecta los ingresos ni los gastos del negocio.
                </p>
              </div>
            )}
            {efecto && <p className={cn('rounded-lg border px-3 py-3 text-sm', efecto.alerta
              ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700')}>{efecto.texto}</p>}
            {fondosInsuficientes && <p role="alert" className="flex gap-2 text-sm text-rose-700">
              <AlertCircle size={17} aria-hidden="true" className="shrink-0" /> Saldo insuficiente en {cajaQueEntrega.nombre}.
            </p>}
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          </div>
          <footer className={`${PIE_HOJA_MODAL} flex flex-wrap justify-end gap-2`}>
            <button type="button" disabled={guardando} onClick={cerrar}
              className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={!puedeGuardar || guardando}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45">
              {guardando && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
              {guardando ? 'Guardando…' : accion}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}

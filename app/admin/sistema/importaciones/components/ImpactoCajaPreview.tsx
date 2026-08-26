import React from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { ImpactoCaja } from '@/types/importaciones'

const pesos = (valor: number) =>
  valor.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

/**
 * Le dice al usuario, antes de confirmar, qué va a mover esta importación y
 * por qué.
 *
 * Subir el archivo no toca nada: la caja y el inventario solo se afectan al
 * confirmar. Quien aprueba merece ver las cifras antes, no después.
 */
export default function ImpactoCajaPreview({
  impacto,
}: {
  impacto: ImpactoCaja
}) {
  if (!impacto.hayMovimientos) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="font-bold text-slate-800">
              Esta importación no mueve caja ni inventario
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {impacto.creditosHistoricos > 0
                ? `Los ${impacto.creditosHistoricos} crédito(s) del archivo son históricos: ya venían cobrándose, así que solo se registran con sus cuotas. Ese dinero se entregó antes de usar el sistema.`
                : 'No hay créditos que se entreguen al confirmar.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const saldoDespues = impacto.saldoCajaOficina - impacto.totalSalida
  const alerta = impacto.alcanzaElSaldo && impacto.cajaOficinaEncontrada

  return (
    <div
      className={`rounded-2xl border p-5 ${
        alerta ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 h-5 w-5 shrink-0 ${
            alerta ? 'text-amber-500' : 'text-red-500'
          }`}
        />
        <div className="flex-1">
          <p className="font-bold text-slate-900">
            Al confirmar, esta importación moverá dinero
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {impacto.creditosOperativos} crédito(s) marcados como OPERATIVA se
            entregan al confirmar, así que salen de la caja o del inventario.
            {impacto.creditosHistoricos > 0 &&
              ` Los otros ${impacto.creditosHistoricos} son históricos y no mueven nada.`}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sale de {impacto.nombreCaja}
              </p>
              <p className="mt-1 text-xl font-black text-red-600">
                {pesos(impacto.totalSalida)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Desembolso de los créditos de dinero
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Entra por cuotas iniciales
              </p>
              <p className="mt-1 text-xl font-black text-emerald-600">
                {pesos(impacto.totalEntrada)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Lo que el cliente abonó al llevarse el artículo
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sale del inventario
              </p>
              <p className="mt-1 text-xl font-black text-slate-800">
                {impacto.unidadesInventario} unidad(es)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Una por cada crédito de artículo
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
            {!impacto.cajaOficinaEncontrada ? (
              <p className="font-bold text-red-600">
                No se encontró la {impacto.nombreCaja}. Sin ella no se pueden
                desembolsar los créditos operativos.
              </p>
            ) : impacto.alcanzaElSaldo ? (
              <p className="text-slate-700">
                <span className="font-bold">El saldo alcanza.</span>{' '}
                {impacto.nombreCaja} tiene {pesos(impacto.saldoCajaOficina)} y
                quedaría en{' '}
                <span className="font-bold">{pesos(saldoDespues)}</span>.
              </p>
            ) : (
              <p className="text-red-700">
                <span className="font-bold">El saldo no alcanza.</span>{' '}
                {impacto.nombreCaja} tiene {pesos(impacto.saldoCajaOficina)} y
                hacen falta{' '}
                <span className="font-bold">{pesos(impacto.faltante)}</span>. La
                confirmación se detendría sin importar nada.
              </p>
            )}
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">
              Ver el detalle fila por fila ({impacto.movimientos.length})
            </summary>
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-bold">Fila</th>
                    <th className="px-3 py-2 font-bold">Crédito</th>
                    <th className="px-3 py-2 font-bold">Qué pasa y por qué</th>
                    <th className="px-3 py-2 text-right font-bold">Sale</th>
                    <th className="px-3 py-2 text-right font-bold">Entra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {impacto.movimientos.map((m, i) => (
                    <tr key={`${m.fila}-${i}`}>
                      <td className="px-3 py-2 font-medium text-slate-500">
                        {m.fila}
                        {m.hoja && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            {m.hoja}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {m.numeroPrestamo || m.ccCliente || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        <span className="font-medium text-slate-800">
                          {m.concepto}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {m.porque}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">
                        {m.salidaEfectivo > 0 ? pesos(m.salidaEfectivo) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">
                        {m.entradaEfectivo > 0 ? pesos(m.entradaEfectivo) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

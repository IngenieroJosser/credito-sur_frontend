import { useId, useState, type FormEvent } from 'react';
import { Calculator } from 'lucide-react';
import { Selector } from '@/components/ui/Selector';
import { mensajeDeError } from '@/lib/mensaje-de-error';
import { formatCurrency } from '@/lib/utils';
import { importacionesService } from '@/services/importaciones-service';
import type { CreditoHistoricoDePrueba, SimulacionHistorica } from '@/types/importaciones-historicas';

export function SimularAbonoHistorico({ expedienteId }: { expedienteId: string }) {
  const montoId = useId();
  const [creditos, setCreditos] = useState<CreditoHistoricoDePrueba[] | null>(null);
  const [creditoId, setCreditoId] = useState('');
  const [monto, setMonto] = useState('');
  const [simulacion, setSimulacion] = useState<SimulacionHistorica | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const credito = creditos?.find(c => c.id === creditoId);
  const pesos = Number(monto);
  const valido = !!credito && Number.isSafeInteger(pesos) && pesos > 0 && pesos <= credito.saldoPendiente;

  async function consultar() {
    setError('');
    setOcupado(true);
    try {
      setCreditos(await importacionesService.listarCreditosHistoricosDePrueba(expedienteId));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron consultar los créditos de prueba.'));
    } finally {
      setOcupado(false);
    }
  }

  async function simular(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valido || ocupado) return;
    setError('');
    setSimulacion(null);
    setOcupado(true);
    try {
      setSimulacion(await importacionesService.simularAbonoHistorico(expedienteId, creditoId, pesos));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo simular el abono.'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-label="Simulación de abonos" className="mt-4 min-w-0 border-t border-slate-200 pt-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Calculator size={16} className="text-teal-700" aria-hidden="true" /> Simulación de abonos
      </h3>
      {creditos === null ? (
        <button type="button" disabled={ocupado} onClick={() => void consultar()}
          className="min-h-10 rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-950">
          {ocupado ? 'Cargando créditos…' : 'Consultar créditos de prueba'}
        </button>
      ) : creditos.length ? (
        <form onSubmit={simular} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            <span>Crédito de prueba</span>
            <Selector etiqueta="Crédito de prueba" value={creditoId} disabled={ocupado}
              onChange={id => { setCreditoId(id); setSimulacion(null); setError(''); setMonto(''); }}
              opciones={creditos.map(c => ({ value: c.id, label: `${c.numeroPrestamo} · ${c.tipoPrestamo === 'ARTICULO' ? 'Artículo' : 'Efectivo'}` }))} />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            <label htmlFor={montoId}>Monto en COP</label>
            <input id={montoId} type="number" min={1} max={credito?.saldoPendiente} step={1}
              value={monto} disabled={!credito || ocupado}
              onChange={e => { setMonto(e.target.value); setSimulacion(null); setError(''); }}
              className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 px-3" />
          </div>
          <button type="submit" disabled={!valido || ocupado}
            className="min-h-10 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50">
            Proyectar abono
          </button>
          {credito && <p className="text-sm text-slate-600 sm:col-span-3">Saldo de prueba: {formatCurrency(credito.saldoPendiente)}</p>}
        </form>
      ) : <p className="text-sm text-slate-600">Este expediente no tiene créditos de prueba.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      {simulacion && (
        <div role="status" className="mt-3 rounded-md bg-teal-50 p-3 text-sm text-teal-950">
          <strong>Saldo proyectado: {formatCurrency(simulacion.saldoProyectado)}</strong>
          <p>Capital: {formatCurrency(simulacion.capital)} · Interés: {formatCurrency(simulacion.interes)} · Cuotas afectadas: {simulacion.cuotasAfectadas}</p>
          <p>No se registró un pago ni un movimiento de caja.</p>
        </div>
      )}
    </section>
  );
}

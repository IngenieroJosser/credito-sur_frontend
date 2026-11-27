import { useState, type FormEvent } from 'react';
import { ChevronRight, Download, FileCheck2, FolderOpen, Loader2 } from 'lucide-react';
import { archivoDecisiones, type DecisionesHistoricas, type ExpedienteHistorico, type RevisionHistoricaResultado } from '@/types/importaciones-historicas';
import { RevisionHistorica } from './RevisionHistorica';
import { SimularAbonoHistorico } from './SimularAbonoHistorico';
import { Selector } from '@/components/ui/Selector';
import { importacionesService } from '@/services/importaciones-service';
import { mensajeDeError } from '@/lib/mensaje-de-error';

const CAMPOS = [
  { clave: 'cartera', etiqueta: 'Archivo de cartera', accept: '.xlsx', obligatorio: true },
  { clave: 'inventario', etiqueta: 'Archivo de inventario', accept: '.xlsx', obligatorio: true },
  { clave: 'decisiones', etiqueta: 'JSON de respaldo para exportar (opcional)', accept: '.json', obligatorio: false },
] as const;

export function PreparacionHistoricaCard({ alConfirmar }: { alConfirmar: () => void }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [lista, setLista] = useState(false);
  const [revision, setRevision] = useState<RevisionHistoricaResultado | null>(null);
  const [borrador, setBorrador] = useState<DecisionesHistoricas | null>(null);
  const [expedientes, setExpedientes] = useState<ExpedienteHistorico[] | null>(null);
  const [seleccion, setSeleccion] = useState('');
  const [integral, setIntegral] = useState(false);
  const [evidencia, setEvidencia] = useState('');
  const [confirmada, setConfirmada] = useState(false);

  const limpiarRevision = () => {
    setRevision(null);
    setBorrador(null);
    setError('');
    setLista(false);
    setEvidencia('');
    setConfirmada(false);
  };

  const procesarRevision = async (solicitar: () => Promise<RevisionHistoricaResultado>) => {
    setError('');
    setProcesando(true);
    try {
      const resultado = await solicitar();
      setRevision(resultado);
      setBorrador(resultado.decisiones);
      setLista(false);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo evaluar la cartera.'));
    } finally {
      setProcesando(false);
    }
  };

  const consultarExpedientes = async () => {
    setError('');
    setProcesando(true);
    try {
      setExpedientes(await importacionesService.listarExpedientesHistoricos());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar los expedientes.'));
    } finally {
      setProcesando(false);
    }
  };

  const descargarExpediente = async (id: string) => {
    setError('');
    setProcesando(true);
    try {
      await importacionesService.descargarExpedienteHistorico(id);
      setLista(true);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo descargar el expediente.'));
    } finally {
      setProcesando(false);
    }
  };

  const preparar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setLista(false);
    const archivos = new FormData(evento.currentTarget);
    const decisiones = archivos.get('decisiones');
    if (decisiones instanceof File && !decisiones.name) archivos.delete('decisiones');
    const boton = (evento.nativeEvent as SubmitEvent).submitter;
    if (integral || boton?.getAttribute('value') === 'revisar') {
      await procesarRevision(() => importacionesService.revisarHistoricos(archivos));
      return;
    }
    if (revision && borrador !== revision.decisiones) {
      setError('Registra y reevalúa las decisiones del borrador antes de descargar.');
      return;
    }
    if (revision) {
      await descargarExpediente(revision.expediente.id);
      return;
    }
    setProcesando(true);
    try {
      await importacionesService.prepararHistoricos(archivos);
      setLista(true);
    } catch (error) {
      setError(mensajeDeError(error, 'No se pudo preparar el consolidado.'));
    } finally {
      setProcesando(false);
    }
  };

  const confirmar = async () => {
    const seleccion = revision?.vistaIntegral?.seleccion;
    if (!revision || !seleccion || procesando || borrador !== revision.decisiones || evidencia.trim().length < 5) return;
    await procesarRevision(async () => {
      await importacionesService.confirmarIntegralDePrueba(revision.expediente.id, revision.expediente.revision, seleccion, evidencia.trim());
      setConfirmada(true);
      alConfirmar();
      return importacionesService.abrirExpedienteHistorico(revision.expediente.id);
    });
  };

  const vista = revision?.vistaIntegral;

  return (
    <section aria-labelledby="preparacion-historica" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="preparacion-historica" className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FileCheck2 size={18} className="text-teal-700" aria-hidden="true" />
          Preparación histórica
        </h2>
        <span className="rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">Sin cobranza</span>
      </div>
      <form onSubmit={preparar} aria-busy={procesando}>
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={integral} disabled={procesando} onChange={e => {
            setIntegral(e.target.checked);
            limpiarRevision();
          }} /> Usar un libro integral histórico
        </label>
        <fieldset disabled={procesando} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(integral ? [{ clave: 'integral', etiqueta: 'Libro integral histórico', accept: '.xlsx', obligatorio: true }] : CAMPOS)
            .map(({ clave, etiqueta, accept, obligatorio }) => (
            <label className="grid min-w-0 grid-cols-1 gap-2 text-sm font-semibold text-slate-700" key={clave}>
              <span>{etiqueta}</span>
              <input name={clave} type="file" accept={accept} required={obligatorio} onChange={limpiarRevision}
                className="w-full min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold file:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600" />
            </label>
          ))}
        </fieldset>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" value="revisar" disabled={procesando} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 disabled:opacity-60">
            <FileCheck2 size={16} aria-hidden="true" /> {integral ? 'Validar libro' : 'Revisar archivos'}
          </button>
          {!integral && <button type="submit" value="descargar" disabled={procesando} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
            {procesando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
            {procesando ? 'Preparando…' : 'Descargar consolidado'}
          </button>}
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          {lista && <p role="status" className="text-sm text-emerald-800">Consolidado descargado. No se registró una importación.</p>}
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
        <button type="button" disabled={procesando} onClick={() => void consultarExpedientes()}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold">
          <FolderOpen size={16} aria-hidden="true" /> Expedientes guardados
        </button>
        {expedientes && (expedientes.length ? (
          <>
            <div className="grid w-full min-w-0 grid-cols-1 gap-1 text-sm sm:max-w-80">
              <span>Expediente</span>
              <Selector etiqueta="Expediente" value={seleccion} onChange={setSeleccion} disabled={procesando}
                opciones={expedientes.map(e => ({ value: e.id, label:
                  `${e.huellaCartera.slice(0, 10)} · Revisión ${e.revision} · ${new Date(e.actualizadoEn).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`,
                }))} />
            </div>
            <button type="button" disabled={procesando || !seleccion}
              onClick={() => void procesarRevision(() => importacionesService.abrirExpedienteHistorico(seleccion))}
              className="min-h-10 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50">Abrir expediente</button>
          </>
        ) : <p className="text-sm text-slate-600">No hay expedientes guardados.</p>)}
      </div>
      {revision && borrador && (
        <>
          <p className="mt-4 text-sm text-slate-600">Expediente {revision.expediente.huellaCartera.slice(0, 10)} · Revisión {revision.expediente.revision}</p>
          {confirmada && <p role="status" className="mt-2 text-sm font-semibold text-teal-800">Carga de prueba confirmada. No se habilitó la cobranza.</p>}
          {vista && (
            <section aria-label="Vista previa del libro integral" className="mt-4 min-w-0 space-y-3 border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900">Vista previa del libro integral</h3>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                {([['Artículos', vista.conteos.inventario], ['Clientes', vista.conteos.clientes], ['Créditos de dinero', vista.conteos.dinero], ['Créditos de artículo', vista.conteos.articulos]] as const)
                  .map(([nombre, total]) => <div key={nombre}><dt>{nombre}</dt><dd className="font-semibold tabular-nums">{total}</dd></div>)}
              </dl>
              <p className="text-sm text-slate-700">{vista.totalErrores} errores · {vista.totalAdvertencias} advertencias · {vista.filasPorResolver} filas por resolver</p>
              {!vista.cuadre && <p role="alert" className="text-sm text-rose-700">La lectura histórica y la validación del libro no coinciden.</p>}
              {([['Errores', vista.errores], ['Advertencias', vista.advertencias]] as const).map(([titulo, avisos]) => avisos.length > 0 && (
                <details key={titulo} className="group text-sm">
                  <summary className="flex cursor-pointer items-center gap-1 font-semibold">
                    <ChevronRight aria-hidden="true" size={16} className="transition-transform group-open:rotate-90" />
                    {titulo} (primeros {avisos.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-slate-700">
                    {avisos.map(({ hoja, fila, campo, mensaje }, i) => <li key={i}>{hoja} · Fila {fila} · {campo}: {mensaje}</li>)}
                  </ul>
                </details>
              ))}
              {vista.seleccion && (
                <div className="flex flex-wrap items-end gap-3 rounded-md bg-teal-50 p-3">
                  <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold">
                    Evidencia de autorización de prueba
                    <input type="text" value={evidencia} maxLength={500} onChange={e => setEvidencia(e.target.value)}
                      className="min-h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 font-normal" />
                  </label>
                  <button type="button" onClick={() => void confirmar()} disabled={procesando || evidencia.trim().length < 5 || borrador !== revision.decisiones}
                    className="min-h-10 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50">Confirmar carga de prueba</button>
                </div>
              )}
            </section>
          )}
          {revision.expediente.estado === 'IMPORTADO' &&
            <SimularAbonoHistorico key={revision.expediente.id} expedienteId={revision.expediente.id} />}
          <RevisionHistorica key={revision.expediente.id} resultado={revision} decisiones={borrador} cambiar={setBorrador}
            ocupado={procesando || revision.expediente.estado !== 'EN_REVISION'}
            guardar={() => void procesarRevision(() => importacionesService.guardarRevisionHistorica(
              revision.expediente.id, revision.expediente.revision, borrador,
            ))} />
          <button type="button" disabled={procesando || borrador !== revision.decisiones}
            onClick={() => void descargarExpediente(revision.expediente.id)}
            className="mt-3 mr-2 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">
            <Download size={16} aria-hidden="true" /> Descargar expediente
          </button>
          {revision.decisiones.aprobadasEn && (
            <button type="button" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
              onClick={() => {
                const url = URL.createObjectURL(archivoDecisiones(revision.decisiones));
                const link = document.createElement('a');
                link.href = url;
                link.download = 'decisiones-historicas.json';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>
              <Download size={16} aria-hidden="true" /> Descargar decisiones registradas
            </button>
          )}
        </>
      )}
    </section>
  );
}

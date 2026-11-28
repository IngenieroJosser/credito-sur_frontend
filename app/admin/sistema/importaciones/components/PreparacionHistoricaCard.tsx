'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Download, FileCheck2, FolderOpen, Loader2, UploadCloud, XCircle } from 'lucide-react';
import type { DecisionesHistoricas, ExpedienteHistorico, RevisionHistoricaResultado, ValidacionLibroIntegral } from '@/types/importaciones-historicas';
import { archivoDecisiones } from '@/types/importaciones-historicas';
import { RevisionHistorica } from './RevisionHistorica';
import { SimularAbonoHistorico } from './SimularAbonoHistorico';
import { ArchivoValidadorCard } from './ArchivoValidadorCard';
import { Selector } from '@/components/ui/Selector';
import { importacionesService } from '@/services/importaciones-service';
import { mensajeDeError } from '@/lib/mensaje-de-error';
import { formatCurrency } from '@/lib/utils';
import { useModalDialog } from '@/hooks/use-modal-dialog';

/**
 * El camino normal de la importación: descargar la plantilla, llenarla,
 * arrastrarla aquí y confirmar.
 *
 * Antes esta pantalla pedía archivos por módulo, un JSON de decisiones y un
 * «modo», y el libro integral se subía por un input pelado aparte. Ahora hay una
 * sola zona de arrastre para el libro integral. Lo técnico —expedientes
 * guardados, revisión caso a caso, simulación de abonos— sigue existiendo, pero
 * dentro de «Herramientas técnicas», sin estorbar el camino de quien solo quiere
 * cargar.
 *
 * La detección de qué trae el libro y los guardas de permiso/entorno viven en el
 * servidor: aquí no se inventa atomicidad ni se eleva a nadie de rol.
 */
export function PreparacionHistoricaCard({ alConfirmar }: { alConfirmar: () => void }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState<RevisionHistoricaResultado | null>(null);
  const [cargaOperativa, setCargaOperativa] = useState<{
    archivo: File;
    vista: Extract<ValidacionLibroIntegral, { operativa: unknown }>['operativa'];
  } | null>(null);
  const [evidencia, setEvidencia] = useState('');
  const [confirmada, setConfirmada] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const cerrarModal = () => { if (!procesando) setModalAbierto(false); };
  const { contenedorRef, propsDialogo } = useModalDialog({ abierto: modalAbierto, onClose: cerrarModal });

  // Herramientas técnicas (no obligatorias para cargar).
  const [expedientes, setExpedientes] = useState<ExpedienteHistorico[] | null>(null);
  const [seleccionExpediente, setSeleccionExpediente] = useState('');
  const [revisionTecnica, setRevisionTecnica] = useState<RevisionHistoricaResultado | null>(null);
  const [borradorTecnico, setBorradorTecnico] = useState<DecisionesHistoricas | null>(null);

  const limpiarRevision = () => {
    setRevision(null);
    setCargaOperativa(null);
    setError('');
    setEvidencia('');
    setConfirmada(false);
    setModalAbierto(false);
  };

  /**
   * Al elegir (o quitar) un archivo se descarta la validación anterior. No se
   * valida aquí: eso lo hace el botón «Validar archivo», para no arrancar dos
   * veces la misma lectura ni procesar un archivo por accidente al soltarlo.
   */
  const manejarCambioArchivo = () => {
    limpiarRevision();
  };

  const validarLibro = async (archivo: File) => {
    setError('');
    setProcesando(true);
    try {
      const resultado = await importacionesService.validarLibroIntegral(archivo);
      if ('operativa' in resultado) {
        setCargaOperativa({ archivo, vista: resultado.operativa });
        setRevision(null);
      } else {
        setCargaOperativa(null);
        setRevision(resultado);
      }
      setConfirmada(false);
      setModalAbierto(true);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo leer el libro. Revisa que sea la plantilla oficial ya llena.'));
    } finally {
      setProcesando(false);
    }
  };

  const abrirExpedientes = async () => {
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

  const abrirExpedienteTecnico = async (id: string) => {
    setError('');
    setProcesando(true);
    try {
      const resultado = await importacionesService.abrirExpedienteHistorico(id);
      setRevisionTecnica(resultado);
      setBorradorTecnico(resultado.decisiones);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo abrir el expediente.'));
    } finally {
      setProcesando(false);
    }
  };

  const descargarConsolidadoTecnico = async (id: string) => {
    setError('');
    setProcesando(true);
    try {
      await importacionesService.descargarExpedienteHistorico(id);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo descargar el expediente.'));
    } finally {
      setProcesando(false);
    }
  };

  const confirmar = async () => {
    const seleccion = revision?.vistaIntegral?.seleccion;
    if (procesando) return;
    setError('');
    setProcesando(true);
    try {
      if (cargaOperativa?.vista.confirmable) {
        await importacionesService.confirmarLibroOperativo(cargaOperativa.archivo);
      } else if (revision && seleccion && evidencia.trim().length >= 5) {
        await importacionesService.confirmarIntegralDePrueba(
          revision.expediente.id, revision.expediente.revision, seleccion, evidencia.trim(),
        );
      } else return;
      setConfirmada(true);
      setModalAbierto(false);
      alConfirmar();
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo confirmar la carga.'));
    } finally {
      setProcesando(false);
    }
  };

  const vista = cargaOperativa?.vista ?? revision?.vistaIntegral;
  const impacto = cargaOperativa?.vista.impactoCaja;
  const hayErrores = (vista?.totalErrores ?? 0) > 0;
  const puedeConfirmar = cargaOperativa?.vista.confirmable ??
    (Boolean(revision?.vistaIntegral?.seleccion) && Boolean(vista?.cuadre) && !hayErrores && vista?.filasPorResolver === 0);

  const modal = modalAbierto && (revision || cargaOperativa) && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 capa-modal flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
      onClick={cerrarModal}
    >
      <div
        ref={contenedorRef}
        {...propsDialogo}
        aria-labelledby="titulo-importacion-integral"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p id="titulo-importacion-integral" className="text-xs font-bold uppercase tracking-wider text-slate-500">Vista previa de la importación</p>
              <h2 className="truncate text-xl font-bold text-slate-900">Libro integral</h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={cerrarModal}
            disabled={procesando}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {vista ? (
            <>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  ['Artículos', vista.conteos.inventario],
                  ['Clientes', vista.conteos.clientes],
                  ['Créditos de dinero', vista.conteos.dinero],
                  ['Créditos de artículo', vista.conteos.articulos],
                ] as const).map(([nombre, total]) => (
                  <div key={nombre} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                    <dd className="text-3xl font-black text-slate-700 tabular-nums">{total}</dd>
                    <dt className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{nombre}</dt>
                  </div>
                ))}
              </dl>

              <p className="text-sm text-slate-700">
                {vista.totalErrores} errores · {vista.totalAdvertencias} advertencias{!cargaOperativa && ` · ${vista.filasPorResolver} filas por resolver`}
              </p>

              {impacto?.hayMovimientos && (
                <dl className="flex flex-wrap gap-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                  {impacto.totalSalida > 0 && <div><dt>Desembolsos de caja</dt><dd className="font-bold">{formatCurrency(impacto.totalSalida)}</dd></div>}
                  {impacto.totalEntrada > 0 && <div><dt>Cuotas iniciales</dt><dd className="font-bold">{formatCurrency(impacto.totalEntrada)}</dd></div>}
                  {impacto.unidadesInventario > 0 && <div><dt>Unidades por entregar</dt><dd className="font-bold">{impacto.unidadesInventario}</dd></div>}
                </dl>
              )}
              {!vista.cuadre && (
                <p role="alert" className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  Lo que se leyó del libro y lo que se validó no coinciden en número de filas. No se puede confirmar así.
                </p>
              )}

              {hayErrores ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  Corrige los errores del archivo y vuelve a subirlo. Con errores no se habilita la confirmación.
                </div>
              ) : puedeConfirmar ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900">Listo para confirmar</p>
                  <p className="text-sm font-medium text-emerald-700">
                    {cargaOperativa ? 'Al confirmar se aplican los cambios del archivo.' : 'Los créditos históricos quedarán en borrador, sin cobranza.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                  El libro quedó validado, pero este entorno no habilita la carga de prueba (requiere Super Administrador
                  y un entorno aislado).
                </div>
              )}

              {([
                ['Errores', vista.errores],
                ['Advertencias', vista.advertencias],
              ] as const).map(([titulo, avisos]) => avisos.length > 0 && (
                <details key={titulo} className="group rounded-xl border border-slate-100 bg-white">
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-slate-800">
                    <ChevronRight aria-hidden="true" size={16} className="transition-transform group-open:rotate-90" />
                    {titulo} (primeros {avisos.length})
                  </summary>
                  <ul className="space-y-1 border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
                    {avisos.map(({ hoja, fila, campo, mensaje }, i) => (
                      <li key={i}>{hoja} · Fila {fila} · {campo}: {mensaje}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
              El libro se registró para revisión. Resuelve los casos pendientes y vuelve a validar antes de confirmar.
            </div>
          )}

          {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          {puedeConfirmar && (
            <>
              {!cargaOperativa && <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold text-slate-700">
                Evidencia de autorización de prueba
                <input
                  type="text"
                  value={evidencia}
                  maxLength={500}
                  onChange={(e) => setEvidencia(e.target.value)}
                  className="min-h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 font-normal"
                />
              </label>}
              <button
                type="button"
                onClick={() => void confirmar()}
                disabled={procesando || (!cargaOperativa && evidencia.trim().length < 5)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {procesando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <FileCheck2 size={16} aria-hidden="true" />}
                {procesando ? 'Confirmando…' : 'Confirmar carga'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={cerrarModal}
            disabled={procesando}
            className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <section aria-labelledby="importacion-integral" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="importacion-integral" className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FileCheck2 size={18} className="text-teal-700" aria-hidden="true" />
          Importación integral
        </h2>
      </div>

      <ArchivoValidadorCard
        title="Sube tu libro integral"
        subtitle="La plantilla oficial, ya llena"
        maxSizeMB={8}
        loading={procesando}
        onValidate={validarLibro}
        onFileChange={manejarCambioArchivo}
        icon={<UploadCloud className="h-6 w-6" />}
        surface="plain"
      />

      {error && !modalAbierto && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {confirmada && (
        <p role="status" className="mt-3 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm font-semibold text-teal-800">
          {cargaOperativa ? 'Importación confirmada.' : 'Carga de prueba confirmada. No se habilitó la cobranza histórica.'}
        </p>
      )}

      {(revision || cargaOperativa) && !confirmada && !modalAbierto && (
        <button type="button" className="mt-4 text-sm font-semibold text-teal-800 underline" onClick={() => setModalAbierto(true)}>
          Ver resultado de validación
        </button>
      )}

      {/* Las herramientas técnicas ya no son pasos obligatorios: viven aquí,
          plegadas, para no interrumpir el camino de cargar. */}
      <details className="group mt-4 border-t border-slate-100 pt-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
          <ChevronRight aria-hidden="true" size={16} className="transition-transform group-open:rotate-90" />
          Herramientas técnicas
        </summary>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              disabled={procesando}
              onClick={() => void abrirExpedientes()}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold"
            >
              <FolderOpen size={16} aria-hidden="true" /> Expedientes guardados
            </button>
            {expedientes && (expedientes.length ? (
              <>
                <div className="grid w-full min-w-0 grid-cols-1 gap-1 text-sm sm:max-w-80">
                  <span>Expediente</span>
                  <Selector
                    etiqueta="Expediente"
                    value={seleccionExpediente}
                    onChange={setSeleccionExpediente}
                    disabled={procesando}
                    opciones={expedientes.map(e => ({
                      value: e.id,
                      label: `${e.huellaCartera.slice(0, 10)} · Revisión ${e.revision} · ${new Date(e.actualizadoEn).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`,
                    }))}
                  />
                </div>
                <button
                  type="button"
                  disabled={procesando || !seleccionExpediente}
                  onClick={() => void abrirExpedienteTecnico(seleccionExpediente)}
                  className="min-h-10 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Abrir expediente
                </button>
                <button
                  type="button"
                  disabled={procesando || !seleccionExpediente}
                  onClick={() => void descargarConsolidadoTecnico(seleccionExpediente)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50"
                >
                  <Download size={16} aria-hidden="true" /> Descargar expediente
                </button>
              </>
            ) : <p className="text-sm text-slate-600">No hay expedientes guardados.</p>)}
          </div>

          {revisionTecnica && borradorTecnico && (
            <>
              <p className="text-sm text-slate-600">
                Expediente {revisionTecnica.expediente.huellaCartera.slice(0, 10)} · Revisión {revisionTecnica.expediente.revision}
              </p>
              <RevisionHistorica
                key={revisionTecnica.expediente.id}
                resultado={revisionTecnica}
                decisiones={borradorTecnico}
                cambiar={setBorradorTecnico}
                ocupado={procesando || revisionTecnica.expediente.estado !== 'EN_REVISION'}
                guardar={() => void (async () => {
                  try {
                    const r = await importacionesService.guardarRevisionHistorica(
                      revisionTecnica.expediente.id, revisionTecnica.expediente.revision, borradorTecnico,
                    );
                    setRevisionTecnica(r);
                    setBorradorTecnico(r.decisiones);
                  } catch (e) {
                    setError(mensajeDeError(e, 'No se pudieron guardar las decisiones.'));
                  }
                })()}
              />
              {revisionTecnica.expediente.estado === 'IMPORTADO' && (
                <SimularAbonoHistorico key={revisionTecnica.expediente.id} expedienteId={revisionTecnica.expediente.id} />
              )}
              {revisionTecnica.decisiones.aprobadasEn && (
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    const url = URL.createObjectURL(archivoDecisiones(revisionTecnica.decisiones));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'decisiones-historicas.json';
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  <Download size={16} aria-hidden="true" /> Descargar decisiones registradas
                </button>
              )}
            </>
          )}
        </div>
      </details>

      {modal}
    </section>
  );
}

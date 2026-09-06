'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, History, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { importacionesService } from '@/services/importaciones-service';
import { LoteImportacion } from '@/types/importaciones';
import RevisarLoteModal from './RevisarLoteModal';
import Paginador from '@/components/ui/Paginador';

const LOTES_POR_PAGINA = 5;

const formatearFecha = (valor: string | null) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ETIQUETA_TIPO: Record<string, string> = {
  CLIENTES_CREDITOS: 'Clientes y créditos',
  INVENTARIO: 'Inventario',
};

const ESTILO_ESTADO: Record<string, string> = {
  CONFIRMADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FALLIDO: 'bg-red-50 text-red-700 border-red-200',
  CANCELADO: 'bg-slate-100 text-slate-600 border-slate-200',
  VALIDADO: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const HistorialLotesCard: React.FC<{ recargar?: number }> = ({ recargar }) => {
  const [lotes, setLotes] = useState<LoteImportacion[]>([]);
  const [cargando, setCargando] = useState(true);
  // El lote que se está revisando. Deshacer ya no es un botón que borra: abre
  // la pantalla donde se ve qué se va a deshacer y se eligen los créditos.
  const [revisando, setRevisando] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setLotes(await importacionesService.listarLotes());
    } catch {
      // El historial es informativo: si falla no bloquea la importación.
      setLotes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, recargar]);

  // Al recargar (nueva importación confirmada) el más reciente queda primero:
  // se vuelve a la página 1 para que se vea sin tener que navegar hacia atrás.
  useEffect(() => {
    setPagina(1);
  }, [recargar]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(lotes.length / LOTES_POR_PAGINA),
  );
  const paginaSegura = Math.min(pagina, totalPaginas);
  const lotesPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * LOTES_POR_PAGINA;
    return lotes.slice(inicio, inicio + LOTES_POR_PAGINA);
  }, [lotes, paginaSegura]);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Importaciones recientes
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Antes de deshacer se puede revisar qué creó cada una y elegir
              créditos concretos. Los que ya recibieron pagos quedan
              bloqueados.
            </p>
          </div>
        </div>

        {cargando && (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial…
          </div>
        )}

        {!cargando && lotes.length === 0 && (
          <p className="py-6 text-center text-sm font-medium text-slate-400">
            Todavía no se ha confirmado ninguna importación.
          </p>
        )}

        {!cargando && lotes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3 font-bold">Archivo</th>
                  <th className="pb-2 pr-3 font-bold">Tipo</th>
                  <th className="pb-2 pr-3 font-bold">Fecha</th>
                  <th className="pb-2 pr-3 font-bold">Creó</th>
                  <th className="pb-2 pr-3 font-bold">Estado</th>
                  <th className="pb-2 font-bold" />
                </tr>
              </thead>
              <tbody>
                {lotesPagina.map((lote) => (
                  <tr key={lote.id} className="border-b border-slate-100 last:border-0">
                    <td className="max-w-[220px] py-3 pr-3">
                      <p className="truncate font-semibold text-slate-800">
                        {lote.nombreArchivo}
                      </p>
                      <p className="text-xs text-slate-400">
                        {lote.creadoPor || 'Usuario desconocido'}
                      </p>
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      {ETIQUETA_TIPO[lote.tipo] || lote.tipo}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      {formatearFecha(lote.confirmadoEn || lote.creadoEn)}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      {lote.tipo === 'CLIENTES_CREDITOS' && lote.clientesCreados !== null
                        ? `${lote.clientesCreados} cliente(s) · ${lote.prestamosCreados} crédito(s)`
                        : lote.tipo === 'INVENTARIO' && lote.articulosCreados !== null
                        ? `${lote.articulosCreados} artículo(s) · ${lote.preciosCreados} precio(s)`
                        : '—'}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                          ESTILO_ESTADO[lote.estado] ||
                          'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lote.estado}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {lote.sePuedeDeshacer ? (
                        <button
                          type="button"
                          onClick={() => setRevisando(lote.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Revisar y deshacer
                        </button>
                      ) : (
                        <span
                          title={lote.razonNoSePuedeDeshacer || ''}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          No reversible
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Paginador
              pagina={paginaSegura}
              totalPaginas={totalPaginas}
              onCambiar={setPagina}
              resumen={`${lotes.length} importación(es)`}
            />
          </div>
        )}
      </section>

      {revisando && (
        <RevisarLoteModal
          loteId={revisando}
          onCerrar={() => setRevisando(null)}
          onDeshecho={() => void cargar()}
        />
      )}
    </>
  );
};

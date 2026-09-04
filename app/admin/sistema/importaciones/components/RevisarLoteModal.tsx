'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Package,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { importacionesService } from '@/services/importaciones-service';
import { CreditoDeLote, DetalleLoteImportacion } from '@/types/importaciones';
import { formatCurrency } from '@/lib/utils';
import Portal from '@/components/ui/Portal';
import { Cargando } from '@/components/ui/PantallaCarga';

/**
 * Revisar antes de deshacer.
 *
 * Deshacer una importación devuelve plata a la caja, artículos a la bodega y
 * borra créditos de clientes reales. Hasta ahora la única información
 * disponible antes de hacerlo era "12 créditos": con eso nadie puede decidir
 * si son los 12 que se cargaron mal.
 *
 * Aquí se ve cada crédito con su cliente, su monto y lo que la caja
 * recuperaría, se eligen los que van, y el total a devolver se calcula sobre
 * la selección antes de confirmar.
 */

const formatearFecha = (valor: string | null) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

interface Props {
  loteId: string;
  onCerrar: () => void;
  onDeshecho: () => void;
}

export const RevisarLoteModal: React.FC<Props> = ({
  loteId,
  onCerrar,
  onDeshecho,
}) => {
  const [detalle, setDetalle] = useState<DetalleLoteImportacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [deshaciendo, setDeshaciendo] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      try {
        const d = await importacionesService.detalleLote(loteId);
        if (!vivo) return;
        setDetalle(d);
        // Nada viene marcado: elegir qué deshacer es del usuario, no del
        // sistema. Marcar todo por defecto invita a confirmar sin mirar.
        setSeleccion(new Set());
      } catch (e: any) {
        if (vivo) setError(e?.message || 'No se pudo cargar la importación.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [loteId]);

  const deshacibles = useMemo(
    () => detalle?.creditos.filter((c) => c.sePuedeDeshacer) ?? [],
    [detalle],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const todos = detalle?.creditos ?? [];
    if (!q) return todos;
    return todos.filter((c) =>
      [c.cliente, c.cedula, c.numeroPrestamo, c.articulo ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [detalle, busqueda]);

  const elegidos = useMemo(
    () => deshacibles.filter((c) => seleccion.has(c.id)),
    [deshacibles, seleccion],
  );

  // El impacto se calcula sobre lo elegido, no sobre el lote entero: es lo que
  // va a pasar de verdad al confirmar.
  //
  // Y no solo qué cambia, sino en cuánto queda. "Vuelven $800.000 a la caja"
  // no le dice a nadie si el resultado tiene sentido; "de $2.400.000 pasa a
  // $3.200.000" sí, porque se compara contra lo que uno espera tener.
  const impacto = useMemo(() => {
    const caja = elegidos.reduce((s, c) => s + c.devolucionACaja, 0);
    const saldoAhora = detalle?.estadoActual.caja.saldo ?? 0;

    // Cuántas unidades vuelven a cada artículo.
    const porArticulo = new Map<string, number>();
    elegidos.forEach((c) => {
      if (!c.articuloCodigo) return;
      porArticulo.set(
        c.articuloCodigo,
        (porArticulo.get(c.articuloCodigo) ?? 0) + 1,
      );
    });

    const articulos = (detalle?.estadoActual.articulos ?? [])
      .map((a) => ({
        ...a,
        devuelve: porArticulo.get(a.codigo) ?? 0,
      }))
      .filter((a) => a.devuelve > 0);

    return {
      creditos: elegidos.length,
      caja,
      cajaAhora: saldoAhora,
      cajaDespues: saldoAhora + caja,
      cajaNombre: detalle?.estadoActual.caja.nombre ?? 'Caja de Oficina',
      articulos,
      creditosAhora: detalle?.estadoActual.creditosVivos ?? 0,
      creditosDespues:
        (detalle?.estadoActual.creditosVivos ?? 0) - elegidos.length,
      esTodo: elegidos.length > 0 && elegidos.length === deshacibles.length,
    };
  }, [elegidos, deshacibles, detalle]);

  const alternar = useCallback((id: string) => {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }, []);

  const alternarTodos = useCallback(() => {
    setSeleccion((prev) =>
      prev.size === deshacibles.length
        ? new Set()
        : new Set(deshacibles.map((c) => c.id)),
    );
  }, [deshacibles]);

  const deshacer = async () => {
    if (!detalle || elegidos.length === 0) return;
    setDeshaciendo(true);
    try {
      const res = await importacionesService.revertirLote(
        detalle.id,
        // Si van todos, se manda sin lista: el lote queda cancelado entero.
        impacto.esTodo ? undefined : elegidos.map((c) => c.id),
      );
      toast.success(res.mensajes[0] ?? 'Importación deshecha.');
      res.mensajes.slice(1).forEach((m) => toast.info(m));
      onDeshecho();
      onCerrar();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo deshacer la importación.');
    } finally {
      setDeshaciendo(false);
      setConfirmando(false);
    }
  };

  const fila = (c: CreditoDeLote) => {
    const elegido = seleccion.has(c.id);
    return (
      <tr
        key={c.id}
        onClick={() => c.sePuedeDeshacer && alternar(c.id)}
        className={`border-b border-slate-100 transition-colors ${
          !c.sePuedeDeshacer
            ? 'bg-slate-50/70 text-slate-400'
            : elegido
              ? 'bg-rose-50/60 cursor-pointer'
              : 'hover:bg-slate-50 cursor-pointer'
        }`}
      >
        <td className="px-3 py-2.5">
          <input
            type="checkbox"
            checked={elegido}
            disabled={!c.sePuedeDeshacer}
            onChange={() => alternar(c.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 disabled:opacity-40"
            aria-label={`Deshacer ${c.numeroPrestamo}`}
          />
        </td>
        <td className="px-3 py-2.5">
          <div className="font-semibold text-slate-800">{c.cliente}</div>
          <div className="text-xs text-slate-500">
            CC {c.cedula} · {c.numeroPrestamo}
          </div>
          {!c.sePuedeDeshacer && c.razonNoSePuedeDeshacer && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {c.razonNoSePuedeDeshacer}
            </div>
          )}
        </td>
        <td className="px-3 py-2.5 text-sm">
          {c.articulo ? (
            <span className="inline-flex items-center gap-1 text-slate-700">
              <Package className="h-3.5 w-3.5" />
              {c.articulo}
            </span>
          ) : (
            <span className="text-slate-500">Préstamo en efectivo</span>
          )}
          <div className="text-xs text-slate-500">
            {formatearFecha(c.fechaCredito)}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
          {formatCurrency(c.monto)}
          {c.cuotaInicial > 0 && (
            <div className="text-xs font-normal text-slate-500">
              inicial {formatCurrency(c.cuotaInicial)}
            </div>
          )}
        </td>
        <td className="px-3 py-2.5 text-right">
          {c.movioCaja ? (
            <span
              className={`font-bold ${c.devolucionACaja >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
            >
              {c.devolucionACaja >= 0 ? '+' : '−'}
              {formatCurrency(Math.abs(c.devolucionACaja))}
            </span>
          ) : (
            <span className="text-xs text-slate-400">no movió caja</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none">
        <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          {/* Encabezado */}
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900">
                Revisar antes de deshacer
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {detalle?.nombreArchivo ?? 'Cargando…'}
                {detalle?.creadoPor ? ` · importado por ${detalle.creadoPor}` : ''}
              </p>
            </div>
            <button
              onClick={onCerrar}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {cargando && <Cargando texto="Buscando lo que creó esta importación…" />}

          {error && (
            <div className="px-6 py-10 text-center text-sm font-medium text-rose-600">
              {error}
            </div>
          )}

          {detalle && !cargando && (
            <>
              {/* Buscador y selección */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por cliente, cédula o número de crédito"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={alternarTodos}
                  disabled={deshacibles.length === 0}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  {seleccion.size === deshacibles.length && deshacibles.length > 0
                    ? 'Quitar todo'
                    : `Elegir los ${deshacibles.length} que se pueden`}
                </button>
              </div>

              {/* Tabla */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-10 px-3 py-2" />
                      <th className="px-3 py-2">Cliente y crédito</th>
                      <th className="px-3 py-2">Qué es</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                      <th className="px-3 py-2 text-right">Vuelve a caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map(fila)}
                    {visibles.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-10 text-center text-sm text-slate-500"
                        >
                          Ningún crédito coincide con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Lo que va a pasar */}
              <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                {detalle.totales.bloqueados > 0 && (
                  <p className="mb-3 flex items-start gap-2 text-xs font-medium text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {detalle.totales.bloqueados} crédito(s) no se pueden
                    deshacer y quedan como están. Aparecen en gris.
                  </p>
                )}

                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Al confirmar
                    </div>
                    {impacto.creditos === 0 ? (
                      <p className="text-sm text-slate-500">
                        No ha elegido ningún crédito todavía.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                          Va a deshacer <b>{impacto.creditos}</b> crédito(s) con
                          sus cuotas.
                          {impacto.esTodo &&
                            ' Es todo lo que se puede deshacer de esta importación.'}
                        </p>

                        {/* Cómo queda cada cosa después. Es lo que se compara
                            contra lo que uno espera tener. */}
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[280px] text-sm">
                          <tbody className="[&_td]:py-0.5">
                            <tr>
                              <td className="pr-3 text-slate-500">
                                {impacto.cajaNombre}
                              </td>
                              <td className="pr-2 text-slate-500 tabular-nums">
                                {formatCurrency(impacto.cajaAhora)}
                              </td>
                              <td className="pr-2 text-slate-400">→</td>
                              <td
                                className={`font-bold tabular-nums ${
                                  impacto.caja > 0
                                    ? 'text-emerald-700'
                                    : impacto.caja < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-700'
                                }`}
                              >
                                {formatCurrency(impacto.cajaDespues)}
                              </td>
                              <td className="pl-2 text-xs text-slate-400">
                                {impacto.caja !== 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <ArrowDownToLine className="h-3 w-3" />
                                    {impacto.caja > 0 ? '+' : '−'}
                                    {formatCurrency(Math.abs(impacto.caja))}
                                  </span>
                                )}
                              </td>
                            </tr>

                            {impacto.articulos.map((a) => (
                              <tr key={a.codigo}>
                                <td className="pr-3 text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    {a.codigo}
                                  </span>
                                </td>
                                <td className="pr-2 text-slate-500 tabular-nums">
                                  {a.stock} und
                                </td>
                                <td className="pr-2 text-slate-400">→</td>
                                <td className="font-bold tabular-nums text-emerald-700">
                                  {a.stock + a.devuelve} und
                                </td>
                                <td className="pl-2 text-xs text-slate-400">
                                  +{a.devuelve}
                                </td>
                              </tr>
                            ))}

                            <tr>
                              <td className="pr-3 text-slate-500">
                                Créditos de esta importación
                              </td>
                              <td className="pr-2 text-slate-500 tabular-nums">
                                {impacto.creditosAhora}
                              </td>
                              <td className="pr-2 text-slate-400">→</td>
                              <td className="font-bold tabular-nums text-slate-700">
                                {impacto.creditosDespues}
                              </td>
                              <td className="pl-2 text-xs text-slate-400">
                                −{impacto.creditos}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={onCerrar}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setConfirmando(true)}
                      disabled={impacto.creditos === 0 || deshaciendo}
                      className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Deshacer {impacto.creditos || ''}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Segunda confirmación: se está devolviendo dinero. */}
      {confirmando && detalle && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-2xl bg-rose-50 p-2.5 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Esto no se puede deshacer
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              Se van a borrar <b>{impacto.creditos}</b> crédito(s)
              {impacto.caja !== 0 && (
                <>
                  {' '}y a mover{' '}
                  <b>{formatCurrency(Math.abs(impacto.caja))}</b> en la Caja de
                  Oficina
                </>
              )}
              {impacto.articulos.length > 0 && (
                <>
                  {' '}y a devolver{' '}
                  <b>
                    {impacto.articulos.reduce((s, a) => s + a.devuelve, 0)}
                  </b>{' '}
                  artículo(s) al inventario
                </>
              )}
              . Los asientos contables quedan registrados con su reversa.
            </p>

            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {impacto.cajaNombre} queda en{' '}
              <b className="text-slate-900">
                {formatCurrency(impacto.cajaDespues)}
              </b>
              .
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                disabled={deshaciendo}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={deshacer}
                disabled={deshaciendo}
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deshaciendo ? 'Deshaciendo…' : 'Sí, deshacer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Portal>
  );
};

export default RevisarLoteModal;
